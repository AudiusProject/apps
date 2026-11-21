import { AccountCollection } from '~/models/Collection'
import { Nullable } from '~/utils/typeUtils'
import { uuid } from '~/utils/uid'

import { ID } from '../../models/Identifiers'
import {
  PlaylistLibrary,
  PlaylistLibraryIdentifier,
  PlaylistLibraryFolder,
  PlaylistLibraryID
} from '../../models/PlaylistLibrary'

export const findInPlaylistLibrary = (
  library: Nullable<PlaylistLibrary | PlaylistLibraryFolder>,
  playlistId: ID | string
): PlaylistLibraryIdentifier | false => {
  if (!library || !library.contents) return false

  for (const item of library.contents) {
    switch (item.type) {
      case 'folder': {
        const contains = findInPlaylistLibrary(item, playlistId)
        if (contains) return contains
        break
      }
      case 'playlist':
        if (item.playlist_id === playlistId) return item
        break
    }
  }
  return false
}

export const findIndexInPlaylistLibrary = (
  library: PlaylistLibrary | PlaylistLibraryFolder,
  entityId: ID | string
): number | number[] | -1 => {
  if (!library.contents) return -1

  for (const [i, item] of library.contents.entries()) {
    switch (item.type) {
      case 'folder': {
        if (item.id === entityId) return i
        const indexInFolder = findIndexInPlaylistLibrary(item, entityId)
        if (indexInFolder !== -1) {
          return [i].concat(indexInFolder)
        }
        break
      }
      case 'playlist':
        if (item.playlist_id === entityId) return i
        break
    }
  }
  return -1
}

export const removeFromPlaylistLibrary = (
  library: PlaylistLibrary | PlaylistLibraryFolder,
  entityId: ID | string
): {
  library: PlaylistLibrary | PlaylistLibraryFolder
  removed: PlaylistLibraryIdentifier | PlaylistLibraryFolder | null
} => {
  if (!library.contents) return { library, removed: null }

  const newContents: (PlaylistLibraryFolder | PlaylistLibraryIdentifier)[] = []
  let removed: PlaylistLibraryIdentifier | PlaylistLibraryFolder | null = null
  for (const item of library.contents) {
    let newItem: PlaylistLibraryFolder | PlaylistLibraryIdentifier | null = item
    switch (item.type) {
      case 'folder': {
        if (item.id === entityId) {
          removed = item
          newItem = null
        } else {
          const res = removeFromPlaylistLibrary(item, entityId)
          if (res.removed) {
            removed = res.removed
          }
          newItem = {
            id: item.id,
            type: item.type,
            name: item.name,
            contents: res.library.contents
          }
        }
        break
      }
      case 'playlist':
        if (item.playlist_id === entityId) {
          removed = item
          newItem = null
        }
        break
    }
    if (newItem) {
      newContents.push(newItem)
    }
  }
  return {
    library: {
      ...library,
      contents: newContents
    },
    removed
  }
}

export const constructPlaylistFolder = (
  name: string,
  contents: (PlaylistLibraryFolder | PlaylistLibraryIdentifier)[] = []
): PlaylistLibraryFolder => {
  return {
    id: uuid(),
    type: 'folder',
    name,
    contents
  }
}

const playlistIdToPlaylistLibraryIdentifier = (
  playlistId: ID | string
): Nullable<PlaylistLibraryIdentifier> => {
  if (typeof playlistId === 'number') {
    return {
      type: 'playlist',
      playlist_id: playlistId
    }
  }
  return null
}

export const addPlaylistToFolder = (
  library: PlaylistLibrary,
  playlistId: ID,
  folderId: string
): PlaylistLibrary => {
  if (!library.contents) return library
  let folderIndex = library.contents.findIndex((item) => {
    return item.type === 'folder' && item.id === folderId
  })
  if (folderIndex < 0) return library
  const folder = library.contents[folderIndex] as PlaylistLibraryFolder
  if (findInPlaylistLibrary(folder, playlistId) !== false) {
    return library
  }

  let entry: PlaylistLibraryIdentifier | null
  const { library: newLibrary, removed } = removeFromPlaylistLibrary(
    library,
    playlistId
  )

  if (removed?.type === 'folder') {
    return library
  }
  entry = removed as PlaylistLibraryIdentifier

  if (!entry) {
    entry = playlistIdToPlaylistLibraryIdentifier(playlistId)
  } else {
    folderIndex = newLibrary.contents.findIndex((item) => {
      return item.type === 'folder' && item.id === folderId
    })
  }
  const updatedFolder = reorderPlaylistLibrary(
    folder,
    playlistId,
    -1
  ) as PlaylistLibraryFolder
  const newContents = [...newLibrary.contents]

  newContents.splice(folderIndex, 1, updatedFolder)

  return {
    ...newLibrary,
    contents: newContents
  }
}

export const renamePlaylistFolderInLibrary = (
  library: PlaylistLibrary,
  folderId: string,
  newName: string
): PlaylistLibrary => {
  if (!library.contents) return library
  const folderIndex = library.contents.findIndex((item) => {
    return item.type === 'folder' && item.id === folderId
  })
  if (folderIndex < 0) return library
  const folder = library.contents[folderIndex]
  const updatedFolder = { ...folder, name: newName }
  const newContents = [...library.contents]
  newContents.splice(folderIndex, 1, updatedFolder)
  return {
    ...library,
    contents: newContents
  }
}

export const removePlaylistFolderInLibrary = (
  library: PlaylistLibrary,
  folderId: string
): PlaylistLibrary => {
  if (!library.contents) return library
  const folder = library.contents.find((item) => {
    return item.type === 'folder' && item.id === folderId
    // Need to cast here because TS doesn't know that the result has to be a folder or undefined due to `item.type === 'folder'`
  }) as PlaylistLibraryFolder | undefined
  if (!folder) return library
  const folderIndex = library.contents.findIndex((item) => {
    return item.type === 'folder' && item.id === folderId
  })
  const newContents = [...library.contents]
  const removedFolderContents = folder.contents
  newContents.splice(folderIndex, 1, ...removedFolderContents)
  return {
    ...library,
    contents: newContents
  }
}

export const addFolderToLibrary = (
  library: PlaylistLibrary | null,
  folder: PlaylistLibraryFolder
): PlaylistLibrary => {
  return {
    ...(library || {}),
    contents: [folder, ...(library?.contents || [])]
  }
}

export const removePlaylistLibraryDuplicates = (
  library: PlaylistLibrary | PlaylistLibraryFolder,
  ids: Set<string> = new Set([])
) => {
  if (!library.contents) return library
  const newContents: (PlaylistLibraryFolder | PlaylistLibraryIdentifier)[] = []

  for (const item of library.contents) {
    switch (item.type) {
      case 'folder': {
        if (ids.has(item.id)) {
          break
        }
        ids.add(item.id)
        const folder = removePlaylistLibraryDuplicates(
          item,
          ids
        ) as PlaylistLibraryFolder
        newContents.push(folder)
        break
      }
      case 'playlist':
        if (ids.has(`${item.playlist_id}`)) {
          break
        }
        ids.add(`${item.playlist_id}`)
        newContents.push(item)
        break
    }
  }
  return {
    ...library,
    contents: newContents
  }
}

export const reorderPlaylistLibrary = (
  library: PlaylistLibrary | PlaylistLibraryFolder,
  draggingId: PlaylistLibraryID,
  droppingId: PlaylistLibraryID,
  draggingKind = 'library-playlist',
  reorderBeforeTarget = false
) => {
  let entry: PlaylistLibraryIdentifier | PlaylistLibraryFolder | null
  const { library: newLibrary, removed } = removeFromPlaylistLibrary(
    library,
    draggingId
  )
  entry = removed
  if (!entry) {
    if (draggingKind === 'playlist-folder') {
      return library
    } else {
      entry = playlistIdToPlaylistLibraryIdentifier(draggingId)
    }
  }

  const newContents = [...newLibrary.contents]

  if (!entry) return { ...library, contents: newContents }

  let index: number | number[]
  if (droppingId === -1) {
    index = 0
  } else {
    const found = findIndexInPlaylistLibrary(newLibrary, droppingId)
    if (found === -1) return library
    const indexShift = reorderBeforeTarget ? 0 : 1
    if (Array.isArray(found)) {
      index = [found[0], found[1] + indexShift]
    } else {
      index = found + indexShift
    }
  }
  if (Array.isArray(index)) {
    const folderIndex = index[0]
    const dropIndex = index[1]
    const folder = newContents[folderIndex] as PlaylistLibraryFolder
    const updatedFolderContents = [...folder.contents]
    updatedFolderContents.splice(dropIndex, 0, entry)
    const updatedFolder = { ...folder, contents: updatedFolderContents }
    newContents.splice(folderIndex, 1, updatedFolder)
  } else {
    newContents.splice(index, 0, entry)
  }
  return {
    ...library,
    contents: newContents
  }
}

export const isInsideFolder = (
  library: PlaylistLibrary | PlaylistLibraryFolder,
  id: ID | string
): boolean => {
  return Array.isArray(findIndexInPlaylistLibrary(library, id))
}

export const getPlaylistsNotInLibrary = (
  library: PlaylistLibrary | null,
  playlists: {
    [id: number]: AccountCollection
  }
) => {
  const result = { ...playlists }
  const helpComputePlaylistsNotInLibrary = (
    libraryContentsLevel: PlaylistLibrary['contents']
  ) => {
    libraryContentsLevel.forEach((content) => {
      if (content.type === 'playlist') {
        const playlist = playlists[Number(content.playlist_id)]
        if (playlist) {
          delete result[Number(content.playlist_id)]
        }
      } else if (content.type === 'folder') {
        helpComputePlaylistsNotInLibrary(content.contents)
      }
    })
  }
  if (library && playlists) {
    helpComputePlaylistsNotInLibrary(library.contents)
  }
  return result
}
