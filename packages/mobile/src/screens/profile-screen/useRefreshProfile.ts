import { useCallback, useState, useEffect } from 'react'

import {
  getProfileRepostsQueryKey,
  getProfileTracksQueryKey,
  getUserAlbumsQueryKey,
  getUserByHandleQueryKey,
  getUserPlaylistsQueryKey,
  getUserQueryKey
} from '@audius/common/api'
import { Status } from '@audius/common/models'
import { profilePageSelectors, ProfilePageTabs } from '@audius/common/store'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

const { getProfileStatus } = profilePageSelectors

export const useRefreshProfile = (
  profile: { user_id: number } | null | undefined,
  handleLower: string,
  currentTab: ProfilePageTabs
) => {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const status = useSelector((state) => getProfileStatus(state, handleLower))

  // Reset isRefreshing when status becomes SUCCESS
  useEffect(() => {
    if (status === Status.SUCCESS && isRefreshing) {
      setIsRefreshing(false)
    }
  }, [status, isRefreshing])

  const handleRefresh = useCallback(() => {
    if (profile) {
      setIsRefreshing(true)
      // Invalidate user metadata queries
      queryClient.invalidateQueries({
        queryKey: getUserByHandleQueryKey(handleLower)
      })
      queryClient.invalidateQueries({
        queryKey: getUserQueryKey(profile.user_id)
      })

      // Invalidate user playlists and albums
      queryClient.invalidateQueries({
        queryKey: getUserPlaylistsQueryKey({ userId: profile.user_id })
      })
      queryClient.invalidateQueries({
        queryKey: getUserAlbumsQueryKey({ userId: profile.user_id })
      })

      // Handle tab-specific queries
      switch (currentTab) {
        case ProfilePageTabs.TRACKS:
          queryClient.resetQueries({
            queryKey: getProfileTracksQueryKey({
              handle: handleLower
            })
          })
          break
        case ProfilePageTabs.ALBUMS:
          // Albums are already invalidated above, but also reset for immediate refresh
          queryClient.resetQueries({
            queryKey: getUserAlbumsQueryKey({ userId: profile.user_id })
          })
          break
        case ProfilePageTabs.PLAYLISTS:
          // Playlists are already invalidated above, but also reset for immediate refresh
          queryClient.resetQueries({
            queryKey: getUserPlaylistsQueryKey({ userId: profile.user_id })
          })
          break
        case ProfilePageTabs.REPOSTS:
          queryClient.resetQueries({
            queryKey: getProfileRepostsQueryKey({
              handle: handleLower
            })
          })
          break
      }
    }
  }, [profile, handleLower, currentTab, queryClient])

  return {
    handleRefresh,
    isRefreshing
  }
}
