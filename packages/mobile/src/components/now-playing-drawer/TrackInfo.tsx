import { useCallback } from 'react'

import { useGatedContentAccess } from '@audius/common/hooks'
import type { Track, User } from '@audius/common/models'
import { playerSelectors } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { TouchableOpacity, View } from 'react-native'
import { useSelector } from 'react-redux'

import { LockedStatusBadge, Text } from 'app/components/core'
import { useDrawer } from 'app/hooks/useDrawer'
import { useAppTabNavigation } from 'app/screens/app-screen'
import { makeStyles } from 'app/styles'
import type { GestureResponderHandler } from 'app/types/gesture'

import { UserLink } from '../user-link'

const { getPreviewing } = playerSelectors

const messages = {
  preview: 'PREVIEW'
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    alignItems: 'center'
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing(2),
    flexWrap: 'wrap'
  },
  previewBadge: {
    marginBottom: spacing(2)
  },
  trackTitle: {
    textAlign: 'center'
  }
}))

type TrackInfoProps = {
  track: Nullable<Track>
  user: Nullable<User> | undefined
  onPressTitle: GestureResponderHandler
}

export const TrackInfo = (props: TrackInfoProps) => {
  const { track, user, onPressTitle } = props
  const styles = useStyles()
  const { hasStreamAccess } = useGatedContentAccess(track)
  const { onClose } = useDrawer('NowPlaying')
  const navigation = useAppTabNavigation()
  const isPreviewing = useSelector(getPreviewing)
  const shouldShowPreviewLock =
    isPreviewing ||
    (track?.stream_conditions &&
      'usdc_purchase' in track.stream_conditions &&
      !hasStreamAccess)

  const handlePressArtist = useCallback(() => {
    if (user?.user_id) {
      navigation?.push('Profile', { id: user.user_id })
      onClose()
    }
  }, [navigation, user?.user_id, onClose])

  if (!user || !track) return null

  const { user_id } = user

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.titleContainer} onPress={onPressTitle}>
        <Text numberOfLines={2} style={styles.trackTitle} variant='h1'>
          {track.title}
        </Text>
        {shouldShowPreviewLock ? (
          <View style={styles.previewBadge}>
            <LockedStatusBadge
              variant='premium'
              locked
              coloredWhenLocked
              iconSize='small'
              text={messages.preview}
            />
          </View>
        ) : null}
      </TouchableOpacity>
      <UserLink
        variant='visible'
        userId={user_id}
        onPress={handlePressArtist}
      />
    </View>
  )
}
