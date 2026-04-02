import { useCallback, useState } from 'react'

import {
  useComment,
  useCurrentUserId,
  useEditComment,
  useDeleteTextPost,
  useArtistCoin
} from '@audius/common/api'
import { ID } from '@audius/common/models'
import { getLargestTimeUnitText } from '@audius/common/utils'
import {
  Flex,
  IconHeart,
  IconKebabHorizontal,
  IconLock,
  IconButton,
  Paper,
  PlainButton,
  PopupMenu,
  Skeleton,
  Text
} from '@audius/harmony'

import { Avatar } from 'components/avatar'
import { ComposerInput } from 'components/composer-input/ComposerInput'
import { ConfirmationModal } from 'components/confirmation-modal'
import { UserLink } from 'components/link'

const messages = {
  locked: 'Hold this coin to unlock',
  edit: 'Edit',
  delete: 'Delete',
  deleteTitle: 'Delete Post',
  deleteBody: 'Are you sure you want to delete this post?',
  deleteConfirm: 'Delete',
  edited: '(edited)'
}

type TextPostCardProps = {
  commentId: ID
  mint: string
}

export const TextPostCard = ({ commentId, mint }: TextPostCardProps) => {
  const { data: comment, isPending } = useComment(commentId)
  const { data: currentUserId } = useCurrentUserId()
  const { data: coin } = useArtistCoin(mint)
  const { mutate: editComment } = useEditComment()
  const { mutate: deleteTextPost } = useDeleteTextPost()

  const [isEditing, setIsEditing] = useState(false)
  const [editMessageId, setEditMessageId] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isOwner = currentUserId != null && comment?.userId === currentUserId
  const isCoinOwner = currentUserId != null && coin?.ownerId === currentUserId
  const canModify = isOwner || isCoinOwner

  const handleEdit = useCallback(() => {
    setEditMessageId((prev) => prev + 1)
    setIsEditing(true)
  }, [])

  const handleEditSubmit = useCallback(
    (newMessage: string) => {
      if (!currentUserId || !comment || !newMessage.trim()) return
      editComment({
        commentId,
        userId: currentUserId,
        newMessage: newMessage.trim(),
        trackId: comment.entityId,
        currentSort: 'newest',
        entityType: 'FanClub'
      })
      setIsEditing(false)
    },
    [currentUserId, comment, commentId, editComment]
  )

  const handleDelete = useCallback(() => {
    if (!currentUserId) return
    deleteTextPost({
      commentId,
      userId: currentUserId,
      mint
    })
    setShowDeleteConfirm(false)
  }, [currentUserId, commentId, mint, deleteTextPost])

  if (isPending) {
    return (
      <Paper
        column
        gap='m'
        p='l'
        border='default'
        borderRadius='m'
        shadow='flat'
      >
        <Flex row gap='s' alignItems='center'>
          <Skeleton w={32} h={32} css={{ borderRadius: '50%' }} />
          <Skeleton w={120} h={16} />
        </Flex>
        <Skeleton w='100%' h={40} />
      </Paper>
    )
  }

  if (!comment) return null

  const isLocked = comment.message === null

  const popupMenuItems = [
    isOwner && {
      onClick: handleEdit,
      text: messages.edit
    },
    canModify && {
      onClick: () => setShowDeleteConfirm(true),
      text: messages.delete
    }
  ].filter(Boolean) as { onClick: () => void; text: string }[]

  return (
    <Paper column gap='m' p='l' border='default' borderRadius='m' shadow='flat'>
      {/* Header: Avatar + Name + Timestamp */}
      <Flex row gap='s' alignItems='center'>
        <Avatar userId={comment.userId} size='small' aria-hidden />
        <Flex column>
          {comment.userId ? (
            <UserLink userId={comment.userId} size='s' />
          ) : null}
          {comment.createdAt ? (
            <Text variant='body' size='xs' color='subdued'>
              {getLargestTimeUnitText(new Date(comment.createdAt))}
            </Text>
          ) : null}
        </Flex>
      </Flex>

      {/* Body: Locked / Editing / Text */}
      {isLocked ? (
        <Flex
          row
          alignItems='center'
          gap='s'
          css={(theme) => ({
            padding: theme.spacing.m,
            borderRadius: theme.cornerRadius.s,
            backgroundColor: theme.color.background.surface2
          })}
        >
          <IconLock size='s' color='subdued' />
          <Text variant='body' size='s' color='subdued'>
            {messages.locked}
          </Text>
        </Flex>
      ) : isEditing ? (
        <Flex w='100%' column gap='s'>
          <ComposerInput
            messageId={editMessageId}
            presetMessage={comment.message ?? ''}
            onSubmit={handleEditSubmit}
            maxLength={2000}
            autoFocus
          />
          <PlainButton
            css={{ alignSelf: 'flex-end' }}
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </PlainButton>
        </Flex>
      ) : (
        <Text variant='body' size='m'>
          {comment.message}
          {comment.isEdited ? (
            <Text variant='body' size='xs' color='subdued'>
              {' '}
              {messages.edited}
            </Text>
          ) : null}
        </Text>
      )}

      {/* Footer: React count + Kebab menu */}
      {!isLocked ? (
        <Flex row alignItems='center' gap='l'>
          <Flex alignItems='center' gap='xs'>
            <IconButton
              icon={IconHeart}
              color={comment.isCurrentUserReacted ? 'active' : 'subdued'}
              aria-label='Heart post'
              size='s'
            />
            {comment.reactCount > 0 ? (
              <Text variant='body' size='s'>
                {comment.reactCount}
              </Text>
            ) : null}
          </Flex>

          {canModify ? (
            <PopupMenu
              items={popupMenuItems}
              anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              renderTrigger={(anchorRef, triggerPopup) => (
                <IconButton
                  aria-label='Post options'
                  icon={IconKebabHorizontal}
                  color='subdued'
                  ref={anchorRef}
                  size='s'
                  onClick={() => triggerPopup()}
                />
              )}
            />
          ) : null}
        </Flex>
      ) : null}

      <ConfirmationModal
        messages={{
          header: messages.deleteTitle,
          description: messages.deleteBody,
          confirm: messages.deleteConfirm
        }}
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </Paper>
  )
}
