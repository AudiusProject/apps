import { useCallback } from 'react'

import {
  useCurrentAccount,
  useCurrentUserId,
  useMarkPlaylistAsViewed,
  usePlaylistHasUpdate
} from '@audius/common/api'

import { CollectionNavItem } from './CollectionNavItem'

type PlaylistNavItemProps = {
  playlistId: number
  level: number
  isChild?: boolean
}

export const PlaylistNavItem = (props: PlaylistNavItemProps) => {
  const { playlistId, level, isChild } = props
  const { data: currentUserId } = useCurrentUserId()

  const { data: accountCollection } = useCurrentAccount({
    select: (account) => account?.collections?.[playlistId]
  })
  const { name, permalink, user } = accountCollection ?? {}

  const isOwnedByCurrentUser = user?.id === currentUserId

  const { data: hasPlaylistUpdate = false } = usePlaylistHasUpdate(playlistId)
  const { mutate: markPlaylistAsViewed } = useMarkPlaylistAsViewed()

  const handleClick = useCallback(() => {
    if (hasPlaylistUpdate) {
      markPlaylistAsViewed({ playlistId })
    }
  }, [hasPlaylistUpdate, markPlaylistAsViewed, playlistId])

  if (!name || !permalink || !user) return null
  return (
    <CollectionNavItem
      id={playlistId}
      name={name}
      url={permalink}
      isOwned={isOwnedByCurrentUser}
      level={level}
      isChild={isChild}
      hasUpdate={hasPlaylistUpdate}
      onClick={handleClick}
      exact
    />
  )
}
