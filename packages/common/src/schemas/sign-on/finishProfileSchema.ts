import { z } from 'zod'

import { MAX_DISPLAY_NAME_LENGTH } from '~/services/oauth/formatSocialProfile'

export const finishProfileSchema = z.object({
  displayName: z
    .string({ required_error: 'Display name is required.' })
    .max(MAX_DISPLAY_NAME_LENGTH, ''),
  profileImage: z
    .object({
      url: z.string().optional()
    })
    .optional(),
  coverPhoto: z
    .object({
      url: z.string().optional()
    })
    .optional()
})

export const finishReferralProfileSchema = z.object({
  displayName: z
    .string({ required_error: 'Display name is required.' })
    .max(MAX_DISPLAY_NAME_LENGTH, ''),
  profileImage: z
    .object({
      url: z.string().optional()
    })
    .optional(),
  coverPhoto: z
    .object({
      url: z.string().optional()
    })
    .optional()
})
