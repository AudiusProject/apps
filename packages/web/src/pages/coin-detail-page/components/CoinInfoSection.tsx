import { useCallback, useContext, useMemo } from 'react'

import type { Coin } from '@audius/common/adapters'
import {
  useArtistCoin,
  useUser,
  useUserCoins,
  useCurrentAccountUser
} from '@audius/common/api'
import {
  useGetDiscordOAuthLink,
  useIsManagedAccount
} from '@audius/common/hooks'
import { coinDetailsMessages, walletMessages } from '@audius/common/messages'
import { Feature, Name, WidthSizes } from '@audius/common/models'
import { useClaimVestedCoinsModal } from '@audius/common/store'
import {
  formatCurrencyWithSubscript,
  getTokenDecimalPlaces,
  removeNullable,
  route,
  shortenSPLAddress
} from '@audius/common/utils'
import { FixedDecimal, wAUDIO } from '@audius/fixed-decimal'
import {
  Artwork,
  Box,
  Button,
  Flex,
  IconCloudUpload,
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
  useTheme,
  Divider,
  Tooltip
} from '@audius/harmony'
import { HashId } from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { appkitModal } from 'app/ReownAppKitModal'
import { make, useRecord } from 'common/store/analytics/actions'
import { Avatar } from 'components/avatar/Avatar'
import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { ExternalLink } from 'components/link/ExternalLink'
import { UserLink } from 'components/link/UserLink'
import Skeleton from 'components/skeleton/Skeleton'
import { ToastContext } from 'components/toast/ToastContext'
import UserBadges from 'components/user-badges/UserBadges'
import { UserGeneratedText } from 'components/user-generated-text'
import { UserTokenBadge } from 'components/user-token-badge/UserTokenBadge'
import { useClaimFees } from 'hooks/useClaimFees'
import { useClaimVestedCoins } from 'hooks/useClaimVestedCoins'
import { useConnectExternalWallets } from 'hooks/useConnectExternalWallets'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useIsMobile } from 'hooks/useIsMobile'
import { env } from 'services/env'
import { reportToSentry } from 'store/errors/reportToSentry'
import { copyToClipboard } from 'utils/clipboardUtil'
import { push } from 'utils/navigation'

const { REWARDS_PAGE, UPLOAD_PAGE } = route

const messages = {
  ...coinDetailsMessages.coinInfo,
  balance: (balance: string, ticker?: string) => `${balance} $${ticker}`
}
const overflowMessages = coinDetailsMessages.overflowMenu
const toastMessages = coinDetailsMessages.toasts

const BANNER_HEIGHT = 160
const DISCOVERY_COVER_HEIGHT = 96

const fanClubCardMessages = walletMessages.artistCoins

// Minimum claimable fee amount (0.01 $AUDIO = 10^6 in smallest denomination with 8 decimals)
// Below this threshold is considered "dust" and not worth claiming due to transaction fees
const MIN_CLAIMABLE_FEES = 1_000_000

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

type CoinHeroCoverPhotoProps = {
  bannerImage?: string
}

const CoinHeroCoverPhoto = ({ bannerImage }: CoinHeroCoverPhotoProps) => {
  const theme = useTheme()

  return (
    <Box
      w='100%'
      data-testid='coin-cover-photo'
      css={{
        height: DISCOVERY_COVER_HEIGHT,
        flexShrink: 0,
        borderBottom: `1px solid ${theme.color.border.default}`,
        backgroundColor: theme.color.background.surface2,
        ...(bannerImage
          ? {
              backgroundImage: `url("${bannerImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }
          : {})
      }}
    />
  )
}

const CoinInfoHeroSkeleton = () => {
  const theme = useTheme()

  return (
    <Paper
      borderRadius='l'
      shadow='mid'
      column
      alignItems='flex-start'
      border='default'
      data-testid='coin-info-hero'
      css={{ overflow: 'hidden' }}
    >
      <Skeleton h={DISCOVERY_COVER_HEIGHT} w='100%' />
      <Flex
        column
        gap='l'
        ph='l'
        pb='l'
        pt='l'
        alignSelf='stretch'
        css={{ marginTop: -theme.spacing.unit9 }}
      >
        <Flex gap='s' alignItems='flex-end' w='100%'>
          <Skeleton borderRadius='circle' w={72} h={72} />
          <Flex column gap='xs' flex={1}>
            <Skeleton h={12} w={64} />
            <Skeleton h={24} w='70%' />
          </Flex>
        </Flex>
        <Paper
          border='default'
          borderRadius='m'
          p='m'
          column
          gap='m'
          backgroundColor='surface1'
          w='100%'
        >
          <Flex gap='m' alignItems='center'>
            <Skeleton w={40} h={40} />
            <Flex column gap='xs' flex={1}>
              <Skeleton h={12} w={72} />
              <Skeleton h={20} w={40} />
            </Flex>
          </Flex>
        </Paper>
        <Flex column gap='m' w='100%'>
          <Skeleton width='100%' height='20px' />
          <Skeleton width='90%' height='20px' />
          <Skeleton width='100%' height='20px' />
        </Flex>
      </Flex>
    </Paper>
  )
}

const CoinInfoOnchainSkeleton = () => {
  return (
    <Paper
      borderRadius='l'
      shadow='far'
      column
      alignItems='flex-start'
      border='default'
      data-testid='coin-onchain-details'
    >
      <Flex alignSelf='stretch' ph='l' pv='m' borderBottom='default'>
        <Skeleton width='160px' height='20px' />
      </Flex>
      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
        p='l'
        ph='xl'
        borderBottom='default'
      >
        <Skeleton width='140px' height='16px' />
        <Skeleton width='88px' height='20px' />
      </Flex>
      <Flex column alignSelf='stretch' ph='xl' pv='l' gap='l'>
        <Skeleton width='100%' height='20px' />
        <Skeleton width='100%' height='20px' />
      </Flex>
    </Paper>
  )
}

type BannerSectionProps = {
  mint: string
}

export const BannerSection = ({ mint }: BannerSectionProps) => {
  const { data: coin, isLoading } = useArtistCoin(mint)
  const theme = useTheme()
  const { spacing } = theme
  const { ownerId: ownerIdRaw } = coin ?? {}
  const ownerId =
    typeof ownerIdRaw === 'string' ? HashId.parse(ownerIdRaw) : ownerIdRaw

  const { data: owner } = useUser(ownerId)
  const { image: coverPhoto } = useCoverPhoto({
    userId: ownerId,
    size: WidthSizes.SIZE_640
  })
  const bannerImage = coin?.bannerImageUrl ?? coverPhoto

  if (isLoading || !coin || !owner) {
    return (
      <Flex
        alignSelf='stretch'
        css={{
          position: 'relative',
          minHeight: BANNER_HEIGHT,
          backgroundColor: theme.color.neutral.n100
        }}
        data-testid='coin-cover-photo'
      >
        <Flex
          alignItems='flex-end'
          alignSelf='stretch'
          gap='s'
          p='l'
          w='100%'
          css={{ minHeight: BANNER_HEIGHT }}
        >
          <Skeleton
            width={`${spacing.unit24}px`}
            height={`${spacing.unit24}px`}
          />
          <Flex column gap='xs' alignItems='flex-start' flex={1}>
            <Skeleton width='80px' height='14px' />
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
      </Flex>
    )
  }

  return (
    <Flex
      alignSelf='stretch'
      css={{
        position: 'relative',
        minHeight: BANNER_HEIGHT,
        overflow: 'hidden'
      }}
      data-testid='coin-cover-photo'
    >
      <Flex
        css={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.color.neutral.n100,
          backgroundImage: bannerImage ? `url("${bannerImage}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <Flex
        css={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0, 0, 0, 0) 33.78%, rgba(0, 0, 0, 0.15) 42.99%, rgba(0, 0, 0, 0.3) 49.14%, rgba(0, 0, 0, 0.5) 55.28%)',
          pointerEvents: 'none'
        }}
      />
      <Flex
        alignItems='flex-end'
        gap='s'
        p='l'
        w='100%'
        css={{
          position: 'relative',
          zIndex: 1,
          minHeight: BANNER_HEIGHT,
          boxSizing: 'border-box'
        }}
      >
        {coin.logoUri ? (
          <Artwork
            src={coin.logoUri}
            hex
            w={spacing.unit24}
            h={spacing.unit24}
            borderWidth={0}
            borderRadius='s'
          />
        ) : null}
        <Flex
          column
          gap='xs'
          alignItems='flex-start'
          flex={1}
          css={{ minWidth: 0 }}
        >
          <Text
            variant='label'
            size='s'
            color='staticWhite'
            shadow='emphasis'
            css={{ letterSpacing: '0.5px' }}
            style={{ textTransform: 'uppercase' }}
          >
            {messages.createdBy}
          </Text>
          {ownerId ? <UserTokenBadge userId={ownerId} /> : null}
        </Flex>
      </Flex>
    </Flex>
  )
}

const formatBalance = (balance: number, coinDecimals: number) => {
  const decimals = getTokenDecimalPlaces(balance)
  const maxFractionDigits = Math.min(decimals, coinDecimals)
  return new FixedDecimal(BigInt(balance), coinDecimals).toLocaleString(
    'en-US',
    {
      maximumFractionDigits: maxFractionDigits
    }
  )
}

type ArtistVestingSectionProps = {
  coin: Coin
  handleClaimVestedCoinsClick: () => void
  isClaimVestedCoinsDisabled: boolean
  isClaimVestedCoinsPending: boolean
}

const ArtistVestingSection = ({
  coin,
  handleClaimVestedCoinsClick,
  isClaimVestedCoinsDisabled,
  isClaimVestedCoinsPending
}: ArtistVestingSectionProps) => {
  const { data: currentUser } = useCurrentAccountUser()
  const isOwner = currentUser?.user_id === coin.ownerId
  const isMobile = useIsMobile()

  const rewardsPoolBalance = formatBalance(
    coin.rewardPool?.balance ?? 0,
    coin.decimals
  )
  const lockedBalance = formatBalance(
    coin.artistLocker?.locked ?? 0,
    coin.decimals
  )
  const unlockedBalance = formatBalance(
    coin.artistLocker?.unlocked ?? 0,
    coin.decimals
  )
  const claimableBalance = formatBalance(
    coin.artistLocker?.claimable ?? 0,
    coin.decimals
  )
  return (
    <Flex column gap='m' w='100%'>
      <Divider orientation='horizontal' />
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
        <Text variant='body' size='s'>
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
            {overflowMessages.locked}
          </Text>
          <Tooltip text={overflowMessages.tooltips.locked} mount='body'>
            <IconInfo size='s' color='subdued' />
          </Tooltip>
        </Flex>
        <Text variant='body' size='s'>
          {messages.balance(lockedBalance, coin.ticker)}
        </Text>
      </Flex>
      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
      >
        <Flex alignItems='center' gap='s'>
          <Text variant='body' size='s' strength='strong'>
            {overflowMessages.unlocked}
          </Text>
          <Tooltip text={overflowMessages.tooltips.unlocked} mount='body'>
            <IconInfo size='s' color='subdued' />
          </Tooltip>
        </Flex>
        <Text variant='body' size='s'>
          {messages.balance(unlockedBalance, coin.ticker)}
        </Text>
      </Flex>
      {isOwner ? (
        <Flex
          alignItems='center'
          justifyContent='space-between'
          alignSelf='stretch'
        >
          <Flex alignItems='center' gap='s'>
            <Text variant='body' size='s' strength='strong'>
              {overflowMessages.availableToClaim}
            </Text>
            <Tooltip
              text={overflowMessages.tooltips.availableToClaim}
              mount='body'
            >
              <IconInfo size='s' color='subdued' />
            </Tooltip>
          </Flex>
          <Flex alignItems='center' gap='s'>
            {coin.artistLocker?.claimable &&
            coin.artistLocker.claimable > 0 &&
            !isMobile ? (
              <Flex gap='xs' alignItems='center'>
                <TextLink
                  onClick={handleClaimVestedCoinsClick}
                  variant={isClaimVestedCoinsDisabled ? 'subdued' : 'visible'}
                  disabled={isClaimVestedCoinsDisabled}
                >
                  {overflowMessages.claim}
                </TextLink>
                {isClaimVestedCoinsPending ? (
                  <LoadingSpinner size='s' color='subdued' />
                ) : null}
              </Flex>
            ) : null}
            <Text variant='body' size='s'>
              {messages.balance(claimableBalance, coin.ticker)}
            </Text>
          </Flex>
        </Flex>
      ) : null}
      <Divider orientation='horizontal' />
      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
      >
        <Flex alignItems='center' gap='s'>
          <Text variant='body' size='s' strength='strong'>
            {overflowMessages.rewardsPool}
          </Text>
          <Tooltip text={overflowMessages.tooltips.rewardsPool} mount='body'>
            <IconInfo size='s' color='subdued' />
          </Tooltip>
        </Flex>
        <Text variant='body' size='s'>
          {messages.balance(rewardsPoolBalance, coin.ticker)}
        </Text>
      </Flex>
    </Flex>
  )
}

export type CoinInfoSectionVariant = 'hero' | 'onchainDetails'

type CoinInfoSectionProps = {
  mint: string
  variant: CoinInfoSectionVariant
}

export const CoinInfoSection = ({ mint, variant }: CoinInfoSectionProps) => {
  const dispatch = useDispatch()
  const theme = useTheme()
  const { toast } = useContext(ToastContext)
  const record = useRecord()
  const isMobile = useIsMobile()

  const { onOpen: openClaimVestedCoinsModal } = useClaimVestedCoinsModal()

  const { data: coin, isLoading: isArtistCoinLoading } = useArtistCoin(mint)

  const { image: ownerCoverPhoto } = useCoverPhoto({
    userId: coin?.ownerId,
    size: WidthSizes.SIZE_640
  })

  const { data: currentUser } = useCurrentAccountUser()
  const { data: userCoins } = useUserCoins({ userId: currentUser?.user_id })
  const userToken = useMemo(
    () => userCoins?.find((coin) => coin.mint === mint),
    [userCoins, mint]
  )
  const isCoinCreator = coin?.ownerId === currentUser?.user_id
  const getDiscordOAuthLink = useGetDiscordOAuthLink(coin?.ticker)
  const { balance: userTokenBalance } = userToken ?? {}

  const isManagerMode = useIsManagedAccount()

  // Claim fee hook
  const { mutate: claimFees, isPending: isClaimFeesPending } = useClaimFees({
    onSuccess: (data) => {
      toast(toastMessages.feesClaimed)
      record(
        make(Name.LAUNCHPAD_CLAIM_FEES_SUCCESS, {
          signatures: data.signatures,
          walletAddress: coinCreatorWalletAddress ?? '',
          coinSymbol: coin?.ticker,
          mintAddress: mint,
          claimedAmount: unclaimedFees.toString()
        })
      )
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
      record(
        make(Name.LAUNCHPAD_CLAIM_FEES_FAILURE, {
          walletAddress: coinCreatorWalletAddress ?? '',
          coinSymbol: coin?.ticker,
          mintAddress: mint,
          error: error instanceof Error ? error.message : String(error)
        })
      )
    }
  })

  // Claim vested coins hook
  const { mutate: claimVestedCoins, isPending: isClaimVestedCoinsPending } =
    useClaimVestedCoins({
      onSuccess: (data) => {
        toast(toastMessages.vestedCoinsClaimed)
        record(
          make(Name.LAUNCHPAD_CLAIM_VESTED_COINS_SUCCESS, {
            signature: data.signature,
            walletAddress: coinCreatorWalletAddress ?? '',
            coinSymbol: coin?.ticker,
            mintAddress: mint,
            claimedAmount:
              coin?.artistLocker?.claimable?.toLocaleString() ?? '0'
          })
        )
      },
      onError: (error) => {
        reportToSentry({
          error,
          feature: Feature.ArtistCoins,
          name: 'Failed to claim vested artist coins',
          additionalInfo: {
            coin,
            tokenMint: mint
          }
        })
        console.error(error)
        toast(toastMessages.vestedCoinsClaimFailed)
        record(
          make(Name.LAUNCHPAD_CLAIM_VESTED_COINS_FAILURE, {
            walletAddress: coinCreatorWalletAddress ?? '',
            coinSymbol: coin?.ticker,
            mintAddress: mint,
            error: error instanceof Error ? error.message : String(error)
          })
        )
      }
    })

  const formatFeeNumber = (input: number) => {
    const value = wAUDIO(BigInt(input))
    const decimalPlaces = getTokenDecimalPlaces(Number(value.toString()))
    return formatCurrencyWithSubscript(
      Number(value.trunc(decimalPlaces).toString()),
      'en-US',
      ''
    )
  }

  const unclaimedFees = coin?.artistFees?.unclaimedFees ?? 0
  const formattedUnclaimedFees = useMemo(() => {
    return formatFeeNumber(unclaimedFees)
  }, [unclaimedFees])

  const totalArtistEarnings = coin?.artistFees?.totalFees ?? 0
  const formattedTotalArtistEarnings = useMemo(
    () => formatFeeNumber(Math.trunc(totalArtistEarnings)),
    [totalArtistEarnings]
  )
  const descriptionParagraphs: string[] = coin?.description?.split('\n') ?? []

  const openDiscord = useCallback(async () => {
    const discordLink = await getDiscordOAuthLink()
    window.open(discordLink, '_blank')
  }, [getDiscordOAuthLink])

  const handleLearnMore = () => {
    window.open(coin?.website, '_blank')
  }

  const handleBrowseRewards = useCallback(() => {
    dispatch(push(REWARDS_PAGE))
  }, [dispatch])

  const handleUploadExclusiveTrack = useCallback(() => {
    dispatch(push(UPLOAD_PAGE))
  }, [dispatch])

  const handleCopyAddress = useCallback(() => {
    copyToClipboard(mint)
    toast(overflowMessages.copiedToClipboard)
  }, [mint, toast])

  // In some cases a custom-made coin will not have a dbc, so we should use the escrow recipient instead.
  // It's possible to transfer the recipient however, so this isn't a perfect solution.
  const coinCreatorWalletAddress =
    !!coin?.dynamicBondingCurve?.creatorWalletAddress &&
    coin?.dynamicBondingCurve?.creatorWalletAddress !== ''
      ? coin?.dynamicBondingCurve?.creatorWalletAddress
      : coin?.escrowRecipient

  const handleClaimFees = useCallback(
    (walletAddress: string) => {
      claimFees({
        tokenMint: mint,
        externalWalletAddress: walletAddress
      })
    },
    [mint, claimFees]
  )

  const { openAppKitModal: openAppKitModalForFees } = useConnectExternalWallets(
    async () => {
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
    }
  )

  const handleClaimFeesClick = useCallback(async () => {
    const solanaAccount = appkitModal.getAccount('solana')
    const connectedAddress = solanaAccount?.address

    // Track the click event
    record(
      make(Name.LAUNCHPAD_CLAIM_FEES_CLICKED, {
        walletAddress: connectedAddress ?? coinCreatorWalletAddress ?? '',
        coinSymbol: coin?.ticker,
        mintAddress: mint
      })
    )

    // appkit wallet is not connected, need to prompt connect flow first
    if (!connectedAddress) {
      record(
        make(Name.LAUNCHPAD_CLAIM_FEES_CONNECT_WALLET, {
          coinSymbol: coin?.ticker,
          mintAddress: mint
        })
      )
      openAppKitModalForFees('solana')
    } else if (connectedAddress !== coinCreatorWalletAddress) {
      // If we hit this block the user has not connected the wallet they used to launch the coin
      // Disconnect the current Solana wallet to allow connecting a different one
      record(
        make(Name.LAUNCHPAD_CLAIM_FEES_SWITCH_WALLET, {
          currentWalletAddress: connectedAddress,
          expectedWalletAddress: coinCreatorWalletAddress ?? '',
          coinSymbol: coin?.ticker,
          mintAddress: mint
        })
      )
      await appkitModal.disconnect('solana')
      openAppKitModalForFees('solana')
    } else {
      // appkit wallet is connected with the correct address,
      // can just initiate claim fees flow immediately
      record(
        make(Name.LAUNCHPAD_CLAIM_FEES_WALLET_CONNECTED, {
          walletAddress: connectedAddress,
          coinSymbol: coin?.ticker,
          mintAddress: mint
        })
      )
      handleClaimFees(connectedAddress)
    }
  }, [
    openAppKitModalForFees,
    handleClaimFees,
    coinCreatorWalletAddress,
    record,
    coin?.ticker,
    mint
  ])

  const handleClaimVestedCoins = useCallback(
    (walletAddress: string, rewardsPoolPercentage: number) => {
      claimVestedCoins({
        tokenMint: mint,
        externalWalletAddress: walletAddress,
        rewardsPoolPercentage
      })
    },
    [mint, claimVestedCoins]
  )

  const handleConfirmClaim = useCallback(
    (rewardsPoolPercentage: number) => {
      const solanaAccount = appkitModal.getAccount('solana')
      const connectedAddress = solanaAccount?.address
      if (connectedAddress) {
        // Pass the rewards pool percentage to the claim function
        handleClaimVestedCoins(connectedAddress, rewardsPoolPercentage)
      }
    },
    [handleClaimVestedCoins]
  )

  const { openAppKitModal: openAppKitModalForVestedCoins } =
    useConnectExternalWallets(async () => {
      const solanaAccount = appkitModal.getAccount('solana')
      const connectedAddress = solanaAccount?.address

      if (!coinCreatorWalletAddress) {
        toast(toastMessages.vestedCoinsClaimFailed)
        return
      }
      if (!connectedAddress || connectedAddress !== coinCreatorWalletAddress) {
        toast(toastMessages.incorrectWalletLinked)
        return
      }
      openClaimVestedCoinsModal({
        ticker: coin?.ticker ?? '',
        isOpen: true,
        claimable: coin?.artistLocker?.claimable ?? 0,
        onClaim: handleConfirmClaim,
        isClaimPending: isClaimVestedCoinsPending
      })
    })

  const handleClaimVestedCoinsClick = useCallback(async () => {
    const solanaAccount = appkitModal.getAccount('solana')
    const connectedAddress = solanaAccount?.address
    record(
      make(Name.LAUNCHPAD_CLAIM_VESTED_COINS_CLICKED, {
        walletAddress: connectedAddress ?? '',
        coinSymbol: coin?.ticker,
        mintAddress: mint
      })
    )

    // appkit wallet is not connected, need to prompt connect flow first
    if (!connectedAddress) {
      record(
        make(Name.LAUNCHPAD_CLAIM_VESTED_COINS_CONNECT_WALLET, {
          coinSymbol: coin?.ticker,
          mintAddress: mint
        })
      )
      openAppKitModalForVestedCoins('solana')
    } else if (connectedAddress !== coinCreatorWalletAddress) {
      // Disconnect the current Solana wallet to allow connecting a different one
      record(
        make(Name.LAUNCHPAD_CLAIM_VESTED_COINS_SWITCH_WALLET, {
          currentWalletAddress: connectedAddress,
          expectedWalletAddress: coinCreatorWalletAddress ?? '',
          coinSymbol: coin?.ticker,
          mintAddress: mint
        })
      )
      await appkitModal.disconnect('solana')
      openAppKitModalForVestedCoins('solana')
    } else {
      record(
        make(Name.LAUNCHPAD_CLAIM_VESTED_COINS_WALLET_CONNECTED, {
          walletAddress: connectedAddress,
          coinSymbol: coin?.ticker,
          mintAddress: mint
        })
      )
      // Open the modal to let user choose allocation
      openClaimVestedCoinsModal({
        ticker: coin?.ticker ?? '',
        isOpen: true,
        claimable: coin?.artistLocker?.claimable ?? 0,
        onClaim: handleConfirmClaim,
        isClaimPending: isClaimVestedCoinsPending
      })
    }
  }, [
    openAppKitModalForVestedCoins,
    coinCreatorWalletAddress,
    openClaimVestedCoinsModal,
    coin,
    mint,
    record,
    isClaimVestedCoinsPending,
    handleConfirmClaim
  ])

  // Get vesting information from the coin's dynamic bonding curve data
  const hasGraduated = coin?.dynamicBondingCurve?.isMigrated ?? false

  const isClaimVestedCoinsDisabled =
    isClaimVestedCoinsPending ||
    isManagerMode ||
    coin?.artistLocker === null ||
    coin?.artistLocker?.claimable === 0

  if (isArtistCoinLoading || !coin) {
    return variant === 'onchainDetails' ? (
      <CoinInfoOnchainSkeleton />
    ) : (
      <CoinInfoHeroSkeleton />
    )
  }

  const isWAudio = coin.mint === env.WAUDIO_MINT_ADDRESS
  const CTAIcon = isWAudio ? IconGift : IconExternalLink

  const isUserBalanceUnavailable =
    !userTokenBalance || Number(userTokenBalance) <= 0
  const isClaimFeesDisabled = isClaimFeesPending || isManagerMode

  if (variant === 'hero') {
    const bannerSrcForHero =
      coin.bannerImageUrl && coin.bannerImageUrl.trim().length > 0
        ? coin.bannerImageUrl
        : ownerCoverPhoto

    const hasSocialLinks = [
      coin.link1,
      coin.link2,
      coin.link3,
      coin.link4
    ].some(removeNullable)

    const hasDescriptionText = descriptionParagraphs.some(
      (paragraph) => paragraph.trim() !== ''
    )

    return (
      <Paper
        borderRadius='l'
        shadow='mid'
        column
        alignItems='flex-start'
        border='default'
        data-testid='coin-info-hero'
        css={{ overflow: 'hidden' }}
      >
        <CoinHeroCoverPhoto bannerImage={bannerSrcForHero} />

        <Flex
          column
          gap='l'
          ph='l'
          pb='l'
          pt='l'
          alignSelf='stretch'
          css={{ marginTop: -theme.spacing.unit9 }}
        >
          <Flex gap='s' alignItems='flex-end' w='100%' css={{ minWidth: 0 }}>
            <Avatar userId={coin.ownerId} size='large' />
            <Flex column gap='2xs' flex={1} css={{ minWidth: 0 }}>
              <Text variant='label' size='s' color='subdued'>
                {fanClubCardMessages.fanClubLabel}
              </Text>
              <Flex gap='xs' alignItems='center' w='100%' css={{ minWidth: 0 }}>
                <UserLink userId={coin.ownerId} noBadges size='l' />
                <Flex css={{ flexShrink: 0 }}>
                  <UserBadges userId={coin.ownerId} size='m' mint={mint} />
                </Flex>
              </Flex>
            </Flex>
          </Flex>

          {hasSocialLinks ? <SocialLinksDisplay coin={coin} /> : null}

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
            <Flex gap='m' alignItems='center' w='100%' css={{ minWidth: 0 }}>
              <TokenIcon logoURI={coin.logoUri} size='xl' hex />
              <Flex column gap='xs' flex={1} css={{ minWidth: 0 }}>
                <Text variant='label' size='s' color='subdued'>
                  {walletMessages.poweredBy}
                </Text>
                <Text variant='heading' size='s' ellipses>
                  {coin.ticker ?? ''}
                </Text>
              </Flex>
            </Flex>
          </Paper>

          {hasDescriptionText ? (
            <Flex column gap='m' alignSelf='stretch'>
              {descriptionParagraphs.map((paragraph) => {
                if (paragraph.trim() === '') {
                  return null
                }

                return (
                  <UserGeneratedText
                    key={paragraph.slice(0, 10)}
                    variant='body'
                    size='m'
                    color='default'
                  >
                    {paragraph}
                  </UserGeneratedText>
                )
              })}
            </Flex>
          ) : null}

          {isCoinCreator && !isManagerMode ? (
            <Button
              variant='secondary'
              fullWidth
              iconLeft={IconCloudUpload}
              onClick={handleUploadExclusiveTrack}
            >
              {messages.uploadExclusiveTrack}
            </Button>
          ) : null}
        </Flex>

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
      </Paper>
    )
  }

  return (
    <Paper
      borderRadius='l'
      shadow='far'
      column
      alignItems='flex-start'
      border='default'
      data-testid='coin-onchain-details'
    >
      <Flex
        alignItems='center'
        alignSelf='stretch'
        ph='l'
        pv='m'
        borderBottom='default'
      >
        <Text variant='heading' size='s'>
          {messages.fanClubDetailsTitle}
        </Text>
      </Flex>

      <Flex
        alignItems='center'
        justifyContent='space-between'
        alignSelf='stretch'
        p='l'
        ph='xl'
        borderBottom='default'
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
            data-testid='artist-earnings'
          >
            <Flex alignItems='center' gap='s'>
              <Text variant='body' size='s' strength='strong'>
                {overflowMessages.artistEarnings}
              </Text>
              <Tooltip
                text={overflowMessages.tooltips.artistEarnings}
                mount='body'
              >
                <IconInfo size='s' color='subdued' />
              </Tooltip>
            </Flex>
            <Text variant='body' size='s'>
              {formattedTotalArtistEarnings} {overflowMessages.$audio}
            </Text>
          </Flex>
          {isCoinCreator && !isManagerMode ? (
            <Flex
              alignItems='center'
              justifyContent='space-between'
              alignSelf='stretch'
              data-testid='unclaimed-fees'
            >
              <Flex alignItems='center' gap='s'>
                <Text variant='body' size='s' strength='strong'>
                  {overflowMessages.unclaimedEarnings}
                </Text>
                <Tooltip
                  text={overflowMessages.tooltips.unclaimedEarnings}
                  mount='body'
                >
                  <IconInfo size='s' color='subdued' />
                </Tooltip>
              </Flex>
              <Flex alignItems='center' gap='s'>
                {unclaimedFees >= MIN_CLAIMABLE_FEES && !isMobile ? (
                  <Flex gap='xs' alignItems='center'>
                    <TextLink
                      onClick={handleClaimFeesClick}
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

                <Text variant='body' size='s'>
                  {formattedUnclaimedFees} {overflowMessages.$audio}
                </Text>
              </Flex>
            </Flex>
          ) : null}
          {!isManagerMode && hasGraduated && coin.artistLocker ? (
            <ArtistVestingSection
              coin={coin}
              handleClaimVestedCoinsClick={handleClaimVestedCoinsClick}
              isClaimVestedCoinsDisabled={isClaimVestedCoinsDisabled}
              isClaimVestedCoinsPending={isClaimVestedCoinsPending}
            />
          ) : null}
        </Flex>
      ) : null}
    </Paper>
  )
}
