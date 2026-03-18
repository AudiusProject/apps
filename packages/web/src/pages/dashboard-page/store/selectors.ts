import { UserMetadata } from '@audius/common/models'
import { createSelector } from 'reselect'

import { AppState } from 'store/types'

// Dashboard selectors
export const getDashboardTracksStatus = (state: AppState) =>
  state.dashboard.tracksStatus
export const getDashboardStatus = (state: AppState) => state.dashboard.status
export const getDashboardListenData = (state: AppState) =>
  state.dashboard.listenData
const getDashboardTracks = (state: AppState) => state.dashboard.tracks

export const makeGetDashboard = (
  accountUser: UserMetadata | null | undefined
) => {
  return createSelector([getDashboardTracks], (tracks) => {
    let stats
    if (accountUser?.track_count) {
      // Artist stats
      stats = {
        tracks: accountUser ? accountUser.track_count : 0,
        albums: accountUser ? accountUser.album_count : 0,
        plays: tracks.reduce(
          (totalPlays, track) => totalPlays + (track.play_count || 0),
          0
        ),
        // downloads: fetched separately via useTrackDownloadCounts, merged in DashboardPage
        reposts: accountUser ? accountUser.repost_count : 0,
        followers: accountUser ? accountUser.follower_count : 0
      }
    } else {
      // User stats
      stats = {
        playlists: accountUser ? accountUser.playlist_count : 0,
        following: accountUser ? accountUser.followee_count : 0,
        followers: accountUser ? accountUser.follower_count : 0
      }
    }
    return {
      account: accountUser,
      tracks,
      stats
    }
  })
}
