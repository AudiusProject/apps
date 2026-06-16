import { useCallback, useState } from 'react'

import { useCollection, useUser } from '@audius/common/api'
import { FollowSource } from '@audius/common/models'
import { usersSocialActions } from '@audius/common/store'
import { IconButton, IconKebabHorizontal } from '@audius/harmony'
import { pick } from 'lodash'
import { useDispatch } from 'react-redux'

import { DeleteCollectionConfirmationModal } from 'components/edit-collection/DeleteCollectionConfirmationModal'
import { CollectionMenuProps } from 'components/menu/CollectionMenu'
import Menu from 'components/menu/Menu'

const { followUser, unfollowUser } = usersSocialActions

const messages = {
  follow: 'Follow User',
  unfollow: 'Unfollow User',
  moreOptions: 'More Options'
}

type OverflowMenuButtonProps = {
  collectionId: number
  isOwner?: boolean
}

export const OverflowMenuButton = (props: OverflowMenuButtonProps) => {
  const { collectionId, isOwner } = props
  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) =>
      pick(
        collection,
        'is_album',
        'playlist_name',
        'is_private',
        'is_stream_gated',
        'playlist_owner_id',
        'has_current_user_saved',
        'permalink',
        'access',
        'ddex_app'
      )
  })
  const dispatch = useDispatch()
  const {
    is_album,
    playlist_name,
    is_private,
    is_stream_gated,
    playlist_owner_id,
    has_current_user_saved,
    permalink,
    access,
    ddex_app
  } = partialCollection ?? {}

  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false)

  const { data: owner } = useUser(playlist_owner_id)
  const isFollowing = owner?.does_current_user_follow
  const hasStreamAccess = access?.stream

  const handleFollow = useCallback(() => {
    if (!playlist_owner_id) return
    if (isFollowing) {
      dispatch(unfollowUser(playlist_owner_id, FollowSource.COLLECTION_PAGE))
    } else {
      dispatch(followUser(playlist_owner_id, FollowSource.COLLECTION_PAGE))
    }
  }, [isFollowing, dispatch, playlist_owner_id])

  const extraMenuItems = !isOwner
    ? [
        {
          text: isFollowing ? messages.unfollow : messages.follow,
          onClick: handleFollow
        }
      ]
    : []

  const overflowMenu = {
    type: is_album ? ('album' as const) : ('playlist' as const),
    playlistId: collectionId,
    playlistName: playlist_name,
    handle: owner?.handle,
    isFavorited: has_current_user_saved,
    mount: 'page',
    isOwner,
    ddexApp: ddex_app,
    includeDelete: isOwner && !ddex_app,
    includeEmbed: !is_private && !is_stream_gated,
    includeFavorite: hasStreamAccess,
    includeRepost: hasStreamAccess,
    includeShare: true,
    includeVisitPage: false,
    isPublic: !is_private,
    onDelete: () => setIsDeleteConfirmationOpen(true),
    extraMenuItems,
    permalink
  } as unknown as CollectionMenuProps

  return (
    <>
      <Menu menu={overflowMenu}>
        {(ref, triggerPopup) => (
          <IconButton
            ref={ref}
            aria-label={messages.moreOptions}
            size='2xl'
            icon={IconKebabHorizontal}
            onClick={() => triggerPopup()}
            color='subdued'
          />
        )}
      </Menu>
      <DeleteCollectionConfirmationModal
        collectionId={collectionId}
        visible={isDeleteConfirmationOpen}
        onCancel={() => setIsDeleteConfirmationOpen(false)}
      />
    </>
  )
}
