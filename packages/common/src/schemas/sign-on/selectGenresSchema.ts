import { z } from 'zod'

import { GENRES, Genre, convertGenreLabelToValue } from '~/utils/genres'

const excludedGenres = new Set<string>([
  Genre.COMEDY,
  Genre.KIDS,
  Genre.SOUNDTRACK,
  Genre.DEVOTIONAL,
  Genre.AUDIOBOOKS,
  Genre.SPOKEN_WORK
])

export const selectableGenres = GENRES.filter(
  (genre) => !excludedGenres.has(genre)
).map((genre) => ({
  value: genre,
  label: convertGenreLabelToValue(genre)
}))

export const selectGenresSchema = z.object({
  genres: z.array(z.string()).optional()
})
