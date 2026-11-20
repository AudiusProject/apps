import type { User } from '@audius/common/models'

export type StoryArtist = Pick<User, 'user_id' | 'name' | 'instagram_handle'>

/**
 * The artist credit on a story card: display name, plus their Instagram
 * handle when they've linked one, so viewers can find them on Instagram.
 * Falls back to the display name alone.
 */
export const formatStoryArtist = (artist: StoryArtist | undefined) => {
  if (!artist) return ''
  const instagram = artist.instagram_handle?.trim().replace(/^@+/, '')
  return instagram ? `${artist.name} · @${instagram}` : artist.name
}
