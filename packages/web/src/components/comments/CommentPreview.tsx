import { useCallback, useEffect } from 'react'

import { useTrack } from '@audius/common/api'
import {
  CommentSectionProvider,
  useCurrentCommentSection
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { ID } from '@audius/common/models'
import { trackPageSelectors } from '@audius/common/store'
import {
  Flex,
  IconCaretRight,
  IconMessage,
  Paper,
  PlainButton,
  Skeleton,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { tracksActions } from '~/store/pages/track/lineup/actions'

import { push as pushRoute } from 'utils/navigation'

import { CommentBlock } from './CommentBlock'
import { CommentForm } from './CommentForm'
const { getLineup } = trackPageSelectors

const CommentPreviewHeader = () => {
  const {
    entityId,
    commentSectionLoading: isLoading,
    commentIds,
    commentCount
  } = useCurrentCommentSection()

  const { data: trackPermalink } = useTrack(entityId, {
    select: (track) => track.permalink
  })

  const isShowingComments = !isLoading && commentIds?.length

  return (
    <Flex
      direction='row'
      w='100%'
      justifyContent='space-between'
      alignItems='center'
    >
      <Flex gap='s'>
        <IconMessage color='default' />
        <Text variant='title' size='l'>
          Comments
          {isShowingComments ? (
            <Text color='subdued'>&nbsp;({commentCount})</Text>
          ) : null}
        </Text>
      </Flex>
      {isShowingComments ? (
        <PlainButton iconRight={IconCaretRight} variant='subdued' asChild>
          <Link to={`${trackPermalink}/comments`}>{messages.viewAll}</Link>
        </PlainButton>
      ) : null}
    </Flex>
  )
}

const CommentPreviewContent = () => {
  const {
    entityId,
    currentUserId,
    commentSectionLoading: isLoading,
    commentIds
  } = useCurrentCommentSection()
  const dispatch = useDispatch()

  const { data: trackPermalink } = useTrack(entityId, {
    select: (track) => track.permalink
  })

  const handleClick = useCallback(() => {
    dispatch(pushRoute(`${trackPermalink}/comments`))
  }, [trackPermalink, dispatch])

  // Loading state
  if (isLoading) {
    return (
      <Paper w='100%' direction='column' gap='s' p='l' border='default'>
        <Flex direction='row' gap='s' alignItems='center'>
          <Skeleton w={40} h={40} css={{ borderRadius: 100 }} />
          <Flex gap='s' direction='column'>
            <Skeleton h={20} w={240} />
            <Skeleton h={20} w={160} />
          </Flex>
        </Flex>
      </Paper>
    )
  }

  // Empty state
  if (!commentIds || !commentIds.length) {
    return (
      <Paper w='100%' direction='column' gap='s' p='l' border='default'>
        <Flex gap='m' column alignItems='flex-start'>
          <Text variant='body'>{messages.noComments}</Text>
          <CommentForm hideAvatar={!currentUserId} />
        </Flex>
      </Paper>
    )
  }

  return (
    <Paper
      w='100%'
      direction='column'
      gap='s'
      p='l'
      border='default'
      onClick={handleClick}
    >
      <CommentBlock commentId={commentIds[0]} isPreview />
    </Paper>
  )
}

type CommentPreviewProps = {
  entityId: ID
}

export const CommentPreview = (props: CommentPreviewProps) => {
  const { entityId } = props
  const dispatch = useDispatch()
  const { data: trackPermalink } = useTrack(entityId, {
    select: (track) => track.permalink
  })
  const [searchParams] = useSearchParams()
  const showComments = searchParams.get('showComments')
  const commentId = searchParams.get('commentId')
  const navigate = useNavigate()
  const lineup = useSelector(getLineup)
  const uid = lineup?.entries?.[0]?.uid

  // Show the comment screen if the showComments or commentId query param is present
  useEffect(() => {
    if ((showComments || commentId) && trackPermalink) {
      navigate({ search: '' }, { replace: true })
      dispatch(
        pushRoute(
          `${trackPermalink}/comments${commentId ? `?commentId=${commentId}` : ''}`
        )
      )
    }
  }, [
    showComments,
    commentId,
    trackPermalink,
    dispatch,
    searchParams,
    navigate
  ])

  return (
    <CommentSectionProvider
      entityId={entityId}
      lineupActions={tracksActions}
      uid={uid}
    >
      <Flex gap='s' direction='column' w='100%' alignItems='flex-start'>
        <CommentPreviewHeader />
        <CommentPreviewContent />
      </Flex>
    </CommentSectionProvider>
  )
}
