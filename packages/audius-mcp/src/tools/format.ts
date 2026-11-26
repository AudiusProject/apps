import type { Playlist, Track, User } from '@audius/sdk'

const SITE_URL = 'https://audius.co'

const truncate = (value: string | undefined, max: number) =>
  value && value.length > max ? `${value.slice(0, max)}…` : value

const toIsoDate = (value: Date | string | undefined) => {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export const formatUserRef = (user: User | undefined) =>
  user
    ? {
        id: user.id,
        handle: user.handle,
        name: user.name,
        is_verified: user.isVerified
      }
    : undefined

export const formatUser = (user: User) => ({
  id: user.id,
  handle: user.handle,
  name: user.name,
  is_verified: user.isVerified,
  bio: truncate(user.bio, 500),
  location: user.location,
  follower_count: user.followerCount,
  following_count: user.followeeCount,
  track_count: user.trackCount,
  playlist_count: user.playlistCount,
  album_count: user.albumCount,
  url: `${SITE_URL}/${user.handle}`
})

export const formatTrack = (track: Track) => ({
  id: track.id,
  title: track.title,
  artist: formatUserRef(track.user),
  genre: track.genre,
  mood: track.mood,
  tags: track.tags ? track.tags.split(',').filter(Boolean) : [],
  description: truncate(track.description, 500),
  duration_seconds: track.duration,
  release_date: toIsoDate(track.releaseDate),
  play_count: track.playCount,
  favorite_count: track.favoriteCount,
  repost_count: track.repostCount,
  comment_count: track.commentCount,
  is_unlisted: track.isUnlisted,
  is_stream_gated: track.isStreamGated,
  url: `${SITE_URL}${track.permalink}`
})

export const formatTrackStats = (track: Track) => ({
  id: track.id,
  title: track.title,
  play_count: track.playCount,
  favorite_count: track.favoriteCount,
  repost_count: track.repostCount,
  comment_count: track.commentCount,
  release_date: toIsoDate(track.releaseDate),
  url: `${SITE_URL}${track.permalink}`
})

export const formatPlaylist = (playlist: Playlist) => ({
  id: playlist.id,
  name: playlist.playlistName,
  owner: formatUserRef(playlist.user),
  description: truncate(playlist.description, 500),
  is_album: playlist.isAlbum,
  is_private: playlist.isPrivate,
  track_count: playlist.trackCount,
  favorite_count: playlist.favoriteCount,
  repost_count: playlist.repostCount,
  total_play_count: playlist.totalPlayCount,
  url: `${SITE_URL}${playlist.permalink}`
})
