import type { ReactNode } from 'react'
import React, { useCallback } from 'react'

import type { Coin } from '@audius/common/adapters'
import { useFeatureFlag, useStreamConditionsEntity } from '@audius/common/hooks'
import {
  FollowSource,
  ModalSource,
  Chain,
  isContentCollectibleGated,
  isContentFollowGated,
  isContentTipGated,
  isContentUSDCPurchaseGated,
  isContentTokenGated
} from '@audius/common/models'
import type { ID, AccessConditions, User } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  PurchaseableContentType,
  usersSocialActions,
  tippingActions,
  usePremiumContentPurchaseModal,
  gatedContentSelectors
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import type { ViewStyle } from 'react-native'
import { Image, Text, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  IconExternalLink,
  IconUserFollow,
  IconTipping,
  Flex,
  Button,
  useTheme
} from '@audius/harmony-native'
import LogoEth from 'app/assets/images/logoEth.svg'
import LogoSol from 'app/assets/images/logoSol.svg'
import { LockedStatusBadge, useLink } from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import { UserBadges } from 'app/components/user-badges'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { make, track } from 'app/services/analytics'
import { flexRowCentered, makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { EventNames } from 'app/types/analytics'

const { getGatedContentStatusMap } = gatedContentSelectors
const { followUser } = usersSocialActions
const { beginTip } = tippingActions

const messages = {
  unlocking: 'UNLOCKING',
  howToUnlock: 'HOW TO UNLOCK',
  goToCollection: 'Go To Collection',
  followArtist: 'Follow Artist',
  sendTip: 'Send Tip',
  buy: (price: string) => `Buy ${price}`,
  lockedCollectibleGated:
    'To unlock this track, you must link a wallet containing a collectible from:',
  unlockingCollectibleGatedPrefix: 'A Collectible from ',
  unlockingCollectibleGatedSuffix: ' was found in a linked wallet.',
  lockedFollowGatedPrefix: 'Follow ',
  unlockingFollowGatedPrefix: 'Thank you for following ',
  unlockingFollowGatedSuffix: '!',
  lockedTipGatedPrefix: 'Send ',
  lockedTipGatedSuffix: ' a tip.',
  unlockingTipGatedPrefix: 'Thank you for supporting ',
  unlockingTipGatedSuffix: ' by sending them a tip!',
  lockedTokenGatedPrefix: 'You must hold at least ',
  lockedTokenGatedSuffix: ' in a connected wallet.',
  buyArtistCoin: 'Buy Artist Coin',
  lockedUSDCPurchase: 'Unlock access with a one-time purchase!'
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  titleContainer: {
    ...flexRowCentered(),
    justifyContent: 'space-between'
  },
  title: {
    fontFamily: typography.fontByWeight.heavy,
    fontSize: typography.fontSize.medium,
    color: palette.neutral
  },
  descriptionContainer: {
    ...flexRowCentered(),
    flexWrap: 'wrap'
  },
  description: {
    flexShrink: 0,
    fontFamily: typography.fontByWeight.demiBold,
    fontSize: typography.fontSize.medium,
    color: palette.neutral,
    lineHeight: typography.fontSize.medium * 1.3
  },
  name: {
    color: palette.secondary
  },
  collectionContainer: {
    ...flexRowCentered(),
    marginTop: spacing(2),
    gap: spacing(6)
  },
  collectionImages: {
    ...flexRowCentered()
  },
  collectionImage: {
    borderWidth: 1,
    borderColor: palette.neutralLight7,
    borderRadius: spacing(1),
    width: spacing(8),
    height: spacing(8)
  },
  collectionChainImageContainer: {
    backgroundColor: palette.white,
    position: 'absolute',
    left: spacing(6),
    padding: spacing(1),
    width: spacing(6),
    height: spacing(6),
    borderWidth: 1,
    borderColor: palette.neutralLight7,
    borderRadius: spacing(4)
  },
  collectionChainImage: {
    top: -spacing(0.25),
    left: -spacing(1.25)
  },
  loadingSpinner: {
    width: spacing(5),
    height: spacing(5)
  }
}))

type NoAccessProps = {
  renderDescription: () => ReactNode
  streamConditions: AccessConditions
  isUnlocking: boolean
  style?: ViewStyle
}

const DetailsTileNoAccessSection = ({
  renderDescription,
  streamConditions,
  isUnlocking,
  style
}: NoAccessProps) => {
  const styles = useStyles()

  return (
    <Flex
      p='l'
      gap='s'
      backgroundColor='white'
      border='strong'
      borderRadius='m'
      w='100%'
      style={style}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {isUnlocking ? messages.unlocking : messages.howToUnlock}
        </Text>
        {isUnlocking ? (
          <LoadingSpinner style={styles.loadingSpinner} />
        ) : (
          <LockedStatusBadge
            locked={true}
            variant={
              isContentUSDCPurchaseGated(streamConditions) ? 'premium' : 'gated'
            }
          />
        )}
      </View>
      {renderDescription()}
    </Flex>
  )
}

type DetailsTileNoAccessProps = {
  streamConditions: AccessConditions
  contentType: PurchaseableContentType
  trackId: ID
  token?: Coin | undefined
  style?: ViewStyle
}

export const DetailsTileNoAccess = (props: DetailsTileNoAccessProps) => {
  const { trackId, contentType, streamConditions, style, token } = props
  const styles = useStyles()
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { isOpen: isModalOpen, onClose } = useDrawer('LockedContent')
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const { color } = useTheme()
  const source = isModalOpen ? 'howToUnlockModal' : 'howToUnlockTrackPage'
  const followSource = isModalOpen
    ? FollowSource.HOW_TO_UNLOCK_MODAL
    : FollowSource.HOW_TO_UNLOCK_TRACK_PAGE
  const gatedTrackStatusMap = useSelector(getGatedContentStatusMap)
  const gatedTrackStatus = gatedTrackStatusMap[trackId] ?? null
  const { nftCollection, collectionLink, followee, tippedUser } =
    useStreamConditionsEntity(streamConditions)
  const { isEnabled: isUsdcPurchasesEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES
  )

  const { onPress: handlePressCollection } = useLink(collectionLink)

  const handleFollowArtist = useCallback(() => {
    if (followee) {
      dispatch(followUser(followee.user_id, followSource, trackId))
    }
  }, [followee, dispatch, followSource, trackId])

  const handleSendTip = useCallback(() => {
    onClose()
    dispatch(beginTip({ user: tippedUser, source, trackId }))
    navigation.navigate('TipArtist')
  }, [dispatch, tippedUser, source, trackId, navigation, onClose])

  const handlePurchasePress = useCallback(() => {
    track(
      make({
        eventName: EventNames.PURCHASE_CONTENT_BUY_CLICKED,
        contentId: trackId,
        contentType
      })
    )

    onClose()
    openPremiumContentPurchaseModal(
      { contentId: trackId, contentType },
      {
        source:
          contentType === PurchaseableContentType.ALBUM
            ? ModalSource.CollectionDetails
            : ModalSource.TrackDetails
      }
    )
  }, [trackId, contentType, openPremiumContentPurchaseModal, onClose])

  const handleTokenPress = useCallback(() => {
    if (token?.ticker) {
      navigation.navigate('CoinDetailsScreen', { ticker: token.ticker })
      onClose()
    }
  }, [navigation, token?.ticker, onClose])

  const handleBuyTokenPress = useCallback(() => {
    if (token?.ticker) {
      navigation.navigate('BuySell', {
        initialTab: 'buy',
        coinTicker: token.ticker
      })
    }
  }, [navigation, token?.ticker])

  const handlePressArtistName = useCallback(
    (handle: string) => () => {
      navigation.push('Profile', { handle })
    },
    [navigation]
  )

  const renderLockedSpecialAccessDescription = useCallback(
    (args: { entity: User; prefix: string; suffix?: string }) => {
      const { entity, prefix, suffix } = args
      return (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{prefix}</Text>
          <Text
            style={[styles.description, styles.name]}
            onPress={handlePressArtistName(entity.handle)}
          >
            {entity.name}
          </Text>
          <UserBadges userId={entity.user_id} badgeSize='xs' />
          {suffix ? <Text style={styles.description}>{suffix}</Text> : null}
        </View>
      )
    },
    [styles, handlePressArtistName]
  )

  const renderLockedDescription = useCallback(() => {
    if (isContentCollectibleGated(streamConditions)) {
      if (!nftCollection) return null
      return (
        <>
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              {messages.lockedCollectibleGated}
            </Text>
            <View style={styles.collectionContainer}>
              {nftCollection.imageUrl && (
                <View style={styles.collectionImages}>
                  <Image
                    source={{ uri: nftCollection.imageUrl }}
                    style={styles.collectionImage}
                  />
                  <View style={styles.collectionChainImageContainer}>
                    {nftCollection.chain === Chain.Eth ? (
                      <LogoEth
                        style={styles.collectionChainImage}
                        height={spacing(4)}
                      />
                    ) : (
                      <LogoSol
                        style={styles.collectionChainImage}
                        height={spacing(4)}
                      />
                    )}
                  </View>
                </View>
              )}
              <Text style={styles.description}>{nftCollection.name}</Text>
            </View>
          </View>
          <Button
            color='blue'
            iconRight={IconExternalLink}
            onPress={handlePressCollection}
            fullWidth
          >
            {messages.goToCollection}
          </Button>
        </>
      )
    }
    if (isContentFollowGated(streamConditions)) {
      if (!followee) return null
      return (
        <>
          {renderLockedSpecialAccessDescription({
            entity: followee,
            prefix: messages.lockedFollowGatedPrefix
          })}
          <Button
            color='blue'
            iconLeft={IconUserFollow}
            onPress={handleFollowArtist}
            fullWidth
          >
            {messages.followArtist}
          </Button>
        </>
      )
    }
    if (isContentTipGated(streamConditions)) {
      if (!tippedUser) return null
      return (
        <>
          {renderLockedSpecialAccessDescription({
            entity: tippedUser,
            prefix: messages.lockedTipGatedPrefix,
            suffix: messages.lockedTipGatedSuffix
          })}
          <Button iconRight={IconTipping} onPress={handleSendTip} fullWidth>
            {messages.sendTip}
          </Button>
        </>
      )
    }
    if (isContentTokenGated(streamConditions)) {
      return (
        <Flex column gap='xl'>
          <Flex column gap='s'>
            <View style={styles.descriptionContainer}>
              <Text>
                <Text style={styles.description}>
                  {messages.lockedTokenGatedPrefix}
                </Text>
                <Text
                  style={[styles.description, styles.name]}
                  onPress={handleTokenPress}
                >
                  1 ${token?.ticker}
                </Text>
                <Text style={styles.description}>
                  {messages.lockedTokenGatedSuffix}
                </Text>
              </Text>
            </View>
          </Flex>
          <Button
            onPress={handleBuyTokenPress}
            gradient={color.special.coinGradient}
          >
            {messages.buyArtistCoin}
          </Button>
        </Flex>
      )
    }
    if (isContentUSDCPurchaseGated(streamConditions)) {
      return (
        <Flex gap='s'>
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              {messages.lockedUSDCPurchase}
            </Text>
          </View>
          <Button color='lightGreen' onPress={handlePurchasePress} fullWidth>
            {messages.buy(
              USDC(streamConditions.usdc_purchase.price / 100).toLocaleString()
            )}
          </Button>
        </Flex>
      )
    }

    console.warn(
      'No entity for stream conditions... should not have reached here.'
    )
    return null
  }, [
    streamConditions,
    nftCollection,
    styles.descriptionContainer,
    styles.description,
    styles.collectionContainer,
    styles.collectionImages,
    styles.collectionImage,
    styles.collectionChainImageContainer,
    styles.collectionChainImage,
    styles.name,
    handlePressCollection,
    followee,
    renderLockedSpecialAccessDescription,
    handleFollowArtist,
    tippedUser,
    handleSendTip,
    handleTokenPress,
    token?.ticker,
    handleBuyTokenPress,
    color.special.coinGradient,
    handlePurchasePress
  ])

  const renderUnlockingSpecialAccessDescription = useCallback(
    (args: { entity: User; prefix: string; suffix: string }) => {
      const { entity, prefix, suffix } = args
      return (
        <View style={styles.descriptionContainer}>
          <Text>
            <Text style={styles.description}>{prefix}</Text>
            <Text
              style={[styles.description, styles.name]}
              onPress={handlePressArtistName(entity.handle)}
            >
              {entity.name}
            </Text>
            <UserBadges userId={entity.user_id} badgeSize='xs' />
            <Text style={styles.description}>{suffix}</Text>
          </Text>
        </View>
      )
    },
    [styles, handlePressArtistName]
  )

  const renderUnlockingDescription = useCallback(() => {
    if (nftCollection) {
      return (
        <View style={styles.descriptionContainer}>
          <Text>
            <Text style={styles.description}>
              {messages.unlockingCollectibleGatedPrefix}
            </Text>
            <Text
              onPress={handlePressCollection}
              style={[styles.description, styles.name]}
            >
              {nftCollection.name}
            </Text>
            <Text style={styles.description}>
              {messages.unlockingCollectibleGatedSuffix}
            </Text>
          </Text>
        </View>
      )
    }
    if (followee) {
      return renderUnlockingSpecialAccessDescription({
        entity: followee,
        prefix: messages.unlockingFollowGatedPrefix,
        suffix: messages.unlockingFollowGatedSuffix
      })
    }
    if (tippedUser) {
      return renderUnlockingSpecialAccessDescription({
        entity: tippedUser,
        prefix: messages.unlockingTipGatedPrefix,
        suffix: messages.unlockingTipGatedSuffix
      })
    }

    console.warn(
      'No entity for stream conditions... should not have reached here.'
    )
    return null
  }, [
    nftCollection,
    followee,
    tippedUser,
    handlePressCollection,
    renderUnlockingSpecialAccessDescription,
    styles
  ])

  const isUnlocking = gatedTrackStatus === 'UNLOCKING'

  if (!isUsdcPurchasesEnabled && isContentUSDCPurchaseGated(streamConditions)) {
    return null
  }

  return (
    <DetailsTileNoAccessSection
      renderDescription={
        isUnlocking ? renderUnlockingDescription : renderLockedDescription
      }
      streamConditions={streamConditions}
      isUnlocking={isUnlocking}
      style={style}
    />
  )
}
