import { useCallback } from 'react'

import { useGatedContentAccess, useLockedContent } from '@audius/common/hooks'
import {
  gatedContentActions,
  PurchaseableContentType
} from '@audius/common/store'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'

import { IconLock } from '@audius/harmony-native'
import { Text } from 'app/components/core'
import { DetailsTileGatedAccess } from 'app/components/details-tile/DetailsTileGatedAccess'
import { NativeDrawer } from 'app/components/drawer'
import { TrackDetailsTile } from 'app/components/track-details-tile/TrackDetailsTile'
import { makeStyles, flexRowCentered } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useColor } from 'app/utils/theme'

const LOCKED_CONTENT_MODAL_NAME = 'LockedContent'

const { resetLockedContentId } = gatedContentActions

const messages = {
  howToUnlock: 'HOW TO UNLOCK'
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  drawer: {
    paddingVertical: spacing(6),
    alignItems: 'center',
    backgroundColor: palette.white,
    paddingHorizontal: spacing(4),
    gap: spacing(6)
  },
  titleContainer: {
    ...flexRowCentered(),
    justifyContent: 'center',
    paddingBottom: spacing(4),
    gap: spacing(2),
    borderBottomColor: palette.neutralLight8,
    borderBottomWidth: 1,
    width: '100%'
  },
  gatedContentSection: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent'
  }
}))

export const LockedContentDrawer = () => {
  const styles = useStyles()
  const neutralLight2 = useColor('neutralLight2')
  const dispatch = useDispatch()
  const { id, track, owner } = useLockedContent()
  const { hasStreamAccess } = useGatedContentAccess(track)

  const handleClose = useCallback(() => {
    dispatch(resetLockedContentId())
  }, [dispatch])

  if (!id || !track || !track.stream_conditions || !owner) {
    return null
  }

  return (
    <NativeDrawer drawerName={LOCKED_CONTENT_MODAL_NAME} onClose={handleClose}>
      <View style={styles.drawer}>
        <View style={styles.titleContainer}>
          <IconLock
            fill={neutralLight2}
            width={spacing(6)}
            height={spacing(6)}
          />
          <Text weight='heavy' color='neutralLight2' fontSize='xl'>
            {messages.howToUnlock}
          </Text>
        </View>
        <TrackDetailsTile trackId={track.track_id} />
        <DetailsTileGatedAccess
          style={styles.gatedContentSection}
          trackId={track.track_id}
          streamConditions={track.stream_conditions}
          isOwner={false}
          hasStreamAccess={hasStreamAccess}
          contentType={PurchaseableContentType.TRACK}
        />
      </View>
    </NativeDrawer>
  )
}
