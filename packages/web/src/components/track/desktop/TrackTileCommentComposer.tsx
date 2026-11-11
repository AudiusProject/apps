import { MouseEvent, useCallback, useEffect, useState } from 'react'

import {
  useCurrentAccount,
  useCurrentUserId,
  usePostComment
} from '@audius/common/api'
import { ID } from '@audius/common/models'
import { formatCommentTrackTimestamp } from '@audius/common/utils'
import { Box, Flex } from '@audius/harmony'
import { CommentMention, EntityType } from '@audius/sdk'

import { Avatar } from 'components/avatar'
import { ComposerInput } from 'components/composer-input/ComposerInput'
import { useRequiresAccountFn } from 'hooks/useRequiresAccount'
import { audioPlayer } from 'services/audio-player'

const messages = {
  commentAt: (time: string) => `Comment at ${time}`
}

// The waveform reads comments sorted by timestamp, so the optimistic comment
// goes into that list and its avatar shows up right away.
const SORT_BY_TIMESTAMP = 'timestamp'
const POLL_MS = 500

const usePlaybackSecond = (isPlaying: boolean) => {
  const [second, setSecond] = useState(() =>
    Math.floor(audioPlayer?.getPosition() ?? 0)
  )

  useEffect(() => {
    const tick = () => setSecond(Math.floor(audioPlayer?.getPosition() ?? 0))
    tick()
    if (!isPlaying) return
    const interval = window.setInterval(tick, POLL_MS)
    return () => window.clearInterval(interval)
  }, [isPlaying])

  return second
}

type TrackTileCommentComposerProps = {
  trackId: ID
  isPlaying: boolean
}

/**
 * Comment box under the waveform of the track that is playing. The comment is
 * stamped with the playback position at the moment it is sent.
 */
export const TrackTileCommentComposer = ({
  trackId,
  isPlaying
}: TrackTileCommentComposerProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })
  const { requiresAccount } = useRequiresAccountFn()
  const { mutate: postComment } = usePostComment()
  const [messageId, setMessageId] = useState(0)
  const second = usePlaybackSecond(isPlaying)

  const canComment = !!currentUserId && !guestEmail

  const handleClick = useCallback(() => {
    if (!canComment) requiresAccount()
  }, [canComment, requiresAccount])

  const handleSubmit = useCallback(
    (message: string, _: unknown, mentions: CommentMention[]) => {
      if (!message || !currentUserId) return
      postComment({
        userId: currentUserId,
        trackId,
        body: message,
        trackTimestampS: Math.floor(audioPlayer?.getPosition() ?? 0),
        mentions,
        currentSort: SORT_BY_TIMESTAMP
      })
      setMessageId((id) => id + 1)
    },
    [currentUserId, postComment, trackId]
  )

  // The tile navigates on click; typing here should not.
  const stopPropagation = useCallback(
    (e: MouseEvent) => e.stopPropagation(),
    []
  )

  return (
    <Flex
      gap='s'
      alignItems='center'
      w='100%'
      onClick={stopPropagation}
      css={{ cursor: 'auto' }}
    >
      {currentUserId ? (
        <Box css={{ flexShrink: 0 }}>
          <Avatar userId={currentUserId} size='small' aria-hidden />
        </Box>
      ) : null}
      <Box flex={1}>
        <ComposerInput
          placeholder={messages.commentAt(formatCommentTrackTimestamp(second))}
          entityId={trackId}
          entityType={EntityType.TRACK}
          messageId={messageId}
          maxLength={400}
          maxMentions={10}
          readOnly={!canComment}
          onClick={handleClick}
          onSubmit={handleSubmit}
          blurOnSubmit
        />
      </Box>
    </Flex>
  )
}
