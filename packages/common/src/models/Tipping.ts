import { full } from '@audius/sdk'

import { ID } from '~/models/Identifiers'
import { removeNullable } from '~/utils/typeUtils'

import { UserMetadata, userMetadataFromSDK } from './User'
import { StringWei } from './Wallet'

export type Supporter = {
  sender_id: ID
  amount: StringWei
  rank: number
}

export type Supporting = {
  receiver_id: ID
  amount: StringWei
  rank: number
}

export type UserTip = {
  amount: StringWei
  sender_id: ID
  receiver_id: ID
  followee_supporter_ids: ID[]
  slot: number
  created_at: string
  tx_signature: string
}

export type LastDismissedTip = {
  receiver_id: ID
}

export type SupporterMetadata = {
  sender: UserMetadata
  amount: StringWei
  rank: number
}

export type SupportedUserMetadata = {
  receiver: UserMetadata
  amount: StringWei
  rank: number
}

export const supporterMetadataFromSDK = (
  input: full.FullSupporter
): SupporterMetadata | undefined => {
  const user = userMetadataFromSDK(input.sender)
  return user
    ? { sender: user, amount: input.amount as StringWei, rank: input.rank }
    : undefined
}

export const supporterMetadataListFromSDK = (input?: full.FullSupporter[]) =>
  input
    ? input.map((d) => supporterMetadataFromSDK(d)).filter(removeNullable)
    : []

export const supportedUserMetadataFromSDK = (
  input: full.FullSupporting
): SupportedUserMetadata | undefined => {
  const user = userMetadataFromSDK(input.receiver)
  return user
    ? { receiver: user, amount: input.amount as StringWei, rank: input.rank }
    : undefined
}

export const supportedUserMetadataListFromSDK = (
  input?: full.FullSupporting[]
) =>
  input
    ? input.map((d) => supportedUserMetadataFromSDK(d)).filter(removeNullable)
    : []
