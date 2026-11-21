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

  useEffect(() => {
    if (status === Status.SUCCESS && isRefreshing) {
      setIsRefreshing(false)
    }
  }, [status, isRefreshing])

  const handleRefresh = useCallback(() => {
    if (profile) {
      setIsRefreshing(true)
      queryClient.invalidateQueries({
        queryKey: getUserByHandleQueryKey(handleLower)
      })
      queryClient.invalidateQueries({
        queryKey: getUserQueryKey(profile.user_id)
      })

      queryClient.invalidateQueries({
        queryKey: getUserPlaylistsQueryKey({ userId: profile.user_id })
      })
      queryClient.invalidateQueries({
        queryKey: getUserAlbumsQueryKey({ userId: profile.user_id })
      })

      switch (currentTab) {
        case ProfilePageTabs.TRACKS:
          queryClient.resetQueries({
            queryKey: getProfileTracksQueryKey({
              handle: handleLower
            })
          })
          break
        case ProfilePageTabs.ALBUMS:
          queryClient.resetQueries({
            queryKey: getUserAlbumsQueryKey({ userId: profile.user_id })
          })
          break
        case ProfilePageTabs.PLAYLISTS:
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
