import { useCallback, useContext, useMemo } from 'react'

import type { Coin } from '@audius/common/adapters'
import {
  useArtistCoin,
  useUser,
  useUserCoins,
  useCurrentAccountUser
} from '@audius/common/api'
import { useDiscordOAuthLink, useIsManagedAccount } from '@audius/common/hooks'
import { coinDetailsMessages } from '@audius/common/messages'
import { Feature, WidthSizes } from '@audius/common/models'
import {
  formatCurrencyWithSubscript,
  getTokenDecimalPlaces,
  removeNullable,
  route,
  shortenSPLAddress
} from '@audius/common/utils'
import { wAUDIO } from '@audius/fixed-decimal'
import {
  Flex,
  IconCopy,
  IconDiscord,
  IconExternalLink,
  IconGift,
  IconInstagram,
  IconLink,
  IconTikTok,
  IconX,
  IconInfo,
  LoadingSpinner,
  Paper,
  PlainButton,
  Text,
  TextLink,
  useTheme
} from '@audius/harmony'
import { HashId } from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { appkitModal } from 'app/ReownAppKitModal'
import { ExternalLink } from 'components/link/ExternalLink'
import Skeleton from 'components/skeleton/Skeleton'
import { ToastContext } from 'components/toast/ToastContext'
import Tooltip from 'components/tooltip/Tooltip'
import { UserGeneratedText } from 'components/user-generated-text'
import { UserTokenBadge } from 'components/user-token-badge/UserTokenBadge'
import { useClaimFees } from 'hooks/useClaimFees'
import { useConnectWallets } from 'hooks/useConnectWallets'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { env } from 'services/env'
import { reportToSentry } from 'store/errors/reportToSentry'
import { copyToClipboard } from 'utils/clipboardUtil'
import { push } from 'utils/navigation'

const messages = coinDetailsMessages.coinInfo
const overflowMessages = coinDetailsMessages.overflowMenu
const toastMessages = coinDetailsMessages.toasts

const BANNER_HEIGHT = 120

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

const SocialLinksDisplay = ({ coin }: { coin: Coin }) => {
  const socialLinks = [coin.link1, coin.link2, coin.link3, coin.link4].filter(
    removeNullable
  )

  if (socialLinks.length === 0) {
    return null
  }

  return (
    <Flex gap='l' alignItems='center'>
      {socialLinks.map((link, index) => {
        const platform = detectPlatform(link)
        const IconComponent = getPlatformIcon(platform)

        return (
          <ExternalLink key={index} to={link}>
            <PlainButton
              size='large'
              iconLeft={() => <IconComponent color='subdued' />}
            />
          </ExternalLink>
        )
      })}
    </Flex>
  )
}

const AssetInfoSectionSkeleton = () => {
  const theme = useTheme()

  return (
    <Paper
      borderRadius='l'
      shadow='far'
      column
      alignItems='flex-start'
      border='default'
    >
      {/* Banner skeleton */}
      <Flex
        column
        alignItems='flex-start'
        alignSelf='stretch'
        border='default'
        h={BANNER_HEIGHT}
        css={{ backgroundColor: theme.color.neutral.n100 }}
      >
        <Flex column alignItems='flex-start' alignSelf='stretch' p='l' gap='s'>
          <Skeleton width='80px' height='16px' />
          <Flex
            alignItems='center'
            gap='xs'
            p='xs'
            backgroundColor='white'
            borderRadius='circle'
            border='default'
          >
            <Skeleton width='32px' height='32px' />
            <Skeleton width='100px' height='20px' />
          </Flex>
        </Flex>
      </Flex>

      {/* Content skeleton */}
      <Flex column alignItems='flex-start' alignSelf='stretch' p='xl' gap='l'>
        <Skeleton width='200px' height='24px' />
        <Flex column gap='m'>
          <Skeleton width='100%' height='20px' />
          <Skeleton width='90%' height='20px' />
          <Skeleton width='100%' height='20px' />
          <Skeleton width='80%' height='20px' />
        </Flex>
      </Flex>

      {/* Footer skeleton */}
      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
        p='xl'
        borderTop='default'
      >
        <Flex alignItems='center' gap='s'>
          <Skeleton width='24px' height='24px' />
          <Skeleton width='100px' height='20px' />
        </Flex>
        <Skeleton width='120px' height='20px' />
      </Flex>
    </Paper>
  )
}

type BannerSectionProps = {
  mint: string
}

const BannerSection = ({ mint }: BannerSectionProps) => {
  const { data: coin, isLoading } = useArtistCoin(mint)
  const theme = useTheme()
  const { ownerId: ownerIdRaw } = coin ?? {}
  const ownerId =
    typeof ownerIdRaw === 'string' ? HashId.parse(ownerIdRaw) : ownerIdRaw

  const { data: owner } = useUser(ownerId)
  const { image: coverPhoto } = useCoverPhoto({
    userId: ownerId,
    size: WidthSizes.SIZE_640
  })

  if (isLoading || !coin || !owner) {
    return (
      <Flex
        column
        alignItems='flex-start'
        alignSelf='stretch'
        h={BANNER_HEIGHT}
        css={{ backgroundColor: theme.color.neutral.n100 }}
      >
        <Flex column alignItems='flex-start' alignSelf='stretch' p='l' gap='s'>
          <Skeleton width='80px' height='16px' />
          <Flex
            alignItems='center'
            gap='xs'
            p='xs'
            backgroundColor='white'
            borderRadius='circle'
            border='default'
          >
            <Skeleton width='32px' height='32px' />
            <Skeleton width='100px' height='20px' />
          </Flex>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex
      column
      alignItems='flex-start'
      alignSelf='stretch'
      h={BANNER_HEIGHT}
      css={{
        background: `linear-gradient(90deg, rgba(0, 0, 0, 0.05) 10%, rgba(0, 0, 0, 0.02) 20%, rgba(0, 0, 0, 0.01) 30%, rgba(0, 0, 0, 0) 45%), url("${coverPhoto}")`,
        backgroundSize: 'auto, cover',
        backgroundPosition: '0% 0%, 50% 50%',
        backgroundRepeat: 'repeat, no-repeat',
        position: 'relative'
      }}
    >
      <Flex column alignItems='flex-start' alignSelf='stretch' p='l' gap='s'>
        <Text variant='label' size='m' color='staticWhite' shadow='emphasis'>
          {messages.createdBy}
        </Text>

        {ownerId && <UserTokenBadge userId={ownerId} />}
      </Flex>
    </Flex>
  )
}

type AssetInfoSectionProps = {
  mint: string
}

const { REWARDS_PAGE } = route

type AssetDetailsSectionProps = {
  formattedTotalArtistEarnings: string
  isCoinCreator: boolean
  unclaimedFees: number
  formattedUnclaimedFees: string
  isClaimFeesPending: boolean
  isClaimFeesDisabled: boolean
  handleClaimFees: () => void
}

const AssetDetailsSection = ({
  formattedTotalArtistEarnings,
  isCoinCreator,
  unclaimedFees,
  formattedUnclaimedFees,
  isClaimFeesPending,
  handleClaimFees,
  isClaimFeesDisabled
}: AssetDetailsSectionProps) => {
  const isManagerMode = useIsManagedAccount()
  return (
    <Flex
      direction='column'
      alignItems='flex-start'
      alignSelf='stretch'
      borderTop='default'
      ph='xl'
      pv='l'
      gap='l'
    >
      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
      >
        <Flex alignItems='center' gap='s'>
          <Text variant='body' size='s' strength='strong'>
            {overflowMessages.vestingSchedule}
          </Text>
          <Tooltip
            text={overflowMessages.tooltips.vestingSchedule}
            mount='body'
          >
            <IconInfo size='s' color='subdued' />
          </Tooltip>
        </Flex>
        <Text variant='body' size='s' color='subdued'>
          {overflowMessages.vestingScheduleValue}
        </Text>
      </Flex>
      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
      >
        <Flex alignItems='center' gap='s'>
          <Text variant='body' size='s' strength='strong'>
            {overflowMessages.artistEarnings}
          </Text>
          <Tooltip text={overflowMessages.tooltips.artistEarnings} mount='body'>
            <IconInfo size='s' color='subdued' />
          </Tooltip>
        </Flex>
        <Text variant='body' size='s' color='subdued'>
          {formattedTotalArtistEarnings} {overflowMessages.$audio}
        </Text>
      </Flex>
      {isCoinCreator && !isManagerMode ? (
        <Flex
          alignItems='center'
          justifyContent='space-between'
          alignSelf='stretch'
        >
          <Flex alignItems='center' gap='s'>
            <Text variant='body' size='s' strength='strong'>
              {overflowMessages.unclaimedFees}
            </Text>
            <Tooltip
              text={overflowMessages.tooltips.unclaimedFees}
              mount='body'
            >
              <IconInfo size='s' color='subdued' />
            </Tooltip>
          </Flex>
          <Flex alignItems='center' gap='s'>
            {unclaimedFees > 0 ? (
              <Flex gap='xs' alignItems='center'>
                <TextLink
                  onClick={handleClaimFees}
                  variant={isClaimFeesDisabled ? 'subdued' : 'visible'}
                  disabled={isClaimFeesDisabled}
                >
                  {overflowMessages.claim}
                </TextLink>
                {isClaimFeesPending ? (
                  <LoadingSpinner size='s' color='subdued' />
                ) : null}
              </Flex>
            ) : null}

            <Text variant='body' size='s' color='subdued'>
              {formattedUnclaimedFees} {overflowMessages.$audio}
            </Text>
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}

export const AssetInfoSection = ({ mint }: AssetInfoSectionProps) => {
  const dispatch = useDispatch()
  const { toast } = useContext(ToastContext)

  const { data: coin, isLoading } = useArtistCoin(mint)

  const { data: currentUser } = useCurrentAccountUser()
  const { data: userCoins } = useUserCoins({ userId: currentUser?.user_id })
  const userToken = useMemo(
    () => userCoins?.find((coin) => coin.mint === mint),
    [userCoins, mint]
  )
  const isCoinCreator = coin?.ownerId === currentUser?.user_id
  const discordOAuthLink = useDiscordOAuthLink(userToken?.ticker)
  const { balance: userTokenBalance } = userToken ?? {}

  // Claim fee hook
  const { mutate: claimFees, isPending: isClaimFeesPending } = useClaimFees({
    onSuccess: () => {
      toast(toastMessages.feesClaimed)
    },
    onError: (error) => {
      reportToSentry({
        error,
        feature: Feature.ArtistCoins,
        name: 'Failed to claim artist coin fees',
        additionalInfo: {
          coin,
          tokenMint: mint,
          unclaimedFees,
          totalArtistEarnings
        }
      })
      console.error(error)
      toast(toastMessages.feesClaimFailed)
    }
  })

  const unclaimedFees = coin?.dynamicBondingCurve?.creatorQuoteFee ?? 0

  const formatFeeNumber = (input: number) => {
    const value = wAUDIO(BigInt(input))
    const decimalPlaces = getTokenDecimalPlaces(Number(value.toString()))
    return formatCurrencyWithSubscript(
      Number(value.trunc(decimalPlaces).toString()),
      'en-US',
      ''
    )
  }
  const formattedUnclaimedFees = useMemo(() => {
    return formatFeeNumber(unclaimedFees)
  }, [unclaimedFees])
  const totalArtistEarnings =
    coin?.dynamicBondingCurve?.totalTradingQuoteFee ?? 0
  const formattedTotalArtistEarnings = useMemo(
    () => formatFeeNumber(Math.trunc(totalArtistEarnings / 2)),
    [totalArtistEarnings]
  )
  const descriptionParagraphs = coin?.description?.split('\n') ?? []

  const openDiscord = () => {
    window.open(discordOAuthLink, '_blank')
  }

  const handleLearnMore = () => {
    window.open(coin?.website, '_blank')
  }

  const handleBrowseRewards = useCallback(() => {
    dispatch(push(REWARDS_PAGE))
  }, [dispatch])

  const handleCopyAddress = useCallback(() => {
    copyToClipboard(mint)
    toast(overflowMessages.copiedToClipboard)
  }, [mint, toast])

  const coinCreatorWalletAddress =
    coin?.dynamicBondingCurve?.creatorWalletAddress
  const handleClaimFees = useCallback(
    (walletAddress: string) => {
      claimFees({
        tokenMint: mint,
        externalWalletAddress: walletAddress
      })
    },
    [mint, claimFees]
  )

  const { openAppKitModal } = useConnectWallets(async () => {
    const solanaAccount = appkitModal.getAccount('solana')
    const connectedAddress = solanaAccount?.address

    if (!coinCreatorWalletAddress) {
      // If we hit this block the user has not launched the coin
      toast(toastMessages.feesClaimFailed)
      return
    }
    if (!connectedAddress || connectedAddress !== coinCreatorWalletAddress) {
      // If we hit this block the user has not connected the wallet they used to launch the coin
      toast(toastMessages.incorrectWalletLinked)
      return
    }
    handleClaimFees(connectedAddress)
  })

  const handleClaimFeesClick = useCallback(async () => {
    const solanaAccount = appkitModal.getAccount('solana')
    const connectedAddress = solanaAccount?.address

    // appkit wallet is not connected, need to prompt connect flow first
    if (!connectedAddress) {
      openAppKitModal('solana')
    } else if (connectedAddress !== coinCreatorWalletAddress) {
      // If we hit this block the user has not connected the wallet they used to launch the coin
      // Disconnect the current Solana wallet to allow connecting a different one
      await appkitModal.disconnect('solana')
      openAppKitModal('solana')
    } else {
      // appkit wallet is connected with the correct address,
      // can just initiate claim fees flow immediately
      handleClaimFees(connectedAddress)
    }
  }, [openAppKitModal, handleClaimFees, coinCreatorWalletAddress])

  if (isLoading || !coin) {
    return <AssetInfoSectionSkeleton />
  }

  const isWAudio = coin.mint === env.WAUDIO_MINT_ADDRESS
  const CTAIcon = isWAudio ? IconGift : IconExternalLink

  const isUserBalanceUnavailable =
    !userTokenBalance || Number(userTokenBalance) <= 0

  return (
    <Paper
      borderRadius='l'
      shadow='far'
      column
      alignItems='flex-start'
      border='default'
    >
      <BannerSection mint={mint} />

      {coin.description ? (
        <Flex
          column
          alignItems='flex-start'
          alignSelf='stretch'
          ph='xl'
          pv='l'
          gap='l'
        >
          <Flex column gap='m'>
            <SocialLinksDisplay coin={coin} />
            {descriptionParagraphs.map((paragraph) => {
              if (paragraph.trim() === '') {
                return null
              }

              return (
                <UserGeneratedText
                  key={paragraph.slice(0, 10)}
                  variant='body'
                  size='m'
                  color='subdued'
                >
                  {paragraph}
                </UserGeneratedText>
              )
            })}
          </Flex>
        </Flex>
      ) : null}

      {isWAudio || coin.website ? (
        <Flex
          alignItems='center'
          justifyContent='space-between'
          alignSelf='stretch'
          p='l'
          borderTop='default'
        >
          <Flex alignItems='center' justifyContent='center' gap='s'>
            <PlainButton
              onClick={isWAudio ? handleBrowseRewards : handleLearnMore}
              iconLeft={CTAIcon}
              variant='default'
            >
              {isWAudio ? messages.browseRewards : messages.learnMore}
            </PlainButton>
          </Flex>
        </Flex>
      ) : null}
      {userToken?.hasDiscord ? (
        <Flex
          alignItems='center'
          justifyContent='space-between'
          alignSelf='stretch'
          p='l'
          borderTop='default'
        >
          <Flex alignItems='center' justifyContent='center' gap='s'>
            {isUserBalanceUnavailable ? (
              <Tooltip text={messages.discordDisabledTooltip(coin?.ticker)}>
                <Flex style={{ cursor: 'pointer' }}>
                  <PlainButton
                    onClick={openDiscord}
                    iconLeft={IconDiscord}
                    variant='default'
                    disabled={isUserBalanceUnavailable}
                  >
                    {messages.openDiscord}
                  </PlainButton>
                </Flex>
              </Tooltip>
            ) : (
              <Flex style={{ cursor: 'pointer' }}>
                <PlainButton
                  onClick={openDiscord}
                  iconLeft={IconDiscord}
                  variant='default'
                  disabled={isUserBalanceUnavailable}
                >
                  {messages.openDiscord}
                </PlainButton>
              </Flex>
            )}
          </Flex>
        </Flex>
      ) : null}

      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
        p='l'
        borderTop='default'
      >
        <PlainButton
          onClick={handleCopyAddress}
          iconLeft={IconCopy}
          variant='default'
        >
          {overflowMessages.copyCoinAddress}
        </PlainButton>
        <Text variant='body' size='m' color='subdued'>
          {shortenSPLAddress(mint)}
        </Text>
      </Flex>
      {!isWAudio ? (
        <AssetDetailsSection
          formattedTotalArtistEarnings={formattedTotalArtistEarnings}
          isCoinCreator={isCoinCreator}
          unclaimedFees={unclaimedFees}
          formattedUnclaimedFees={formattedUnclaimedFees}
          isClaimFeesPending={isClaimFeesPending}
          isClaimFeesDisabled={isClaimFeesPending}
          handleClaimFees={handleClaimFeesClick}
        />
      ) : null}
    </Paper>
  )
}
