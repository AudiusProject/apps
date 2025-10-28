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
import { Feature, Name, WidthSizes } from '@audius/common/models'
import { useClaimVestedCoinsModal } from '@audius/common/store'
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
import { make, useRecord } from 'common/store/analytics/actions'
import { ExternalLink } from 'components/link/ExternalLink'
import Skeleton from 'components/skeleton/Skeleton'
import { ToastContext } from 'components/toast/ToastContext'
import Tooltip from 'components/tooltip/Tooltip'
import { UserGeneratedText } from 'components/user-generated-text'
import { UserTokenBadge } from 'components/user-token-badge/UserTokenBadge'
import { useClaimFees } from 'hooks/useClaimFees'
import { useClaimVestedCoins } from 'hooks/useClaimVestedCoins'
import { useConnectExternalWallets } from 'hooks/useConnectExternalWallets'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { env } from 'services/env'
import { reportToSentry } from 'store/errors/reportToSentry'
import { copyToClipboard } from 'utils/clipboardUtil'
import { push } from 'utils/navigation'

const { REWARDS_PAGE } = route

const messages = coinDetailsMessages.coinInfo
const overflowMessages = coinDetailsMessages.overflowMenu
const toastMessages = coinDetailsMessages.toasts

const BANNER_HEIGHT = 120

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

const CoinInfoSectionSkeleton = () => {
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
  return (
    <>
      <Flex
        css={{ height: '1px', background: '$neutralLight8' }}
        alignSelf='stretch'
      />
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
            {overflowMessages.locked}
          </Text>
          <Tooltip text={overflowMessages.tooltips.locked} mount='body'>
            <IconInfo size='s' color='subdued' />
          </Tooltip>
        </Flex>
        <Text variant='body' size='s' color='subdued'>
          {coin.artistLocker?.locked?.toLocaleString()} ${coin.ticker}
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
        <Text variant='body' size='s' color='subdued'>
          {coin.artistLocker?.unlocked?.toLocaleString()} ${coin.ticker}
        </Text>
      </Flex>
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
          {coin.artistLocker?.claimable && coin.artistLocker.claimable > 0 ? (
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
          <Text variant='body' size='s' color='subdued'>
            {coin.artistLocker?.claimable?.toLocaleString()} ${coin.ticker}
          </Text>
        </Flex>
      </Flex>
    </>
  )
}

type CoinInfoSectionProps = {
  mint: string
}

export const CoinInfoSection = ({ mint }: CoinInfoSectionProps) => {
  const dispatch = useDispatch()
  const { toast } = useContext(ToastContext)
  const record = useRecord()

  const { onOpen: openClaimVestedCoinsModal } = useClaimVestedCoinsModal()

  const { data: coin, isLoading: isArtistCoinLoading } = useArtistCoin(mint)

  const { data: currentUser } = useCurrentAccountUser()
  const { data: userCoins } = useUserCoins({ userId: currentUser?.user_id })
  const userToken = useMemo(
    () => userCoins?.find((coin) => coin.mint === mint),
    [userCoins, mint]
  )
  const isCoinCreator = coin?.ownerId === currentUser?.user_id
  const discordOAuthLink = useDiscordOAuthLink(userToken?.ticker)
  const { balance: userTokenBalance } = userToken ?? {}

  const isManagerMode = useIsManagedAccount()

  // Claim fee hook
  const { mutate: claimFees, isPending: isClaimFeesPending } = useClaimFees({
    onSuccess: (data) => {
      toast(toastMessages.feesClaimed)
      record(
        make(Name.LAUNCHPAD_CLAIM_FEES_SUCCESS, {
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
      }
      // Wallet is connected and verified, modal will handle the claim
    })

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
      if (coin) {
        openClaimVestedCoinsModal({
          ticker: coin.ticker ?? '',
          isOpen: true,
          claimable: coin.artistLocker?.claimable ?? 0,
          onClaim: handleConfirmClaim,
          isClaimPending: isClaimVestedCoinsPending
        })
      }
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
    return <CoinInfoSectionSkeleton />
  }

  const isWAudio = coin.mint === env.WAUDIO_MINT_ADDRESS
  const CTAIcon = isWAudio ? IconGift : IconExternalLink

  const isUserBalanceUnavailable =
    !userTokenBalance || Number(userTokenBalance) <= 0
  const isClaimFeesDisabled = isClaimFeesPending || isManagerMode

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
                {overflowMessages.artistEarnings}
              </Text>
              <Tooltip
                text={overflowMessages.tooltips.artistEarnings}
                mount='body'
              >
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
                {unclaimedFees >= MIN_CLAIMABLE_FEES ? (
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

                <Text variant='body' size='s' color='subdued'>
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
