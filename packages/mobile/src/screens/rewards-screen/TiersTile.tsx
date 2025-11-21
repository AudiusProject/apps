import type { ReactElement } from 'react'
import React from 'react'

import { useAudioBalance } from '@audius/common/api'
import { useGetDiscordOAuthLink } from '@audius/common/hooks'
import type { AudioTiers, StringWei } from '@audius/common/models'
import {
  featureMessages,
  features,
  tierFeatureMap
} from '@audius/common/models'
import { badgeTiers, getTierAndNumberForBalance } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { formatNumberCommas } from '@audius/common/utils'
import { Linking } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import {
  Button,
  Flex,
  IconDiscord,
  IconTokenBronze,
  IconTokenGold,
  IconTokenPlatinum,
  IconTokenSilver,
  IconValidationCheck,
  Paper,
  Text
} from '@audius/harmony-native'
import { GradientText } from 'app/components/core'
import { useThemeColors } from 'app/utils/theme'

const audioTierMapSvg: {
  [tier in AudioTiers]: Nullable<ReactElement>
} = {
  bronze: <IconTokenBronze size='l' />,
  silver: <IconTokenSilver size='l' />,
  gold: <IconTokenGold size='l' />,
  platinum: <IconTokenPlatinum size='l' />
}

const LEARN_MORE_LINK = 'https://blog.audius.co/article/community-meet-audio'

const messages = {
  vipTiers: 'Reward Perks',
  vipTiersBody:
    'Keep $AUDIO in your wallet to enjoy perks and exclusive features.',
  launchDiscord: 'Launch the VIP Discord',
  learnMore: 'LEARN MORE'
}

export const TiersTile = () => {
  const { pageHeaderGradientColor1, pageHeaderGradientColor2 } =
    useThemeColors()

  const { totalBalance } = useAudioBalance()
  const { tier } = getTierAndNumberForBalance(
    totalBalance?.toString() as StringWei
  )

  const getDiscordAuthLink = useGetDiscordOAuthLink('AUDIO')

  const onPressLaunchDiscord = async () => {
    const discordOauthLink = await getDiscordAuthLink()
    Linking.openURL(discordOauthLink)
  }

  return (
    <Paper
      shadow='near'
      border='strong'
      ph='s'
      pv='xl'
      alignItems='center'
      gap='l'
    >
      <GradientText style={{ fontSize: 24, fontWeight: 'bold' }}>
        {messages.vipTiers}
      </GradientText>
      <Flex ph='2xl'>
        <Text variant='body' textAlign='center'>
          {messages.vipTiersBody}
        </Text>
      </Flex>

      <Paper
        shadow='mid'
        border='strong'
        style={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 8
        }}
      >
        {/* Current tier header */}
        <LinearGradient
          colors={[pageHeaderGradientColor1, pageHeaderGradientColor2]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={{ padding: 12 }}
        >
          <Flex justifyContent='center' alignItems='center'>
            <Text variant='label' size='s' color='white'>
              CURRENT TIER
            </Text>
          </Flex>
        </LinearGradient>

        {/* Tier icon and name */}
        <Flex direction='column' alignItems='center' gap='s' pv='l' ph='l'>
          {tier === 'none' ? (
            <Text variant='title' size='l'>
              No Tier
            </Text>
          ) : (
            <>
              {audioTierMapSvg[tier as AudioTiers]}
              <GradientText
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  textTransform: 'capitalize'
                }}
              >
                {tier}
              </GradientText>
            </>
          )}
        </Flex>

        {/* Feature rows */}
        {features.map((feature) => {
          const isAvailable = tierFeatureMap[tier][feature]
          let content: React.ReactNode = null

          if (feature === 'balance') {
            if (tier === 'none') {
              return null
            }
            const tierInfo = badgeTiers.find((b) => b.tier === tier)
            const minAudio = tierInfo?.humanReadableAmount
            if (!minAudio) {
              return null
            }

            content = (
              <Text variant='label' size='m'>
                {`${formatNumberCommas(minAudio.toString())}+`}
              </Text>
            )
          } else if (isAvailable) {
            content = (
              <Flex direction='row' alignItems='center' gap='s'>
                <IconValidationCheck />
                {feature === 'customDiscordRole' ? (
                  <Button
                    size='small'
                    variant='secondary'
                    iconLeft={IconDiscord}
                    onPress={onPressLaunchDiscord}
                  />
                ) : null}
              </Flex>
            )
          } else {
            // No content for unavailable features - empty circle was removed in mobile web
            return null
          }

          return (
            <Flex
              key={feature}
              direction='row'
              justifyContent='space-between'
              alignItems='center'
              pv='m'
              ph='m'
              borderTop='default'
            >
              <Text variant='body'>{featureMessages[feature]}</Text>
              {content}
            </Flex>
          )
        })}
      </Paper>

      <Flex gap='l' w='100%'>
        <Button
          variant='secondary'
          onPress={() => Linking.openURL(LEARN_MORE_LINK)}
          fullWidth
        >
          {messages.learnMore}
        </Button>
        <Button
          variant='secondary'
          iconLeft={IconDiscord}
          onPress={onPressLaunchDiscord}
          fullWidth
        >
          {messages.launchDiscord}
        </Button>
      </Flex>
    </Paper>
  )
}
