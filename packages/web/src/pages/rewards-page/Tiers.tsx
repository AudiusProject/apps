import { ReactElement, useCallback, useEffect, useMemo } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { useGetDiscordOAuthLink } from '@audius/common/hooks'
import {
  AudioTiers,
  BadgeTier,
  featureMessages,
  tierFeatureMap
} from '@audius/common/models'
import {
  badgeTiers,
  getTierNumber,
  musicConfettiActions,
  useTierAndVerifiedForUser
} from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { formatNumberCommas } from '@audius/common/utils'
import {
  IconTokenBronze,
  IconTokenGold,
  IconTokenPlatinum,
  IconTokenSilver,
  IconDiscord,
  Button,
  Text,
  Flex,
  IconValidationCheck,
  IconRefresh,
  Paper,
  Tooltip,
  useTheme
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import styles from './Tiers.module.css'
const { show } = musicConfettiActions

const messages = {
  title: 'Perks',
  subtitle: 'Keep $AUDIO in your wallet to enjoy perks and exclusive features.',
  noTier: 'Everyone',
  currentTier: 'Current',
  tierLevel: (amount: string) => `${Number(amount).toLocaleString()}+`,
  updateRole: 'Update Role',
  features: featureMessages,
  learnMore: 'Learn more',
  launchDiscord: 'Launch the VIP Discord',
  refreshDiscordRole: 'Refresh Discord role',
  tierNumber: (tier: number) => `TIER ${tier}`
}

const BADGE_SIZE = 24

// Tiers as they are listed here, in order
const tiers: AudioTiers[] = ['bronze', 'silver', 'gold', 'platinum']
const displayTiers: BadgeTier[] = [
  'none',
  'bronze',
  'silver',
  'gold',
  'platinum'
]
type TierFeature = keyof typeof featureMessages
const featureKeys = Object.keys(featureMessages) as TierFeature[]

// Mapping for large icons
const audioTierMapSvg: {
  [tier in AudioTiers]: Nullable<ReactElement>
} = {
  bronze: <IconTokenBronze width={BADGE_SIZE} height={BADGE_SIZE} />,
  silver: <IconTokenSilver width={BADGE_SIZE} height={BADGE_SIZE} />,
  gold: <IconTokenGold width={BADGE_SIZE} height={BADGE_SIZE} />,
  platinum: <IconTokenPlatinum width={BADGE_SIZE} height={BADGE_SIZE} />
}

const BADGE_LOCAL_STORAGE_KEY = 'last_badge_tier'

const LEARN_MORE_URL = 'https://help.audius.co'

const useShowConfetti = (tier: BadgeTier) => {
  // No tier or no local storage, never show confetti
  if (tier === 'none' || !window.localStorage) return false

  const lastBadge = window.localStorage.getItem(BADGE_LOCAL_STORAGE_KEY) as
    | BadgeTier
    | undefined

  // set last tier
  window.localStorage.setItem(BADGE_LOCAL_STORAGE_KEY, tier)

  // if we just got our first tier, always show confetti
  if (!lastBadge) return true

  const [oldTierNum, newTierNum] = [
    getTierNumber(lastBadge),
    getTierNumber(tier)
  ]

  return newTierNum > oldTierNum
}

/** Renders out the level # associated with a given tier */
export const TierNumber = ({ tier }: { tier: AudioTiers }) => {
  const tierNumber = tiers.findIndex((t) => t === tier) + 1
  return (
    <span className={styles.tierNumberText}>
      {messages.tierNumber(tierNumber)}
    </span>
  )
}

/** Renders out level of audio required for a tier - e.g. '1000+ $AUDIO */
export const TierLevel = ({ tier }: { tier: AudioTiers }) => {
  const minAudio = useMemo(
    () =>
      badgeTiers
        .find((b) => b.tier === tier)
        ?.humanReadableAmount?.toString() ?? '',
    [tier]
  )
  return <div className={styles.tierLevel}>{messages.tierLevel(minAudio)}</div>
}

const TierBox = ({ tier, message }: { tier: BadgeTier; message?: string }) => {
  return (
    <Flex direction='column' alignItems='center' gap='s' mb='s'>
      <Flex>
        {tier !== 'none' ? (
          audioTierMapSvg[tier as AudioTiers]
        ) : (
          <Flex h={BADGE_SIZE} w={BADGE_SIZE} />
        )}
      </Flex>
      <Text
        variant='title'
        size='m'
        color='default'
        textTransform='capitalize'
        css={{ minHeight: '1.5em' }}
      >
        {tier !== 'none' ? tier : message}
      </Text>
    </Flex>
  )
}

const TierFeatureValue = ({
  tier,
  feature,
  current,
  onClickDiscord,
  isMobileCard
}: {
  tier: BadgeTier
  feature: TierFeature
  current?: boolean
  onClickDiscord: () => void
  isMobileCard?: boolean
}) => {
  const { color } = useTheme()
  const tierFeatures =
    tier !== 'none' ? tierFeatureMap[tier] : tierFeatureMap.none
  const minAudio =
    badgeTiers.find((b) => b.tier === tier)?.humanReadableAmount?.toString() ??
    '0'

  if (feature === 'balance') {
    return (
      <Flex h={24} alignItems='center' justifyContent='center'>
        {minAudio !== '0' ? (
          <Text
            variant={isMobileCard ? 'body' : 'label'}
            size='s'
          >{`${formatNumberCommas(minAudio)}+`}</Text>
        ) : null}
      </Flex>
    )
  }

  if (tierFeatures[feature]) {
    return (
      <Flex h={24} direction='row' alignItems='center' gap='m'>
        {feature === 'customDiscordRole' && current ? (
          <Tooltip text={messages.refreshDiscordRole}>
            <Button
              size='small'
              variant='secondary'
              iconLeft={IconRefresh}
              onClick={onClickDiscord}
            />
          </Tooltip>
        ) : null}
        <IconValidationCheck />
      </Flex>
    )
  }

  return (
    <Flex h={24} w={24} alignItems='center' justifyContent='center'>
      <Flex
        h={16}
        w={16}
        borderRadius='circle'
        border='strong'
        css={{
          borderWidth: 2,
          borderColor: color.border.default
        }}
      />
    </Flex>
  )
}

const TierColumn = ({
  tier,
  current,
  onClickDiscord
}: {
  tier: BadgeTier
  current?: boolean
  onClickDiscord: () => void
}) => {
  const { color } = useTheme()

  return (
    <Flex
      direction='column'
      border={current ? 'strong' : undefined}
      borderRadius={current ? 'm' : undefined}
      shadow={current ? 'mid' : undefined}
      css={{
        overflow: 'hidden',
        minWidth: '108px',
        '@media (max-width: 1280px)': {
          minWidth: '96px'
        },
        '@media (max-width: 1120px)': {
          minWidth: '84px'
        }
      }}
      mt={current ? '-49px' : undefined} // Move current tier up to align columns
    >
      {current && (
        <Paper
          justifyContent='center'
          pv='m'
          mb='m'
          css={{
            background: color.special.gradient,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0
          }}
        >
          <Text variant='label' size='s' color='white'>
            {messages.currentTier}
          </Text>
        </Paper>
      )}
      <TierBox
        tier={tier as AudioTiers}
        message={tier === 'none' ? messages.noTier : undefined}
      />
      {featureKeys.map((feature) => (
        <Flex key={feature} pv='m' borderTop='default' justifyContent='center'>
          <TierFeatureValue
            tier={tier}
            feature={feature}
            current={current}
            onClickDiscord={onClickDiscord}
          />
        </Flex>
      ))}
    </Flex>
  )
}

const TierRowLabel = ({
  tier,
  current,
  isMobileCard
}: {
  tier: BadgeTier
  current: boolean
  isMobileCard?: boolean
}) => {
  return (
    <Flex direction='row' alignItems='center' gap='s'>
      {tier !== 'none' ? (
        audioTierMapSvg[tier as AudioTiers]
      ) : (
        <Flex
          h={BADGE_SIZE}
          w={BADGE_SIZE}
          alignItems='center'
          justifyContent='center'
        >
          <Flex h={16} w={16} borderRadius='circle' border='strong' />
        </Flex>
      )}
      <Text
        variant={isMobileCard ? 'body' : 'label'}
        size='s'
        strength={isMobileCard ? 'strong' : undefined}
        color='default'
        textTransform='capitalize'
      >
        {tier === 'none' ? messages.noTier : tier}
      </Text>
      {current ? (
        <Text
          variant={isMobileCard ? 'body' : 'label'}
          size='s'
          color='subdued'
        >
          {messages.currentTier}
        </Text>
      ) : null}
    </Flex>
  )
}

const FeatureCards = ({
  tier,
  onClickDiscord
}: {
  tier: BadgeTier
  onClickDiscord: () => void
}) => {
  const { color } = useTheme()

  return (
    <Flex
      direction='column'
      w='100%'
      gap='m'
      p='m'
      css={{
        display: 'none',
        '@media (max-width: 980px)': {
          display: 'flex'
        }
      }}
    >
      {featureKeys.map((feature) => (
        <Flex
          key={feature}
          direction='column'
          w='100%'
          border='default'
          css={{
            overflow: 'hidden',
            borderRadius: 12,
            backgroundColor: color.background.surface1
          }}
        >
          <Flex p='l' pb='m' w='100%'>
            <Text variant='title' size='l' color='default'>
              {messages.features[feature]}
            </Text>
          </Flex>
          {(feature === 'balance'
            ? displayTiers.filter((displayTier) => displayTier !== 'none')
            : displayTiers
          ).map((displayTier) => {
            const isCurrentTier = displayTier === tier
            return (
              <Flex
                key={displayTier}
                w='100%'
                pv='m'
                ph='l'
                borderTop='default'
                justifyContent='space-between'
                alignItems='center'
                css={{
                  gap: 'var(--harmony-unit-4)'
                }}
              >
                <TierRowLabel
                  tier={displayTier}
                  current={isCurrentTier}
                  isMobileCard
                />
                <TierFeatureValue
                  tier={displayTier}
                  feature={feature}
                  current={isCurrentTier}
                  onClickDiscord={onClickDiscord}
                  isMobileCard
                />
              </Flex>
            )
          })}
        </Flex>
      ))}
    </Flex>
  )
}

const TierTable = ({
  tier,
  onClickDiscord
}: {
  tier: BadgeTier
  onClickDiscord: () => void
}) => {
  return (
    <>
      <Flex
        w='100%'
        justifyContent='space-between'
        p='xl'
        css={{
          gap: 'var(--harmony-unit-2)',
          '@media (max-width: 1280px)': {
            padding: 'var(--harmony-unit-6)'
          },
          '@media (max-width: 1120px)': {
            padding: 'var(--harmony-unit-4)',
            gap: 'var(--harmony-unit-1)'
          },
          '@media (max-width: 980px)': {
            display: 'none'
          }
        }}
      >
        <Flex direction='column' flex='1 1 260px' css={{ minWidth: '160px' }}>
          <TierBox tier='none' />
          {featureKeys.map((feature) => (
            <Flex
              key={feature}
              pv='m'
              borderTop='default'
              justifyContent='flex-end'
              pr='xl'
            >
              <Text variant='title' size='m' color='default' ellipses>
                {messages.features[feature]}
              </Text>
            </Flex>
          ))}
        </Flex>
        {displayTiers.map((displayTier) => (
          <Flex
            key={displayTier}
            direction='column'
            flex='1 1 160px'
            css={{ minWidth: 0 }}
          >
            <TierColumn
              tier={displayTier}
              current={displayTier === tier}
              onClickDiscord={onClickDiscord}
            />
          </Flex>
        ))}
      </Flex>
      <FeatureCards tier={tier} onClickDiscord={onClickDiscord} />
    </>
  )
}

/** Tile with multiple tiers */
const Tiers = () => {
  const { data: accountUserId } = useCurrentUserId()
  const getDiscordOAuthLink = useGetDiscordOAuthLink('AUDIO')
  const userId = accountUserId ?? 0
  const { tier } = useTierAndVerifiedForUser(userId)

  const dispatch = useDispatch()

  const onClickExplainMore = useCallback(() => {
    window.open(LEARN_MORE_URL, '_blank')
  }, [])

  const onClickDiscord = useCallback(async () => {
    const discordLink = await getDiscordOAuthLink()
    window.open(discordLink, '_blank')
  }, [getDiscordOAuthLink])

  const showConfetti = useShowConfetti(tier)
  useEffect(() => {
    if (showConfetti) {
      dispatch(show())
    }
  }, [showConfetti, dispatch])

  return (
    <>
      <div className={styles.container}>
        <div className={styles.titleContainer}>
          <Text variant='display' size='s' className={styles.title}>
            {messages.title}
          </Text>
          <Text
            variant='body'
            strength='strong'
            size='l'
            className={styles.subtitle}
          >
            {messages.subtitle}
          </Text>
        </div>
        <TierTable tier={tier} onClickDiscord={onClickDiscord} />
        <div className={styles.buttonContainer}>
          <Button variant='secondary' onClick={onClickExplainMore}>
            {messages.learnMore}
          </Button>
          <Button
            variant='secondary'
            iconLeft={IconDiscord}
            onClick={onClickDiscord}
          >
            {messages.launchDiscord}
          </Button>
        </div>
      </div>
    </>
  )
}
export default Tiers
