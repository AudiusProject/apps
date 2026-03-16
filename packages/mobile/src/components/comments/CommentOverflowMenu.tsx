import React, { useCallback, useState } from 'react'

import { useUser } from '@audius/common/api'
import {
  CommentSectionProvider,
  useCurrentCommentSection,
  useDeleteComment,
  useUpdateCommentNotificationSetting,
  usePinComment,
  useReportComment,
  useMuteUser
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import {
  Name,
  type Comment,
  type ID,
  type ReplyComment
} from '@audius/common/models'
import { removeNullable } from '@audius/common/utils'
import { Id } from '@audius/sdk/services'
import { Portal } from '@gorhom/portal'
import Clipboard from '@react-native-clipboard/clipboard'

import { Hint, IconButton, IconKebabHorizontal } from '@audius/harmony-native'
import { useToast } from 'app/hooks/useToast'
import { track as trackEvent, make } from 'app/services/analytics'
import { env } from 'app/services/env'

import {
  ActionDrawerWithoutRedux,
  type ActionDrawerRow
} from '../action-drawer'
import { ConfirmationDrawerWithoutRedux } from '../drawers'

type CommentOverflowMenuProps = {
  comment: Comment | ReplyComment
  disabled?: boolean
  parentCommentId?: ID
}

export const CommentOverflowMenu = (props: CommentOverflowMenuProps) => {
  const {
    comment,
    comment: { id, userId },
    disabled,
    parentCommentId
  } = props

  const { track } = useCurrentCommentSection()
  const isMuted = 'isMuted' in comment ? comment.isMuted : false
  const isParentComment = 'replyCount' in comment

  const { data: userName } = useUser(userId, {
    select: (user) => user?.name
  })

  const { toast } = useToast()

  // Need isOpen and isVisible to account for the closing animation
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const [isFlagAndHideConfirmationOpen, setIsFlagAndHideConfirmationOpen] =
    useState(false)
  const [
    isFlagAndHideConfirmationVisible,
    setIsFlagAndHideConfirmationVisible
  ] = useState(false)

  const [isFlagAndRemoveConfirmationOpen, setIsFlagAndRemoveConfirmationOpen] =
    useState(false)
  const [
    isFlagAndRemoveConfirmationVisible,
    setIsFlagAndRemoveConfirmationVisible
  ] = useState(false)

  const [isMuteUserConfirmationOpen, setIsMuteUserConfirmationOpen] =
    useState(false)
  const [isMuteUserConfirmationVisible, setIsMuteUserConfirmationVisible] =
    useState(false)

  const [isPinConfirmationOpen, setIsPinConfirmationOpen] = useState(false)
  const [isPinConfirmationVisible, setIsPinConfirmationVisible] =
    useState(false)

  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false)
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] =
    useState(false)

  const {
    entityId,
    isEntityOwner,
    currentUserId,
    setReplyingAndEditingState,
    currentSort
  } = useCurrentCommentSection()

  const isCommentOwner = Number(userId) === currentUserId
  const isPinned = track.pinned_comment_id === id

  const [pinComment] = usePinComment()
  const [deleteComment] = useDeleteComment()
  const [reportComment] = useReportComment()
  const [muteUser] = useMuteUser()

  const [handleMuteCommentNotifications] =
    useUpdateCommentNotificationSetting(id)

  const handleMuteNotifs = () => {
    handleMuteCommentNotifications(isMuted ? 'unmute' : 'mute')
    toast({
      content: isMuted
        ? messages.toasts.unmutedNotifs
        : messages.toasts.mutedNotifs
    })
  }

  const handleShare = useCallback(() => {
    const url = `${env.AUDIUS_URL}${track.permalink}?commentId=${Id.parse(comment.id)}`
    Clipboard.setString(url)
    toast({
      content: messages.toasts.linkCopied,
      type: 'info',
      timeout: 1500
    })
  }, [comment.id, track.permalink, toast])

  const rows: ActionDrawerRow[] = [
    {
      callback: handleShare,
      text: messages.menuActions.share
    },
    isEntityOwner &&
      isParentComment && {
        text: isPinned ? messages.menuActions.unpin : messages.menuActions.pin,
        callback: () => {
          if (isPinned) {
            // Unpin the comment
            handlePinComment()
          } else {
            setIsPinConfirmationOpen(true)
            setIsPinConfirmationVisible(true)
          }
        }
      },
    !isEntityOwner &&
      !isCommentOwner && {
        text: messages.menuActions.flagAndHide,
        callback: () => {
          setIsFlagAndHideConfirmationOpen(true)
          setIsFlagAndHideConfirmationVisible(true)
        }
      },
    isEntityOwner &&
      !isCommentOwner && {
        text: messages.menuActions.flagAndRemove,
        callback: () => {
          setIsFlagAndRemoveConfirmationOpen(true)
          setIsFlagAndRemoveConfirmationVisible(true)
        }
      },
    isEntityOwner &&
      !isCommentOwner && {
        text: messages.menuActions.muteUser,
        callback: () => {
          setIsMuteUserConfirmationOpen(true)
          setIsMuteUserConfirmationVisible(true)
        }
      },
    isCommentOwner &&
      isParentComment && {
        text: isMuted
          ? messages.menuActions.unmuteThread
          : messages.menuActions.muteThread,
        callback: handleMuteNotifs
      },
    isCommentOwner && {
      text: messages.menuActions.edit,
      callback: () =>
        setReplyingAndEditingState?.({ editingComment: props.comment })
    },
    (isCommentOwner || isEntityOwner) && {
      text: messages.menuActions.delete,
      callback: () => {
        setIsDeleteConfirmationOpen(true)
        setIsDeleteConfirmationVisible(true)
      },
      isDestructive: true
    }
  ].filter(removeNullable)

  const handleMuteUser = useCallback(() => {
    if (userId === undefined) return
    muteUser({
      mutedUserId: userId,
      isMuted: false,
      trackId: entityId,
      currentSort
    })
    toast({
      content: messages.toasts.mutedUser,
      type: 'info'
    })
  }, [currentSort, entityId, muteUser, toast, userId])

  const handleFlagComment = useCallback(() => {
    reportComment(id, parentCommentId)
    toast({
      content: messages.toasts.flaggedAndHidden,
      type: 'info'
    })
  }, [reportComment, id, parentCommentId, toast])

  const handleFlagAndRemoveComment = useCallback(() => {
    reportComment(id, parentCommentId)
    toast({
      content: messages.toasts.flaggedAndRemoved,
      type: 'info'
    })
  }, [reportComment, id, parentCommentId, toast])

  const handlePinComment = useCallback(() => {
    pinComment(id, !isPinned)
    toast({
      content: isPinned ? messages.toasts.unpinned : messages.toasts.pinned,
      type: 'info'
    })
  }, [id, isPinned, pinComment, toast])

  const handleDeleteComment = useCallback(() => {
    deleteComment(id, parentCommentId)
    toast({
      content: messages.toasts.deleted,
      type: 'info'
    })
  }, [deleteComment, id, parentCommentId, toast])

  const handlePress = useCallback(() => {
    setIsOpen(!isOpen)
    setIsVisible(!isVisible)

    trackEvent(
      make({
        eventName: Name.COMMENTS_OPEN_COMMENT_OVERFLOW_MENU,
        commentId: id
      })
    )
  }, [isOpen, isVisible, id])

  return (
    <>
      <IconButton
        aria-label={messages.menuActions.moreActions}
        icon={IconKebabHorizontal}
        size='s'
        color='subdued'
        onPress={handlePress}
        disabled={disabled}
      />

      <Portal hostName='DrawerPortal'>
        {isVisible ? (
          <CommentSectionProvider entityId={entityId}>
            <ActionDrawerWithoutRedux
              rows={rows}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onClosed={() => setIsVisible(false)}
            />
          </CommentSectionProvider>
        ) : null}

        {isFlagAndHideConfirmationVisible ? (
          <ConfirmationDrawerWithoutRedux
            isOpen={isFlagAndHideConfirmationOpen}
            onClose={() => setIsFlagAndHideConfirmationOpen(false)}
            onClosed={() => setIsFlagAndHideConfirmationVisible(false)}
            messages={{
              header: messages.popups.flagAndHide.title,
              description: messages.popups.flagAndHide.body(userName),
              confirm: messages.popups.flagAndHide.confirm
            }}
            onConfirm={handleFlagComment}
          />
        ) : null}

        {isFlagAndRemoveConfirmationVisible ? (
          <ConfirmationDrawerWithoutRedux
            isOpen={isFlagAndRemoveConfirmationOpen}
            onClose={() => setIsFlagAndRemoveConfirmationOpen(false)}
            onClosed={() => setIsFlagAndRemoveConfirmationVisible(false)}
            messages={{
              header: messages.popups.flagAndRemove.title,
              description: messages.popups.flagAndRemove.body(userName),
              confirm: messages.popups.flagAndRemove.confirm
            }}
            onConfirm={handleFlagAndRemoveComment}
          />
        ) : null}

        {isPinConfirmationVisible ? (
          <ConfirmationDrawerWithoutRedux
            isOpen={isPinConfirmationOpen}
            onClose={() => setIsPinConfirmationOpen(false)}
            onClosed={() => setIsPinConfirmationVisible(false)}
            variant='affirmative'
            messages={{
              header: messages.popups.pin.title,
              description: messages.popups.pin.body,
              confirm: messages.popups.pin.confirm
            }}
            onConfirm={handlePinComment}
          />
        ) : null}

        {isDeleteConfirmationVisible ? (
          <ConfirmationDrawerWithoutRedux
            isOpen={isDeleteConfirmationOpen}
            onClose={() => setIsDeleteConfirmationOpen(false)}
            onClosed={() => setIsDeleteConfirmationVisible(false)}
            messages={{
              header: messages.popups.delete.title,
              description: isCommentOwner
                ? messages.popups.delete.body
                : messages.popups.artistDelete.body(userName),
              confirm: messages.popups.delete.confirm
            }}
            onConfirm={handleDeleteComment}
          />
        ) : null}

        {isMuteUserConfirmationVisible ? (
          <ConfirmationDrawerWithoutRedux
            isOpen={isMuteUserConfirmationOpen}
            onClose={() => setIsMuteUserConfirmationOpen(false)}
            onClosed={() => setIsMuteUserConfirmationVisible(false)}
            messages={{
              header: messages.popups.muteUser.title,
              description: messages.popups.muteUser.body(userName),
              confirm: messages.popups.muteUser.confirm
            }}
            onConfirm={handleMuteUser}
          >
            <Hint>{messages.popups.muteUser.hint}</Hint>
          </ConfirmationDrawerWithoutRedux>
        ) : null}
      </Portal>
    </>
  )
}
