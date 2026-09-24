import { useContext } from 'react'

import {
  useCurrentCommentSection,
  useGetTrackCommentNotificationSetting,
  useUpdateTrackCommentNotificationSetting
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import {
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconMessage,
  IconRefresh,
  PlainButton,
  PopupMenu,
  PopupMenuItem,
  Text
} from '@audius/harmony'
import { useTheme } from '@emotion/react'

import { ToastContext } from 'components/toast/ToastContext'

type CommentHeaderProps = {
  isLoading?: boolean
}

export const CommentHeader = (props: CommentHeaderProps) => {
  const { isLoading } = props
  const { toast } = useContext(ToastContext)
  const {
    isEntityOwner,
    entityId,
    resetComments,
    hasNewComments,
    isCommentCountLoading,
    commentCount
  } = useCurrentCommentSection()

  const isMuted = useGetTrackCommentNotificationSetting(entityId)
  const [updateTrackCommentNotificationSetting] =
    useUpdateTrackCommentNotificationSetting(entityId)
  const { motion } = useTheme()

  const handleToggleTrackCommentNotifications = () => {
    updateTrackCommentNotificationSetting(isMuted ? 'unmute' : 'mute')
    toast(
      isMuted
        ? messages.toasts.unmutedTrackNotifs
        : messages.toasts.mutedTrackNotifs
    )
  }

  const popupMenuItems: PopupMenuItem[] = [
    {
      onClick: handleToggleTrackCommentNotifications,
      text: isMuted
        ? messages.popups.trackNotifications.unmute
        : messages.popups.trackNotifications.mute
    }
  ]

  return (
    <Flex justifyContent='space-between' w='100%'>
      <Flex alignItems='center' gap='s'>
        <IconMessage color='default' />
        <Text variant='title' size='l'>
          Comments (
          {commentCount !== undefined && !isCommentCountLoading
            ? commentCount
            : '...'}
          )
        </Text>

        {hasNewComments ? (
          <PlainButton
            iconLeft={IconRefresh}
            variant='subdued'
            onClick={resetComments}
          >
            {messages.newComments}
          </PlainButton>
        ) : null}
      </Flex>
      {isEntityOwner && !isLoading ? (
        <PopupMenu
          items={popupMenuItems}
          anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
          transformOrigin={{ vertical: 'center', horizontal: 'right' }}
          renderTrigger={(anchorRef, triggerPopup) => (
            <IconButton
              aria-label='Show comment options'
              icon={IconKebabHorizontal}
              color='subdued'
              ref={anchorRef}
              css={{
                cursor: 'pointer',
                transition: motion.hover
              }}
              onClick={() => triggerPopup()}
              className='kebabIcon'
            />
          )}
        />
      ) : null}
    </Flex>
  )
}
