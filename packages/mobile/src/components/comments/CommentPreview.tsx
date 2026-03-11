import { useCallback, useEffect } from 'react'

import { useComment } from '@audius/common/api'
import {
  CommentSectionProvider,
  useCurrentCommentSection,
  usePostComment
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import type { ID } from '@audius/common/models'
import { playerSelectors, trackPageSelectors } from '@audius/common/store'
import type { CommentMention } from '@audius/sdk'
import { OptionalHashId } from '@audius/sdk'
import { TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import TrackPlayer from 'react-native-track-player'
import { useSelector } from 'react-redux'
import { tracksActions } from '~/store/pages/track/lineup/actions'

import {
  Flex,
  IconCaretRight,
  IconMessage,
  Paper,
  PlainButton,
  Text
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'

import Skeleton from '../skeleton'

import { CommentBlock } from './CommentBlock'
import { useCommentDrawer } from './CommentDrawerContext'
import { CommentForm } from './CommentForm'

const { getLineup } = trackPageSelectors

type CommentPreviewHeaderProps = {
  openCommentDrawer: () => void
}

const CommentPreviewHeader = (props: CommentPreviewHeaderProps) => {
  const { openCommentDrawer } = props
  const {
    commentSectionLoading: isLoading,
    commentIds,
    commentCount
  } = useCurrentCommentSection()
  const handlePressViewAll = () => {
    openCommentDrawer()
  }

  const isShowingComments = !isLoading && commentIds?.length

  return (
    <Flex
      direction='row'
      w='100%'
      justifyContent='space-between'
      alignItems='center'
    >
      <Flex row gap='s'>
        <IconMessage color='default' />
        <Text variant='title' size='l'>
          Comments
          {isShowingComments ? (
            <Text color='subdued'>&nbsp;({commentCount})</Text>
          ) : null}
        </Text>
      </Flex>
      {isShowingComments ? (
        <PlainButton
          onPress={handlePressViewAll}
          iconRight={IconCaretRight}
          variant='subdued'
        >
          {messages.viewAll}
        </PlainButton>
      ) : null}
    </Flex>
  )
}

type CommentPreviewContentProps = {
  openCommentDrawer: (args?: { autoFocusInput?: boolean }) => void
  highlightedCommentId: ID | null
}

const CommentPreviewContent = (props: CommentPreviewContentProps) => {
  const { openCommentDrawer, highlightedCommentId } = props
  const {
    commentSectionLoading: isLoading,
    commentIds,
    isEntityOwner,
    entityId
  } = useCurrentCommentSection()
  const [postComment] = usePostComment()
  const playerTrackId = useSelector(playerSelectors.getTrackId)

  const handlePress = useCallback(() => {
    openCommentDrawer()
  }, [openCommentDrawer])

  const handleFormPress = useCallback(() => {
    openCommentDrawer({ autoFocusInput: true })
  }, [openCommentDrawer])

  const handleSubmitPreview = useCallback(
    async (message: string, mentions?: CommentMention[]) => {
      const { position: currentPosition } = await TrackPlayer.getProgress()
      const trackTimestampS =
        playerTrackId !== null &&
        currentPosition !== undefined &&
        playerTrackId === entityId
          ? Math.floor(currentPosition)
          : undefined
      postComment(message, undefined, trackTimestampS, mentions)
    },
    [postComment, entityId, playerTrackId]
  )

  // Loading state
  if (isLoading) {
    return (
      <Flex direction='row' gap='s' alignItems='center'>
        <Skeleton width={40} height={40} style={{ borderRadius: 100 }} />
        <Flex gap='s'>
          <Skeleton height={20} width={240} />
          <Skeleton height={20} width={160} />
        </Flex>
      </Flex>
    )
  }

  // Empty state
  if (!commentIds || !commentIds.length) {
    return (
      <Flex gap='m'>
        <Text variant='body'>
          {isEntityOwner
            ? messages.noCommentsPreviewOwner
            : messages.noCommentsPreview}
        </Text>
        <TouchableWithoutFeedback onPress={handleFormPress}>
          <View>
            <View>
              <CommentForm isPreview onSubmit={handleSubmitPreview} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Flex>
    )
  }

  return (
    <TouchableOpacity onPress={handlePress}>
      <CommentBlock
        commentId={highlightedCommentId ?? commentIds[0]}
        isPreview
      />
    </TouchableOpacity>
  )
}

type CommentPreviewProps = {
  entityId: ID
}

export const CommentPreview = (props: CommentPreviewProps) => {
  const { entityId } = props

  const { params } = useRoute<'Track'>()
  const { commentId, showComments } = params ?? {}
  const parsedCommentId = OptionalHashId.parse(commentId)
  const { data: highlightedComment } = useComment(parsedCommentId)
  const highlightedCommentId =
    highlightedComment?.entityId === entityId
      ? (highlightedComment?.parentCommentId ?? highlightedComment.id)
      : null

  const navigation = useNavigation()
  const { open } = useCommentDrawer()

  const lineup = useSelector(getLineup)
  const trackUid = lineup?.entries?.[0]?.uid

  const openCommentDrawer = useCallback(
    (args: { autoFocusInput?: boolean } = {}) => {
      const { autoFocusInput } = args
      open({
        entityId,
        navigation,
        autoFocusInput,
        highlightedComment,
        uid: trackUid,
        actions: tracksActions
      })
    },
    [open, entityId, navigation, trackUid, highlightedComment]
  )

  useEffect(() => {
    if (highlightedComment) {
      openCommentDrawer()
    } else if (showComments && !highlightedCommentId) {
      openCommentDrawer()
    }
  }, [
    showComments,
    openCommentDrawer,
    highlightedComment,
    highlightedCommentId
  ])

  return (
    <CommentSectionProvider
      entityId={entityId}
      lineupActions={tracksActions}
      uid={trackUid}
    >
      <Flex gap='s' direction='column' w='100%' alignItems='flex-start'>
        <CommentPreviewHeader openCommentDrawer={openCommentDrawer} />
        <Paper w='100%' direction='column' gap='s' p='l' border='default'>
          <CommentPreviewContent
            openCommentDrawer={openCommentDrawer}
            highlightedCommentId={highlightedCommentId}
          />
        </Paper>
      </Flex>
    </CommentSectionProvider>
  )
}
