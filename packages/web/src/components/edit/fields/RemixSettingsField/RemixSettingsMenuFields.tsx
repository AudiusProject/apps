import { useEffect } from 'react'

import { useTrackByPermalink } from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import { remixSettingsMessages as messages } from '@audius/common/messages'
import { getPathFromTrackUrl } from '@audius/common/utils'
import { Divider } from '@audius/harmony'
import { useField } from 'formik'
import { pick } from 'lodash'
import { useThrottle } from 'react-use'

import { TextField } from 'components/form-fields'

import { SwitchRowField } from '../SwitchRowField'

import styles from './RemixSettingsField.module.css'
import { TrackInfo } from './TrackInfo'
import { CAN_REMIX_PARENT, IS_REMIX, REMIX_LINK, SHOW_REMIXES } from './types'

export const RemixSettingsMenuFields = () => {
  const [{ value: trackUrl }] = useField(REMIX_LINK)
  const [, , { setValue: setCanRemixParent }] = useField(CAN_REMIX_PARENT)
  const permalink = useThrottle(getPathFromTrackUrl(trackUrl), 1000)

  const { data: partialTrack } = useTrackByPermalink(permalink, {
    throwOnError: false, // Workaround for legacy python endpoint - currently we get a 404 in our pw tests
    select: (track) =>
      pick(track, [
        'track_id',
        'is_stream_gated',
        'stream_conditions',
        'is_download_gated',
        'download_conditions',
        'access'
      ])
  })

  const { track_id } = partialTrack ?? {}
  const { hasStreamAccess: canRemixParent } =
    useGatedContentAccess(partialTrack)

  const [, , { setValue: setParentTrackId }] = useField('parentTrackId')

  useEffect(() => {
    setParentTrackId(track_id)
    setCanRemixParent(canRemixParent)
  }, [track_id, setParentTrackId, canRemixParent, setCanRemixParent])

  return (
    <div className={styles.fields}>
      <SwitchRowField
        name={IS_REMIX}
        header={messages.remixOfField.header}
        description={messages.remixOfField.description}
      >
        <TextField name={REMIX_LINK} label={messages.remixOfField.linkLabel} />
        {track_id ? <TrackInfo trackId={track_id} /> : null}
      </SwitchRowField>

      <Divider />

      <SwitchRowField
        name={SHOW_REMIXES}
        header={messages.hideRemixField.header}
        description={messages.hideRemixField.description}
        inverted
      />
    </div>
  )
}
