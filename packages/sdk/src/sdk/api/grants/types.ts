import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { HashId } from '../../types/HashId'
import { isApiKeyValid } from '../../utils/apiKey'

export type GrantsApiServicesConfig = {
  entityManager?: EntityManagerService
}

export const CreateGrantSchema = z.object({
  userId: HashId,
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  })
})

export type EntityManagerCreateGrantRequest = z.input<typeof CreateGrantSchema>

export const AddManagerSchema = z.object({
  userId: HashId,
  managerUserId: HashId
})

export type EntityManagerAddManagerRequest = z.input<typeof AddManagerSchema>

export const RemoveManagerSchema = z.object({
  userId: HashId,
  managerUserId: HashId
})

export type EntityManagerRemoveManagerRequest = z.input<
  typeof RemoveManagerSchema
>

export const RevokeGrantSchema = z.object({
  userId: HashId,
  appApiKey: z.custom<string>((data: unknown) => {
    return isApiKeyValid(data as string)
  })
})

export type EntityManagerRevokeGrantRequest = z.input<typeof RevokeGrantSchema>

export const ApproveGrantSchema = z.object({
  userId: HashId,
  grantorUserId: HashId
})

export type EntityManagerApproveGrantRequest = z.input<
  typeof ApproveGrantSchema
>

export type CreateGrantRequest = EntityManagerCreateGrantRequest
export type AddManagerRequest = EntityManagerAddManagerRequest
export type RemoveManagerRequest = EntityManagerRemoveManagerRequest
export type RevokeGrantRequest = EntityManagerRevokeGrantRequest
export type ApproveGrantRequest = EntityManagerApproveGrantRequest
