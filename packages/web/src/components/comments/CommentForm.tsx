import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentCommentSection,
  useEditComment,
  usePostComment
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { ID, Name, SquareSizes } from '@audius/common/models'
import { playerSelectors } from '@audius/common/src/store'
import { Avatar, Flex } from '@audius/harmony'
import { CommentMention } from '@audius/sdk'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router'
import { usePrevious } from 'react-use'

import { ComposerInput } from 'components/composer-input/ComposerInput'
import { useIsMobile } from 'hooks/useIsMobile'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { make, track } from 'services/analytics'
import { audioPlayer } from 'services/audio-player'

import { useCommentActionCallback } from './useCommentActionCallback'

type CommentFormValues = {
  commentMessage: string
  mentions?: CommentMention[]
}

type CommentFormProps = {
  onSubmit?: ({ commentMessage }: { commentMessage: string }) => void
  initialValue?: string
  initialUserMentions?: CommentMention[]
  hideAvatar?: boolean
  commentId?: ID
  parentCommentId?: ID
  isEdit?: boolean
  autoFocus?: boolean
  disabled?: boolean
}

export const CommentForm = ({
  onSubmit,
  initialValue = '',
  initialUserMentions = [],
  commentId,
  parentCommentId,
  isEdit,
  hideAvatar = false,
  autoFocus,
  disabled = false
}: CommentFormProps) => {
  const { currentUserId, entityId, entityType } = useCurrentCommentSection()
  const isMobile = useIsMobile()

  const [messageId, setMessageId] = useState(0) // Message id is used to reset the composer input
  const currentlyPlayingTrackId = useSelector(playerSelectors.getTrackId)
  const [postComment] = usePostComment()
  const [editComment] = useEditComment()

  const location = useLocation()
  const previousLocation = usePrevious(location)
  const hasLocationChanged =
    previousLocation && previousLocation.pathname !== location.pathname
  useEffect(() => {
    if (hasLocationChanged) {
      // Reset input text when the location changes
      setMessageId((prev) => prev + 1)
    }
  }, [hasLocationChanged])

  const handlePostComment = (message: string, mentions?: CommentMention[]) => {
    const trackPosition = audioPlayer
      ? Math.floor(audioPlayer.getPosition())
      : undefined
    const trackTimestampS =
      currentlyPlayingTrackId === entityId ? trackPosition : undefined

    postComment(message, parentCommentId, trackTimestampS, mentions)
  }

  const handleCommentEdit = (
    commentMessage: string,
    mentions?: CommentMention[]
  ) => {
    if (commentId) {
      editComment(commentId, commentMessage, mentions)
    }
  }

  const [handleClickInput, mobileAppDrawer] = useCommentActionCallback(() => {
    track(
      make({
        eventName: Name.COMMENTS_FOCUS_COMMENT_INPUT,
        trackId: entityId,
        source: 'comment_input'
      })
    )
  }, [entityId])

  const profileImage = useProfilePicture({
    userId: currentUserId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  const handleSubmit = ({ commentMessage, mentions }: CommentFormValues) => {
    if (!commentMessage) return

    if (isEdit) {
      handleCommentEdit(commentMessage, mentions)
    } else {
      handlePostComment(commentMessage, mentions)
    }

    onSubmit?.({ commentMessage })
    // Each instance of form state is tracked with a message id
    // Incrementing the message id "clears" the input value
    setMessageId((prev) => prev + 1)
  }

  const handleAddMention = useCallback((userId: ID) => {
    track(
      make({
        eventName: Name.COMMENTS_ADD_MENTION,
        userId
      })
    )
  }, [])

  const handleAddTimestamp = useCallback((timestamp: number) => {
    track(
      make({
        eventName: Name.COMMENTS_ADD_TIMESTAMP,
        timestamp
      })
    )
  }, [])

  const handleAddLink = useCallback(
    (entityId: ID, kind: 'track' | 'collection' | 'user') => {
      track(
        make({
          eventName: Name.COMMENTS_ADD_LINK,
          entityId,
          kind
        })
      )
    },
    []
  )

  return (
    <>
      <Flex w='100%' gap='m' alignItems='center' justifyContent='center'>
        {!hideAvatar ? (
          <Avatar
            size='auto'
            isLoading={false} // loading is not working correctly?
            src={profileImage}
            css={{ width: 44, height: 44, flexShrink: 0 }}
          />
        ) : null}
        <ComposerInput
          autoFocus={autoFocus}
          placeholder={messages.addComment}
          entityId={entityId}
          entityType={entityType}
          presetMessage={initialValue}
          presetUserMentions={initialUserMentions}
          readOnly={isMobile}
          onClick={handleClickInput}
          messageId={messageId}
          maxLength={400}
          maxMentions={10}
          onSubmit={(value: string, _, mentions) => {
            handleSubmit({ commentMessage: value, mentions })
          }}
          onAddMention={handleAddMention}
          onAddTimestamp={handleAddTimestamp}
          onAddLink={handleAddLink}
          disabled={disabled}
          blurOnSubmit={true}
        />
      </Flex>
      {mobileAppDrawer}
    </>
  )
}
