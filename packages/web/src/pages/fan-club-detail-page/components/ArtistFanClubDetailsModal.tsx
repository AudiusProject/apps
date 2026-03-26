import { useCallback, type ReactNode } from 'react'

import type { Coin } from '@audius/common/adapters'
import {
  useArtistCoin,
  useCoinGeckoCoin,
  useUser,
  type CoinGeckoCoinResponse
} from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { toast } from '@audius/common/src/store/ui/toast/slice'
import {
  formatCurrencyWithSubscript,
  getTokenDecimalPlaces,
  shortenSPLAddress
} from '@audius/common/utils'
import { FixedDecimal, wAUDIO } from '@audius/fixed-decimal'
import {
  Box,
  Flex,
  Text,
  Divider,
  IconInfo,
  Button,
  useTheme,
  IconCopy,
  IconButton,
  Tooltip
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { env } from 'services/env'
import { copyToClipboard } from 'utils/clipboardUtil'

import { TokenIcon } from '../../../components/buy-sell-modal/TokenIcon'
import ResponsiveModal from '../../../components/modal/ResponsiveModal'
import { LAUNCHPAD_COIN_DESCRIPTION } from '../../artist-coins-launchpad-page/constants'

const { artistCoinDetails, overflowMenu } = coinDetailsMessages

type ArtistFanClubDetailsModalProps = {
  /**
   * Whether the modal is open
   */
  isOpen: boolean
  /**
   * Callback to close the modal
   */
  onClose: () => void
  /**
   * The mint address of the artist coin
   */
  mint: string
}

const formatModalTokenAmount = (balance: number, coinDecimals: number) => {
  const decimals = getTokenDecimalPlaces(balance)
  const maxFractionDigits = Math.min(decimals, coinDecimals)
  return new FixedDecimal(BigInt(balance), coinDecimals).toLocaleString(
    'en-US',
    {
      maximumFractionDigits: maxFractionDigits
    }
  )
}

const formatModalFeeNumber = (input: number) => {
  const value = wAUDIO(BigInt(input))
  const decimalPlaces = getTokenDecimalPlaces(Number(value.toString()))
  return formatCurrencyWithSubscript(
    Number(value.trunc(decimalPlaces).toString()),
    'en-US',
    ''
  )
}

const ModalLabeledValue = ({
  label,
  tooltip,
  children
}: {
  label: string
  tooltip?: string
  children: ReactNode
}) => {
  return (
    <Flex
      column
      gap='xs'
      alignItems='flex-start'
      flex={1}
      css={{ minWidth: 0 }}
    >
      <Flex alignItems='center' gap='xs'>
        <Text variant='body' size='s' strength='strong' color='subdued'>
          {label}
        </Text>
        {tooltip ? (
          <Tooltip text={tooltip} mount='body'>
            <IconInfo size='s' color='subdued' />
          </Tooltip>
        ) : null}
      </Flex>
      <Box css={{ minWidth: 0, width: '100%' }}>{children}</Box>
    </Flex>
  )
}

const ModalStatRow = ({
  left,
  right
}: {
  left: ReactNode
  right: ReactNode
}) => (
  <Flex row gap='xl' w='100%' alignItems='flex-start'>
    {left}
    {right}
  </Flex>
)

export const ArtistFanClubDetailsModal = ({
  isOpen,
  onClose,
  mint
}: ArtistFanClubDetailsModalProps) => {
  const dispatch = useDispatch()
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS
  const { spacing } = useTheme()
  const { data: artistCoin } = useArtistCoin(mint)

  const { data: artistHandle } = useUser(artistCoin?.ownerId, {
    select: (user) => {
      return user.handle
    }
  })
  const { data: coingeckoResponse } = useCoinGeckoCoin(
    { coinId: 'audius' },
    { enabled: isAudio }
  )

  const handleCopyMint = useCallback(() => {
    if (artistCoin?.mint) {
      copyToClipboard(artistCoin.mint)
      dispatch(toast({ content: overflowMenu.copiedToClipboard, type: 'info' }))
    }
  }, [artistCoin?.mint, dispatch])

  const handleCopyRewardsPoolAddress = useCallback(() => {
    if (artistCoin?.rewardPool?.address) {
      copyToClipboard(artistCoin.rewardPool.address)
      dispatch(toast({ content: overflowMenu.copiedToClipboard, type: 'info' }))
    }
  }, [artistCoin?.rewardPool?.address, dispatch])

  const marketProps = isAudio
    ? convertCoinGeckoResponseToStatsDetailsProps(coingeckoResponse)
    : artistCoin

  const decimals = artistCoin?.decimals ?? 9
  const hasGraduated = artistCoin?.dynamicBondingCurve?.isMigrated ?? false
  const locker = artistCoin?.artistLocker
  const showLockerStats = !isAudio && hasGraduated && !!locker
  const formattedArtistEarnings = artistCoin?.artistFees?.totalFees
    ? formatModalFeeNumber(Math.trunc(artistCoin.artistFees.totalFees))
    : null
  const rewardsPoolBalance =
    artistCoin?.rewardPool?.balance != null
      ? formatModalTokenAmount(artistCoin.rewardPool.balance, decimals)
      : null

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={artistCoinDetails.details}
      Icon={IconInfo}
      size='l'
      isFullscreen
    >
      <Flex
        direction='column'
        gap='l'
        p='l'
        w='100%'
        alignSelf='stretch'
        css={{ overflowY: 'auto', maxHeight: '100%' }}
      >
        <Flex alignItems='center' gap='m'>
          <TokenIcon
            logoURI={artistCoin?.logoUri}
            w={spacing.unit16}
            h={spacing.unit16}
            hex
          />
          <Flex direction='column' gap='2xs'>
            <Text variant='title' size='l'>
              {artistCoin?.name}
            </Text>
            <Text variant='body' size='m' color='subdued'>
              ${artistCoin?.ticker}
            </Text>
          </Flex>
        </Flex>

        <Divider />

        {artistCoin?.mint ? (
          <Flex column gap='xs' w='100%'>
            <Flex alignItems='center' gap='xs'>
              <Text variant='body' size='m' strength='strong' color='subdued'>
                {artistCoinDetails.coinAddress}
              </Text>
              <Tooltip
                text={artistCoinDetails.tooltips.coinAddress}
                mount='body'
              >
                <IconInfo size='s' color='subdued' />
              </Tooltip>
            </Flex>
            <Flex alignItems='center' gap='s' w='100%' css={{ minWidth: 0 }}>
              <Text
                variant='body'
                size='m'
                userSelect='text'
                css={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  wordBreak: 'break-all'
                }}
              >
                {artistCoin.mint}
              </Text>
              <IconButton
                aria-label={overflowMenu.copyCoinAddress}
                size='s'
                color='subdued'
                icon={IconCopy}
                onClick={handleCopyMint}
              />
            </Flex>
          </Flex>
        ) : null}

        {artistCoin?.ticker && artistHandle && !isAudio ? (
          <Flex column gap='xs' w='100%'>
            <Flex alignItems='center' gap='xs'>
              <Text variant='body' size='m' strength='strong' color='subdued'>
                {artistCoinDetails.onChainDescription}
              </Text>
              <Tooltip
                text={artistCoinDetails.tooltips.onChainDescription}
                mount='body'
              >
                <IconInfo size='s' color='subdued' />
              </Tooltip>
            </Flex>
            <Text variant='body' size='m' userSelect='text'>
              {LAUNCHPAD_COIN_DESCRIPTION(artistHandle, artistCoin.ticker)}
            </Text>
          </Flex>
        ) : null}

        <Divider />

        <Flex column gap='l' w='100%'>
          <ModalStatRow
            left={
              marketProps?.totalSupply != null ? (
                <ModalLabeledValue
                  label={artistCoinDetails.totalSupply}
                  tooltip={artistCoinDetails.tooltips.totalSupply}
                >
                  <Text variant='body' size='m' userSelect='text'>
                    {marketProps.totalSupply.toLocaleString()}
                  </Text>
                </ModalLabeledValue>
              ) : (
                <Box />
              )
            }
            right={
              marketProps?.displayPrice != null ? (
                <ModalLabeledValue
                  label={artistCoinDetails.price}
                  tooltip={artistCoinDetails.tooltips.price}
                >
                  <Text variant='body' size='m' userSelect='text'>
                    {formatCurrencyWithSubscript(marketProps.displayPrice)}
                  </Text>
                </ModalLabeledValue>
              ) : (
                <Box />
              )
            }
          />
          <ModalStatRow
            left={
              marketProps?.displayMarketCap != null ? (
                <ModalLabeledValue
                  label={artistCoinDetails.marketCap}
                  tooltip={artistCoinDetails.tooltips.marketCap}
                >
                  <Text variant='body' size='m' userSelect='text'>
                    ${marketProps.displayMarketCap.toLocaleString()}
                  </Text>
                </ModalLabeledValue>
              ) : (
                <Box />
              )
            }
            right={
              marketProps?.liquidity != null ? (
                <ModalLabeledValue
                  label={artistCoinDetails.liquidity}
                  tooltip={artistCoinDetails.tooltips.liquidity}
                >
                  <Text variant='body' size='m' userSelect='text'>
                    ${marketProps.liquidity.toLocaleString()}
                  </Text>
                </ModalLabeledValue>
              ) : (
                <Box />
              )
            }
          />
        </Flex>

        {!isAudio && artistCoin ? (
          <>
            <Divider />
            <Flex column gap='l' w='100%'>
              <ModalStatRow
                left={
                  <ModalLabeledValue
                    label={overflowMenu.vestingSchedule}
                    tooltip={overflowMenu.tooltips.vestingSchedule}
                  >
                    <Text variant='body' size='m'>
                      {overflowMenu.vestingScheduleValue}
                    </Text>
                  </ModalLabeledValue>
                }
                right={
                  formattedArtistEarnings ? (
                    <ModalLabeledValue
                      label={overflowMenu.artistEarnings}
                      tooltip={overflowMenu.tooltips.artistEarnings}
                    >
                      <Text variant='body' size='m'>
                        {formattedArtistEarnings} {overflowMenu.$audio}
                      </Text>
                    </ModalLabeledValue>
                  ) : (
                    <Box />
                  )
                }
              />
              {showLockerStats && locker ? (
                <ModalStatRow
                  left={
                    <ModalLabeledValue
                      label={overflowMenu.locked}
                      tooltip={overflowMenu.tooltips.locked}
                    >
                      <Text variant='body' size='m'>
                        {formatModalTokenAmount(locker.locked ?? 0, decimals)}{' '}
                        {artistCoin.ticker != null
                          ? `$${artistCoin.ticker}`
                          : ''}
                      </Text>
                    </ModalLabeledValue>
                  }
                  right={
                    <ModalLabeledValue
                      label={overflowMenu.unlocked}
                      tooltip={overflowMenu.tooltips.unlocked}
                    >
                      <Text variant='body' size='m'>
                        {formatModalTokenAmount(locker.unlocked ?? 0, decimals)}{' '}
                        {artistCoin.ticker != null
                          ? `$${artistCoin.ticker}`
                          : ''}
                      </Text>
                    </ModalLabeledValue>
                  }
                />
              ) : null}
              {rewardsPoolBalance != null ? (
                <ModalStatRow
                  left={
                    <ModalLabeledValue
                      label={overflowMenu.rewardsPool}
                      tooltip={overflowMenu.tooltips.rewardsPool}
                    >
                      <Text variant='body' size='m'>
                        {rewardsPoolBalance}{' '}
                        {artistCoin.ticker != null
                          ? `$${artistCoin.ticker}`
                          : ''}
                      </Text>
                    </ModalLabeledValue>
                  }
                  right={<Box />}
                />
              ) : null}
              {artistCoin.rewardPool?.address ? (
                <Flex column gap='xs' w='100%'>
                  <Flex alignItems='center' gap='xs'>
                    <Text
                      variant='body'
                      size='m'
                      strength='strong'
                      color='subdued'
                    >
                      {artistCoinDetails.rewardsPoolAddress}
                    </Text>
                    <Tooltip
                      text={overflowMenu.tooltips.rewardsPool}
                      mount='body'
                    >
                      <IconInfo size='s' color='subdued' />
                    </Tooltip>
                  </Flex>
                  <Flex
                    alignItems='center'
                    gap='s'
                    w='100%'
                    css={{ minWidth: 0 }}
                  >
                    <Text variant='body' size='m' userSelect='text'>
                      {shortenSPLAddress(artistCoin.rewardPool.address, 20)}
                    </Text>
                    <IconButton
                      aria-label='Copy rewards pool address'
                      size='s'
                      color='subdued'
                      icon={IconCopy}
                      onClick={handleCopyRewardsPoolAddress}
                    />
                  </Flex>
                </Flex>
              ) : null}
            </Flex>
          </>
        ) : null}

        <Flex w='100%' alignSelf='stretch' pt='m' css={{ flexShrink: 0 }}>
          <Button variant='primary' onClick={onClose} fullWidth>
            {artistCoinDetails.close}
          </Button>
        </Flex>
      </Flex>
    </ResponsiveModal>
  )
}

export type TokenDetailsStatsSectionProps = Partial<
  Pick<
    Coin,
    | 'totalSupply'
    | 'marketCap'
    | 'price'
    | 'liquidity'
    | 'displayPrice'
    | 'displayMarketCap'
  >
>

export const convertCoinGeckoResponseToStatsDetailsProps = (
  coingeckoResponse?: CoinGeckoCoinResponse
): TokenDetailsStatsSectionProps => {
  if (!coingeckoResponse || !coingeckoResponse.market_data) {
    return {}
  }
  return {
    totalSupply: coingeckoResponse.market_data.total_supply,
    displayMarketCap: coingeckoResponse.market_data.market_cap.usd,
    displayPrice: coingeckoResponse.market_data.current_price.usd,
    liquidity: coingeckoResponse.market_data.total_volume.usd
  }
}
