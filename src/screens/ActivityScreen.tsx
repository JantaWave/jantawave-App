import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  Keyboard,
  Animated,
} from 'react-native';
import { getUserStreams } from '../api/user';
import { getPostComments, commentOnPost, getUserPosts, togglePostLike } from '../api';
import { useToast } from 'react-native-toast-notifications';
import AppHeader from './Components/AppHeader';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import PostCard from './Components/PostCard';
import { MaterialIcons, Feather } from '@expo/vector-icons';

export default function ActivityScreen() {
  const router = useRouter();
  const Toast = useToast();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- UI STATE ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'streams' | 'posts'>('streams');

  // --- STREAMS STATE ---
  const [streams, setStreams] = useState<any[]>([]);
  const [streamCursor, setStreamCursor] = useState<string | null>(null);
  const [streamsHasMore, setStreamsHasMore] = useState(true);
  const [streamsLoadingMore, setStreamsLoadingMore] = useState(false);

  // --- POSTS STATE ---
  const [posts, setPosts] = useState<any[]>([]);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);

  // --- INTERACTION STATE ---
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [commentsData, setCommentsData] = useState<{ [postId: string]: any[] }>({});
  const [commentsLoading, setCommentsLoading] = useState<{ [postId: string]: boolean }>({});
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [likeAnimations, setLikeAnimations] = useState<any>({});

  // Initial Fetch on Tab Change
  useEffect(() => {
    if (activeTab === 'streams' && streams.length === 0) {
      fetchActivityData(true);
    } else if (activeTab === 'posts' && posts.length === 0) {
      fetchActivityData(true);
    }
  }, [activeTab]);

  const fetchActivityData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (streams.length === 0 && posts.length === 0) {
        setLoading(true);
      }

      if (activeTab === 'streams') {
        const currentCursor = isRefresh ? null : streamCursor;
        const data = await getUserStreams(5, currentCursor);

        const newStreams = data?.streams || [];
        const nextCursor = data?.nextCursor;

        if (isRefresh) {
          setStreams(newStreams);
        } else {
          setStreams((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const unique = newStreams.filter((s: any) => !existingIds.has(s.id));
            return [...prev, ...unique];
          });
        }

        setStreamCursor(nextCursor);
        setStreamsHasMore(!!nextCursor);
      } else {
        if (user?.id) {
          const currentCursor = isRefresh ? null : postCursor;
          const result = await getUserPosts(user.id, 10, currentCursor);
          const newPosts = result?.posts || []; // Store new posts in a variable

          if (isRefresh) {
            setPosts(newPosts);
          } else {
            // FIXED LOGIC: Filter out duplicates before appending
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const uniquePosts = newPosts.filter((p: any) => !existingIds.has(p.id));
              return [...prev, ...uniquePosts];
            });
          }

          setPostCursor(result?.nextCursor || null);
          setPostsHasMore(!!result?.nextCursor);
        }
      }
    } catch (error: any) {
      Toast.show(error.response?.data?.message || 'Failed to load data', { type: 'warning' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setStreamsLoadingMore(false);
      setPostsLoadingMore(false);
    }
  };

  const onRefresh = () => {
    fetchActivityData(true);
  };

  const handleLoadMoreStreams = () => {
    if (!streamsLoadingMore && streamsHasMore) {
      setStreamsLoadingMore(true);
      fetchActivityData(false);
    }
  };

  const handleLoadMorePosts = useCallback(() => {
    if (!postsLoadingMore && postsHasMore && activeTab === 'posts') {
      setPostsLoadingMore(true);
      fetchActivityData(false);
    }
  }, [postsLoadingMore, postsHasMore, activeTab]);

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
      if (!isLiked) {
        triggerHeartAnimation(postId);
      }

      await togglePostLike(postId, user.id);

      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: !isLiked,
                likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p
        )
      );
    } catch (error) {
      console.error(error);
      Toast.show('Failed to update like', { type: 'danger' });
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
    setCommentText((prev) => ({ ...prev, [postId]: `@${username} ` }));
  };

  const handleAddComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) return;

    const parentId = replyingTo?.postId === postId ? replyingTo.commentId : null;

    try {
      const newComment = await commentOnPost(postId, content, parentId);

      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);

      const updatedComments = [...(commentsData[postId] || [])];
      updatedComments.push({
        ...newComment,
        user: {
          first_name: user?.first_name,
          last_name: user?.last_name,
        },
        created_at: new Date().toISOString(),
      });

      setCommentsData((prev) => ({ ...prev, [postId]: updatedComments }));

      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
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

  const renderComment = (comment: any, postId: string, depth = 0) => {
    const marginLeft = depth * 20;

    return (
      <View key={comment.id} style={{ marginLeft }} className="mb-3">
        <View className="flex-row items-start">
          <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-blue-500">
            <Text className="text-xs font-bold text-white">
              {comment.user?.first_name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-sm">
              <Text className="font-semibold text-black dark:text-white">
                {comment.user?.first_name || 'User'} {comment.user?.last_name || ''}{' '}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">{comment.content}</Text>
            </Text>

            <View className="mt-1 flex-row items-center gap-3">
              <Text className="text-xs text-gray-400">{formatTime(comment.created_at)}</Text>

              <TouchableOpacity
                onPress={() => handleReplyTo(postId, comment.id, comment.user?.first_name)}>
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {comment.replies && comment.replies.length > 0 && (
          <View className="mt-2">
            {comment.replies.map((reply: any) => renderComment(reply, postId, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const renderPostItem = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      currentUser={user}
      author={{
        id: item.id,
        first_name: user?.first_name,
        last_name: user?.last_name,
        avatar_url: user?.avatar_url,
      }}
      isDark={isDark}
      likeAnimation={likeAnimations[item.id]}
      expanded={!!expandedComments[item.id]}
      comments={commentsData[item.id] || []}
      commentsLoading={commentsLoading[item.id]}
      commentText={commentText[item.id] || ''}
      replyingTo={replyingTo?.postId === item.id ? replyingTo : null}
      onLike={() => toggleLike(item.id, item.is_liked)}
      onToggleComments={() => toggleComments(item.id)}
      onCommentTextChange={(t) => setCommentText((p) => ({ ...p, [item.id]: t }))}
      onAddComment={() => handleAddComment(item.id)}
      onCancelReply={() => setReplyingTo(null)}
      onReplyTo={(cid, uname) => handleReplyTo(item.id, cid, uname)}
      renderComment={(c) => renderComment(c, item.id)}
      formatTime={formatTime}
    />
  );

  const renderStreamItem = ({ item: stream }: { item: any }) => {
    const isLive = stream.status === 'live' || stream.isLive === true;
    const isScheduled = stream.status === 'scheduled';

    if (isLive) {
      return (
        <TouchableOpacity
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
                <MaterialIcons name="visibility" size={14} color={isDark ? '#888888' : '#666666'} />
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
      );
    }

    if (isScheduled) {
      return (
        <TouchableOpacity
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
      );
    }

    return (
      <TouchableOpacity className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]">
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
    );
  };

  const renderStreamFooter = () => {
    if (streamsLoadingMore) {
      return (
        <View className="py-4">
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      );
    }

    if (streamsHasMore && streams.length > 0) {
      return (
        <View className="px-4 py-4">
          <TouchableOpacity
            onPress={handleLoadMoreStreams}
            className="w-full rounded-xl bg-gray-100 py-3 dark:bg-[#333]"
            activeOpacity={0.7}>
            <Text className="text-center font-semibold text-gray-700 dark:text-gray-200">
              Show More
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <View className="h-20" />;
  };

  const renderPostFooter = () => {
    if (postsLoadingMore) {
      return (
        <View className="py-4">
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      );
    }
    return <View className="h-20" />;
  };

  const renderEmptyPosts = () => (
    <View className="flex-1 items-center justify-center px-10 py-32">
      <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-gray-300 dark:border-gray-700">
        <Feather name="image" size={32} color={isDark ? '#555' : '#999'} />
      </View>
      <Text className="mt-6 text-2xl font-bold text-black dark:text-white">No Posts Yet</Text>
      <Text className="mt-2 text-center text-base text-gray-500 dark:text-[#888888]">
        Share your first photo or video
      </Text>
    </View>
  );

  const renderEmptyStreams = () => (
    <View className="flex-1 items-center justify-center px-10 py-20">
      <MaterialIcons name="radio" size={64} color={isDark ? '#333333' : '#cccccc'} />
      <Text className="mb-2 mt-6 text-xl font-bold text-black dark:text-white">
        No Streams Available
      </Text>
      <Text className="text-center text-sm text-gray-500 dark:text-[#888888]">
        Check back later for live streams and recordings
      </Text>
    </View>
  );

  // Prepare streams data for FlatList with sections
  const liveStreams = streams.filter((s) => s.status === 'live' || s.isLive === true);
  const scheduledStreams = streams.filter((s) => s.status === 'scheduled');
  const pastStreams = streams.filter(
    (s) => s.status === 'ended' || (s.status !== 'live' && !s.isLive && s.status !== 'scheduled')
  );

  const streamsData = [
    ...(liveStreams.length > 0
      ? [{ section: 'Live Now', id: 'section-live', isSection: true }, ...liveStreams]
      : []),
    ...(scheduledStreams.length > 0
      ? [
          { section: 'Upcoming Streams', id: 'section-scheduled', isSection: true },
          ...scheduledStreams,
        ]
      : []),
    ...(pastStreams.length > 0
      ? [{ section: 'Recent Streams', id: 'section-past', isSection: true }, ...pastStreams]
      : []),
  ];
  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      <AppHeader title="Activity" iconName="radio" />

      {/* Tabs */}
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

      {/* Content */}
      {activeTab === 'posts' ? (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => `post-${item.id}`} // Add prefix to ensure uniqueness
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
          }
          onEndReached={handleLoadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderPostFooter}
          ListEmptyComponent={renderEmptyPosts}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={streamsData}
          renderItem={({ item }) => {
            if (item.isSection) {
              return (
                <View className="mb-4 mt-6 px-5">
                  <Text className="text-lg font-bold text-black dark:text-white">
                    {item.section}
                  </Text>
                </View>
              );
            }
            return renderStreamItem({ item });
          }}
          keyExtractor={(item, index) => {
            if (item.isSection) {
              return item.id; // section-live, section-scheduled, section-past
            }
            return `stream-${item.id || index}`; // Fallback to index if ID missing
          }}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
          }
          ListFooterComponent={renderStreamFooter}
          ListEmptyComponent={renderEmptyStreams}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
