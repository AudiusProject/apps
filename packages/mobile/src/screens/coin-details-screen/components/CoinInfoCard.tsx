import { useCallback, useMemo } from 'react'

import type { Coin } from '@audius/common/adapters'
import { useArtistCoin } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { WidthSizes } from '@audius/common/models'
import { shortenSPLAddress } from '@audius/common/utils'
import Clipboard from '@react-native-clipboard/clipboard'
import { Image, Linking, StyleSheet, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import {
  Divider,
  Flex,
  IconCopy,
  IconExternalLink,
  IconGift,
  IconInstagram,
  IconLink,
  IconX,
  IconTikTok,
  Paper,
  PlainButton,
  Text
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { useCoverPhoto } from 'app/components/image/CoverPhoto'
import { primitiveToImageSource } from 'app/components/image/primitiveToImageSource'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { env } from 'app/services/env'

const messages = coinDetailsMessages.coinInfo
const overflowMessages = coinDetailsMessages.overflowMenu

// Helper function to detect platform from URL
const detectPlatform = (
  url: string
): 'x' | 'instagram' | 'tiktok' | 'website' => {
  const cleanUrl = url.toLowerCase().trim()

  if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) {
    return 'x'
  }
  if (cleanUrl.includes('instagram.com')) {
    return 'instagram'
  }
  if (cleanUrl.includes('tiktok.com')) {
    return 'tiktok'
  }

  return 'website'
}

// Get platform icon
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'x':
      return IconX
    case 'instagram':
      return IconInstagram
    case 'tiktok':
      return IconTikTok
    case 'website':
    default:
      return IconLink
  }
}

export const BannerSection = ({ mint }: { mint: string }) => {
  const { data: coin, isLoading } = useArtistCoin(mint)
  const { ownerId } = coin ?? {}

  const { source: coverPhotoSource } = useCoverPhoto({
    userId: ownerId,
    size: WidthSizes.SIZE_640
  })

  // Use banner image if available, otherwise fall back to cover photo
  const bannerImageSource = useMemo(() => {
    if (coin?.bannerImageUrl) {
      return primitiveToImageSource(coin.bannerImageUrl)
    }
    return coverPhotoSource
  }, [coin?.bannerImageUrl, coverPhotoSource])

  if (isLoading || !coin) {
    // TODO: Add loading state
    return null
  }

  const bannerHeight = 120

  return (
    <View
      style={{
        position: 'relative',
        height: bannerHeight,
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Background Image */}
      {bannerImageSource && (
        <Image
          source={bannerImageSource}
          style={StyleSheet.absoluteFill}
          resizeMode='cover'
        />
      )}

      {/* Gradient overlay matching coin details page - horizontal gradient from left to right */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.05)',
          'rgba(0, 0, 0, 0.05)',
          'rgba(0, 0, 0, 0.02)',
          'rgba(0, 0, 0, 0.01)',
          'rgba(0, 0, 0, 0)'
        ]}
        locations={[0, 0.1, 0.2, 0.3, 0.45]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <Flex
        direction='column'
        alignItems='flex-start'
        alignSelf='stretch'
        p='l'
        ph='xl'
        gap='s'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      >
        <Text variant='label' size='m' color='staticWhite' shadow='emphasis'>
          {messages.createdBy}
        </Text>

        {ownerId ? (
          <Flex
            row
            alignItems='center'
            gap='xs'
            ph='s'
            p='xs'
            backgroundColor='white'
            borderRadius='circle'
            border='default'
          >
            <ProfilePicture userId={ownerId} size='small' />
            <UserLink userId={ownerId} size='l' />
          </Flex>
        ) : null}
      </Flex>
    </View>
  )
}

const CoinDescriptionSection = ({ coin }: { coin: Coin }) => {
  if (!coin.description) return null

  const descriptionParagraphs = coin.description.split('\n') ?? []

  return (
    <Flex
      direction='column'
      alignItems='flex-start'
      alignSelf='stretch'
      ph='xl'
      pv='l'
      gap='l'
    >
      <Flex direction='column' gap='m'>
        {descriptionParagraphs.map((paragraph) => {
          if (paragraph.trim() === '') {
            return null
          }

          return (
            <Text key={paragraph.slice(0, 10)} variant='body' size='m'>
              {paragraph}
            </Text>
          )
        })}
      </Flex>
    </Flex>
  )
}

const SocialLinksSection = ({ coin }: { coin: Coin }) => {
  const socialLinks = [coin.link1, coin.link2, coin.link3, coin.link4].filter(
    (link): link is string => link != null && link.trim() !== ''
  )

  if (socialLinks.length === 0) return null

  return (
    <Flex row gap='l' ph='xl' pt='l'>
      {socialLinks.map((link, index) => {
        const platform = detectPlatform(link)
        const PlatformIcon = getPlatformIcon(platform)

        return (
          <PlainButton
            key={index}
            onPress={() => Linking.openURL(link)}
            size='large'
            iconLeft={PlatformIcon}
            variant='subdued'
          />
        )
      })}
    </Flex>
  )
}

export const CoinInfoCard = ({ mint }: { mint: string }) => {
  const { data: coin, isLoading } = useArtistCoin(mint)
  const navigation = useNavigation()
  const { toast } = useToast()

  const handleLearnMore = useCallback(() => {
    // Open the coin website in browser
    if (coin?.website) {
      Linking.openURL(coin?.website)
    }
  }, [coin?.website])

  const handleBrowseRewards = useCallback(() => {
    navigation.navigate('RewardsScreen')
  }, [navigation])

  const handleCopyAddress = useCallback(() => {
    Clipboard.setString(mint)
    toast({ content: overflowMessages.copiedToClipboard, type: 'info' })
  }, [mint, toast])

  if (isLoading || !coin) {
    return null
  }

  const isWAudio = coin.mint === env.WAUDIO_MINT_ADDRESS
  const CTAIcon = isWAudio ? IconGift : IconExternalLink

  return (
    <Paper
      borderRadius='l'
      shadow='far'
      border='default'
      column
      alignItems='flex-start'
      style={{ overflow: 'hidden' }}
    >
      <BannerSection mint={mint} />
      <SocialLinksSection coin={coin} />
      <CoinDescriptionSection coin={coin} />
      {isWAudio || coin.website ? (
        <>
          <Divider style={{ width: '100%' }} />
          <Flex direction='column' w='100%' ph='xl' pv='l'>
            <PlainButton
              style={{ alignSelf: 'flex-start' }}
              onPress={isWAudio ? handleBrowseRewards : handleLearnMore}
              iconLeft={CTAIcon}
            >
              {isWAudio ? messages.browseRewards : messages.learnMore}
            </PlainButton>
          </Flex>
        </>
      ) : null}
      <Flex
        direction='row'
        w='100%'
        ph='xl'
        pv='l'
        justifyContent='space-between'
        alignItems='center'
      >
        <PlainButton onPress={handleCopyAddress} iconLeft={IconCopy}>
          {overflowMessages.copyCoinAddress}
        </PlainButton>
        <Text variant='body' size='m' color='subdued'>
          {shortenSPLAddress(mint)}
        </Text>
      </Flex>
    </Paper>
  )
}
