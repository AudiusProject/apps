import { useCallback } from 'react'

import type { Coin } from '@audius/common/adapters'
import { useStreamConditionsEntity } from '@audius/common/hooks'
import {
  isContentFollowGated,
  isContentTipGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import type { AccessConditions, User } from '@audius/common/models'
import type { PurchaseableContentType } from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import type { ViewStyle } from 'react-native'
import { Image, View } from 'react-native'

import {
  Flex,
  Text as HarmonyText,
  HexagonalIcon,
  IconArtistCoin,
  IconCart,
  IconSparkles
} from '@audius/harmony-native'
import { LockedStatusBadge, Text } from 'app/components/core'
import { UserBadges } from 'app/components/user-badges'
import { useNavigation } from 'app/hooks/useNavigation'
import { flexRowCentered, makeStyles } from 'app/styles'
import { useColor } from 'app/utils/theme'

const messages = {
  unlocked: 'UNLOCKED',
  specialAccess: 'SPECIAL ACCESS',
  payToUnlock: 'Pay to Unlock',
  coinGated: 'COIN GATED',
  artistCoin: "This artist's coin",
  unlockedTokenGatedSuffix: (contentType: PurchaseableContentType) =>
    ` was found in a linked wallet. This ${contentType} is now available.`,
  ownerTokenGated:
    'Fans can unlock access by linking a wallet containing your artist coin',
  unlockedFollowGatedPrefix: 'Thank you for following ',
  unlockedFollowGatedSuffix: (contentType: PurchaseableContentType) =>
    `! This ${contentType} is now available.`,
  ownerFollowGated: 'Users can unlock access by following your account!',
  unlockedTipGatedPrefix: 'Thank you for supporting ',
  unlockedTipGatedSuffix: (contentType: PurchaseableContentType) =>
    ` by sending them a tip! This ${contentType} is now available.`,
  ownerTipGated: 'Users can unlock access by sending you a tip!',
  unlockedUSDCPurchasePrefix: (contentType: PurchaseableContentType) =>
    `You've purchased this ${contentType}. Thank you for supporting `,
  unlockedUSDCPurchaseSuffix: '.',
  ownerUSDCPurchase: ({
    price,
    contentType
  }: {
    price: string
    contentType: PurchaseableContentType
  }) =>
    `Users can unlock access to this ${contentType} for a one time purchase of ${price}`
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  titleContainer: {
    ...flexRowCentered(),
    justifyContent: 'space-between',
    gap: spacing(2)
  },
  ownerTitleContainer: {
    justifyContent: 'flex-start'
  },
  title: {
    fontFamily: typography.fontByWeight.heavy,
    fontSize: typography.fontSize.medium,
    color: palette.neutral,
    textTransform: 'uppercase'
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
  }
}))

type HasAccessProps = {
  streamConditions: AccessConditions
  token: Coin | undefined
  contentType: PurchaseableContentType
}

const DetailsTileOwnerSection = ({
  streamConditions,
  token,
  contentType
}: HasAccessProps) => {
  const styles = useStyles()
  const neutral = useColor('neutral')

  if (
    isContentFollowGated(streamConditions) ||
    isContentTipGated(streamConditions)
  ) {
    return (
      <Flex
        p='l'
        gap='s'
        backgroundColor='white'
        border='strong'
        borderRadius='m'
      >
        <View style={[styles.titleContainer, styles.ownerTitleContainer]}>
          <IconSparkles fill={neutral} width={16} height={16} />
          <Text style={styles.title}>{messages.specialAccess}</Text>
        </View>
        <View style={styles.descriptionContainer}>
          <Text>
            <Text style={styles.description}>
              {isContentFollowGated(streamConditions)
                ? messages.ownerFollowGated
                : messages.ownerTipGated}
            </Text>
          </Text>
        </View>
      </Flex>
    )
  }
  if (isContentTokenGated(streamConditions)) {
    return (
      <Flex
        p='l'
        gap='s'
        backgroundColor='white'
        border='strong'
        borderRadius='m'
      >
        <Flex row alignItems='center' gap='s'>
          <IconArtistCoin fill={neutral} width={16} height={16} />
          <HarmonyText variant='title' size='m' strength='strong'>
            {messages.coinGated}
          </HarmonyText>
        </Flex>
        <Flex>
          <Text style={styles.description}>{messages.ownerTokenGated}</Text>
        </Flex>
        <Flex row alignItems='center' gap='xs'>
          <HexagonalIcon size={24}>
            <Image
              source={{ uri: token?.logoUri }}
              style={{ width: 24, height: 24 }}
            />
          </HexagonalIcon>
          <HarmonyText variant='title'>${token?.ticker}</HarmonyText>
        </Flex>
      </Flex>
    )
  }
  if (isContentUSDCPurchaseGated(streamConditions)) {
    return (
      <Flex
        p='l'
        gap='s'
        backgroundColor='white'
        border='strong'
        borderRadius='m'
      >
        <View style={[styles.titleContainer, styles.ownerTitleContainer]}>
          <IconCart fill={neutral} width={16} height={16} />
          <Text style={styles.title}>{messages.payToUnlock}</Text>
        </View>
        <View style={styles.descriptionContainer}>
          <Text>
            <Text style={styles.description}>
              {messages.ownerUSDCPurchase({
                price: USDC(
                  streamConditions.usdc_purchase.price / 100
                ).toLocaleString(),
                contentType
              })}
            </Text>
          </Text>
        </View>
      </Flex>
    )
  }
  return null
}

type DetailsTileHasAccessProps = {
  streamConditions: AccessConditions
  isOwner: boolean
  style?: ViewStyle
  trackArtist?: Pick<User, 'user_id' | 'name' | 'is_verified' | 'handle'>
  token?: Coin | undefined
  contentType: PurchaseableContentType
}

export const DetailsTileHasAccess = ({
  streamConditions,
  isOwner,
  style,
  token,
  trackArtist,
  contentType
}: DetailsTileHasAccessProps) => {
  const styles = useStyles()
  const navigation = useNavigation()

  const { followee, tippedUser } = useStreamConditionsEntity(streamConditions)

  const handlePressArtistName = useCallback(
    (handle: string) => () => {
      navigation.push('Profile', { handle })
    },
    [navigation]
  )

  const handleTokenPress = useCallback(() => {
    if (token?.ticker) {
      navigation.push('CoinDetailsScreen', { ticker: token.ticker })
    }
  }, [navigation, token?.ticker])

  const renderUnlockedSpecialAccessDescription = useCallback(
    (args: {
      entity: Pick<User, 'user_id' | 'name' | 'is_verified' | 'handle'>
      prefix: string
      suffix: string
    }) => {
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

  const renderUnlockedDescription = useCallback(() => {
    if (isContentFollowGated(streamConditions)) {
      if (!followee) return null
      return renderUnlockedSpecialAccessDescription({
        entity: followee,
        prefix: messages.unlockedFollowGatedPrefix,
        suffix: messages.unlockedFollowGatedSuffix(contentType)
      })
    }
    if (isContentTipGated(streamConditions)) {
      if (!tippedUser) return null
      return renderUnlockedSpecialAccessDescription({
        entity: tippedUser,
        prefix: messages.unlockedTipGatedPrefix,
        suffix: messages.unlockedTipGatedSuffix(contentType)
      })
    }
    if (isContentUSDCPurchaseGated(streamConditions)) {
      if (!trackArtist) return null
      return renderUnlockedSpecialAccessDescription({
        entity: trackArtist,
        prefix: messages.unlockedUSDCPurchasePrefix(contentType),
        suffix: messages.unlockedUSDCPurchaseSuffix
      })
    }
    if (isContentTokenGated(streamConditions)) {
      if (!trackArtist) return null

      return (
        <View style={styles.descriptionContainer}>
          <Text>
            <Text
              style={[styles.description, styles.name]}
              onPress={handleTokenPress}
            >
              {token?.ticker ? `$${token.ticker}` : messages.artistCoin}
            </Text>
            <Text style={styles.description}>
              {messages.unlockedTokenGatedSuffix(contentType)}
            </Text>
          </Text>
        </View>
      )
    }
    return null
  }, [
    streamConditions,
    styles.descriptionContainer,
    styles.description,
    styles.name,
    contentType,
    followee,
    renderUnlockedSpecialAccessDescription,
    tippedUser,
    trackArtist,
    handleTokenPress,
    token?.ticker
  ])

  if (isOwner) {
    return (
      <DetailsTileOwnerSection
        streamConditions={streamConditions}
        token={token}
        contentType={contentType}
      />
    )
  }

  return (
    <Flex
      p='l'
      gap='s'
      backgroundColor='white'
      border='strong'
      borderRadius='m'
      style={style}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{messages.unlocked}</Text>
        <LockedStatusBadge
          locked={false}
          variant={
            isContentUSDCPurchaseGated(streamConditions)
              ? 'premium'
              : isContentTokenGated(streamConditions)
                ? 'tokenGated'
                : 'gated'
          }
        />
      </View>
      {renderUnlockedDescription()}
    </Flex>
  )
}
