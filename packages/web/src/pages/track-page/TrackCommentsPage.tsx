import { useContext, useEffect } from 'react'

import { useTrackByPermalink } from '@audius/common/api'
import { CommentSectionProvider } from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { Flex, Text } from '@audius/harmony'
import { pick } from 'lodash'
import { useParams } from 'react-router'

import { CommentList } from 'components/comments/CommentList'
import { useHighlightedComment } from 'components/comments/useHighlightedComment'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'

type TrackCommentsParams = {
  slug: string
  handle: string
}

export const TrackCommentsPage = () => {
  const { slug, handle } = useParams<TrackCommentsParams>()
  const { data: partialTrack } = useTrackByPermalink(`/${handle}/${slug}`, {
    select: (track) =>
      pick(track, ['track_id', 'comments_disabled', 'permalink'])
  })

  const { setLeft, setCenter, setRight } = useContext(NavContext)

  // Use the same highlighting logic as desktop
  const highlightedComment = useHighlightedComment()
  const highlightedCommentId =
    highlightedComment?.entityId === partialTrack?.track_id
      ? (highlightedComment?.parentCommentId ?? highlightedComment?.id)
      : null

  useEffect(() => {
    setCenter(messages.title)
    setRight(null)
    setLeft(LeftPreset.BACK)
  }, [setCenter, setLeft, setRight])

  if (!partialTrack) return null

  const { track_id, comments_disabled } = partialTrack

  return (
    <MobilePageContainer
      title={messages.title}
      css={(theme) => ({
        backgroundColor: theme.color.background.white,
        minHeight: '100%'
      })}
    >
      {comments_disabled ? (
        <Flex p='2xl' justifyContent='center'>
          <Text variant='title'>{messages.commentsDisabled}</Text>
        </Flex>
      ) : (
        <CommentSectionProvider entityId={track_id}>
          <CommentList highlightedCommentId={highlightedCommentId} />
        </CommentSectionProvider>
      )}
    </MobilePageContainer>
  )
}
