import { useCallback } from 'react'

import { useComment } from '@audius/common/api'
import {
  CommentSectionProvider,
  useCurrentCommentSection
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import type { Comment, ID } from '@audius/common/models'
import { trackPageSelectors } from '@audius/common/store'
import { OptionalHashId } from '@audius/sdk'
import { TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { useSelector } from 'react-redux'
import { useEffectOnce } from 'react-use'
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
  highlightCommentId: ID | null
}

const CommentPreviewContent = (props: CommentPreviewContentProps) => {
  const { openCommentDrawer, highlightCommentId } = props
  const {
    commentSectionLoading: isLoading,
    commentIds,
    isEntityOwner
  } = useCurrentCommentSection()

  const handlePress = useCallback(() => {
    openCommentDrawer()
  }, [openCommentDrawer])

  const handleFormPress = useCallback(() => {
    openCommentDrawer({ autoFocusInput: true })
  }, [openCommentDrawer])

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
            <View pointerEvents='none'>
              <CommentForm isPreview />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Flex>
    )
  }

  return (
    <TouchableOpacity onPress={handlePress}>
      <CommentBlock commentId={highlightCommentId ?? commentIds[0]} isPreview />
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
  const { data: highlightComment } = useComment(parsedCommentId)
  const highlightCommentId =
    highlightComment?.entityId === entityId
      ? (highlightComment?.parentCommentId ?? highlightComment.id)
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
        highlightComment: highlightComment as Comment | undefined,
        uid: trackUid,
        actions: tracksActions
      })
    },
    [open, entityId, navigation, trackUid, highlightComment]
  )

  useEffectOnce(() => {
    if (showComments) {
      openCommentDrawer()
    }
  })

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
            highlightCommentId={highlightCommentId}
          />
        </Paper>
      </Flex>
    </CommentSectionProvider>
  )
}
