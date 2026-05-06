import { IconAlbum, IconNote, IconPlaylists, IconUser } from '@audius/harmony'

import { Category } from './types'

export const categories = {
  all: {
    filters: [
      'genre',
      'mood',
      'key',
      'bpm',
      'isPremium',
      'hasDownloads',
      'isVerified'
    ]
  },
  profiles: { icon: IconUser, filters: ['genre', 'isVerified'] },
  tracks: {
    icon: IconNote,
    filters: [
      'genre',
      'mood',
      'key',
      'bpm',
      'isPremium',
      'hasDownloads',
      'isVerified'
    ]
  },
  albums: {
    icon: IconAlbum,
    filters: ['genre', 'mood', 'isPremium', 'hasDownloads', 'isVerified']
  },
  playlists: { icon: IconPlaylists, filters: ['genre', 'mood', 'isVerified'] }
} satisfies Record<string, Category>
