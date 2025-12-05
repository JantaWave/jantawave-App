import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  Image,
  TextInput,
  Animated,
  Keyboard,
} from 'react-native';
import { getUserStreams } from '../api/user';
import { getPostComments, commentOnPost, getUserPosts, togglePostLike } from '../api';
import { useToast } from 'react-native-toast-notifications';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import AppHeader from './Components/AppHeader';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function ActivityScreen() {
  const router = useRouter();
  const Toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const commentInputRef = useRef<TextInput>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streams, setStreams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'streams' | 'posts'>('streams');
  const [posts, setPosts] = useState<any[]>([]);
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [commentsData, setCommentsData] = useState<{ [postId: string]: any[] }>({});
  const [commentsLoading, setCommentsLoading] = useState<{ [postId: string]: boolean }>({});

  // State to track who we are replying to: { postId, commentId, username }
  const [replyingTo, setReplyingTo] = useState<{
    postId: string;
    commentId: string;
    username: string;
  } | null>(null);

  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [likeAnimations, setLikeAnimations] = useState<{ [key: string]: Animated.Value }>({});

  useEffect(() => {
    fetchActivityData();
  }, [activeTab]);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'streams') {
        const data = await getUserStreams();
        setStreams(data || []);
      } else {
        if (user?.id) {
          const data = await getUserPosts(user.id);
          setPosts(data || []);
        }
      }
    } catch (error: any) {
      Toast.show(error.response?.data?.message || 'Failed to load data', { type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivityData();
    setRefreshing(false);
  };

  const handleJoinStream = (stream: any) => {
    router.push({
      pathname: '/start-stream',
      params: {
        sessionId: stream.id,
        scheduledTime: stream.status === 'scheduled' ? stream.scheduled_start_time : undefined,
      },
    });
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    try {
      // Trigger heart animation
      if (!isLiked) {
        triggerHeartAnimation(postId);
      }
      const userId = user.id;

      const { liked } = await togglePostLike(postId, userId);
      console.log(liked);

      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: !isLiked,
                like_count: isLiked ? p.like_count - 1 : p.like_count + 1,
              }
            : p
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const triggerHeartAnimation = (postId: string) => {
    const scaleValue = new Animated.Value(0);
    setLikeAnimations((prev) => ({ ...prev, [postId]: scaleValue }));

    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 1.2,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLikeAnimations((prev) => {
        const newAnimations = { ...prev };
        delete newAnimations[postId];
        return newAnimations;
      });
    });
  };

  const toggleComments = async (postId: string) => {
    const isExpanding = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: isExpanding }));

    // If expanding and data not loaded, fetch it
    if (isExpanding && !commentsData[postId]) {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      try {
        const data = await getPostComments(postId);
        setCommentsData((prev) => ({ ...prev, [postId]: data || [] }));
      } catch (error) {
        console.error('Failed to load comments', error);
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleReplyTo = (postId: string, commentId: string, username: string) => {
    setReplyingTo({ postId, commentId, username });
    // Focus the input box for this post
    // Note: In a FlatList/Map this might require a ref map,
    // but focusing the specific input if rendered is tricky without individual refs.
    // For now, we update state so the UI changes.
    setCommentText((prev) => ({ ...prev, [postId]: `@${username} ` }));
  };

  const handleAddComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) return;

    // Check if this is a reply
    const parentId = replyingTo?.postId === postId ? replyingTo.commentId : null;

    try {
      // API Call
      const newComment = await commentOnPost(postId, content, parentId);

      console.log('Comment added:', newComment);

      // Clear input and replying state
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);

      // Optimistically update comments list
      // Note: This logic assumes your API returns the new comment object
      // You might need to reload comments or append manually depending on your API response structure

      const updatedComments = [...(commentsData[postId] || [])];

      // If your API returns flat list with parent_id, just push.
      // If nested, you need to find parent and push to children.
      // Assuming Flat List structure for simplicity here:
      updatedComments.push({
        ...newComment,
        user: {
          first_name: user?.first_name,
          last_name: user?.last_name,
        },
        created_at: new Date().toISOString(),
      });

      setCommentsData((prev) => ({ ...prev, [postId]: updatedComments }));

      // Update post comment count
      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
        )
      );

      Keyboard.dismiss();
    } catch (error) {
      console.error(error);
      Toast.show('Failed to post comment', { type: 'danger' });
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatStreamTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter Logic
  const liveStreams = streams.filter((s) => s.status === 'live' || s.isLive === true);
  const scheduledStreams = streams.filter((s) => s.status === 'scheduled');
  const pastStreams = streams.filter(
    (s) => s.status === 'ended' || (!s.isLive && s.status !== 'scheduled')
  );

  const renderComment = (comment: any, postId: string, depth = 0) => {
    // Styling for indentation
    const marginLeft = depth * 20;

    return (
      <View key={comment.id} style={{ marginLeft }} className="mb-3">
        <View className="flex-row items-start">
          {/* Avatar */}
          <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-blue-500">
            <Text className="text-xs font-bold text-white">
              {comment.user?.first_name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>

          {/* Comment Body */}
          <View className="flex-1">
            <Text className="text-sm">
              <Text className="font-semibold text-black dark:text-white">
                {comment.user?.first_name || 'User'} {comment.user?.last_name || ''}{' '}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">{comment.content}</Text>
            </Text>

            {/* Metadata & Actions */}
            <View className="mt-1 flex-row items-center gap-3">
              <Text className="text-xs text-gray-400">{formatTime(comment.created_at)}</Text>

              {/* Reply Button */}
              <TouchableOpacity
                onPress={() => handleReplyTo(postId, comment.id, comment.user?.first_name)}>
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recursively render replies (children) if they exist in a nested structure 
            OR filter from the main list if flat structure. 
            Assuming a `replies` array exists on the comment object for this example.
        */}
        {comment.replies && comment.replies.length > 0 && (
          <View className="mt-2">
            {comment.replies.map((reply: any) => renderComment(reply, postId, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      <AppHeader title="Activity" iconName="radio" />

      {/* Filter Bar */}
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row items-center justify-center rounded-full bg-gray-100 p-1 dark:bg-[#252525]">
          <TouchableOpacity
            onPress={() => setActiveTab('streams')}
            className={`flex-1 rounded-full py-2.5 ${activeTab === 'streams' ? 'bg-[#2196F3]' : ''}`}
            activeOpacity={0.9}>
            <Text
              className={`text-center text-sm font-semibold ${
                activeTab === 'streams' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              }`}>
              Streams
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            className={`flex-1 rounded-full py-2.5 ${activeTab === 'posts' ? 'bg-[#2196F3]' : ''}`}
            activeOpacity={0.9}>
            <Text
              className={`text-center text-sm font-semibold ${
                activeTab === 'posts' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              }`}>
              Posts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
        }
        showsVerticalScrollIndicator={false}>
        {/* STREAMS SECTION */}
        {activeTab === 'streams' && (
          <>
            {streams.length > 0 ? (
              <>
                {/* Live Now */}
                {liveStreams.length > 0 && (
                  <View className="mt-6 px-5">
                    <Text className="mb-4 text-lg font-bold text-black dark:text-white">
                      Live Now
                    </Text>
                    {liveStreams.map((stream, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleJoinStream(stream)}
                        className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-[#252525]">
                        <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-md bg-[#ff4444] px-2 py-1">
                          <View className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                          <Text className="text-[10px] font-bold text-white">LIVE</Text>
                        </View>
                        <View className="mr-3 flex-1">
                          <Text
                            numberOfLines={1}
                            className="mb-1.5 text-base font-semibold text-black dark:text-white">
                            {stream.title || 'Untitled Stream'}
                          </Text>
                          <Text className="mb-2 text-sm text-gray-600 dark:text-[#cccccc]">
                            by {stream.hostName || 'Unknown Host'}
                          </Text>
                          <View className="flex-row items-center gap-4">
                            <View className="flex-row items-center gap-1">
                              <MaterialIcons
                                name="visibility"
                                size={14}
                                color={isDark ? '#888888' : '#666666'}
                              />
                              <Text className="text-xs text-gray-500 dark:text-[#888888]">
                                {stream.viewers || 0} watching
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#ff4444]">
                          <MaterialIcons name="play-arrow" size={24} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Upcoming / Scheduled */}
                {scheduledStreams.length > 0 && (
                  <View className="mt-6 px-5">
                    <Text className="mb-4 text-lg font-bold text-black dark:text-white">
                      Upcoming Streams
                    </Text>
                    {scheduledStreams.map((stream, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleJoinStream(stream)}
                        className="mb-3 flex-row items-center rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-[#1e2a38]">
                        <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-md bg-[#2196F3] px-2 py-1">
                          <Feather name="calendar" size={10} color="white" />
                          <Text className="text-[10px] font-bold text-white">UPCOMING</Text>
                        </View>
                        <View className="mr-3 flex-1">
                          <Text
                            numberOfLines={1}
                            className="mb-1.5 text-base font-semibold text-black dark:text-white">
                            {stream.title || 'Scheduled Event'}
                          </Text>
                          <Text className="mb-2 text-sm text-gray-600 dark:text-[#cccccc]">
                            by {stream.hostName || 'Host'}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <View className="flex-row items-center rounded bg-white/20 px-2 py-1">
                              <Feather name="clock" size={12} color={isDark ? '#ccc' : '#555'} />
                              <Text className="ml-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                                {formatDate(stream.scheduled_start_time)} •{' '}
                                {formatStreamTime(stream.scheduled_start_time)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#2196F3]">
                          <Feather name="bell" size={20} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Recent / Past Streams */}
                {pastStreams.length > 0 && (
                  <View className="mt-6 px-5 pb-6">
                    <Text className="mb-4 text-lg font-bold text-black dark:text-white">
                      Recent Streams
                    </Text>
                    {pastStreams.map((stream, index) => (
                      <TouchableOpacity
                        key={index}
                        className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]">
                        <View className="mr-3 flex-1">
                          <Text
                            numberOfLines={1}
                            className="mb-1.5 text-base font-semibold text-black dark:text-white">
                            {stream.title || 'Untitled Stream'}
                          </Text>
                          <Text className="mb-2 text-sm text-gray-600 dark:text-[#cccccc]">
                            by {stream.hostName}
                          </Text>
                          <View className="flex-row items-center gap-4">
                            <Text className="text-xs text-gray-500 dark:text-[#888888]">
                              Ended {stream.timeAgo || 'recently'}
                            </Text>
                          </View>
                        </View>
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-400 dark:bg-gray-700">
                          <MaterialIcons name="replay" size={24} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View className="flex-1 items-center justify-center px-10 py-20">
                <MaterialIcons name="radio" size={64} color={isDark ? '#333333' : '#cccccc'} />
                <Text className="mb-2 mt-6 text-xl font-bold text-black dark:text-white">
                  No Streams Available
                </Text>
                <Text className="text-center text-sm text-gray-500 dark:text-[#888888]">
                  Check back later for live streams and recordings
                </Text>
              </View>
            )}
          </>
        )}

        {/* MODERN POSTS SECTION */}
        {activeTab === 'posts' && (
          <View className="bg-gray-50 pb-4 dark:bg-[#1a1a1a]">
            {posts.length > 0 ? (
              posts.map((post) => (
                <View key={post.id} className="mb-2 bg-white dark:bg-[#000000]">
                  {/* Header */}
                  <View className="flex-row items-center px-4 py-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                      <Text className="text-base font-bold text-white">
                        {user?.first_name?.[0]?.toUpperCase() || 'U'}
                      </Text>
                    </View>

                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm font-semibold text-black dark:text-white">
                          {user?.first_name || 'User'} {user?.last_name || ''}
                        </Text>
                        {post.status === 'scheduled' && (
                          <View className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 dark:bg-orange-900/30">
                            <Text className="text-[9px] font-bold text-orange-600 dark:text-orange-400">
                              SCHEDULED
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(post.created_at)}
                      </Text>
                    </View>

                    <TouchableOpacity className="p-2">
                      <Feather name="more-horizontal" size={20} color={isDark ? '#888' : '#666'} />
                    </TouchableOpacity>
                  </View>

                  {/* Content Text */}
                  {post.content && (
                    <View className="px-4 pb-3">
                      <Text className="text-[15px] leading-5 text-black dark:text-white">
                        {post.content}
                      </Text>
                    </View>
                  )}

                  {/* Media (Image/Video) */}
                  {post.media_url && (
                    <View className="relative w-full">
                      <Image
                        source={{ uri: post.media_url }}
                        className="h-96 w-full bg-gray-100 dark:bg-gray-900"
                        resizeMode="cover"
                      />

                      {/* Animated Heart on Image */}
                      {likeAnimations[post.id] && (
                        <Animated.View
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: [
                              { translateX: -50 },
                              { translateY: -50 },
                              { scale: likeAnimations[post.id] },
                            ],
                          }}
                          pointerEvents="none">
                          <Feather name="heart" size={100} color="#ff4444" fill="#ff4444" />
                        </Animated.View>
                      )}
                    </View>
                  )}

                  {/* Action Bar */}
                  <View className="px-4 py-2">
                    <View className="flex-row items-center py-1">
                      <TouchableOpacity
                        onPress={() => toggleLike(post.id, post.is_liked)}
                        className="mr-4 py-2"
                        activeOpacity={0.7}>
                        <MaterialIcons
                          name={post.is_liked ? 'favorite' : 'favorite-border'}
                          size={28}
                          color={post.is_liked ? '#ff4444' : isDark ? '#fff' : '#000'}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => toggleComments(post.id)}
                        className="mr-4 py-2"
                        activeOpacity={0.7}>
                        <Feather name="message-circle" size={26} color={isDark ? '#fff' : '#000'} />
                      </TouchableOpacity>

                      <TouchableOpacity className="py-2" activeOpacity={0.7}>
                        <Feather name="share-2" size={24} color={isDark ? '#fff' : '#000'} />
                      </TouchableOpacity>
                    </View>

                    {/* Like Count */}
                    {post.like_count > 0 && (
                      <TouchableOpacity className="py-1">
                        <Text className="text-sm font-semibold text-black dark:text-white">
                          {post.like_count.toLocaleString()}{' '}
                          {post.like_count === 1 ? 'like' : 'likes'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Title as Caption */}
                    {post.title && (
                      <View className="py-1">
                        <Text className="text-sm text-black dark:text-white">
                          <Text className="font-semibold">{user?.first_name || 'User'} </Text>
                          <Text className="text-gray-700 dark:text-gray-300">{post.title}</Text>
                        </Text>
                      </View>
                    )}

                    {/* View Comments */}
                    {post.comment_count > 0 && (
                      <TouchableOpacity onPress={() => toggleComments(post.id)} className="py-1">
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          {expandedComments[post.id] ? 'Hide' : 'View all'} {post.comment_count}{' '}
                          comments
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Comment Section */}
                    {expandedComments[post.id] && (
                      <View className="mt-3 border-t border-gray-200 px-4 pt-3 dark:border-gray-800">
                        {commentsLoading[post.id] ? (
                          <ActivityIndicator size="small" color="#2196F3" />
                        ) : (
                          <View>
                            {commentsData[post.id]?.map((comment) =>
                              renderComment(comment, post.id)
                            )}

                            {(!commentsData[post.id] || commentsData[post.id].length === 0) && (
                              <Text className="py-2 text-center text-xs text-gray-400">
                                No comments yet
                              </Text>
                            )}
                          </View>
                        )}

                        {/* Add Comment Input */}
                        <View className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800">
                          {/* Replying To Banner */}
                          {replyingTo?.postId === post.id && (
                            <View className="mb-2 flex-row items-center justify-between rounded bg-gray-100 p-2 dark:bg-gray-800">
                              <Text className="text-xs text-gray-500 dark:text-gray-300">
                                Replying to <Text className="font-bold">{replyingTo.username}</Text>
                              </Text>
                              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Feather name="x" size={14} color="#666" />
                              </TouchableOpacity>
                            </View>
                          )}

                          <View className="flex-row items-center">
                            <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-purple-500">
                              <Text className="text-xs font-bold text-white">
                                {user?.first_name?.[0]?.toUpperCase() || 'U'}
                              </Text>
                            </View>

                            <TextInput
                              placeholder={
                                replyingTo?.postId === post.id
                                  ? 'Write a reply...'
                                  : 'Add a comment...'
                              }
                              placeholderTextColor={isDark ? '#666' : '#999'}
                              value={commentText[post.id] || ''}
                              onChangeText={(text) =>
                                setCommentText((prev) => ({ ...prev, [post.id]: text }))
                              }
                              className="flex-1 py-2 text-sm text-black dark:text-white"
                              multiline
                            />

                            {commentText[post.id]?.trim() ? (
                              <TouchableOpacity
                                onPress={() => handleAddComment(post.id)}
                                className="ml-2 rounded-full bg-blue-500 px-3 py-1.5">
                                <Text className="text-xs font-semibold text-white">
                                  {replyingTo?.postId === post.id ? 'Reply' : 'Post'}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View className="flex-1 items-center justify-center px-10 py-32">
                <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-gray-300 dark:border-gray-700">
                  <Feather name="image" size={32} color={isDark ? '#555' : '#999'} />
                </View>
                <Text className="mt-6 text-2xl font-bold text-black dark:text-white">
                  No Posts Yet
                </Text>
                <Text className="mt-2 text-center text-base text-gray-500 dark:text-[#888888]">
                  Share your first photo or video
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
