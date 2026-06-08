import { useEffect, useMemo, useState } from 'react'

import type { Coin } from '@audius/common/adapters'
import { useUser } from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import type { ID } from '@audius/common/models'
import { WidthSizes } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import type { ImageSourcePropType } from 'react-native'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'

import {
  Divider,
  Flex,
  Paper,
  Skeleton,
  Text,
  spacing as harmonySpacing
} from '@audius/harmony-native'
import { ProfilePicture, TokenIcon } from 'app/components/core'
import { useCoverPhoto } from 'app/components/image/CoverPhoto'
import { primitiveToImageSource } from 'app/components/image/primitiveToImageSource'
import { UserLink } from 'app/components/user-link'
import { useThemeColors } from 'app/utils/theme'

const COVER_HEIGHT = 96
const AVATAR_OVERLAP = -harmonySpacing.unit9

type FanClubExploreCardProps = {
  coin: Coin
  onPress: () => void
}

const resolveDisplaySource = (
  bannerTrim: string,
  ownerCoverSource: ImageSourcePropType | undefined
): ImageSourcePropType | undefined => {
  if (bannerTrim) {
    return primitiveToImageSource(bannerTrim)
  }
  if (!ownerCoverSource) {
    return undefined
  }
  if (typeof ownerCoverSource === 'number') {
    return ownerCoverSource
  }
  if (typeof ownerCoverSource === 'object' && ownerCoverSource !== null) {
    if (
      'uri' in ownerCoverSource &&
      ownerCoverSource.uri != null &&
      String(ownerCoverSource.uri).length > 0
    ) {
      return ownerCoverSource
    }
    return undefined
  }
  return ownerCoverSource
}

const sourceTrackKey = (
  bannerTrim: string,
  ownerCoverSource: ImageSourcePropType | undefined
) => {
  if (bannerTrim) {
    return `b:${bannerTrim}`
  }
  if (typeof ownerCoverSource === 'number') {
    return `n:${ownerCoverSource}`
  }
  if (
    typeof ownerCoverSource === 'object' &&
    ownerCoverSource !== null &&
    'uri' in ownerCoverSource &&
    ownerCoverSource.uri != null
  ) {
    return `c:${String(ownerCoverSource.uri)}`
  }
  return ''
}

/**
 * Isolated per `mint` via parent `key` so FlashList recycling does not mix
 * cover hooks between rows. Shimmers until the banner or owner cover loads.
 */
const FanClubExploreCardCover = ({
  bannerImageUrl,
  ownerId
}: {
  bannerImageUrl?: string
  ownerId: ID
}) => {
  const { borderDefault, neutralLight8 } = useThemeColors()
  const { source: ownerCoverSource } = useCoverPhoto({
    userId: ownerId,
    size: WidthSizes.SIZE_640
  })
  const { isPending: isUserPending } = useUser(ownerId)

  const bannerTrim = bannerImageUrl?.trim() ?? ''
  const displaySource = useMemo(
    () => resolveDisplaySource(bannerTrim, ownerCoverSource),
    [bannerTrim, ownerCoverSource]
  )

  const trackKey = useMemo(
    () => sourceTrackKey(bannerTrim, ownerCoverSource),
    [bannerTrim, ownerCoverSource]
  )

  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    setImageReady(false)
  }, [trackKey])

  useEffect(() => {
    if (typeof displaySource === 'number') {
      setImageReady(true)
    }
  }, [displaySource])

  useEffect(() => {
    if (!trackKey && !isUserPending) {
      setImageReady(true)
    }
  }, [trackKey, isUserPending])

  const waitingOnRemoteImage =
    displaySource != null && typeof displaySource !== 'number'

  const showShimmer =
    !imageReady && (waitingOnRemoteImage || (!bannerTrim && isUserPending))

  return (
    <View
      style={{
        height: COVER_HEIGHT,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: borderDefault,
        overflow: 'hidden',
        backgroundColor: neutralLight8
      }}
    >
      {showShimmer ? <Skeleton style={StyleSheet.absoluteFillObject} /> : null}
      {displaySource ? (
        <Image
          source={displaySource}
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: imageReady ? 1 : 0 }
          ]}
          resizeMode='cover'
          onLoad={() => {
            setImageReady(true)
          }}
          onError={() => {
            setImageReady(true)
          }}
        />
      ) : null}
    </View>
  )
}

export const FanClubExploreCard = ({
  coin,
  onPress
}: FanClubExploreCardProps) => {
  const ownerId = coin.ownerId

  const fanClubLabel = walletMessages.fanClubs.fanClubLabel
  const membersLabel = walletMessages.fanClubs.members
  const marketCapLabel = walletMessages.fanClubs.marketCap

  const membersDisplay =
    coin.holder != null && !Number.isNaN(coin.holder)
      ? coin.holder.toLocaleString('en-US')
      : '—'

  const marketCapDisplay = `$${formatCount(coin.displayMarketCap ?? 0, 2)}`

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92}>
      <Paper
        column
        w='100%'
        borderRadius='l'
        shadow='mid'
        border='default'
        style={{ overflow: 'hidden' }}
      >
        <FanClubExploreCardCover
          key={coin.mint}
          bannerImageUrl={coin.bannerImageUrl}
          ownerId={ownerId}
        />

        <Flex
          column
          gap='l'
          ph='l'
          pb='l'
          pt='l'
          style={{ marginTop: AVATAR_OVERLAP }}
        >
          <Flex row gap='s' alignItems='flex-end' w='100%'>
            <View key={String(ownerId)}>
              <ProfilePicture userId={ownerId} size='large' />
            </View>
            <Flex column gap='2xs' flex={1} style={{ minWidth: 0 }}>
              <Text
                variant='label'
                size='s'
                color='subdued'
                style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {fanClubLabel}
              </Text>
              <UserLink userId={ownerId} size='l' mint={coin.mint} />
            </Flex>
          </Flex>

          <Paper
            backgroundColor='surface1'
            border='default'
            borderRadius='m'
            ph='l'
            pv='m'
            column
            gap='m'
            w='100%'
          >
            <Flex row gap='m' alignItems='center' w='100%'>
              <TokenIcon logoURI={coin.logoUri} size='xl' />
              <Flex column gap='xs' flex={1} style={{ minWidth: 0 }}>
                <Text
                  variant='label'
                  size='s'
                  color='subdued'
                  style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {walletMessages.poweredBy}
                </Text>
                <Text variant='heading' size='s' numberOfLines={1}>
                  {coin.ticker ?? coin.name}
                </Text>
              </Flex>
            </Flex>

            <Divider style={{ width: '100%' }} />

            <Flex row gap='l' alignItems='flex-start' w='100%'>
              <Flex column gap='xs' flex={1}>
                <Text
                  variant='label'
                  size='s'
                  color='subdued'
                  style={{ textTransform: 'uppercase' }}
                >
                  {membersLabel}
                </Text>
                <Text variant='body' size='m'>
                  {membersDisplay}
                </Text>
              </Flex>
              <Flex column gap='xs' flex={1}>
                <Text
                  variant='label'
                  size='s'
                  color='subdued'
                  style={{ textTransform: 'uppercase' }}
                >
                  {marketCapLabel}
                </Text>
                <Text variant='body' size='m'>
                  {marketCapDisplay}
                </Text>
              </Flex>
            </Flex>
          </Paper>
        </Flex>
      </Paper>
    </TouchableOpacity>
  )
}
