import { useCallback, useEffect, useMemo } from 'react'

import { useTrack } from '@audius/common/api'
import { remixSettingsMessages as messages } from '@audius/common/messages'
import {
  isContentUSDCPurchaseGated,
  ID,
  FieldVisibility,
  Remix
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { IconRemix, Text } from '@audius/harmony'
import { get, set } from 'lodash'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  ContextualMenu,
  SelectedValue
} from 'components/data-entry/ContextualMenu'
import { useTrackField } from 'components/edit-track/hooks'
import { SingleTrackEditValues } from 'components/edit-track/types'
import { fullTrackPage } from 'utils/route'

import { IS_STREAM_GATED, STREAM_CONDITIONS } from '../types'

import styles from './RemixSettingsField.module.css'
import { RemixSettingsMenuFields } from './RemixSettingsMenuFields'
import { TrackInfo } from './TrackInfo'
import {
  CAN_REMIX_PARENT,
  IS_REMIX,
  REMIX_LINK,
  REMIX_OF,
  RemixSettingsFieldSchema,
  RemixSettingsFormValues,
  SHOW_REMIXES,
  SHOW_REMIXES_BASE
} from './types'

export type RemixOfField = Nullable<{ tracks: { parent_track_id: ID }[] }>

type RemixSettingsFieldProps = {
  isUpload: boolean
}

export const RemixSettingsField = (props: RemixSettingsFieldProps) => {
  const { isUpload } = props
  // These refer to the field in the outer EditForm
  const [{ value: showRemixes }, , { setValue: setShowRemixes }] =
    useTrackField<FieldVisibility[typeof SHOW_REMIXES_BASE]>(SHOW_REMIXES)
  const [{ value: remixOf }, , { setValue: setRemixOf }] =
    useTrackField<SingleTrackEditValues[typeof REMIX_OF]>(REMIX_OF)
  const [{ value: isStreamGated }] =
    useTrackField<SingleTrackEditValues[typeof IS_STREAM_GATED]>(
      IS_STREAM_GATED
    )
  const [{ value: streamConditions }] =
    useTrackField<SingleTrackEditValues[typeof STREAM_CONDITIONS]>(
      STREAM_CONDITIONS
    )

  const parentTrackId = remixOf?.tracks[0].parent_track_id
  const { data: remixOfTrackPermalink } = useTrack(parentTrackId, {
    select: (track) => track.permalink
  })

  const remixLink = remixOfTrackPermalink
    ? fullTrackPage(remixOfTrackPermalink)
    : ''

  const isRemix = Boolean(remixOf && remixOf?.tracks.length > 0)

  const initialValues = useMemo(() => {
    const initialValues = {
      parentTrackId,
      [CAN_REMIX_PARENT]: true
    }
    set(initialValues, SHOW_REMIXES, showRemixes)
    set(initialValues, IS_REMIX, isRemix)
    set(initialValues, REMIX_LINK, remixLink)
    set(initialValues, IS_STREAM_GATED, isStreamGated)
    set(initialValues, STREAM_CONDITIONS, streamConditions)
    return initialValues as unknown as RemixSettingsFormValues
  }, [
    showRemixes,
    isRemix,
    remixLink,
    parentTrackId,
    isStreamGated,
    streamConditions
  ])

  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)

  // When uploading, if the track is public or usdc purchase gated, default to showing remixes.
  // Otherwise, default to hiding remixes.
  useEffect(() => {
    if (!isUpload) return
    if (!isStreamGated || isUSDCPurchaseGated) {
      setShowRemixes(true)
    } else if (isStreamGated) {
      setShowRemixes(false)
    }
  }, [isUpload, isStreamGated, isUSDCPurchaseGated, setShowRemixes])

  const handleSubmit = useCallback(
    (values: RemixSettingsFormValues) => {
      const showRemixes = get(values, SHOW_REMIXES)
      const isRemix = get(values, IS_REMIX)
      const { parentTrackId } = values

      setShowRemixes(!!showRemixes)

      setRemixOf(
        isRemix && parentTrackId
          ? { tracks: [{ parent_track_id: parentTrackId } as Remix] }
          : null
      )
    },
    [setShowRemixes, setRemixOf]
  )

  const renderValue = useCallback(() => {
    if (showRemixes && !parentTrackId) return null

    return (
      <div className={styles.selectedValue}>
        {!showRemixes ? <SelectedValue label={messages.remixesHidden} /> : null}
        {parentTrackId ? (
          <div className={styles.remixOfValue}>
            <Text variant='label' size='s'>
              {messages.remixOf}:
            </Text>
            <TrackInfo trackId={parentTrackId} />
          </div>
        ) : null}
      </div>
    )
  }, [parentTrackId, showRemixes])

  return (
    <ContextualMenu
      label={messages.title}
      description={messages.description}
      renderValue={renderValue}
      menuFields={<RemixSettingsMenuFields />}
      icon={<IconRemix />}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(RemixSettingsFieldSchema)}
    />
  )
}
