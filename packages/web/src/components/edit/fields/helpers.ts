import { ID } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'

export const getCombinedDefaultGatedConditionValues = (
  userId: Nullable<ID> | undefined
) => ({
  usdc_purchase: { price: null, albumTrackPrice: null },
  follow_user_id: userId,
  token_gate: {
    token_mint: '',
    token_amount: 0
  }
})
