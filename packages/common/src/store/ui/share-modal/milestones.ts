import { ID } from '~/models/Identifiers'

// Keep both lists in sync with pedalboard's notifications app, which decides
// which pushes open the stat card.

/** Play counts big enough to offer a stat card */
const SHARE_CARD_PLAY_THRESHOLDS = new Set([
  1000, 5000, 10000, 50000, 100000, 500000, 1000000
])

/** Editorial playlists a stat card can celebrate, by production playlist id */
const FEATURED_PLAYLIST_NAMES: Record<ID, string> = {
  4281: 'Hot & New',
  1795117483: 'All Things Bass'
}

export const isShareCardPlayMilestone = (threshold: number) =>
  SHARE_CARD_PLAY_THRESHOLDS.has(threshold)

export const getFeaturedPlaylistName = (playlistId: ID): string | undefined =>
  FEATURED_PLAYLIST_NAMES[playlistId]
