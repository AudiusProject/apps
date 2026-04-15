import { useContext, useEffect, useState } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { priceAndAudienceMessages } from '@audius/common/messages'
import {
  isContentFollowGated,
  StreamTrackAvailabilityType
} from '@audius/common/models'
import type { AccessConditions } from '@audius/common/models'
import type { Nullable } from '@audius/common/utils'

import { IconSparkles, RadioGroupContext } from '@audius/harmony-native'
import { useSetEntityAvailabilityFields } from 'app/hooks/useSetTrackAvailabilityFields'

import { ExpandableRadio } from '../ExpandableRadio'

const { followersOnlyRadio: messages } = priceAndAudienceMessages

type FollowersOnlyRadioFieldProps = {
  disabled?: boolean
  previousStreamConditions: Nullable<AccessConditions>
}

export const FollowersOnlyRadioField = (
  props: FollowersOnlyRadioFieldProps
) => {
  const { disabled = false, previousStreamConditions } = props

  const { value } = useContext(RadioGroupContext)
  const selected = value === StreamTrackAvailabilityType.SPECIAL_ACCESS

  const setFields = useSetEntityAvailabilityFields()
  const { data: currentUserId } = useCurrentUserId()
  const defaultFollowGate = currentUserId
    ? { follow_user_id: currentUserId }
    : null
  const [followGate] = useState(
    isContentFollowGated(previousStreamConditions)
      ? (previousStreamConditions ?? defaultFollowGate)
      : defaultFollowGate
  )

  // Update follow gate when selection changes
  useEffect(() => {
    if (selected && followGate) {
      setFields({
        is_stream_gated: true,
        stream_conditions: followGate,
        preview_start_seconds: null,
        'field_visibility.remixes': false
      })
    }
  }, [selected, followGate, setFields])

  return (
    <ExpandableRadio
      value={StreamTrackAvailabilityType.SPECIAL_ACCESS}
      label={messages.title}
      icon={IconSparkles}
      description={messages.description}
      disabled={disabled}
    />
  )
}
