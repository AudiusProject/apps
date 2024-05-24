import { ID } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'

/**
 * Allows us to store all the user selections in the Price & Audience modal
 * so that their previous selections is remembered as they change between the radio button options.
 * On submit (saving the changes in the Price & Audience modal), we only save the corresponding
 * stream conditions based on the availability type they have currently selected.
 */
export const getCombinedDefaultGatedConditionValues = (
  userId: Nullable<ID>
) => ({
  usdc_purchase: { price: null, albumTrackPrice: null },
  follow_user_id: userId,
  tip_user_id: userId,
  nft_collection: undefined
})
