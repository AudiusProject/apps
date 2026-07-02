import type { RefObject } from 'react'
import React, { useCallback, useMemo, useRef, useState } from 'react'

import type { SearchCategory } from '@audius/common/api'
import {
  useCurrentUserId,
  useFollowers,
  useSearchUserResults,
  useTrack
} from '@audius/common/api'
import type { ReplyingAndEditingState } from '@audius/common/context'
import {
  CommentSectionProvider,
  useCurrentCommentSection
} from '@audius/common/context'
import type { Comment, ID, UserMetadata } from '@audius/common/models'
import type {
  BottomSheetFlatListMethods,
  BottomSheetFooterProps
} from '@gorhom/bottom-sheet'
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetFooter
} from '@gorhom/bottom-sheet'
import type { ParamListBase } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { TouchableOpacityProps } from 'react-native'
import { TouchableOpacity } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box, Divider, Flex, Text, useTheme } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { UserBadges } from 'app/components/user-badges'
import { LoadingSpinner } from 'app/harmony-native/components/LoadingSpinner/LoadingSpinner'

import { useCommentDrawer } from './CommentDrawerContext'
import { CommentDrawerForm } from './CommentDrawerForm'
import { CommentDrawerHeader } from './CommentDrawerHeader'
import { CommentSkeleton } from './CommentSkeleton'
import { CommentThread } from './CommentThread'
import { NoComments } from './NoComments'
import { COMMENT_DRAWER_BORDER_RADIUS } from './constants'
import { useGestureEventsHandlers } from './useGestureEventHandlers'
import { useScrollEventsHandlers } from './useScrollEventHandlers'

type UserListItemProps = {
  user: UserMetadata
} & Pick<TouchableOpacityProps, 'onPress'>

const UserListItem = (props: UserListItemProps) => {
  const { user, onPress } = props

  return (
    <TouchableOpacity onPress={onPress}>
      <Flex direction='row' p='s' gap='s' borderRadius='s'>
        <ProfilePicture userId={user.user_id} size='medium' />
        <Flex direction='column'>
          <Text variant='body' size='s'>
            {user.name}
            <UserBadges userId={user.user_id} badgeSize='xs' />
          </Text>
          <Text variant='body' size='xs' color='default'>
            @{user.handle}
          </Text>
        </Flex>
      </Flex>
    </TouchableOpacity>
  )
}

type CommentDrawerAutocompleteContentProps = {
  query: string
  onSelect: (user: UserMetadata) => void
}

const CommentDrawerAutocompleteContent = ({
  query,
  onSelect
}: CommentDrawerAutocompleteContentProps) => {
  const { data: currentUserId } = useCurrentUserId()

  const params = {
    query,
    category: 'users' as SearchCategory,
    currentUserId,
    limit: 10,
    offset: 0
  }

  const { data: searchData, isLoading: searchLoading } =
    useSearchUserResults(params)
  const { users: followersData, isPending: followerDataPending } = useFollowers(
    {
      pageSize: 6,
      userId: currentUserId
    }
  )
  const userList = query !== '' ? searchData : followersData
  const isUserListPending = query !== '' ? searchLoading : followerDataPending

  // Loading state
  if (isUserListPending) {
    return (
      <Flex p='l' alignItems='center'>
        <LoadingSpinner style={{ height: 24 }} />
      </Flex>
    )
  }

  // Empty state
  if (!userList || !userList.length) {
    return (
      <Flex p='l'>
        <Text>No User Results</Text>
      </Flex>
    )
  }

  return (
    <BottomSheetFlatList
      data={userList}
      keyExtractor={({ user_id }) => user_id.toString()}
      ListHeaderComponent={<Box h='l' />}
      enableFooterMarginAdjustment
      scrollEventsHandlersHook={useScrollEventsHandlers}
      keyboardShouldPersistTaps='handled'
      renderItem={({ item }) => (
        <Box ph='l'>
          <UserListItem
            user={item as UserMetadata}
            onPress={() => onSelect(item as UserMetadata)}
          />
        </Box>
      )}
    />
  )
}

const CommentDrawerContent = (props: {
  commentListRef: RefObject<BottomSheetFlatListMethods | null>
  highlightedComment?: Comment | null
}) => {
  const { commentListRef, highlightedComment } = props
  const {
    commentIds: allCommentIds,
    commentSectionLoading: isLoading,
    loadMorePages,
    isLoadingMorePages
  } = useCurrentCommentSection()

  const highlightedCommentId =
    highlightedComment?.parentCommentId ?? highlightedComment?.id ?? null

  const commentIds = useMemo(() => {
    if (highlightedCommentId === null) return allCommentIds

    return [
      highlightedCommentId,
      ...allCommentIds.filter((id) => id !== highlightedCommentId)
    ]
  }, [highlightedCommentId, allCommentIds])

  // Loading state
  if (isLoading) {
    return (
      <>
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </>
    )
  }

  // Always render BottomSheetFlatList (with ListEmptyComponent for the empty
  // state) so the bottom sheet can handle keyboard avoidance and touch
  // propagation correctly. Swapping in a plain <Flex> when there are zero
  // comments breaks the footer composer's send button on a 0-comment track.
  return (
    <BottomSheetFlatList
      ref={commentListRef}
      data={commentIds}
      keyExtractor={(id) => id.toString()}
      ListHeaderComponent={<Box h='l' />}
      ListEmptyComponent={
        <Flex p='l'>
          <NoComments />
        </Flex>
      }
      ListFooterComponent={
        <>
          {isLoadingMorePages ? (
            <Flex row justifyContent='center' mb='xl' w='100%'>
              <LoadingSpinner style={{ width: 20, height: 20 }} />
            </Flex>
          ) : null}

          <Box h='l' />
        </>
      }
      enableFooterMarginAdjustment
      scrollEventsHandlersHook={useScrollEventsHandlers}
      onEndReached={loadMorePages}
      onEndReachedThreshold={0.3}
      renderItem={({ item: id }) => (
        <CommentThread commentId={id} highlightedComment={highlightedComment} />
      )}
    />
  )
}

export type CommentDrawerData = {
  entityId: number
  navigation: NativeStackNavigationProp<ParamListBase>
  autoFocusInput?: boolean
  // Source tag for the new playback queue when the user plays the track from
  // the comment drawer. Kept optional; defaults to 'comments' downstream.
  playbackSource?: string
  highlightedComment?: Comment | null
}

type CommentDrawerProps = {
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>
  handleClose: (trackId: ID) => void
} & CommentDrawerData

export const CommentDrawer = (props: CommentDrawerProps) => {
  const {
    entityId,
    navigation,
    bottomSheetModalRef,
    handleClose,
    autoFocusInput,
    playbackSource,
    highlightedComment
  } = props
  const { color } = useTheme()
  const insets = useSafeAreaInsets()
  const commentListRef = useRef<BottomSheetFlatListMethods>(null)

  // `closeAndExitNowPlaying` is read here (inside CommentDrawerContext.Provider)
  // and threaded into CommentSectionContext so that CommentBlock can access it
  // without calling useCommentDrawer() directly.  We must NOT call
  // useCommentDrawer() from inside the BottomSheetModal portal content because
  // @gorhom/portal renders portal children at a PortalHost that is a *sibling*
  // of the CommentDrawerContext.Provider in the tree, so the context is
  // unreachable from there — causing a 100%-reproducible crash the moment any
  // comment renders.
  const { closeAndExitNowPlaying } = useCommentDrawer()

  // When the drawer is opened from a lineup tile (e.g. the feed), the full
  // track may not yet be in the query cache. CommentSectionProvider returns
  // null until the track loads, which would render an empty bottom sheet, so
  // fetch the track here and show a loading state instead of a blank drawer.
  const { data: track } = useTrack(entityId)

  const [onAutocomplete, setOnAutocomplete] = useState<
    (user: UserMetadata) => void
  >(() => {})
  const [autoCompleteActive, setAutoCompleteActive] = useState(false)
  const [acText, setAcText] = useState('')
  const [replyingAndEditingState, setReplyingAndEditingState] =
    useState<ReplyingAndEditingState>()
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)

  const setAutocompleteHandler = useCallback(
    (autocompleteHandler: (user: UserMetadata) => void) => {
      setOnAutocomplete(() => autocompleteHandler)
    },
    []
  )

  const onAutoCompleteChange = useCallback((active: boolean, text: string) => {
    setAcText(text)
    setAutoCompleteActive(active)
  }, [])

  const gesture = Gesture.Pan()

  const renderFooterComponent = useCallback(
    (props: BottomSheetFooterProps) => (
      <GestureDetector gesture={gesture}>
        <BottomSheetFooter {...props} bottomInset={insets.bottom}>
          <Divider orientation='horizontal' />
          <CommentSectionProvider
            entityId={entityId}
            replyingAndEditingState={replyingAndEditingState}
            setReplyingAndEditingState={setReplyingAndEditingState}
            playbackSource={playbackSource}
          >
            <CommentDrawerForm
              commentListRef={commentListRef}
              onAutocompleteChange={onAutoCompleteChange}
              setAutocompleteHandler={setAutocompleteHandler}
              autoFocus={autoFocusInput}
            />
          </CommentSectionProvider>
        </BottomSheetFooter>
      </GestureDetector>
    ),
    // intentionally excluding insets.bottom because it causes a rerender
    // when the keyboard is opened on android, causing the keyboard to close
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      entityId,
      onAutoCompleteChange,
      setAutocompleteHandler,
      replyingAndEditingState
    ]
  )

  const handleCloseDrawer = useCallback(() => {
    handleClose(entityId)
  }, [entityId, handleClose])

  const handleSheetChanges = useCallback(
    (index: number) => {
      setIsDrawerVisible(index >= 0)
      // When the sheet first opens (index >= 0), snap to index 1 (85%) if it's at index 0 (50%)
      if (index === 0 && bottomSheetModalRef.current) {
        // Use a small delay to ensure the modal is fully presented
        setTimeout(() => {
          bottomSheetModalRef.current?.snapToIndex(1)
        }, 50)
      }
    },
    [bottomSheetModalRef]
  )

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={['50%', '85%', '95%']}
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
        footerComponent={renderFooterComponent}
        onDismiss={handleCloseDrawer}
        onChange={handleSheetChanges}
        keyboardBlurBehavior='restore'
        android_keyboardInputMode='adjustResize'
      >
        {track ? (
          <CommentSectionProvider
            entityId={entityId}
            replyingAndEditingState={replyingAndEditingState}
            setReplyingAndEditingState={setReplyingAndEditingState}
            navigation={navigation}
            closeDrawer={handleCloseDrawer}
            closeAndExitNowPlaying={closeAndExitNowPlaying}
            playbackSource={playbackSource}
          >
            <CommentDrawerHeader minimal={autoCompleteActive} />
            <Divider orientation='horizontal' />
            {autoCompleteActive ? (
              <CommentDrawerAutocompleteContent
                query={acText}
                onSelect={onAutocomplete}
              />
            ) : (
              <CommentDrawerContent
                commentListRef={commentListRef}
                highlightedComment={highlightedComment}
              />
            )}
          </CommentSectionProvider>
        ) : (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        )}
      </BottomSheetModal>
      {isDrawerVisible ? (
        <Box
          style={{
            backgroundColor: color.background.white,
            position: 'absolute',
            bottom: 0,
            width: '100%',
            zIndex: 5,
            height: insets.bottom
          }}
        />
      ) : null}
    </>
  )
}
