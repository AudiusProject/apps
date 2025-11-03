import { useCallback } from 'react'

import { visibilityMessages } from '@audius/common/messages'
import {
  IconCalendarMonth,
  IconVisibilityHidden,
  IconVisibilityPublic,
  RadioGroup
} from '@audius/harmony'
import dayjs from 'dayjs'
import { useField } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  ContextualMenu,
  SelectedValue
} from 'components/data-entry/ContextualMenu'
import { useTrackField } from 'components/edit-track/hooks'
import { ModalRadioItem } from 'components/modal-radio/ModalRadioItem'
import { formatCalendarTime } from 'utils/dateUtils'

import { IS_PRIVATE, IS_SCHEDULED_RELEASE, IS_UNLISTED } from '../types'

import { ScheduledReleaseDateField } from './ScheduledReleaseDateField'
import { mergeReleaseDateValues } from './mergeReleaseDateValues'

const messages = {
  ...visibilityMessages,
  scheduled: (date: string) => `Scheduled for ${formatCalendarTime(date)}`,
  emptyPlaylistTooltipText: 'You must add at least 1 song.'
}

type VisibilityType = 'scheduled' | 'public' | 'hidden'

type VisibilityFieldProps = {
  entityType: 'track' | 'album' | 'playlist'
  isUpload: boolean
  isPublishable?: boolean
}

const visibilitySchema = z
  .object({
    visibilityType: z.enum(['hidden', 'public', 'scheduled']),
    releaseDate: z.string().optional(),
    releaseDateTime: z.string().optional(),
    releaseDateMeridian: z.string().optional()
  })
  .refine(
    (data) => {
      const { visibilityType, releaseDate } = data
      return visibilityType === 'scheduled' ? !!releaseDate : true
    },
    { message: 'Release date required', path: ['releaseDate'] }
  )
  .refine(
    (data) => {
      const {
        visibilityType,
        releaseDate,
        releaseDateTime,
        releaseDateMeridian
      } = data
      if (visibilityType === 'scheduled') {
        const time = mergeReleaseDateValues(
          releaseDate!,
          releaseDateTime!,
          releaseDateMeridian!
        ).toString()
        return dayjs(time).isAfter(dayjs())
      }
      return true
    },
    { message: 'Select a time in the future', path: ['releaseDate'] }
  )

export const VisibilityField = (props: VisibilityFieldProps) => {
  const { entityType, isUpload, isPublishable = true } = props
  const useEntityField = entityType === 'track' ? useTrackField : useField
  const [
    { value: isHidden },
    { initialValue: initiallyHidden },
    { setValue: setIsUnlisted }
  ] = useEntityField<boolean>(entityType === 'track' ? IS_UNLISTED : IS_PRIVATE)

  const [{ value: isScheduledRelease }, , { setValue: setIsScheduledRelease }] =
    useEntityField<boolean>(IS_SCHEDULED_RELEASE)

  const [{ value: releaseDate }, , { setValue: setReleaseDate }] =
    useEntityField<string>('release_date')

  const visibilityType =
    isScheduledRelease && isHidden
      ? 'scheduled'
      : isHidden
        ? 'hidden'
        : 'public'

  const renderValue = useCallback(() => {
    switch (visibilityType) {
      case 'scheduled':
        return (
          <SelectedValue
            label={messages.scheduled(releaseDate)}
            icon={IconCalendarMonth}
          />
        )
      case 'hidden':
        return (
          <SelectedValue label={messages.hidden} icon={IconVisibilityHidden} />
        )
      case 'public':
        return (
          <SelectedValue label={messages.public} icon={IconVisibilityPublic} />
        )
    }
  }, [visibilityType, releaseDate])

  const scheduledReleaseValues =
    visibilityType === 'scheduled' && releaseDate
      ? {
          releaseDate,
          releaseDateTime: dayjs(releaseDate).format('h:mm'),
          releaseDateMeridian: dayjs(releaseDate).format('A')
        }
      : {}

  const initialValues = {
    visibilityType,
    releaseDateTime: '12:00',
    releaseDateMeridian: 'AM',
    ...scheduledReleaseValues
  }

  return (
    <ContextualMenu
      label={messages.title}
      icon={<IconVisibilityPublic />}
      description={messages.description}
      renderValue={renderValue}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(visibilitySchema)}
      onSubmit={(values) => {
        const {
          visibilityType,
          releaseDate,
          releaseDateTime,
          releaseDateMeridian
        } = values
        switch (visibilityType) {
          case 'scheduled': {
            setIsScheduledRelease(true)
            setReleaseDate(
              mergeReleaseDateValues(
                releaseDate!,
                releaseDateTime!,
                releaseDateMeridian!
              ).toString()
            )
            setIsUnlisted(true)
            break
          }
          case 'hidden': {
            setIsUnlisted(true)
            setIsScheduledRelease(false)
            setReleaseDate('')
            break
          }
          case 'public': {
            setIsUnlisted(false)
            setIsScheduledRelease(false)
            setReleaseDate('')
            break
          }
        }
      }}
      menuFields={
        <VisibilityMenuFields
          entityType={entityType}
          initiallyPublic={!initiallyHidden && !isUpload}
          isPublishable={isPublishable}
        />
      }
    />
  )
}

type VisibilityMenuFieldsProps = {
  entityType: 'track' | 'album' | 'playlist'
  initiallyPublic?: boolean
  isPublishable?: boolean
}

const VisibilityMenuFields = (props: VisibilityMenuFieldsProps) => {
  const { initiallyPublic, isPublishable = true, entityType } = props
  const [field] = useField<VisibilityType>('visibilityType')

  return (
    <RadioGroup {...field} aria-label={messages.title}>
      <ModalRadioItem
        value='public'
        label={messages.public}
        description={messages.publicDescription}
        disabled={!isPublishable}
        tooltipText={
          isPublishable ? undefined : messages.emptyPlaylistTooltipText
        }
      />
      <ModalRadioItem
        value='hidden'
        label={messages.hidden}
        description={messages.hiddenDescription}
      />
      {!initiallyPublic &&
      (entityType === 'track' || entityType === 'album') ? (
        <ModalRadioItem
          value='scheduled'
          label={messages.scheduledRelease}
          description={messages.scheduledReleaseDescription}
          checkedContent={<ScheduledReleaseDateField />}
        />
      ) : null}
    </RadioGroup>
  )
}
