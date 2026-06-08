import { HashId, type Grant as SdkGrant } from '@audius/sdk'

import { Grant } from '~/models/Grant'

export const grantFromSDK = (input: SdkGrant): Grant => {
  return {
    grantee_address: input.granteeAddress,
    user_id: HashId.parse(input.userId) ?? null,
    is_revoked: input.isRevoked,
    is_approved: input.isApproved,
    created_at: input.createdAt,
    updated_at: input.updatedAt
  }
}
