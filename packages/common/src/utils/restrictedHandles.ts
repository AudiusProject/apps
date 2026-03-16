import { Mood } from '@audius/sdk/services'

import { GENRES } from './genres'

const filteredGenres = GENRES.reduce((acc, genre: string) => {
  acc = acc.concat(genre.split('/'))
  return acc
}, [] as string[]).map((genre) =>
  genre.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
)

export const restrictedHandles = new Set(
  [
    'discover',
    'account',
    'collection',
    'curated',
    'podcast',
    'library',
    'next',
    'suggested',
    'follow',
    'stats',
    'radio',
    'like',
    'repost',
    'share',
    'social',
    'artist',
    'options',
    'billing',
    'support',
    'genre',
    'mood',
    'collections',
    'podcasts',
    'libraries',
    'suggestions',
    'following',
    'stations',
    'likes',
    'reposts',
    'artists',
    'notification',
    'message',
    'inbox',
    'genres',
    'moods',
    'embed',
    'crypto',
    'payment',
    'error',
    'search',
    'api',
    '200',
    '204',
    '400',
    '404',

    // ===== Moods =====
    ...Object.keys(Mood),
    // ===== Genre =====
    ...filteredGenres
  ].map((h) => h.toLowerCase())
)
