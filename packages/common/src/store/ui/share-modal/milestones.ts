import { ID } from '~/models/Identifiers'

const SHARE_CARD_PLAY_THRESHOLDS = new Set([
  1000, 5000, 10000, 50000, 100000, 500000, 1000000
])

const FEATURED_PLAYLIST_NAMES: Record<ID, string> = {
  4281: 'Hot & New',
  1795117483: 'All Things Bass'
}

export const isShareCardPlayMilestone = (threshold: number) =>
  SHARE_CARD_PLAY_THRESHOLDS.has(threshold)

export const getFeaturedPlaylistName = (playlistId: ID): string | undefined =>
  FEATURED_PLAYLIST_NAMES[playlistId]
