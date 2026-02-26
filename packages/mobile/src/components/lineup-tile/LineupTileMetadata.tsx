import { useCallback, useMemo } from 'react'

import type { ID } from '@audius/common/models'
import { playerSelectors } from '@audius/common/store'
import { View } from 'react-native'
import {
  Gesture,
  GestureDetector,
  TouchableOpacity
} from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import { IconVolumeLevel2 } from '@audius/harmony-native'
import { Text, FadeInView } from 'app/components/core'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'
import type { GestureResponderHandler } from 'app/types/gesture'
import { useThemeColors } from 'app/utils/theme'

import { LineupTileArt } from './LineupTileArt'
import { LineupTileTopRight } from './LineupTileTopRight'
import { useStyles as useTileStyles } from './styles'
import type { RenderImage } from './types'

const { getPlaying } = playerSelectors

const useStyles = makeStyles(({ palette }) => ({
  metadata: {
    flexDirection: 'row',
    gap: 8,
    width: '100%'
  },
  playingIndicator: {
    marginLeft: 8
  },
  coSignLabel: {
    position: 'absolute',
    bottom: -3,
    left: 96,
    color: palette.primary,
    fontSize: 12,
    letterSpacing: 1,
    lineHeight: 15,
    textTransform: 'uppercase'
  }
}))

type Props = {
  onPressTitle?: GestureResponderHandler
  renderImage: RenderImage
  title: string
  userId: ID
  isPlayingUid: boolean
  type: 'track' | 'playlist' | 'album'
  trackId: ID
  duration: number
  isLongFormContent: boolean
  isArtistPick?: boolean
}

export const LineupTileMetadata = ({
  onPressTitle,
  renderImage,
  title,
  userId,
  isPlayingUid,
  type,
  trackId,
  duration,
  isLongFormContent,
  isArtistPick = false
}: Props) => {
  const styles = useStyles()
  const tileStyles = useTileStyles()
  const { primary } = useThemeColors()
  const navigation = useNavigation()

  const isActive = isPlayingUid

  const isPlaying = useSelector((state) => {
    return getPlaying(state) && isActive
  })

  const handlePressUser = () => {
    navigation.push('Profile', { id: userId })
  }

  const handlePressTitleWorklet = useCallback(() => {
    onPressTitle?.()
  }, [onPressTitle])

  const titleTapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        'worklet'
        runOnJS(handlePressTitleWorklet)()
      }),
    [handlePressTitleWorklet]
  )

  return (
    <View style={styles.metadata}>
      <LineupTileArt
        renderImage={renderImage}
        style={tileStyles.imageContainer}
        trackId={trackId}
      />
      <FadeInView
        style={
          type === 'track' ? tileStyles.titles : tileStyles.collectionTitles
        }
        startOpacity={0}
        duration={500}
      >
        {type !== 'track' ? (
          <Text
            variant='label'
            fontSize='xs'
            textTransform='uppercase'
            color='textIconSubdued'
          >
            {type}
          </Text>
        ) : null}

        <GestureDetector gesture={titleTapGesture}>
          <View
            style={{
              ...tileStyles.title,
              ...(isPlaying ? tileStyles.titlePlaying : {})
            }}
          >
            <Text
              color={isActive ? 'primary' : 'neutral'}
              weight='bold'
              numberOfLines={1}
            >
              {title}
            </Text>
            {isPlaying ? (
              <IconVolumeLevel2
                fill={primary}
                style={styles.playingIndicator}
                size='m'
              />
            ) : null}
          </View>
        </GestureDetector>
        <TouchableOpacity onPress={handlePressUser} activeOpacity={1}>
          <View pointerEvents='none'>
            <UserLink
              variant={isActive ? 'active' : 'default'}
              textVariant='body'
              userId={userId}
            />
          </View>
        </TouchableOpacity>
      </FadeInView>
      <LineupTileTopRight
        duration={duration}
        trackId={trackId}
        isLongFormContent={isLongFormContent}
        isCollection={false}
        isArtistPick={isArtistPick}
      />
    </View>
  )
}
