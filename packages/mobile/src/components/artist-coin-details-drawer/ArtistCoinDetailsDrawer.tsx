import { useCallback, type ReactNode } from 'react'

import { useArtistCoin, useCoinGeckoCoin, useUser } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { useArtistCoinDetailsModal } from '@audius/common/store'
import {
  formatCurrencyWithSubscript,
  getTokenDecimalPlaces
} from '@audius/common/utils'
import { FixedDecimal, wAUDIO } from '@audius/fixed-decimal'
import Clipboard from '@react-native-clipboard/clipboard'
import { ScrollView } from 'react-native'

import {
  Flex,
  Text,
  Divider,
  Button,
  IconCopy,
  PlainButton,
  useTheme
} from '@audius/harmony-native'
import { TooltipInfoIcon } from 'app/components/buy-sell/TooltipInfoIcon'
import { TokenIcon } from 'app/components/core'
import Drawer from 'app/components/drawer/Drawer'
import { useToast } from 'app/hooks/useToast'
import { env } from 'app/services/env'

import { DrawerHeader } from '../drawer/DrawerHeader'

const { artistCoinDetails, overflowMenu } = coinDetailsMessages

const LAUNCHPAD_COIN_DESCRIPTION = (handle: string, ticker: string) =>
  `{${ticker}} is an artist coin created by {${handle}} on Audius. Learn more at https://audius.co/coin/{${ticker}}`

const formatTokenAmount = (balance: number, coinDecimals: number) => {
  const decimals = getTokenDecimalPlaces(balance)
  const maxFractionDigits = Math.min(decimals, coinDecimals)
  return new FixedDecimal(BigInt(balance), coinDecimals).toLocaleString(
    'en-US',
    {
      maximumFractionDigits: maxFractionDigits
    }
  )
}

const formatFeeNumber = (input: number) => {
  const value = wAUDIO(BigInt(input))
  const decimalPlaces = getTokenDecimalPlaces(Number(value.toString()))
  return formatCurrencyWithSubscript(
    Number(value.trunc(decimalPlaces).toString()),
    'en-US',
    ''
  )
}

const DetailRow = ({
  label,
  tooltip,
  children
}: {
  label: string
  tooltip?: string
  children: ReactNode
}) => (
  <Flex column gap='xs' w='100%'>
    <Flex row alignItems='center' gap='xs'>
      <Text variant='body' size='s' strength='strong' color='subdued'>
        {label}
      </Text>
      {tooltip ? <TooltipInfoIcon title={label} message={tooltip} /> : null}
    </Flex>
    {children}
  </Flex>
)

const StatRow = ({ left, right }: { left: ReactNode; right: ReactNode }) => (
  <Flex row gap='xl' w='100%' alignItems='flex-start'>
    <Flex flex={1}>{left}</Flex>
    <Flex flex={1}>{right}</Flex>
  </Flex>
)

const CopyableAddress = ({
  address,
  onCopy
}: {
  address: string
  onCopy: () => void
}) => (
  <Flex row alignItems='center' gap='s' w='100%'>
    <Text
      variant='body'
      size='s'
      numberOfLines={1}
      ellipsizeMode='middle'
      style={{ flex: 1 }}
    >
      {address}
    </Text>
    <PlainButton onPress={onCopy} iconLeft={IconCopy} />
  </Flex>
)

export const ArtistCoinDetailsDrawer = () => {
  const { spacing } = useTheme()
  const { toast } = useToast()
  const { isOpen, onClose, data: modalData } = useArtistCoinDetailsModal()
  const mint = modalData?.mint
  const { data: artistCoin } = useArtistCoin(mint)
  const { data: artist } = useUser(artistCoin?.ownerId)
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS
  const { data: coingeckoResponse } = useCoinGeckoCoin(
    { coinId: 'audius' },
    { enabled: isAudio }
  )

  const handleCopyAddress = useCallback(() => {
    if (artistCoin?.mint) {
      Clipboard.setString(artistCoin.mint)
      toast({ content: artistCoinDetails.copied, type: 'info' })
    }
  }, [artistCoin?.mint, toast])

  const handleCopyRewardsPoolAddress = useCallback(() => {
    if (artistCoin?.rewardPool?.address) {
      Clipboard.setString(artistCoin.rewardPool.address)
      toast({ content: artistCoinDetails.copied, type: 'info' })
    }
  }, [artistCoin?.rewardPool?.address, toast])

  if (!artistCoin?.mint) {
    return null
  }

  const decimals = artistCoin.decimals ?? 9
  const hasGraduated = artistCoin.dynamicBondingCurve?.isMigrated ?? false
  const locker = artistCoin.artistLocker
  const showLockerStats = !isAudio && hasGraduated && !!locker
  const ticker = artistCoin.ticker ? `$${artistCoin.ticker}` : ''

  // Market data
  const totalSupply = isAudio
    ? coingeckoResponse?.market_data?.total_supply
    : artistCoin.totalSupply
  const marketCap = isAudio
    ? coingeckoResponse?.market_data?.market_cap?.usd
    : artistCoin.displayMarketCap
  const price = isAudio
    ? coingeckoResponse?.market_data?.current_price?.usd
    : artistCoin.displayPrice
  const liquidity = isAudio
    ? coingeckoResponse?.market_data?.total_volume?.usd
    : artistCoin.liquidity

  const formattedArtistEarnings = artistCoin.artistFees?.totalFees
    ? formatFeeNumber(Math.trunc(artistCoin.artistFees.totalFees))
    : null

  const rewardsPoolBalance =
    artistCoin.rewardPool?.balance != null
      ? formatTokenAmount(artistCoin.rewardPool.balance, decimals)
      : null

  const renderHeader = () => (
    <Flex pv='l' ph='xl' gap='m' mb='m'>
      <DrawerHeader
        onClose={onClose}
        title={artistCoinDetails.details}
        isFullscreen
      />
      <Divider />
    </Flex>
  )

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      drawerHeader={renderHeader}
      isFullscreen
      isGestureSupported={false}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Flex direction='column' gap='l' ph='xl' pb='xl'>
          {/* Token Info with avatar */}
          <Flex row alignItems='center' gap='m'>
            <TokenIcon logoURI={artistCoin.logoUri} size={spacing['4xl']} />
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l'>
                {artistCoin.name}
              </Text>
              <Text variant='body' size='m' color='subdued'>
                {ticker}
              </Text>
            </Flex>
          </Flex>

          <Divider />

          {/* Coin Address */}
          <DetailRow
            label={artistCoinDetails.coinAddress}
            tooltip={artistCoinDetails.tooltips.coinAddress}
          >
            <CopyableAddress
              address={artistCoin.mint}
              onCopy={handleCopyAddress}
            />
          </DetailRow>

          {/* On-Chain Description */}
          {!isAudio && artist?.handle ? (
            <DetailRow
              label={artistCoinDetails.onChainDescription}
              tooltip={artistCoinDetails.tooltips.onChainDescription}
            >
              <Text variant='body' size='s'>
                {LAUNCHPAD_COIN_DESCRIPTION(
                  artist.handle,
                  artistCoin.ticker ?? ''
                )}
              </Text>
            </DetailRow>
          ) : null}

          <Divider />

          {/* Market Stats */}
          <Flex column gap='l' w='100%'>
            <StatRow
              left={
                totalSupply != null ? (
                  <DetailRow
                    label={artistCoinDetails.totalSupply}
                    tooltip={artistCoinDetails.tooltips.totalSupply}
                  >
                    <Text variant='body' size='m'>
                      {totalSupply.toLocaleString()}
                    </Text>
                  </DetailRow>
                ) : null
              }
              right={
                marketCap != null ? (
                  <DetailRow
                    label={artistCoinDetails.marketCap}
                    tooltip={artistCoinDetails.tooltips.marketCap}
                  >
                    <Text variant='body' size='m'>
                      ${marketCap.toLocaleString()}
                    </Text>
                  </DetailRow>
                ) : null
              }
            />
            <StatRow
              left={
                price != null ? (
                  <DetailRow
                    label={artistCoinDetails.price}
                    tooltip={artistCoinDetails.tooltips.price}
                  >
                    <Text variant='body' size='m'>
                      {formatCurrencyWithSubscript(price)}
                    </Text>
                  </DetailRow>
                ) : null
              }
              right={
                liquidity != null ? (
                  <DetailRow
                    label={artistCoinDetails.liquidity}
                    tooltip={artistCoinDetails.tooltips.liquidity}
                  >
                    <Text variant='body' size='m'>
                      ${liquidity.toLocaleString()}
                    </Text>
                  </DetailRow>
                ) : null
              }
            />
          </Flex>

          {/* Vesting / Locker Stats - Non-wAUDIO only */}
          {!isAudio ? (
            <>
              <Divider />
              <Flex column gap='l' w='100%'>
                {/* Unlock Schedule */}
                <DetailRow
                  label={overflowMenu.vestingSchedule}
                  tooltip={overflowMenu.tooltips.vestingSchedule}
                >
                  <Text variant='body' size='m'>
                    {overflowMenu.vestingScheduleValue}
                  </Text>
                </DetailRow>

                {/* Artist Earnings */}
                {formattedArtistEarnings ? (
                  <DetailRow
                    label={overflowMenu.artistEarnings}
                    tooltip={overflowMenu.tooltips.artistEarnings}
                  >
                    <Text variant='body' size='m'>
                      {formattedArtistEarnings} {overflowMenu.$audio}
                    </Text>
                  </DetailRow>
                ) : null}

                {/* Locked / Unlocked */}
                {showLockerStats && locker ? (
                  <>
                    <DetailRow
                      label={overflowMenu.locked}
                      tooltip={overflowMenu.tooltips.locked}
                    >
                      <Text variant='body' size='m'>
                        {formatTokenAmount(locker.locked ?? 0, decimals)}{' '}
                        {ticker}
                      </Text>
                    </DetailRow>
                    <DetailRow
                      label={overflowMenu.unlocked}
                      tooltip={overflowMenu.tooltips.unlocked}
                    >
                      <Text variant='body' size='m'>
                        {formatTokenAmount(locker.unlocked ?? 0, decimals)}{' '}
                        {ticker}
                      </Text>
                    </DetailRow>
                  </>
                ) : null}

                {/* Reward Pool */}
                {rewardsPoolBalance != null ? (
                  <DetailRow
                    label={overflowMenu.rewardsPool}
                    tooltip={overflowMenu.tooltips.rewardsPool}
                  >
                    <Text variant='body' size='m'>
                      {rewardsPoolBalance} {ticker}
                    </Text>
                  </DetailRow>
                ) : null}

                {/* Rewards Pool Address */}
                {artistCoin.rewardPool?.address ? (
                  <DetailRow
                    label={artistCoinDetails.rewardsPoolAddress}
                    tooltip={overflowMenu.tooltips.rewardsPool}
                  >
                    <CopyableAddress
                      address={artistCoin.rewardPool.address}
                      onCopy={handleCopyRewardsPoolAddress}
                    />
                  </DetailRow>
                ) : null}
              </Flex>
            </>
          ) : null}

          {/* Close Button */}
          <Flex pt='m' w='100%'>
            <Button variant='primary' fullWidth onPress={onClose}>
              {artistCoinDetails.close}
            </Button>
          </Flex>
        </Flex>
      </ScrollView>
    </Drawer>
  )
}
