import { Genre as SDKGenre } from '@audius/sdk'

/** Re-export SDK Genre as the canonical source for track metadata. */
export { Genre } from '@audius/sdk'

/**
 * Track genre value. Any string up to 100 chars is accepted at the API/SDK
 * layer; the {@link Genre} enum provides the canonical autocomplete values.
 * Use this type for read-side / metadata typings so custom-genre tracks
 * flow through without TS errors. Continue using `Genre` for write-side
 * autocomplete sources and static lists where only known values are valid.
 */
export type { GenreString } from '@audius/sdk'

/**
 * UI-only value for "all genres" filter (e.g. trending page).
 * Not part of SDK Genre - use for filter state only.
 */
export const ALL_GENRES = 'All Genres' as const
export type AllGenres = typeof ALL_GENRES

export const ELECTRONIC_PREFIX = 'Electronic - '

export const ELECTRONIC_SUBGENRES: Partial<
  Record<SDKGenre, `${typeof ELECTRONIC_PREFIX}${SDKGenre}`>
> = {
  [SDKGenre.Techno]: `${ELECTRONIC_PREFIX}${SDKGenre.Techno}`,
  [SDKGenre.Trap]: `${ELECTRONIC_PREFIX}${SDKGenre.Trap}`,
  [SDKGenre.House]: `${ELECTRONIC_PREFIX}${SDKGenre.House}`,
  [SDKGenre.TechHouse]: `${ELECTRONIC_PREFIX}${SDKGenre.TechHouse}`,
  [SDKGenre.DeepHouse]: `${ELECTRONIC_PREFIX}${SDKGenre.DeepHouse}`,
  [SDKGenre.Disco]: `${ELECTRONIC_PREFIX}${SDKGenre.Disco}`,
  [SDKGenre.Electro]: `${ELECTRONIC_PREFIX}${SDKGenre.Electro}`,
  [SDKGenre.Jungle]: `${ELECTRONIC_PREFIX}${SDKGenre.Jungle}`,
  [SDKGenre.ProgressiveHouse]: `${ELECTRONIC_PREFIX}${SDKGenre.ProgressiveHouse}`,
  [SDKGenre.Hardstyle]: `${ELECTRONIC_PREFIX}${SDKGenre.Hardstyle}`,
  [SDKGenre.GlitchHop]: `${ELECTRONIC_PREFIX}${SDKGenre.GlitchHop}`,
  [SDKGenre.Trance]: `${ELECTRONIC_PREFIX}${SDKGenre.Trance}`,
  [SDKGenre.FutureBass]: `${ELECTRONIC_PREFIX}${SDKGenre.FutureBass}`,
  [SDKGenre.FutureHouse]: `${ELECTRONIC_PREFIX}${SDKGenre.FutureHouse}`,
  [SDKGenre.TropicalHouse]: `${ELECTRONIC_PREFIX}${SDKGenre.TropicalHouse}`,
  [SDKGenre.Downtempo]: `${ELECTRONIC_PREFIX}${SDKGenre.Downtempo}`,
  [SDKGenre.DrumBass]: `${ELECTRONIC_PREFIX}${SDKGenre.DrumBass}`,
  [SDKGenre.Dubstep]: `${ELECTRONIC_PREFIX}${SDKGenre.Dubstep}`,
  [SDKGenre.JerseyClub]: `${ELECTRONIC_PREFIX}${SDKGenre.JerseyClub}`,
  [SDKGenre.Vaporwave]: `${ELECTRONIC_PREFIX}${SDKGenre.Vaporwave}`,
  [SDKGenre.Moombahton]: `${ELECTRONIC_PREFIX}${SDKGenre.Moombahton}`
}

export const getCanonicalName = (genre: SDKGenre | string) => {
  if (genre in ELECTRONIC_SUBGENRES)
    return ELECTRONIC_SUBGENRES[genre as SDKGenre]
  return genre
}

/** User-facing genre labels. Use `convertGenreLabelToValue` to get the correct genre value (to set as the genre in track metadata). */
export const GENRES = [
  SDKGenre.Electronic,
  SDKGenre.Rock,
  SDKGenre.Metal,
  SDKGenre.Alternative,
  SDKGenre.HipHopRap,
  SDKGenre.Experimental,
  SDKGenre.Punk,
  SDKGenre.Folk,
  SDKGenre.Pop,
  SDKGenre.Ambient,
  SDKGenre.Soundtrack,
  SDKGenre.World,
  SDKGenre.Jazz,
  SDKGenre.Acoustic,
  SDKGenre.Funk,
  SDKGenre.RbSoul,
  SDKGenre.Devotional,
  SDKGenre.Classical,
  SDKGenre.Reggae,
  SDKGenre.Podcasts,
  SDKGenre.Country,
  SDKGenre.SpokenWord,
  SDKGenre.Comedy,
  SDKGenre.Blues,
  SDKGenre.Kids,
  SDKGenre.Audiobooks,
  SDKGenre.Latin,
  SDKGenre.LoFi,
  SDKGenre.Hyperpop,
  SDKGenre.Dancehall,
  ...Object.values(ELECTRONIC_SUBGENRES)
] as const

export type GenreLabel = (typeof GENRES)[number]

export const convertGenreLabelToValue = (genreLabel: GenreLabel): SDKGenre => {
  return genreLabel.replace(ELECTRONIC_PREFIX, '') as SDKGenre
}

/**
 * Converts a string from the trending genre UI (e.g. from URL or genre list)
 * into Genre | null for Redux state. Returns null for null, empty, or ALL_GENRES.
 */
export const parseTrendingGenreFromUrl = (
  param: string | null
): SDKGenre | null => {
  if (param === null || param === '' || param === ALL_GENRES) return null
  const genresList = GENRES as readonly string[]
  if (!genresList.includes(param)) return null
  const trimmed = param.startsWith(ELECTRONIC_PREFIX)
    ? param.slice(ELECTRONIC_PREFIX.length)
    : param
  return trimmed as SDKGenre
}

/**
 * Converts a genre string from UI (e.g. from GenreSelectionList) to Genre | null
 * for setTrendingGenre. Use when the value is known to come from GENRES.
 */
export const toTrendingGenre = (value: string | null): SDKGenre | null => {
  if (value === null || value === '' || value === ALL_GENRES) return null
  const genresList = GENRES as readonly string[]
  if (!genresList.includes(value)) return null
  return convertGenreLabelToValue(value as GenreLabel)
}

/**
 * Converts a genre label from the trending filter UI into the value stored in
 * trending state. Unlike {@link toTrendingGenre}, this accepts freeform /
 * community genres that are not part of the static {@link GENRES} list, so the
 * dynamic popular-genres filter can select long-tail genres. Strips the
 * Electronic prefix for the static electronic subgenres and maps the
 * {@link ALL_GENRES} sentinel / empty values to null.
 */
export const toTrendingGenreValue = (value: string | null): SDKGenre | null => {
  if (value === null || value === '' || value === ALL_GENRES) return null
  return (
    value.startsWith(ELECTRONIC_PREFIX)
      ? value.slice(ELECTRONIC_PREFIX.length)
      : value
  ) as SDKGenre
}

const NEWLY_ADDED_GENRES: string[] = []

export const TRENDING_GENRES = GENRES.filter(
  (g) => !NEWLY_ADDED_GENRES.includes(g)
)

export type GenreSuggestion = {
  label: string
  value: string
  count?: number
}

const GENRE_WORDS_TO_UPPERCASE = new Set([
  'dj',
  'edm',
  'idm',
  'r&b',
  'uk',
  'us'
])

export const normalizeGenre = (genre: string) => {
  const trimmed = genre.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''

  return trimmed
    .split(/(\s|-|\/)/)
    .map((part) => {
      if (part === ' ' || part === '-' || part === '/') return part

      const lower = part.toLowerCase()
      if (GENRE_WORDS_TO_UPPERCASE.has(lower)) return lower.toUpperCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

export const getGenreSuggestionKey = (genre: string) =>
  genre.toLowerCase().replace(/[^a-z0-9]/g, '')

export const getStaticGenreSuggestions = () =>
  GENRES.map((genre) => ({
    label: genre.replace(/^Electronic - /, ''),
    value: convertGenreLabelToValue(genre)
  }))

export const mergeGenreSuggestions = (
  communityGenres: GenreSuggestion[],
  staticGenres: GenreSuggestion[] = getStaticGenreSuggestions()
) => {
  const suggestionsByKey = new Map<string, GenreSuggestion>()

  communityGenres.forEach((genre) => {
    const normalized = normalizeGenre(genre.value)
    const key = getGenreSuggestionKey(normalized)
    if (!normalized || !key) return

    const existingGenre = suggestionsByKey.get(key)
    if ((existingGenre?.count ?? -1) > (genre.count ?? -1)) return

    suggestionsByKey.set(key, {
      label: normalized,
      value: normalized,
      count: genre.count
    })
  })

  staticGenres.forEach((genre) => {
    const key = getGenreSuggestionKey(genre.value)
    if (!key) return

    const communityGenre = suggestionsByKey.get(key)
    suggestionsByKey.set(key, {
      ...communityGenre,
      label: genre.label,
      value: genre.value
    })
  })

  return Array.from(suggestionsByKey.values()).sort((a, b) => {
    const countDiff = (b.count ?? -1) - (a.count ?? -1)
    if (countDiff !== 0) return countDiff
    return a.label.localeCompare(b.label)
  })
}

/** Number of top genres to request from the popular-genres endpoint. */
export const POPULAR_GENRES_LIMIT = 25

/**
 * Selects the genre suggestions to display in the trending genre filter for a
 * given search query. With no query, returns the popular/ranked genres (those
 * with a recent-activity count) so the top genres are shown by default; while
 * searching, matches labels across the full set so long-tail genres remain
 * discoverable. Falls back to the full list when no popular genres are
 * available (e.g. the popular-genres request failed).
 */
export const getTrendingGenreSuggestions = (
  suggestions: GenreSuggestion[],
  searchValue = ''
): GenreSuggestion[] => {
  const query = searchValue.trim().toLowerCase()
  if (query) {
    return suggestions.filter((genre) =>
      genre.label.toLowerCase().includes(query)
    )
  }
  const popular = suggestions.filter((genre) => genre.count !== undefined)
  return popular.length > 0 ? popular : suggestions
}
