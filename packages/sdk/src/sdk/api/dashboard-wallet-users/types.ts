import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { EthAddressSchema } from '../../types/EthAddress'
import { HashId } from '../../types/HashId'

export type DashboardWalletUsersApiServicesConfig = {
  entityManager?: EntityManagerService
}

export const CreateDashboardWalletUser = z
  .object({
    wallet: EthAddressSchema,
    userId: HashId,
    walletSignature: z
      .object({
        /** Message should be of the form: "Connecting Audius user id a93jl at 39823489" OR "Connecting Audius user @jill1990 at 39823489" */
        message: z.string(),
        signature: z.string()
      })
      .optional(),
    userSignature: z
      .object({
        /** Message should be of the form: "Connecting Audius protocol dashboard wallet 0x6c9CA7D9580d4e8286B0628c0300A2A1235a8e2E at 39823489" */
        message: z.string(),
        signature: z.string()
      })
      .optional()
  })
  .refine(
    (data) => !!data.userSignature || !!data.walletSignature,
    "Either `userSignature` or `walletSignature` is required. Use `userSignature` if SDK is authenticated with the wallet's sign methods, and use `walletSignature` if SDK is authenticated with the user's sign methods."
  )

export type CreateDashboardWalletUserRequest = z.input<
  typeof CreateDashboardWalletUser
>

export const DeleteDashboardWalletUserSchema = z.object({
  userId: HashId,
  wallet: EthAddressSchema
})

export type DeleteDashboardWalletUserRequest = z.input<
  typeof DeleteDashboardWalletUserSchema
>
