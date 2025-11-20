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
  useTheme,
  Paper
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { Tooltip } from 'components/tooltip'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'

import styles from './Tiers.module.css'
const { show } = musicConfettiActions

const messages = {
  title: 'Reward Perks',
  subtitle: 'Keep $AUDIO in your wallet to enjoy perks and exclusive features.',
  noTier: 'No tier',
  currentTier: 'CURRENT TIER',
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

const LEARN_MORE_URL = 'http://blog.audius.co/posts/community-meet-audio'

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
        css={{
          minHeight: '1.5em',
          ...(tier !== 'none' && {
            WebkitTextFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            backgroundImage:
              tier === 'bronze'
                ? 'linear-gradient(to right, rgba(141, 48, 8, 0.5), rgb(182, 97, 11))'
                : tier === 'silver'
                  ? 'linear-gradient(to right, rgba(179, 182, 185, 0.5), rgb(189, 189, 189))'
                  : tier === 'gold'
                    ? 'linear-gradient(to right, rgb(236, 173, 11), rgb(236, 173, 11))'
                    : tier === 'platinum'
                      ? 'linear-gradient(to right, rgb(179, 236, 249), rgb(87, 194, 215))'
                      : 'inherit'
          })
        }}
      >
        {tier !== 'none' ? tier : message}
      </Text>
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

  const tierFeatures =
    tier !== 'none' ? tierFeatureMap[tier] : tierFeatureMap.none

  return (
    <Flex
      direction='column'
      border={current ? 'strong' : undefined}
      borderRadius={current ? 'm' : undefined}
      shadow={current ? 'mid' : undefined}
      css={{
        overflow: 'hidden',
        minWidth: '120px',
        '@media (max-width: 1100px)': {
          display: current ? 'flex' : 'none'
        }
      }}
      mt={current ? '-49px' : undefined} // Move current tier up to align columns
    >
      {current && (
        <Paper
          justifyContent='center'
          pv='m'
          mb='m'
          css={(theme) => ({
            background: theme.color.special.gradient
          })}
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
      {(
        Object.keys(messages.features) as Array<keyof typeof messages.features>
      ).map((feature) => {
        const minAudio =
          badgeTiers
            .find((b) => b.tier === tier)
            ?.humanReadableAmount?.toString() ?? '0'

        return (
          <Flex
            key={feature}
            pv='m'
            borderTop='default'
            justifyContent='center'
          >
            <Text>
              {feature === 'balance' ? (
                <Flex h={24} alignItems='center' justifyContent='center'>
                  {minAudio !== '0' ? (
                    <Text
                      variant='label'
                      size='s'
                    >{`${formatNumberCommas(minAudio)}+`}</Text>
                  ) : null}
                </Flex>
              ) : tierFeatures[feature] ? (
                <Flex h={24} direction='row' alignItems='center' gap='m'>
                  <IconValidationCheck />
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
                </Flex>
              ) : (
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
              )}
            </Text>
          </Flex>
        )
      })}
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
    <Flex w='100%' justifyContent='space-between' p='xl'>
      <Flex direction='column' flex='1 1 300px'>
        <TierBox tier='none' />
        {Object.values(messages.features).map((feature) => (
          <Flex
            key={feature}
            pv='m'
            borderTop='default'
            justifyContent='flex-end'
            pr='xl'
          >
            <Text variant='title' size='m' color='default' ellipses>
              {feature}
            </Text>
          </Flex>
        ))}
      </Flex>
      {(['none', 'bronze', 'silver', 'gold', 'platinum'] as BadgeTier[]).map(
        (displayTier) => (
          <Flex key={displayTier} direction='column' flex='1 1 200px'>
            <TierColumn
              tier={displayTier}
              current={displayTier === tier}
              onClickDiscord={onClickDiscord}
            />
          </Flex>
        )
      )}
    </Flex>
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

  const wm = useWithMobileStyle(styles.mobile)

  return (
    <>
      <div className={styles.container}>
        <div className={wm(styles.titleContainer)}>
          <Text variant='display' size='s' className={wm(styles.title)}>
            {messages.title}
          </Text>
          <Text variant='body' strength='strong' size='l'>
            {messages.subtitle}
          </Text>
        </div>
        <TierTable tier={tier} onClickDiscord={onClickDiscord} />
        <div className={wm(styles.buttonContainer)}>
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
