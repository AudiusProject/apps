import { useCallback, useContext, useEffect, useState } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { priceAndAudienceMessages } from '@audius/common/messages'
import {
  isContentFollowGated,
  StreamTrackAvailabilityType
} from '@audius/common/models'
import type { AccessConditions } from '@audius/common/models'
import type { Nullable } from '@audius/common/utils'

import {
  IconSparkles,
  Paper,
  Radio,
  RadioGroup,
  RadioGroupContext
} from '@audius/harmony-native'
import { useSetEntityAvailabilityFields } from 'app/hooks/useSetTrackAvailabilityFields'

import { ExpandableRadio } from '../ExpandableRadio'

const { specialAccessRadio: messages } = priceAndAudienceMessages

type SpecialAccessValue = 'followers'

type SpecialAccessRadioFieldProps = {
  disabled?: boolean
  previousStreamConditions: Nullable<AccessConditions>
}

export const SpecialAccessRadioField = (
  props: SpecialAccessRadioFieldProps
) => {
  const { disabled = false, previousStreamConditions } = props

  const { value } = useContext(RadioGroupContext)
  const selected = value === StreamTrackAvailabilityType.SPECIAL_ACCESS

  const setFields = useSetEntityAvailabilityFields()
  const { data: currentUserId } = useCurrentUserId()
  const defaultSpecialAccess = currentUserId
    ? { follow_user_id: currentUserId }
    : null
  const [selectedSpecialAccessGate, setSelectedSpecialAccessGate] = useState(
    isContentFollowGated(previousStreamConditions)
      ? (previousStreamConditions ?? defaultSpecialAccess)
      : defaultSpecialAccess
  )

  // Update special access gate when selection changes
  useEffect(() => {
    if (selected && selectedSpecialAccessGate) {
      setFields({
        is_stream_gated: true,
        stream_conditions: selectedSpecialAccessGate,
        preview_start_seconds: null,
        'field_visibility.remixes': false
      })
    }
  }, [selected, selectedSpecialAccessGate, setFields])

  const [specialAccess, setSpecialAccess] =
    useState<SpecialAccessValue>('followers')

  const handleAccessChange = useCallback(
    (value: SpecialAccessValue) => {
      if (!currentUserId || !selected) return
      setSpecialAccess(value)
      setSelectedSpecialAccessGate({ follow_user_id: currentUserId })
    },
    [currentUserId, selected]
  )

  return (
    <ExpandableRadio
      value={StreamTrackAvailabilityType.SPECIAL_ACCESS}
      label={messages.title}
      icon={IconSparkles}
      description={messages.description}
      disabled={disabled}
      checkedContent={
        <Paper backgroundColor='surface1' shadow='flat' border='default' p='l'>
          <RadioGroup
            gap='s'
            value={specialAccess}
            onValueChange={handleAccessChange}
          >
            <Radio
              value='followers'
              label={messages.followersOnly}
              disabled={disabled}
            />
          </RadioGroup>
        </Paper>
      }
    />
  )
}
