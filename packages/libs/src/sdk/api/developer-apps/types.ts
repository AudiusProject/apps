import { z } from 'zod'

import { HashId } from '../../types/HashId'
import { isApiKeyValid } from '../../utils/apiKey'

const MAX_DESCRIPTION_LENGTH = 128
const MAX_IMAGE_URL_LENGTH = 2000
const IMAGE_URL_REGEX = /^(https?):\/\//i

export const CreateDeveloperAppSchema = z.object({
  name: z.string(),
  description: z.optional(z.string().max(MAX_DESCRIPTION_LENGTH)),
  imageUrl: z.optional(
    z
      .string()
      .max(MAX_IMAGE_URL_LENGTH)
      .refine((value) => IMAGE_URL_REGEX.test(value), {
        message: 'Invalid URL'
      })
  ),
  userId: HashId
})

export type CreateDeveloperAppRequest = z.input<typeof CreateDeveloperAppSchema>

export const UpdateDeveloperAppSchema = z.object({
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  }),
  name: z.string(),
  description: z.optional(z.string().max(MAX_DESCRIPTION_LENGTH)),
  imageUrl: z.optional(
    z
      .string()
      .max(MAX_IMAGE_URL_LENGTH)
      .refine((value) => IMAGE_URL_REGEX.test(value), {
        message: 'Invalid URL'
      })
  ),
  userId: HashId
})

export type UpdateDeveloperAppRequest = z.input<typeof UpdateDeveloperAppSchema>

export const DeleteDeveloperAppSchema = z.object({
  userId: HashId,
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  })
})

export type DeleteDeveloperAppRequest = z.input<typeof DeleteDeveloperAppSchema>
