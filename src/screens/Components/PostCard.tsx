import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  TextInput,
  Pressable,
  Dimensions,
  Modal,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { capitalize, getInitials } from '@/src/utils/getInitials';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.7;

/* ================= TYPES ================= */

interface PostCardProps {
  post: any;
  currentUser: {
    id: string;
    first_name: string;
    last_name: string;
  };
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  isDark: boolean;
  isActiveVideo: boolean;
  isMutedGlobal: boolean;
  setIsMutedGlobal: (v: boolean) => void;
  likeAnimation?: Animated.Value;
  expanded: boolean;
  comments: any[];
  commentsLoading: boolean;
  commentText: string;
  replyingTo: any | null;
  onLike: () => void;
  onToggleComments: () => void;
  onCommentTextChange: (t: string) => void;
  onAddComment: () => void;
  onCancelReply: () => void;
  onReplyTo: (commentId: string, name: string) => void;
  renderComment: (comment: any) => JSX.Element;
  formatTime: (date: string) => string;
}

/* ================= POST WITH IMAGE ================= */

function PostWithImage({
  post,
  currentUser,
  author,
  isDark,
  likeAnimation,
  onLike,
  onToggleComments,
  expanded,
  comments,
  commentsLoading,
  commentText,
  replyingTo,
  onCommentTextChange,
  onAddComment,
  onCancelReply,
  onReplyTo,
  renderComment,
  formatTime,
}: PostCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const TRUNCATE_LENGTH = 90;
  const MAX_HEIGHT = 600;

  const shouldTruncate = post.content && post.content.length > TRUNCATE_LENGTH;
  const displayedContent =
    shouldTruncate && !isContentExpanded
      ? `${post.content.slice(0, TRUNCATE_LENGTH)}...`
      : post.content;

  const handleDoubleTap = () => {
    if (!post.is_liked) {
      onLike();
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  useEffect(() => {
    if (post.media_url) {
      Image.getSize(
        post.media_url,
        (width, height) => {
          setImageAspectRatio(width / height);
        },
        (error) => {
          console.log('Error getting image size:', error);
          setImageAspectRatio(1);
        }
      );
    }
  }, [post.media_url]);

  const getMediaHeight = () => {
    if (!imageAspectRatio) return SCREEN_WIDTH;
    const calculatedHeight = SCREEN_WIDTH / imageAspectRatio;
    return Math.min(calculatedHeight, MAX_HEIGHT);
  };

  return (
    <View className="mb-2 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <PostHeader
        author={author}
        isDark={isDark}
        formatTime={formatTime}
        createdAt={post.created_at}
      />

      {/* Image - no fullscreen, double tap to like */}
      {post.media_url && (
        <Pressable onLongPress={handleDoubleTap}>
          <View className="relative">
            <Image
              source={{ uri: post.media_url }}
              style={{
                width: '100%',
                height: imageAspectRatio ? getMediaHeight() : SCREEN_WIDTH,
              }}
              resizeMode="cover"
            />

            {/* Double-tap heart animation */}
            {likeAnimation && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: [{ translateX: -50 }, { translateY: -50 }, { scale: likeAnimation }],
                  opacity: likeAnimation.interpolate({
                    inputRange: [0, 1, 1.5],
                    outputRange: [0, 1, 0],
                  }),
                }}>
                <Feather name="heart" size={100} color="#ffffff" fill="#ffffff" />
              </Animated.View>
            )}
          </View>
        </Pressable>
      )}

      {/* Action Bar */}
      <ActionBar
        post={post}
        isDark={isDark}
        isBookmarked={isBookmarked}
        setIsBookmarked={setIsBookmarked}
        scaleAnim={scaleAnim}
        onLike={onLike}
        onToggleComments={onToggleComments}
      />

      {/* Content & Comments */}
      <PostContent
        post={post}
        author={author}
        isDark={isDark}
        displayedContent={displayedContent}
        shouldTruncate={shouldTruncate}
        isContentExpanded={isContentExpanded}
        setIsContentExpanded={setIsContentExpanded}
        expanded={expanded}
        comments={comments}
        commentsLoading={commentsLoading}
        commentText={commentText}
        replyingTo={replyingTo}
        onToggleComments={onToggleComments}
        onCommentTextChange={onCommentTextChange}
        onAddComment={onAddComment}
        onCancelReply={onCancelReply}
        renderComment={renderComment}
      />
    </View>
  );
}
/* ================= POST WITH VIDEO ================= */

function PostWithVideo({
  post,
  author,
  isDark,
  isActiveVideo,
  isMutedGlobal,
  setIsMutedGlobal,
  likeAnimation,
  onLike,
  onToggleComments,
  expanded,
  comments,
  commentsLoading,
  commentText,
  replyingTo,
  onCommentTextChange,
  onAddComment,
  onCancelReply,
  renderComment,
  formatTime,
}: PostCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <View className="mb-2 bg-background-light dark:bg-background-dark">
      <PostHeader
        author={author}
        isDark={isDark}
        formatTime={formatTime}
        createdAt={post.created_at}
      />

      {/* VIDEO - plays inline only, no fullscreen */}
      <VideoComponent
        uri={post.media_url}
        isActive={isActiveVideo}
        isMutedGlobal={isMutedGlobal}
        setIsMutedGlobal={setIsMutedGlobal}
        height={VIDEO_HEIGHT}
      />

      <ActionBar
        post={post}
        isDark={isDark}
        onLike={onLike}
        onToggleComments={onToggleComments}
        scaleAnim={scaleAnim}
      />

      <PostContent
        post={post}
        author={author}
        isDark={isDark}
        expanded={expanded}
        comments={comments}
        commentsLoading={commentsLoading}
        commentText={commentText}
        replyingTo={replyingTo}
        onToggleComments={onToggleComments}
        onCommentTextChange={onCommentTextChange}
        onAddComment={onAddComment}
        onCancelReply={onCancelReply}
        renderComment={renderComment}
      />
    </View>
  );
} /* ================= SHARED COMPONENTS ================= */

function PostHeader({ author, isDark, formatTime, createdAt }: any) {
  return (
    <View className="flex-row items-center justify-between px-3 py-2.5">
      <View className="flex-1 flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] p-[2px]">
          <View className="h-[32px] w-[32px] items-center justify-center rounded-full bg-background-light dark:bg-background-dark">
            {author.avatar_url ? (
              <Image
                source={{ uri: author.avatar_url }}
                className="h-[30px] w-[30px] rounded-full"
              />
            ) : (
              <View className="h-[32px] w-[32px] items-center justify-center rounded-full bg-blue-500">
                <Text className="text-xs font-black text-white">
                  {getInitials(author?.first_name, author?.last_name)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="ml-2.5 flex-1">
          <Text className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
            {capitalize(author.first_name)} {capitalize(author.last_name)}
          </Text>
          <Text className="text-[10px] uppercase text-text-secondary-light dark:text-text-secondary-dark">
            {formatTime(createdAt)}
          </Text>
        </View>
      </View>

      <TouchableOpacity className="p-1">
        <Feather name="more-horizontal" size={20} color={isDark ? '#f8fafc' : '#0f172a'} />
      </TouchableOpacity>
    </View>
  );
}

function ActionBar({
  post,
  isDark,
  isBookmarked,
  setIsBookmarked,
  scaleAnim = new Animated.Value(1),
  onLike,
  onToggleComments,
}: any) {
  return (
    <View className="px-3 pb-1 pt-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-4">
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={onLike} className="p-1">
              <MaterialIcons
                name={post.is_liked ? 'favorite' : 'favorite-border'}
                size={27}
                color={post.is_liked ? '#ed4956' : isDark ? '#f8fafc' : '#0f172a'}
              />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={onToggleComments} className="p-1">
            <Feather
              name="message-circle"
              size={26}
              color={isDark ? '#f8fafc' : '#0f172a'}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <TouchableOpacity className="p-1">
            <Feather name="send" size={26} color={isDark ? '#f8fafc' : '#0f172a'} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {setIsBookmarked && (
          <TouchableOpacity onPress={() => setIsBookmarked(!isBookmarked)} className="p-1">
            <Feather
              name="bookmark"
              size={26}
              color={isDark ? '#f8fafc' : '#0f172a'}
              fill={isBookmarked ? (isDark ? '#f8fafc' : '#0f172a') : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PostContent({
  post,
  author,
  isDark,
  displayedContent,
  shouldTruncate,
  isContentExpanded,
  setIsContentExpanded,
  expanded,
  comments,
  commentsLoading,
  commentText,
  replyingTo,
  onToggleComments,
  onCommentTextChange,
  onAddComment,
  onCancelReply,
  renderComment,
}: any) {
  return (
    <View className="px-3">
      {/* Likes Count */}
      {(post.like_count > 0 || post.likes_count > 0) && (
        <Text className="mt-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
          {(post.like_count || post.likes_count || 0).toLocaleString()}{' '}
          {(post.like_count || post.likes_count) === 1 ? 'like' : 'likes'}
        </Text>
      )}

      {/* Caption */}
      {post.content && (
        <View className="mt-1">
          <Text className="text-sm leading-[18px] text-text-primary-light dark:text-text-primary-dark">
            <Text className="font-semibold">
              {capitalize(author.first_name)} {capitalize(author.last_name)}{' '}
            </Text>
            <Text>{displayedContent}</Text>
            {shouldTruncate && (
              <Text
                onPress={() => setIsContentExpanded(!isContentExpanded)}
                className="font-medium text-text-secondary-light dark:text-text-secondary-dark">
                {' '}
                {isContentExpanded ? 'less' : 'more'}
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* View Comments */}
      {(post.comment_count > 0 || post.comments_count > 0) && !expanded && (
        <TouchableOpacity onPress={onToggleComments} className="mt-1">
          <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            View all {post.comment_count || post.comments_count}{' '}
            {(post.comment_count || post.comments_count) === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Comments Section */}
      {expanded && (
        <View className="mt-3 border-t border-border-light pt-3 dark:border-border-dark">
          {commentsLoading ? (
            <ActivityIndicator size="small" color="#0095f6" />
          ) : (
            <View>{comments.map(renderComment)}</View>
          )}

          {replyingTo && (
            <View className="my-2 flex-row items-center justify-between rounded-lg bg-surfaceHighlight-light p-2 dark:bg-surfaceHighlight-dark">
              <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                Replying to{' '}
                <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                  {replyingTo.name}
                </Text>
              </Text>
              <TouchableOpacity onPress={onCancelReply}>
                <Feather name="x" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
          )}

          <View className="mt-2 flex-row items-center border-t border-border-light pt-3 dark:border-border-dark">
            <TextInput
              placeholder="Add a comment..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={commentText}
              onChangeText={onCommentTextChange}
              className="flex-1 py-2 text-sm text-text-primary-light dark:text-text-primary-dark"
              multiline
            />
            {commentText.trim().length > 0 && (
              <TouchableOpacity onPress={onAddComment}>
                <Text className="ml-2 text-sm font-semibold text-[#0095f6]">Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
/* ================= VIDEO COMPONENT ================= */

function VideoComponent({
  uri,
  isActive,
  isMutedGlobal,
  setIsMutedGlobal,
  height = VIDEO_HEIGHT,
}: {
  uri: string;
  isActive: boolean;
  isMutedGlobal: boolean;
  setIsMutedGlobal: (v: boolean) => void;
  height?: number;
}) {
  const videoRef = useRef<Video>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  const containerHeight = Math.min(SCREEN_WIDTH / aspectRatio, SCREEN_HEIGHT * 0.7);

  // 🔒 SAFETY: stop audio on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.stopAsync?.();
    };
  }, []);

  return (
    <View style={{ width: SCREEN_WIDTH, height: containerHeight, backgroundColor: '#000' }}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={isActive}
        isMuted={isMutedGlobal}
        isLooping
        useNativeControls={false}
        onLoad={(status: any) => {
          if (status?.naturalSize?.width && status?.naturalSize?.height) {
            setAspectRatio(status.naturalSize.width / status.naturalSize.height);
          }
          setIsLoaded(true);
        }}
      />

      {!isLoaded && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* MUTE TOGGLE */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          setIsMutedGlobal(!isMutedGlobal);
        }}
        className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2">
        <Feather name={isMutedGlobal ? 'volume-x' : 'volume-2'} size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
/* ================= MAIN ROUTER ================= */

export default function PostCard(props: PostCardProps) {
  if (props.post.media_type === 'video') {
    return <PostWithVideo {...props} />;
  }
  return <PostWithImage {...props} />;
}
