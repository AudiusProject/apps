import { z } from 'zod'

import { HashId } from '../../types/HashId'
import { isApiKeyValid } from '../../utils/apiKey'

export const CreateGrantSchema = z.object({
  userId: HashId,
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  })
})

export type CreateGrantRequest = z.input<typeof CreateGrantSchema>

export const AddManagerSchema = z.object({
  userId: HashId,
  managerUserId: HashId
})

export type AddManagerRequest = z.input<typeof AddManagerSchema>

export const RemoveManagerSchema = z.object({
  userId: HashId,
  managerUserId: HashId
})

export type RemoveManagerRequest = z.input<typeof RemoveManagerSchema>

export const RevokeGrantSchema = z.object({
  userId: HashId,
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  })
})

export type RevokeGrantRequest = z.input<typeof RevokeGrantSchema>

export const ApproveGrantSchema = z.object({
  userId: HashId,
  grantorUserId: HashId
})

export type ApproveGrantRequest = z.input<typeof ApproveGrantSchema>
