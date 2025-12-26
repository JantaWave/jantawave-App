import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Animated,
  Keyboard,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';

import { getPostsForUser, getPostComments, commentOnPost, togglePostLike } from '../api';

import PostCard from './Components/PostCard';
import { useAuth } from '../context/AuthContext';
import { capitalize, getInitials } from '../utils/getInitials';

const LIMIT = 5;

export default function AudienceCommunityScreen() {
  const Toast = useToast();
  const isDark = useColorScheme() === 'dark';
  const { user } = useAuth();

  const onEndReachedCalledDuringMomentum = useRef(false);

  const [posts, setPosts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [likeAnimations, setLikeAnimations] = useState<Record<string, Animated.Value>>({});
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isMutedGlobal, setIsMutedGlobal] = useState(true);

  const [replyingTo, setReplyingTo] = useState<{
    postId: string;
    commentId: string;
    username: string;
  } | null>(null);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 300,
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const visibleItem = viewableItems.find((item) => item.isViewable && item.item?.id);

    if (visibleItem) {
      setActiveVideoId(visibleItem.item.id);
    }
  }).current;

  /* ---------------- FETCH POSTS ---------------- */
  useEffect(() => {
    fetchPosts(false);
  }, []);

  const fetchPosts = async (loadMore = false) => {
    if (loadingMore) return;
    if (loadMore && !cursor) return;

    try {
      loadMore ? setLoadingMore(true) : setLoading(true);

      const res = await getPostsForUser({
        limit: LIMIT,
        cursor: loadMore ? cursor : null,
      });

      console.log('fetched response', res?.posts[0]);

      const incoming = res.posts || [];

      setPosts((prev) => {
        if (!loadMore) return incoming;

        // 🔥 De-duplicate safely
        const map = new Map<string, any>();
        prev.forEach((p) => map.set(p.id, p));
        incoming.forEach((p) => map.set(p.id, p));

        return Array.from(map.values());
      });

      setCursor(res.nextCursor);
    } catch (err) {
      Toast.show('Failed to load community posts', { type: 'warning' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCursor(null);
    setPosts([]);
    await fetchPosts(false);
    setRefreshing(false);
  };

  /* ---------------- LIKE ---------------- */
  const toggleLike = async (postId: string, isLiked: boolean) => {
    try {
      // Trigger animation immediately for better UX
      if (!isLiked) triggerHeartAnimation(postId);

      // Optimistically update UI
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: !isLiked,
                likes_count: isLiked ? (p.likes_count || 0) - 1 : (p.likes_count || 0) + 1,
                like_count: isLiked ? (p.like_count || 0) - 1 : (p.like_count || 0) + 1,
              }
            : p
        )
      );

      // Make API call
      await togglePostLike(postId, user.id);
    } catch (err) {
      console.error('Like error:', err);
      Toast.show('Failed to update like', { type: 'warning' });

      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: isLiked,
                likes_count: isLiked ? (p.likes_count || 0) + 1 : (p.likes_count || 0) - 1,
                like_count: isLiked ? (p.like_count || 0) + 1 : (p.like_count || 0) - 1,
              }
            : p
        )
      );
    }
  };

  const triggerHeartAnimation = (postId: string) => {
    const scale = new Animated.Value(0);
    setLikeAnimations((p) => ({ ...p, [postId]: scale }));

    Animated.sequence([
      Animated.spring(scale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.timing(scale, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLikeAnimations((p) => {
        const copy = { ...p };
        delete copy[postId];
        return copy;
      });
    });
  };

  /* ---------------- COMMENTS ---------------- */
  const toggleComments = async (postId: string) => {
    const isExpanded = expandedComments[postId];

    if (!isExpanded) {
      // Load comments
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      await fetchComments(postId);
    } else {
      // Close comments
      setExpandedComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const fetchComments = async (postId: string) => {
    if (commentsLoading[postId]) return;

    try {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      const comments = await getPostComments(postId); // Changed
      setCommentsData((prev) => ({ ...prev, [postId]: comments || [] }));
    } catch (err) {
      console.error('Fetch comments error:', err);
      Toast.show('Failed to load comments', { type: 'warning' });
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleCommentTextChange = (postId: string, text: string) => {
    setCommentText((prev) => ({ ...prev, [postId]: text }));
  };

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    try {
      Keyboard.dismiss();

      const newComment = await commentOnPost(
        postId,
        text,
        replyingTo?.postId === postId ? replyingTo.commentId : null
      ); // Changed

      setCommentsData((prev) => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])],
      }));

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments_count: (p.comments_count || 0) + 1,
                comment_count: (p.comment_count || 0) + 1,
              }
            : p
        )
      );

      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);

      Toast.show('Comment posted!', { type: 'success' });
    } catch (err) {
      console.error('Add comment error:', err);
      Toast.show('Failed to post comment', { type: 'warning' });
    }
  };

  const handleReplyTo = (postId: string, commentId: string, username: string) => {
    setReplyingTo({ postId, commentId, username });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // State for expanded comments
  const [expandedCommentTexts, setExpandedCommentTexts] = useState<Record<string, boolean>>({});
  const COMMENT_TRUNCATE_LENGTH = 100;

  const renderComment = (comment: any) => {
    const commentId = comment.id;
    const isCommentExpanded = expandedCommentTexts[commentId];
    const shouldTruncateComment =
      comment.content && comment.content.length > COMMENT_TRUNCATE_LENGTH;
    const displayedCommentContent =
      shouldTruncateComment && !isCommentExpanded
        ? `${comment.content.slice(0, COMMENT_TRUNCATE_LENGTH)}...`
        : comment.content;

    return (
      <View key={comment.id} className="mb-3">
        <View className="flex-row">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700">
            <Text className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">
              {getInitials(comment.first_name, comment.last_name)}
            </Text>
          </View>
          <View className="ml-2 flex-1">
            <Text className="text-sm">
              <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                {capitalize(comment.first_name)} {capitalize(comment.last_name)}{' '}
              </Text>
              <Text className="text-text-primary-light dark:text-text-primary-dark">
                {displayedCommentContent}
              </Text>
              {shouldTruncateComment && (
                <Text
                  onPress={() =>
                    setExpandedCommentTexts((prev) => ({
                      ...prev,
                      [commentId]: !prev[commentId],
                    }))
                  }
                  className="font-medium text-text-secondary-light dark:text-text-secondary-dark">
                  {' '}
                  {isCommentExpanded ? 'less' : 'more'}
                </Text>
              )}
            </Text>
            <View className="mt-1 flex-row items-center space-x-3">
              <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                {formatTime(comment.created_at)}{' '}
              </Text>
              <TouchableOpacity
                onPress={() => handleReplyTo(comment.post_id, comment.id, comment.author_name)}>
                <Text className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /* ---------------- UI ---------------- */
  if (loading && !posts.length) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDark ? '#fff' : '#000'}
        />
      }
      /* ---------------- PAGINATION ---------------- */
      onEndReached={() => {
        if (!onEndReachedCalledDuringMomentum.current) {
          fetchPosts(true);
          onEndReachedCalledDuringMomentum.current = true;
        }
      }}
      onMomentumScrollBegin={() => {
        onEndReachedCalledDuringMomentum.current = false;
      }}
      onEndReachedThreshold={0.4}
      /* ---------------- VIDEO VISIBILITY CONTROL ---------------- */
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 70,
        minimumViewTime: 300,
      }}
      /* ---------------- PERFORMANCE OPTIMIZATIONS ---------------- */
      removeClippedSubviews
      windowSize={5}
      maxToRenderPerBatch={5}
      initialNumToRender={3}
      updateCellsBatchingPeriod={50}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator className="my-4" color="#2196F3" /> : null
      }
      renderItem={({ item: post }) => (
        <PostCard
          post={post}
          currentUser={user}
          author={{
            id: post.author_id,
            first_name: post.first_name,
            last_name: post.last_name,
            avatar_url: post.avatar_url,
          }}
          isDark={isDark}
          /* 🔑 SINGLE SOURCE OF TRUTH FOR VIDEO */
          isActiveVideo={activeVideoId === post.id}
          isMutedGlobal={isMutedGlobal}
          setIsMutedGlobal={setIsMutedGlobal}
          likeAnimation={likeAnimations[post.id]}
          expanded={!!expandedComments[post.id]}
          comments={commentsData[post.id] || []}
          commentsLoading={!!commentsLoading[post.id]}
          commentText={commentText[post.id] || ''}
          replyingTo={replyingTo?.postId === post.id ? replyingTo : null}
          onLike={() => toggleLike(post.id, post.is_liked)}
          onToggleComments={() => toggleComments(post.id)}
          onCommentTextChange={(text) => handleCommentTextChange(post.id, text)}
          onAddComment={() => handleAddComment(post.id)}
          onCancelReply={handleCancelReply}
          onReplyTo={(commentId, username) => handleReplyTo(post.id, commentId, username)}
          renderComment={renderComment}
          formatTime={formatTime}
        />
      )}
      ListEmptyComponent={
        <View className="items-center py-20">
          <MaterialIcons name="group" size={64} color={isDark ? '#555' : '#ccc'} />
          <Text className="mt-4 text-text-secondary-light dark:text-text-secondary-dark">
            No leader posts yet
          </Text>
        </View>
      }
    />
  );
}
