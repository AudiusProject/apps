import { useCallback, useEffect, useState } from 'react'

import { visibilityMessages as messages } from '@audius/common/messages'
import dayjs from 'dayjs'
import { useFormikContext } from 'formik'

import {
  IconVisibilityHidden,
  IconVisibilityPublic
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { FormScreen } from 'app/screens/form-screen'

import type { FormValues } from '../../../screens/edit-track-screen/types'
import { ExpandableRadio } from '../ExpandableRadio'
import { ExpandableRadioGroup } from '../ExpandableRadioGroup'

import { ScheduledReleaseDateField } from './ScheduledReleaseDateField'

type VisibilityType = 'scheduled' | 'public' | 'hidden'

export const VisibilityScreen = () => {
  const { values, initialValues, setValues } = useFormikContext<FormValues>()
  const { entityType } = values
  const hiddenKey = entityType === 'track' ? 'is_unlisted' : 'is_private'
  const {
    [hiddenKey]: isHidden,
    is_scheduled_release,
    release_date,
    isUpload
  } = values

  const initiallyPublic = !isUpload && !initialValues[hiddenKey]

  const initialVisibilityType =
    is_scheduled_release && isHidden
      ? 'scheduled'
      : isHidden
        ? 'hidden'
        : 'public'

  const [visibilityType, setVisibilityType] = useState<VisibilityType>(
    initialVisibilityType
  )
  const [releaseDate, setReleaseDate] = useState(release_date)
  const [dateError, setDateError] = useState('')
  const [dateTimeError, setDateTimeError] = useState('')
  const navigation = useNavigation()

  useEffect(() => {
    if (releaseDate) {
      setDateError('')
      setDateTimeError('')
    }
  }, [releaseDate])

  const handleSubmit = useCallback(() => {
    switch (visibilityType) {
      case 'public':
        setValues({
          ...values,
          [hiddenKey]: false,
          is_scheduled_release: false,
          release_date: null
        })
        break
      case 'hidden':
        setValues({
          ...values,
          [hiddenKey]: true,
          is_scheduled_release: false
        })
        break
      case 'scheduled':
        if (!releaseDate) {
          setDateError('Release date required')
          return
        } else if (dayjs(releaseDate).isBefore(dayjs())) {
          setDateTimeError('Release date must be in the future')
          return
        } else {
          setValues({
            ...values,
            [hiddenKey]: true,
            is_scheduled_release: true,
            release_date: releaseDate
          })
        }
        break
    }
    navigation.goBack()
  }, [visibilityType, releaseDate, navigation, values, setValues, hiddenKey])

  return (
    <FormScreen
      title={messages.title}
      icon={IconVisibilityPublic}
      onSubmit={handleSubmit}
      variant='white'
      stopNavigation
    >
      <ExpandableRadioGroup
        value={visibilityType}
        onValueChange={setVisibilityType}
      >
        <ExpandableRadio
          value='public'
          label={messages.public}
          description={messages.publicDescription}
        />
        <ExpandableRadio
          value='hidden'
          label={messages.hidden}
          icon={IconVisibilityHidden}
          description={messages.hiddenDescription}
        />
        {!initiallyPublic &&
        (entityType === 'track' || entityType === 'album') ? (
          <ExpandableRadio
            value='scheduled'
            label={messages.scheduledRelease}
            description={messages.scheduledReleaseDescription}
            checkedContent={
              <ScheduledReleaseDateField
                releaseDate={releaseDate}
                onChange={setReleaseDate}
                dateError={dateError}
                dateTimeError={dateTimeError}
              />
            }
          />
        ) : null}
      </ExpandableRadioGroup>
    </FormScreen>
  )
}
