import { useCallback } from 'react'

import { useCreatePlaylistModal } from '@audius/common/store'

import { LeftNavLink } from '../LeftNavLink'

const messages = {
  empty: 'Create your first playlist!'
}

export const EmptyLibraryNavLink = () => {
  const { onOpen: openCreatePlaylistModal } = useCreatePlaylistModal()

  const handleCreatePlaylist = useCallback(() => {
    openCreatePlaylistModal({ isAlbum: false })
  }, [openCreatePlaylistModal])

  return (
    <LeftNavLink disabled onClick={handleCreatePlaylist}>
      {messages.empty}
    </LeftNavLink>
  )
}
