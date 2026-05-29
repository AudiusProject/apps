import { useCallback, useMemo, useState } from 'react'

import { useCurrentAccount, useUpdatePlaylistLibrary } from '@audius/common/api'
import {
  playlistLibraryHelpers,
  useDuplicatePlaylistModal
} from '@audius/common/store'
import {
  IconButton,
  IconCopy,
  IconFolder,
  IconPlaylists,
  IconPlus,
  PopupMenu,
  PopupMenuItem
} from '@audius/harmony'
import { useNavigate } from 'react-router'

import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { CREATE_PLAYLIST_PAGE } from 'utils/route'

const { addFolderToLibrary, constructPlaylistFolder } = playlistLibraryHelpers

const messages = {
  new: 'New',
  newPlaylistOrFolderTooltip: 'New Playlist or Folder',
  createPlaylist: 'Create Playlist',
  duplicatePlaylist: 'Duplicate Playlist',
  createFolder: 'Create Folder',
  newFolderName: 'New Folder'
}

// Allows user to create a playlist or playlist-folder
export const CreatePlaylistLibraryItemButton = () => {
  const { data: library } = useCurrentAccount({
    select: (account) => account?.playlistLibrary
  })
  const { mutate: updatePlaylistLibrary } = useUpdatePlaylistLibrary()
  const { onOpen: openDuplicatePlaylistModal } = useDuplicatePlaylistModal()
  const navigate = useNavigate()
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleSubmitPlaylist = useCallback(() => {
    navigate(CREATE_PLAYLIST_PAGE)
  }, [navigate])

  const handleDuplicatePlaylist = useCallback(() => {
    openDuplicatePlaylistModal({ isAlbum: false })
  }, [openDuplicatePlaylistModal])

  const handleSubmitFolder = useCallback(() => {
    if (!library) return null
    const newLibrary = addFolderToLibrary(
      library,
      constructPlaylistFolder(messages.newFolderName)
    )
    updatePlaylistLibrary(newLibrary)
  }, [library, updatePlaylistLibrary])

  // Gate triggering popup behind authentication
  const handleClickPill = useRequiresAccountCallback(
    (triggerPopup: () => void) => {
      triggerPopup()
    },
    []
  )

  const items: PopupMenuItem[] = useMemo(
    () => [
      {
        text: messages.createPlaylist,
        icon: <IconPlaylists />,
        onClick: handleSubmitPlaylist
      },
      {
        text: messages.duplicatePlaylist,
        icon: <IconCopy />,
        onClick: handleDuplicatePlaylist
      },
      {
        text: messages.createFolder,
        icon: <IconFolder />,
        onClick: handleSubmitFolder
      }
    ],
    [handleSubmitPlaylist, handleDuplicatePlaylist, handleSubmitFolder]
  )

  return (
    <PopupMenu
      items={items}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      renderTrigger={(anchorRef, onClick, triggerProps) => (
        <IconButton
          ref={anchorRef}
          icon={IconPlus}
          onClick={() => handleClickPill(onClick)}
          onMouseDown={() => setIsActive(true)}
          onMouseUp={() => setIsActive(false)}
          onMouseLeave={() => {
            setIsActive(false)
            setIsHovered(false)
          }}
          onMouseEnter={() => setIsHovered(true)}
          aria-label={messages.newPlaylistOrFolderTooltip}
          size='m'
          color={isActive || isHovered ? 'default' : 'subdued'}
          {...(triggerProps as Omit<typeof triggerProps, 'color'>)}
        />
      )}
    />
  )
}
