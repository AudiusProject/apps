import { useCallback, useEffect, useRef } from 'react'

import type { CommentOrReply } from '@audius/common/api'
import { useTrack, useUser, useUserComments } from '@audius/common/api'
import { type ID } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal
} from '@gorhom/bottom-sheet'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  useTheme,
  Text,
  Flex,
  Divider,
  IconHeart,
  TextLink
} from '@audius/harmony-native'
import { LoadingSpinner } from 'app/harmony-native/components/LoadingSpinner/LoadingSpinner'
import { useNavigation } from 'app/hooks/useNavigation'

import { ProfilePicture } from '../core/ProfilePicture'
import { UserLink } from '../user-link'

import { CommentSkeleton } from './CommentSkeleton'
import { CommentText } from './CommentText'
import { NoComments } from './NoComments'
import {
  RecentUserCommentsDrawerProvider,
  useRecentUserCommentsDrawer
} from './RecentUserCommentsDrawerContext'
import { Timestamp } from './Timestamp'
import { COMMENT_DRAWER_BORDER_RADIUS } from './constants'
import { useGestureEventsHandlers } from './useGestureEventHandlers'
import { useScrollEventsHandlers } from './useScrollEventHandlers'

const messages = {
  title: 'Recent Comments',
  by: ' by ',
  view: 'View Track'
}

const CommentItem = ({ comment }: { comment: CommentOrReply }) => {
  const { userId, onClose, navigation } = useRecentUserCommentsDrawer()
  const { data: track, isLoading: isTrackLoading } = useTrack(comment?.entityId)
  const { data: artist, isLoading: isArtistLoading } = useUser(track?.owner_id)

  const handlePressView = useCallback(() => {
    if (track?.track_id) {
      // @ts-ignore (bad types on useNavigation)
      navigation.push('Track', { trackId: track.track_id })
    }
    onClose()
  }, [navigation, track?.track_id, onClose])

  if (isTrackLoading || isArtistLoading) {
    return <CommentSkeleton />
  }

  if (!comment || !track || !artist) {
    return null
  }

  const { isEdited } = comment

  return (
    <Animated.View style={{ width: '100%' }} entering={FadeIn.duration(500)}>
      <Flex row gap='s' ph='l' pv='m' alignItems='flex-start' w='100%'>
        <ProfilePicture
          size='medium'
          style={{ flexShrink: 0 }}
          userId={userId}
          borderWidth='thin'
        />
        <Flex gap='s' flex={1}>
          <Flex flex={1}>
            <Flex gap='xs'>
              {/* Track / artist name */}
              <Flex row w='100%' style={{ flexShrink: 1 }}>
                <Text
                  style={{ flexShrink: 3 }}
                  variant='body'
                  size='s'
                  color='subdued'
                  ellipses
                  lineHeight='single'
                  numberOfLines={1}
                >
                  {track.title}
                </Text>
                <Text
                  variant='body'
                  lineHeight='single'
                  size='s'
                  color='subdued'
                  flexShrink={0}
                >
                  {messages.by}
                </Text>
                <Text
                  style={{ flexShrink: 1 }}
                  variant='body'
                  lineHeight='single'
                  size='s'
                  color='subdued'
                  ellipses
                  numberOfLines={1}
                >
                  {artist.name}
                </Text>
              </Flex>
              {/* Commenter name, badges, date */}
              <Flex row gap='s' alignItems='center'>
                <UserLink strength='strong' userId={userId} />
                <Timestamp time={dayjs.utc(comment.createdAt).toDate()} />
              </Flex>
            </Flex>
            <CommentText
              isEdited={isEdited}
              commentId={comment.id}
              mentions={comment.mentions ?? []}
              renderTimestamps={false}
              trackDuration={track.duration}
              navigation={navigation}
              onCloseDrawer={onClose}
            >
              {comment.message}
            </CommentText>
          </Flex>
          {/* Reactions and view button */}
          <Flex row gap='l' alignItems='center'>
            {comment.reactCount > 0 && (
              <Flex row gap='xs' alignItems='center'>
                <IconHeart size='l' color='subdued' />
                <Text variant='body' size='s'>
                  {comment.reactCount}
                </Text>
              </Flex>
            )}
            <TextLink variant='subdued' size='s' onPress={handlePressView}>
              {messages.view}
            </TextLink>
          </Flex>
        </Flex>
      </Flex>
    </Animated.View>
  )
}

const RecentUserCommentsDrawerContent = () => {
  const { userId } = useRecentUserCommentsDrawer()
  const {
    data: comments,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useUserComments({ userId })

  const handleEndReached = useCallback(() => {
    if (hasNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage])

  // Loading state
  if (isPending) {
    return (
      <Flex pv='m'>
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </Flex>
    )
  }

  // Empty state
  if (!comments || !comments.length) {
    return (
      <Flex p='l'>
        <NoComments />
      </Flex>
    )
  }

  return (
    <BottomSheetFlatList
      data={comments}
      keyExtractor={(comment) => comment.id.toString()}
      ListHeaderComponent={<Box h='l' />}
      ListFooterComponent={
        <>
          {isFetchingNextPage ? (
            <Flex row justifyContent='center' mb='xl' w='100%'>
              <LoadingSpinner style={{ width: 20, height: 20 }} />
            </Flex>
          ) : null}

          <Box h='l' />
        </>
      }
      enableFooterMarginAdjustment
      scrollEventsHandlersHook={useScrollEventsHandlers}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      renderItem={({ item: comment }) => <CommentItem comment={comment} />}
    />
  )
}

export type RecentUserCommentsDrawerProps = {
  userId: ID
  onClose: () => void
}

export const RecentUserCommentsDrawer = ({
  userId,
  onClose
}: RecentUserCommentsDrawerProps) => {
  const { color } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const bottomSheetModalRef = useRef<BottomSheetModal>(null)
  useEffect(() => {
    if (bottomSheetModalRef.current) {
      bottomSheetModalRef.current.present()
    }
  }, [bottomSheetModalRef])

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['66%', '100%']}
      topInset={insets.top}
      style={{
        borderTopRightRadius: COMMENT_DRAWER_BORDER_RADIUS,
        borderTopLeftRadius: COMMENT_DRAWER_BORDER_RADIUS,
        overflow: 'hidden'
      }}
      backgroundStyle={{ backgroundColor: color.background.white }}
      handleIndicatorStyle={{ backgroundColor: color.neutral.n200 }}
      gestureEventsHandlersHook={useGestureEventsHandlers}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior='close'
        />
      )}
      onDismiss={onClose}
    >
      <RecentUserCommentsDrawerProvider
        userId={userId}
        onClose={onClose}
        navigation={navigation}
      >
        <Flex ph='l' pb='m'>
          <Text variant='title' size='m' strength='weak'>
            {messages.title}
          </Text>
        </Flex>
        <Divider orientation='horizontal' />
        <RecentUserCommentsDrawerContent />
      </RecentUserCommentsDrawerProvider>
    </BottomSheetModal>
  )
}
