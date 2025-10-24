import type { ComponentType } from 'react'
import { useMemo } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import {
  SquareSizes,
  GatedContentType,
  isContentUSDCPurchaseGated,
  isContentTokenGated
} from '@audius/common/models'
import type { ID } from '@audius/common/models'
import type { ColorValue } from 'react-native'
import { View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import {
  Flex,
  IconArtistCoin,
  IconCart,
  IconSparkles
} from '@audius/harmony-native'
import { Text } from 'app/components/core'
import { UserBadges } from 'app/components/user-badges'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { makeStyles, flexRowCentered, typography } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'

import { CoinGatedLabelSvg } from '../core/CoinGatedLabelSvg'
import { TrackImage } from '../image/TrackImage'
import { TrackDogEar } from '../track/TrackDogEar'

const messages = {
  specialAccess: 'SPECIAL ACCESS',
  premiumTrack: 'PREMIUM TRACK',
  coinGated: 'COIN GATED',
  earn: (amount: string) => `Earn ${amount} $AUDIO for this purchase!`
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: {
    backgroundColor: palette.neutralLight10,
    borderWidth: 1,
    borderColor: palette.neutralLight8,
    borderRadius: spacing(2),
    width: '100%'
  },
  trackDetails: {
    ...flexRowCentered(),
    padding: spacing(4),
    gap: spacing(4)
  },
  trackImage: {
    width: spacing(22),
    height: spacing(22),
    borderRadius: spacing(1),
    borderColor: palette.neutralLight8
  },
  metadataContainer: {
    gap: spacing(1),
    flexShrink: 1
  },
  streamContentLabelContainer: {
    ...flexRowCentered(),
    gap: spacing(2)
  },
  streamContentLabel: {
    letterSpacing: spacing(0.5)
  },
  trackOwner: {
    fontFamily: typography.fontByWeight.medium,
    fontSize: typography.fontSize.medium
  }
}))

type TrackDetailsTileProps = {
  trackId: ID
  showLabel?: boolean
  earnAmount?: string
}

export const TrackDetailsTile = ({
  trackId,
  showLabel = true,
  earnAmount
}: TrackDetailsTileProps) => {
  const styles = useStyles()
  const { accentBlue, specialLightGreen } = useThemeColors()
  const { data: track } = useTrack(trackId)
  const { data: owner } = useUser(track?.owner_id)
  const isTokenGated = isContentTokenGated(track?.stream_conditions)
  const isUSDCPurchaseGated =
    useIsUSDCEnabled() && isContentUSDCPurchaseGated(track?.stream_conditions)

  const type = isUSDCPurchaseGated
    ? GatedContentType.USDC_PURCHASE
    : isTokenGated
      ? GatedContentType.TOKEN_GATED
      : GatedContentType.SPECIAL_ACCESS

  const headerAttributes: {
    [k in GatedContentType]: {
      message: string
      icon: ComponentType<SvgProps>
      color: ColorValue
    }
  } = useMemo(() => {
    return {
      [GatedContentType.SPECIAL_ACCESS]: {
        message: messages.specialAccess,
        icon: IconSparkles,
        color: accentBlue
      },
      [GatedContentType.TOKEN_GATED]: {
        message: messages.coinGated,
        icon: IconArtistCoin,
        color: accentBlue
      },
      [GatedContentType.USDC_PURCHASE]: {
        message: messages.premiumTrack,
        icon: IconCart,
        color: specialLightGreen
      }
    }
  }, [accentBlue, specialLightGreen])

  if (!track || !owner) {
    return null
  }

  const { message: title, icon: IconComponent, color } = headerAttributes[type]

  return (
    <View style={styles.root}>
      <TrackDogEar trackId={trackId} />
      <View style={styles.trackDetails}>
        <TrackImage
          trackId={trackId}
          style={styles.trackImage}
          size={SquareSizes.SIZE_150_BY_150}
        />
        <View style={styles.metadataContainer}>
          {showLabel ? (
            <View style={styles.streamContentLabelContainer}>
              {isTokenGated ? (
                <CoinGatedLabelSvg style={{ height: 28, width: 108 }} />
              ) : (
                <>
                  <IconComponent
                    fill={color}
                    width={spacing(5)}
                    height={spacing(5)}
                  />
                  <Text
                    fontSize='small'
                    colorValue={color}
                    weight='demiBold'
                    textTransform='uppercase'
                    style={styles.streamContentLabel}
                  >
                    {title}
                  </Text>
                </>
              )}
            </View>
          ) : null}
          <Text
            fontSize='medium'
            weight='bold'
            textTransform='capitalize'
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <Flex row alignItems='center' gap='xs' mt='xs'>
            <Text fontSize='medium'>{owner.name}</Text>
            <UserBadges userId={owner.user_id} badgeSize='xs' />
          </Flex>
          {earnAmount ? (
            <Flex direction='row' alignItems='center' gap='xs' pt='xs'>
              <IconCart size='s' color='premium' />
              <Text fontSize='xs' color='specialLightGreen'>
                {messages.earn(earnAmount)}
              </Text>
            </Flex>
          ) : null}
        </View>
      </View>
    </View>
  )
}
