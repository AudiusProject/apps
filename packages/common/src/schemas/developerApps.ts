import { z } from 'zod'

export const DEVELOPER_APP_DESCRIPTION_MAX_LENGTH = 128
export const DEVELOPER_APP_NAME_MAX_LENGTH = 50
export const DEVELOPER_APP_IMAGE_URL_MAX_LENGTH = 2000
const DEVELOPER_APP_IMAGE_URL_REGEX = /^(https?):\/\//i

const messages = {
  invalidUrl: 'Invalid URL'
}

export type ApiAccessKey = {
  api_access_key: string
  is_active: boolean
}

export type DeveloperApp = {
  name: string
  description?: string
  imageUrl?: string
  apiKey: string
  apiSecret?: string
  bearerToken?: string
  /** Bearer tokens from API when fetched with include=metrics */
  api_access_keys?: ApiAccessKey[]
  /** Pre-registered OAuth redirect/callback URIs */
  redirectUris?: string[]
}

export const developerAppSchema = z.object({
  name: z.string().max(DEVELOPER_APP_NAME_MAX_LENGTH),
  imageUrl: z.optional(
    z
      .string()
      .max(DEVELOPER_APP_IMAGE_URL_MAX_LENGTH)
      .refine((value) => DEVELOPER_APP_IMAGE_URL_REGEX.test(value), {
        message: messages.invalidUrl
      })
  ),
  description: z.string().max(DEVELOPER_APP_DESCRIPTION_MAX_LENGTH).optional()
})

export const developerAppEditSchema = z.object({
  apiKey: z.string(),
  name: z.string().max(DEVELOPER_APP_NAME_MAX_LENGTH),
  imageUrl: z.optional(
    z
      .string()
      .max(DEVELOPER_APP_IMAGE_URL_MAX_LENGTH)
      .refine((value) => DEVELOPER_APP_IMAGE_URL_REGEX.test(value), {
        message: messages.invalidUrl
      })
  ),
  description: z.string().max(DEVELOPER_APP_DESCRIPTION_MAX_LENGTH).optional(),
  redirectUris: z.array(z.string().max(2000)).max(50).optional()
})

export type NewAppPayload = Omit<DeveloperApp, 'apiKey'>

export type EditAppPayload = Omit<DeveloperApp, 'apiSecret'>
