import { useEffect } from 'react'

import { useCurrentAccount, useUpdatePlaylistLibrary } from '@audius/common/api'
import { PlaylistLibraryFolder } from '@audius/common/models'

export const useSanitizePlaylistLibrary = () => {
  const { data: library } = useCurrentAccount({
    select: (account) => account?.playlistLibrary
  })
  const { mutate: updatePlaylistLibrary } = useUpdatePlaylistLibrary()

  useEffect(() => {
    if (!library) return
    let hasIssue = false

    const newLibrary = { ...library }

    // checks for issue where folders are incorrectly represented as playlists
    newLibrary.contents = newLibrary.contents.map((content) => {
      if ('contents' in content && content.type !== 'folder') {
        hasIssue = true
        const { id, name, contents } = content as PlaylistLibraryFolder
        return { id, name, contents, type: 'folder' }
      }
      return content
    })

    if (hasIssue) {
      updatePlaylistLibrary(newLibrary)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!library])
}
