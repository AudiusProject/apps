import { useEffect } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { AccessConditions } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { Hint, IconInfo } from '@audius/harmony'
import { useField } from 'formik'

import {
  AccessAndSaleFormValues,
  DOWNLOAD_CONDITIONS,
  GateKeeper,
  LAST_GATE_KEEPER,
  STREAM_CONDITIONS
} from '../types'

const messages = {
  premiumDownloads:
    'Setting your track to Followers Only will remove the availability you set on your premium downloads. Don’t worry, your stems are still saved!'
}

export const FollowersOnlyFields = () => {
  const { data: accountUserId } = useCurrentUserId()
  const [{ value: downloadConditions }] =
    useField<Nullable<AccessConditions>>(DOWNLOAD_CONDITIONS)
  const [{ value: lastGateKeeper }] = useField<GateKeeper>(LAST_GATE_KEEPER)
  const showPremiumDownloadsMessage =
    downloadConditions && lastGateKeeper.access === 'stemsAndDownloads'

  const [, , { setValue: setStreamConditionsValue }] =
    useField<AccessAndSaleFormValues[typeof STREAM_CONDITIONS]>(
      STREAM_CONDITIONS
    )

  // Ensure the stream conditions follow-gate to the current user
  useEffect(() => {
    if (accountUserId) {
      setStreamConditionsValue({
        follow_user_id: accountUserId
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountUserId])

  if (!showPremiumDownloadsMessage) return null

  return <Hint icon={IconInfo}>{messages.premiumDownloads}</Hint>
}
