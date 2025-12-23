import { ChangeEvent, useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { AccessConditions } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  Hint,
  IconInfo,
  Radio,
  RadioGroup,
  Text,
  Tooltip
} from '@audius/harmony'
import cn from 'classnames'
import { useField } from 'formik'

import {
  AccessAndSaleFormValues,
  DOWNLOAD_CONDITIONS,
  GateKeeper,
  LAST_GATE_KEEPER,
  STREAM_CONDITIONS,
  SpecialAccessType
} from '../types'

import styles from './SpecialAccessFields.module.css'

const messages = {
  followersOnly: 'Available to Followers Only',
  supportersOnly: 'Available to Supporters Only',
  supportersInfo: 'Supporters are fans that have sent you a tip.',
  premiumDownloads:
    'Setting your track to Special Access will remove the availability you set on your premium downloads. Don’t worry, your stems are still saved!'
}

type TrackAvailabilityFieldsProps = {
  disabled?: boolean
}

const SPECIAL_ACCESS_TYPE = 'special_access_type'

export const SpecialAccessFields = (props: TrackAvailabilityFieldsProps) => {
  const { disabled } = props
  const { data: accountUserId } = useCurrentUserId()
  const [specialAccessTypeField] = useField({
    name: SPECIAL_ACCESS_TYPE
  })
  const [{ value: downloadConditions }] =
    useField<Nullable<AccessConditions>>(DOWNLOAD_CONDITIONS)
  const [{ value: lastGateKeeper }] = useField<GateKeeper>(LAST_GATE_KEEPER)
  const showPremiumDownloadsMessage =
    downloadConditions && lastGateKeeper.access === 'stemsAndDownloads'

  const [, , { setValue: setStreamConditionsValue }] =
    useField<AccessAndSaleFormValues[typeof STREAM_CONDITIONS]>(
      STREAM_CONDITIONS
    )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const type = e.target.value as SpecialAccessType
      if (accountUserId) {
        if (type === SpecialAccessType.FOLLOW) {
          setStreamConditionsValue({
            follow_user_id: accountUserId
          })
        } else if (type === SpecialAccessType.TIP) {
          setStreamConditionsValue({
            tip_user_id: accountUserId
          })
        }
      }
      specialAccessTypeField.onChange(e)
    },
    [accountUserId, setStreamConditionsValue, specialAccessTypeField]
  )

  return (
    <>
      <RadioGroup
        className={styles.root}
        {...specialAccessTypeField}
        onChange={handleChange}
        defaultValue={SpecialAccessType.FOLLOW}
      >
        <label className={cn(styles.row, { [styles.disabled]: disabled })}>
          <Radio
            className={styles.radio}
            value={SpecialAccessType.FOLLOW}
            disabled={disabled}
          />
          <Text variant='body'>{messages.followersOnly}</Text>
        </label>
        <label className={cn(styles.row, { [styles.disabled]: disabled })}>
          <Radio
            className={styles.radio}
            value={SpecialAccessType.TIP}
            disabled={disabled}
          />
          <Text variant='body'>{messages.supportersOnly}</Text>
          <Tooltip
            className={styles.tooltip}
            text={messages.supportersInfo}
            mouseEnterDelay={0.1}
            mount={'parent'}
            color='secondary'
          >
            <IconInfo size='m' color='subdued' />
          </Tooltip>
        </label>
      </RadioGroup>
      {showPremiumDownloadsMessage ? (
        <Hint icon={IconInfo}>{messages.premiumDownloads}</Hint>
      ) : null}
    </>
  )
}
