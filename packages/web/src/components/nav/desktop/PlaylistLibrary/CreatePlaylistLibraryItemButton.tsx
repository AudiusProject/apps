import { useCallback, useMemo, useState } from 'react'

import { useCurrentAccount, useUpdatePlaylistLibrary } from '@audius/common/api'
import { CreatePlaylistSource } from '@audius/common/models'
import {
  cacheCollectionsActions,
  playlistLibraryHelpers
} from '@audius/common/store'
import {
  IconButton,
  IconFolder,
  IconPlaylists,
  IconPlus,
  PopupMenu,
  PopupMenuItem
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'

const { createPlaylist } = cacheCollectionsActions
const { addFolderToLibrary, constructPlaylistFolder } = playlistLibraryHelpers

const messages = {
  new: 'New',
  newPlaylistOrFolderTooltip: 'New Playlist or Folder',
  createPlaylist: 'Create Playlist',
  createFolder: 'Create Folder',
  newPlaylistName: 'New Playlist',
  newFolderName: 'New Folder'
}

// Allows user to create a playlist or playlist-folder
export const CreatePlaylistLibraryItemButton = () => {
  const dispatch = useDispatch()
  const { data: library } = useCurrentAccount({
    select: (account) => account?.playlistLibrary
  })
  const { mutate: updatePlaylistLibrary } = useUpdatePlaylistLibrary()
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleSubmitPlaylist = useCallback(() => {
    dispatch(
      createPlaylist(
        { playlist_name: messages.newPlaylistName },
        CreatePlaylistSource.NAV
      )
    )
  }, [dispatch])

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
        text: messages.createFolder,
        icon: <IconFolder />,
        onClick: handleSubmitFolder
      }
    ],
    [handleSubmitPlaylist, handleSubmitFolder]
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
