import { useContext, useEffect } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { priceAndAudienceMessages } from '@audius/common/messages'
import { StreamTrackAvailabilityType } from '@audius/common/models'

import { IconUserFollowing, RadioGroupContext } from '@audius/harmony-native'
import { useSetEntityAvailabilityFields } from 'app/hooks/useSetTrackAvailabilityFields'

import { ExpandableRadio } from '../ExpandableRadio'

const { followersOnlyRadio: messages } = priceAndAudienceMessages

type FollowGatedRadioFieldProps = {
  disabled?: boolean
}

export const FollowGatedRadioField = (props: FollowGatedRadioFieldProps) => {
  const { disabled = false } = props

  const { value } = useContext(RadioGroupContext)
  const selected = value === StreamTrackAvailabilityType.FOLLOW_GATED

  const setFields = useSetEntityAvailabilityFields()
  const { data: currentUserId } = useCurrentUserId()

  useEffect(() => {
    if (selected && currentUserId) {
      setFields({
        is_stream_gated: true,
        stream_conditions: { follow_user_id: currentUserId },
        preview_start_seconds: null,
        'field_visibility.remixes': false
      })
    }
  }, [selected, currentUserId, setFields])

  return (
    <ExpandableRadio
      value={StreamTrackAvailabilityType.FOLLOW_GATED}
      label={messages.title}
      icon={IconUserFollowing}
      description={messages.description}
      disabled={disabled}
    />
  )
}
