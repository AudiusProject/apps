import { useCallback, useMemo } from 'react'

import type { AccessConditions } from '@audius/common/models'
import type { Nullable } from '@audius/common/utils'
import { useField } from 'formik'

type TrackAvailabilityField = {
  is_stream_gated: boolean
  stream_conditions: Nullable<AccessConditions>
  is_unlisted: boolean
  preview_start_seconds: Nullable<Number>
  'field_visibility.genre': boolean
  'field_visibility.mood': boolean
  'field_visibility.tags': boolean
  'field_visibility.share': boolean
  'field_visibility.play_count': boolean
  'field_visibility.remixes': boolean
}

export const useSetEntityAvailabilityFields = () => {
  const [{ value: entityType }] = useField('entityType')
  const [, , { setValue: setIsStreamGated }] =
    useField<boolean>('is_stream_gated')
  const [, , { setValue: setStreamConditions }] =
    useField<Nullable<AccessConditions>>('stream_conditions')
  const [, , { setValue: setIsUnlisted }] = useField<boolean>(
    entityType === 'track' ? 'is_unlisted' : 'is_private'
  )
  const [, , { setValue: setPreviewStartSeconds }] = useField<number>(
    'preview_start_seconds'
  )
  const [, , { setValue: setGenre }] = useField<boolean>(
    'field_visibility.genre'
  )
  const [, , { setValue: setMood }] = useField<boolean>('field_visibility.mood')
  const [, , { setValue: setTags }] = useField<boolean>('field_visibility.tags')
  const [, , { setValue: setShare }] = useField<boolean>(
    'field_visibility.share'
  )
  const [, , { setValue: setPlayCount }] = useField<boolean>(
    'field_visibility.play_count'
  )
  const [, , { setValue: setRemixes }] = useField<boolean>(
    'field_visibility.remixes'
  )

  const fieldSetters = useMemo(() => {
    return {
      is_stream_gated: setIsStreamGated,
      stream_conditions: setStreamConditions,
      is_unlisted: setIsUnlisted,
      preview_start_seconds: setPreviewStartSeconds,
      'field_visibility.genre': setGenre,
      'field_visibility.mood': setMood,
      'field_visibility.tags': setTags,
      'field_visibility.share': setShare,
      'field_visibility.play_count': setPlayCount,
      'field_visibility.remixes': setRemixes
    }
    // adding the useField setters cause infinite rendering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = useCallback(
    (fieldValues: Partial<TrackAvailabilityField>) => {
      const givenKeys = Object.keys(fieldValues)
      givenKeys.forEach((key) => {
        const value = fieldValues[key]
        const setter = fieldSetters[key]
        setter(value)
      })
    },
    [fieldSetters]
  )

  return set
}
