import { ReactNode, useCallback, useContext, useMemo, useState } from 'react'

import { useUser } from '@audius/common/api'
import {
  useCurrentCommentSection,
  useUpdateCommentNotificationSetting,
  usePinComment,
  useReactToComment,
  useReportComment,
  useMuteUser
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { Comment, ID, Name, ReplyComment } from '@audius/common/models'
import {
  Box,
  ButtonVariant,
  Flex,
  Hint,
  IconButton,
  IconHeart,
  IconKebabHorizontal,
  IconQuestionCircle,
  PopupMenu,
  Text,
  TextLink
} from '@audius/harmony'
import { Id } from '@audius/sdk/services'

import { ConfirmationModal } from 'components/confirmation-modal'
import { ToastContext } from 'components/toast/ToastContext'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { make, track as trackEvent } from 'services/analytics'
import { env } from 'services/env'
import { copyToClipboard } from 'utils/clipboardUtil'
import { removeNullable } from 'utils/typeUtils'

import { useCommentActionCallback } from './useCommentActionCallback'

type ConfirmationAction =
  | 'pin'
  | 'unpin'
  | 'flagAndHide'
  | 'flagAndRemove'
  | 'muteUser'
  | 'delete'
  | 'artistDelete'

type ConfirmationModalState = {
  messages: {
    title: string
    body: ReactNode
    cancel: string
    confirm: string
  }
  confirmButtonType?: ButtonVariant
  confirmCallback: () => void
  cancelCallback?: () => void
}

type CommentActionBarProps = {
  comment: Comment | ReplyComment
  isDisabled?: boolean
  onClickEdit: () => void
  onClickReply: () => void
  onClickDelete: () => void
  hideReactCount?: boolean
  parentCommentId?: ID
}
export const CommentActionBar = ({
  comment,
  isDisabled,
  onClickEdit,
  onClickReply,
  onClickDelete,
  hideReactCount,
  parentCommentId
}: CommentActionBarProps) => {
  const { currentUserId, isEntityOwner, entityId, currentSort, track } =
    useCurrentCommentSection()
  const { reactCount, id: commentId, userId, isCurrentUserReacted } = comment
  const isMuted = 'isMuted' in comment ? comment.isMuted : false
  const isParentComment = parentCommentId === undefined
  const isPinned = track.pinned_comment_id === commentId
  const isTombstone = 'isTombstone' in comment ? !!comment.isTombstone : false

  // API actions
  const [reactToComment] = useReactToComment()
  const [reportComment] = useReportComment()
  const [pinComment] = usePinComment()
  const [muteUser] = useMuteUser()

  const isCommentOwner = Number(comment.userId) === currentUserId

  // Selectors
  const { data: userDisplayName } = useUser(userId, {
    select: (user) => user?.name
  })

  const [currentConfirmationModalType, setCurrentConfirmationModalType] =
    useState<ConfirmationAction | undefined>(undefined)
  const { toast } = useContext(ToastContext)

  const [handleMuteCommentNotifications] =
    useUpdateCommentNotificationSetting(commentId)

  // Handlers
  const handleReact = useRequiresAccountCallback(
    () => {
      reactToComment(commentId, !isCurrentUserReacted)
    },
    [commentId, isCurrentUserReacted, reactToComment],
    () => {
      trackEvent(
        make({
          eventName: Name.COMMENTS_OPEN_AUTH_MODAL,
          trackId: entityId
        })
      )
    }
  )

  const handleDelete = useCallback(() => {
    // note: we do some UI logic in the CommentBlock above this so we can't trigger directly from here
    onClickDelete()
  }, [onClickDelete])

  const handleMuteNotifs = useCallback(() => {
    handleMuteCommentNotifications(isMuted ? 'unmute' : 'mute')
    toast(isMuted ? messages.toasts.unmutedNotifs : messages.toasts.mutedNotifs)
  }, [handleMuteCommentNotifications, isMuted, toast])

  const handlePin = useCallback(() => {
    pinComment(commentId, !isPinned)
    toast(isPinned ? messages.toasts.unpinned : messages.toasts.pinned)
  }, [commentId, isPinned, pinComment, toast])

  const handleMute = useCallback(() => {
    if (comment.userId === undefined) return
    muteUser({
      mutedUserId: comment.userId,
      isMuted: false,
      trackId: entityId,
      currentSort
    })
    toast(messages.toasts.mutedUser)
  }, [comment.userId, currentSort, entityId, muteUser, toast])

  const handleFlagComment = useCallback(() => {
    reportComment(commentId, parentCommentId)
    toast(messages.toasts.flaggedAndHidden)
  }, [commentId, parentCommentId, reportComment, toast])

  const handleFlagAndRemoveComment = useCallback(() => {
    reportComment(commentId, parentCommentId)
    toast(messages.toasts.flaggedAndRemoved)
  }, [commentId, parentCommentId, reportComment, toast])

  const [handleClickReply, mobileAppDrawer] = useCommentActionCallback(() => {
    onClickReply()
    trackEvent(
      make({
        eventName: Name.COMMENTS_CLICK_REPLY_BUTTON,
        commentId
      })
    )
  }, [onClickReply, commentId])

  const handleShare = useCallback(() => {
    const url = `${env.AUDIUS_URL}${track.permalink}?commentId=${Id.parse(comment.id)}`
    copyToClipboard(url)
    toast('Copied to clipboard')
  }, [comment.id, toast, track.permalink])

  // Confirmation Modal state
  const confirmationModals: {
    [k in ConfirmationAction]: ConfirmationModalState
  } = useMemo(
    () => ({
      pin: {
        messages: messages.popups.pin,
        confirmCallback: handlePin
      },
      unpin: {
        messages: messages.popups.unpin,
        confirmCallback: handlePin
      },
      // Specifically for an artist deleting someone else's comment
      artistDelete: {
        messages: {
          ...messages.popups.artistDelete,
          body: messages.popups.artistDelete.body(userDisplayName as string)
        },
        confirmCallback: handleDelete
      },
      // An individual deleting their own comment
      delete: {
        messages: messages.popups.delete,
        confirmCallback: handleDelete
      },
      muteUser: {
        messages: {
          ...messages.popups.muteUser,
          body: (
            <Flex gap='l' direction='column'>
              <Text color='default' textAlign='left'>
                {messages.popups.muteUser.body(userDisplayName as string)}
              </Text>
              <Hint icon={IconQuestionCircle} css={{ textAlign: 'left' }}>
                {messages.popups.muteUser.hint}
              </Hint>
            </Flex>
          ) as ReactNode,
          confirm: 'Mute User',
          cancel: 'Cancel'
        },
        confirmButtonType: 'destructive',
        confirmCallback: handleMute
      },
      flagAndHide: {
        messages: {
          ...messages.popups.flagAndHide,
          body: messages.popups.flagAndHide.body(userDisplayName as string)
        },
        confirmCallback: handleFlagComment
      },
      flagAndRemove: {
        messages: {
          ...messages.popups.flagAndRemove,
          body: messages.popups.flagAndRemove.body(userDisplayName as string)
        },
        confirmCallback: handleFlagAndRemoveComment
      }
    }),
    [
      handleDelete,
      handleMute,
      handlePin,
      handleFlagComment,
      handleFlagAndRemoveComment,
      userDisplayName
    ]
  )

  const currentConfirmationModal = useMemo(
    () =>
      currentConfirmationModalType
        ? confirmationModals[currentConfirmationModalType]
        : undefined,
    [confirmationModals, currentConfirmationModalType]
  )

  // Popup menu items
  const popupMenuItems = useMemo(
    () =>
      [
        {
          onClick: handleShare,
          text: messages.menuActions.share
        },
        isEntityOwner &&
          isParentComment && {
            onClick: () => setCurrentConfirmationModalType('pin'),
            text: isPinned
              ? messages.menuActions.unpin
              : messages.menuActions.pin
          },
        !isEntityOwner &&
          !isCommentOwner && {
            onClick: () => setCurrentConfirmationModalType('flagAndHide'),
            text: messages.menuActions.flagAndHide
          },
        isEntityOwner &&
          !isCommentOwner && {
            onClick: () => setCurrentConfirmationModalType('flagAndRemove'),
            text: messages.menuActions.flagAndRemove
          },
        isEntityOwner &&
          !isCommentOwner && {
            onClick: () => setCurrentConfirmationModalType('muteUser'),
            text: messages.menuActions.muteUser
          },
        isCommentOwner &&
          isParentComment && {
            onClick: handleMuteNotifs,
            text: isMuted
              ? messages.menuActions.unmuteThread
              : messages.menuActions.muteThread
          },
        isCommentOwner && {
          onClick: onClickEdit,
          text: messages.menuActions.edit
        },
        (isCommentOwner || isEntityOwner) && {
          onClick: () =>
            setCurrentConfirmationModalType(
              !isCommentOwner && isEntityOwner ? 'artistDelete' : 'delete'
            ),
          text: messages.menuActions.delete
        }
      ].filter(removeNullable),
    [
      isParentComment,
      handleShare,
      isEntityOwner,
      isPinned,
      isCommentOwner,
      handleMuteNotifs,
      isMuted,
      onClickEdit
    ]
  )

  const [handleClickOverflowMenu, replyMobileAppDrawer] =
    useCommentActionCallback(
      (triggerPopup: () => void) => {
        triggerPopup()

        trackEvent(
          make({
            eventName: Name.COMMENTS_OPEN_COMMENT_OVERFLOW_MENU,
            commentId
          })
        )
      },
      [commentId]
    )

  return (
    <Flex gap='l' alignItems='center'>
      <Flex alignItems='center' gap='xs'>
        {/* TODO: we should use FavoriteButton here */}
        <IconButton
          icon={IconHeart}
          color={isCurrentUserReacted ? 'active' : 'subdued'}
          aria-label='Heart comment'
          onClick={handleReact}
          disabled={isDisabled}
        />
        {!hideReactCount && reactCount > 0 ? (
          <Text color={isDisabled ? 'subdued' : 'default'}> {reactCount}</Text>
        ) : (
          // Placeholder box to offset where the number would be
          <Box w='8px' />
        )}
      </Flex>
      <TextLink
        variant='subdued'
        onClick={handleClickReply}
        disabled={isDisabled || isTombstone}
      >
        {messages.reply}
      </TextLink>

      <PopupMenu
        items={popupMenuItems}
        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        renderTrigger={(anchorRef, triggerPopup) => (
          <IconButton
            aria-label='Show Comment Management Options'
            icon={IconKebabHorizontal}
            color='subdued'
            ref={anchorRef}
            disabled={isDisabled}
            size='m'
            onClick={() => handleClickOverflowMenu(triggerPopup)}
          />
        )}
      />
      {mobileAppDrawer}
      {replyMobileAppDrawer}
      <ConfirmationModal
        messages={{
          header: currentConfirmationModal?.messages?.title,
          description: currentConfirmationModal?.messages?.body,
          confirm: currentConfirmationModal?.messages?.confirm
        }}
        isOpen={currentConfirmationModalType !== undefined}
        onConfirm={currentConfirmationModal?.confirmCallback}
        onClose={() => {
          setCurrentConfirmationModalType(undefined)
        }}
      />
    </Flex>
  )
}
