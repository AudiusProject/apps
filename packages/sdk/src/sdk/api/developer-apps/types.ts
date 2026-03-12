import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { HashId } from '../../types/HashId'
import { isApiKeyValid } from '../../utils/apiKey'

const DEVELOPER_APP_MAX_DESCRIPTION_LENGTH = 128
const DEVELOPER_APP_MAX_IMAGE_URL_LENGTH = 2000
const URL_REGEX = /^(https?):\/\//i

export type DeveloperAppsApiServicesConfig = {
  entityManager?: EntityManagerService
}

export const CreateDeveloperAppSchema = z.object({
  name: z.string(),
  description: z.optional(z.string().max(DEVELOPER_APP_MAX_DESCRIPTION_LENGTH)),
  imageUrl: z.optional(
    z
      .string()
      .max(DEVELOPER_APP_MAX_IMAGE_URL_LENGTH)
      .refine((value) => URL_REGEX.test(value), {
        message: 'Invalid URL'
      })
  ),
  userId: HashId,
  redirectUris: z
    .array(
      z
        .string()
        .max(2000)
        .refine((value) => URL_REGEX.test(value), {
          message: 'Invalid URL'
        })
    )
    .optional()
})

export type EntityManagerCreateDeveloperAppRequest = z.input<
  typeof CreateDeveloperAppSchema
>

export const UpdateDeveloperAppSchema = z.object({
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  }),
  name: z.string(),
  description: z.optional(z.string().max(DEVELOPER_APP_MAX_DESCRIPTION_LENGTH)),
  imageUrl: z.optional(
    z
      .string()
      .max(DEVELOPER_APP_MAX_IMAGE_URL_LENGTH)
      .refine((value) => URL_REGEX.test(value), {
        message: 'Invalid URL'
      })
  ),
  userId: HashId,
  redirectUris: z
    .array(
      z
        .string()
        .max(2000)
        .refine((value) => URL_REGEX.test(value), {
          message: 'Invalid URL'
        })
    )
    .optional()
})

export type EntityManagerUpdateDeveloperAppRequest = z.input<
  typeof UpdateDeveloperAppSchema
>

export const DeleteDeveloperAppSchema = z.object({
  userId: HashId,
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  })
})

export type EntityManagerDeleteDeveloperAppRequest = z.input<
  typeof DeleteDeveloperAppSchema
>
