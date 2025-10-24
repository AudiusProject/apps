import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { useSelector } from 'react-redux'

import { getReferrer } from 'common/store/pages/signon/selectors'

export const useFastReferral = () => {
  const hasReferrer = useSelector(getReferrer)
  const { isEnabled: isFastReferralEnabled } = useFeatureFlag(
    FeatureFlags.FAST_REFERRAL
  )
  return Boolean(hasReferrer && isFastReferralEnabled)
}
