import { z } from 'zod'

export const selectArtistsSchema = z.object({
  selectedArtists: z.array(z.string()).optional()
})
