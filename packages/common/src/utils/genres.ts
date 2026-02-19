export enum Genre {
  ALL = 'All Genres',
  ELECTRONIC = 'Electronic',
  ROCK = 'Rock',
  METAL = 'Metal',
  ALTERNATIVE = 'Alternative',
  HIP_HOP_RAP = 'Hip-Hop/Rap',
  EXPERIMENTAL = 'Experimental',
  PUNK = 'Punk',
  FOLK = 'Folk',
  POP = 'Pop',
  AMBIENT = 'Ambient',
  SOUNDTRACK = 'Soundtrack',
  WORLD = 'World',
  JAZZ = 'Jazz',
  ACOUSTIC = 'Acoustic',
  FUNK = 'Funk',
  R_AND_B_SOUL = 'R&B/Soul',
  DEVOTIONAL = 'Devotional',
  CLASSICAL = 'Classical',
  REGGAE = 'Reggae',
  PODCASTS = 'Podcasts',
  COUNTRY = 'Country',
  SPOKEN_WORK = 'Spoken Word',
  COMEDY = 'Comedy',
  BLUES = 'Blues',
  KIDS = 'Kids',
  AUDIOBOOKS = 'Audiobooks',
  LATIN = 'Latin',
  LOFI = 'Lo-Fi',
  HYPERPOP = 'Hyperpop',
  DANCEHALL = 'Dancehall',

  // Electronic Subgenres
  TECHNO = 'Techno',
  TRAP = 'Trap',
  HOUSE = 'House',
  TECH_HOUSE = 'Tech House',
  DEEP_HOUSE = 'Deep House',
  DISCO = 'Disco',
  ELECTRO = 'Electro',
  JUNGLE = 'Jungle',
  PROGRESSIVE_HOUSE = 'Progressive House',
  HARDSTYLE = 'Hardstyle',
  GLITCH_HOP = 'Glitch Hop',
  TRANCE = 'Trance',
  FUTURE_BASS = 'Future Bass',
  FUTURE_HOUSE = 'Future House',
  TROPICAL_HOUSE = 'Tropical House',
  DOWNTEMPO = 'Downtempo',
  DRUM_AND_BASS = 'Drum & Bass',
  DUBSTEP = 'Dubstep',
  JERSEY_CLUB = 'Jersey Club',
  VAPORWAVE = 'Vaporwave',
  MOOMBAHTON = 'Moombahton'
}

export const ELECTRONIC_PREFIX = 'Electronic - '

export const ELECTRONIC_SUBGENRES: Partial<
  Record<Genre, `${typeof ELECTRONIC_PREFIX}${Genre}`>
> = {
  [Genre.TECHNO]: `${ELECTRONIC_PREFIX}${Genre.TECHNO}`,
  [Genre.TRAP]: `${ELECTRONIC_PREFIX}${Genre.TRAP}`,
  [Genre.HOUSE]: `${ELECTRONIC_PREFIX}${Genre.HOUSE}`,
  [Genre.TECH_HOUSE]: `${ELECTRONIC_PREFIX}${Genre.TECH_HOUSE}`,
  [Genre.DEEP_HOUSE]: `${ELECTRONIC_PREFIX}${Genre.DEEP_HOUSE}`,
  [Genre.DISCO]: `${ELECTRONIC_PREFIX}${Genre.DISCO}`,
  [Genre.ELECTRO]: `${ELECTRONIC_PREFIX}${Genre.ELECTRO}`,
  [Genre.JUNGLE]: `${ELECTRONIC_PREFIX}${Genre.JUNGLE}`,
  [Genre.PROGRESSIVE_HOUSE]: `${ELECTRONIC_PREFIX}${Genre.PROGRESSIVE_HOUSE}`,
  [Genre.HARDSTYLE]: `${ELECTRONIC_PREFIX}${Genre.HARDSTYLE}`,
  [Genre.GLITCH_HOP]: `${ELECTRONIC_PREFIX}${Genre.GLITCH_HOP}`,
  [Genre.TRANCE]: `${ELECTRONIC_PREFIX}${Genre.TRANCE}`,
  [Genre.FUTURE_BASS]: `${ELECTRONIC_PREFIX}${Genre.FUTURE_BASS}`,
  [Genre.FUTURE_HOUSE]: `${ELECTRONIC_PREFIX}${Genre.FUTURE_HOUSE}`,
  [Genre.TROPICAL_HOUSE]: `${ELECTRONIC_PREFIX}${Genre.TROPICAL_HOUSE}`,
  [Genre.DOWNTEMPO]: `${ELECTRONIC_PREFIX}${Genre.DOWNTEMPO}`,
  [Genre.DRUM_AND_BASS]: `${ELECTRONIC_PREFIX}${Genre.DRUM_AND_BASS}`,
  [Genre.DUBSTEP]: `${ELECTRONIC_PREFIX}${Genre.DUBSTEP}`,
  [Genre.JERSEY_CLUB]: `${ELECTRONIC_PREFIX}${Genre.JERSEY_CLUB}`,
  [Genre.VAPORWAVE]: `${ELECTRONIC_PREFIX}${Genre.VAPORWAVE}`,
  [Genre.MOOMBAHTON]: `${ELECTRONIC_PREFIX}${Genre.MOOMBAHTON}`
}

export const getCanonicalName = (genre: Genre | any) => {
  if (genre in ELECTRONIC_SUBGENRES) return ELECTRONIC_SUBGENRES[genre as Genre]
  return genre
}

/** User-facing genre labels. Use `convertGenreLabelToValue` to get the correct genre value (to set as the genre in track metadata). */
export const GENRES = [
  Genre.ELECTRONIC,
  Genre.ROCK,
  Genre.METAL,
  Genre.ALTERNATIVE,
  Genre.HIP_HOP_RAP,
  Genre.EXPERIMENTAL,
  Genre.PUNK,
  Genre.FOLK,
  Genre.POP,
  Genre.AMBIENT,
  Genre.SOUNDTRACK,
  Genre.WORLD,
  Genre.JAZZ,
  Genre.ACOUSTIC,
  Genre.FUNK,
  Genre.R_AND_B_SOUL,
  Genre.DEVOTIONAL,
  Genre.CLASSICAL,
  Genre.REGGAE,
  Genre.PODCASTS,
  Genre.COUNTRY,
  Genre.SPOKEN_WORK,
  Genre.COMEDY,
  Genre.BLUES,
  Genre.KIDS,
  Genre.AUDIOBOOKS,
  Genre.LATIN,
  Genre.LOFI,
  Genre.HYPERPOP,
  Genre.DANCEHALL,
  ...Object.values(ELECTRONIC_SUBGENRES)
]

export const convertGenreLabelToValue = (
  genreLabel: (typeof GENRES)[number]
) => {
  return genreLabel.replace(ELECTRONIC_PREFIX, '')
}

const NEWLY_ADDED_GENRES: string[] = []

export const TRENDING_GENRES = GENRES.filter(
  (g) => !NEWLY_ADDED_GENRES.includes(g)
)
