import { Genre as SDKGenre } from '@audius/sdk'

/** Re-export SDK Genre as the canonical source for track metadata. */
export { Genre } from '@audius/sdk'

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

export const convertGenreLabelToValue = (
  genreLabel: (typeof GENRES)[number]
): SDKGenre => {
  return genreLabel.replace(ELECTRONIC_PREFIX, '') as SDKGenre
}

/**
 * Converts a string from the trending genre UI (e.g. from URL or genre list)
 * into Genre | null for Redux state. Returns null for null, empty, or ALL_GENRES.
 */
export const parseTrendingGenreFromUrl = (param: string | null): SDKGenre | null => {
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
  return convertGenreLabelToValue(value as (typeof GENRES)[number])
}

const NEWLY_ADDED_GENRES: string[] = []

export const TRENDING_GENRES = GENRES.filter(
  (g) => !NEWLY_ADDED_GENRES.includes(g)
)
