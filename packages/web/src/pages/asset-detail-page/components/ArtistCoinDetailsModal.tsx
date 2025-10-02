import {
  useArtistCoin,
  useCoinGeckoCoin,
  type CoinGeckoCoinResponse
} from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { formatCurrencyWithSubscript } from '@audius/common/utils'
import {
  Flex,
  Text,
  Divider,
  IconInfo,
  Button,
  useTheme
} from '@audius/harmony'
import type { Coin } from '@audius/sdk'

import { env } from 'services/env'

import { TokenIcon } from '../../../components/buy-sell-modal/TokenIcon'
import ResponsiveModal from '../../../components/modal/ResponsiveModal'
import { TokenInfoRow } from '../../artist-coins-launchpad-page/components/TokenInfoRow'

const { artistCoinDetails } = coinDetailsMessages

type ArtistCoinDetailsModalProps = {
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

export const ArtistCoinDetailsModal = ({
  isOpen,
  onClose,
  mint
}: ArtistCoinDetailsModalProps) => {
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS
  const { spacing } = useTheme()
  const { data: artistCoin } = useArtistCoin(mint)
  const { data: coingeckoResponse } = useCoinGeckoCoin(
    { coinId: 'audius' },
    { enabled: isAudio }
  )

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={artistCoinDetails.details}
      Icon={IconInfo}
      size='s'
      isFullscreen
    >
      <Flex direction='column' gap='l' p='l'>
        {/* Token Info Section */}
        <Flex direction='column' gap='m'>
          <Flex alignItems='center' gap='m'>
            {/* Token Icon */}
            <TokenIcon
              logoURI={artistCoin?.logoUri}
              w={spacing['4xl']}
              h={spacing['4xl']}
              hex
            />
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l'>
                {artistCoin?.name}
              </Text>
              <Text variant='body' size='m' color='subdued'>
                {artistCoin?.ticker}
              </Text>
            </Flex>
          </Flex>
        </Flex>

        <Divider />

        {/* Coin Address */}
        {artistCoin?.mint ? (
          <Flex direction='column' gap='xs' w='100%'>
            <Text variant='body' size='m' strength='strong' color='subdued'>
              {artistCoinDetails.coinAddress}
            </Text>
            <Text variant='body' size='m' userSelect='text'>
              {artistCoin.mint}
            </Text>
          </Flex>
        ) : null}

        {/* On-Chain Description */}
        {artistCoin?.description ? (
          <Flex direction='column' gap='xs' w='100%'>
            <Text variant='body' size='m' strength='strong' color='subdued'>
              {artistCoinDetails.onChainDescription}
            </Text>
            <Text variant='body' size='m' userSelect='text'>
              {artistCoin.description}
            </Text>
          </Flex>
        ) : null}

        <Divider />

        {/* Token Details */}
        <TokenDetailsStatsSection
          {...(isAudio
            ? convertCoinGeckoResponseToStatsDetailsProps(coingeckoResponse)
            : artistCoin)}
        />

        {/* Close Button */}
        <Flex direction='column' gap='l' pt='l'>
          <Divider />
          <Button variant='primary' onClick={onClose} fullWidth>
            Close
          </Button>
        </Flex>
      </Flex>
    </ResponsiveModal>
  )
}

export type TokenDetailsStatsSectionProps = Partial<
  Pick<
    Coin,
    'totalSupply' | 'marketCap' | 'price' | 'liquidity' | 'circulatingSupply'
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
    marketCap: coingeckoResponse.market_data.market_cap.usd,
    price: coingeckoResponse.market_data.current_price.usd,
    liquidity: coingeckoResponse.market_data.total_volume.usd,
    circulatingSupply: coingeckoResponse.market_data.circulating_supply
  }
}

const TokenDetailsStatsSection = (props?: TokenDetailsStatsSectionProps) => {
  return (
    <Flex direction='column' gap='m'>
      {props?.totalSupply ? (
        <TokenInfoRow
          label={artistCoinDetails.totalSupply}
          value={props.totalSupply.toLocaleString()}
          hasTooltip
          tooltipContent={artistCoinDetails.tooltips.totalSupply}
          variant='block'
        />
      ) : null}

      {props?.marketCap ? (
        <TokenInfoRow
          label={artistCoinDetails.marketCap}
          value={`$${props.marketCap.toLocaleString()}`}
          hasTooltip
          tooltipContent={artistCoinDetails.tooltips.marketCap}
          variant='block'
        />
      ) : null}

      {props?.price ? (
        <TokenInfoRow
          label={artistCoinDetails.price}
          value={formatCurrencyWithSubscript(props.price)}
          hasTooltip
          tooltipContent={artistCoinDetails.tooltips.price}
          variant='block'
        />
      ) : null}

      {props?.liquidity ? (
        <TokenInfoRow
          label={artistCoinDetails.liquidity}
          value={`$${props.liquidity.toLocaleString()}`}
          hasTooltip
          tooltipContent={artistCoinDetails.tooltips.liquidity}
          variant='block'
        />
      ) : null}

      {props?.circulatingSupply ? (
        <TokenInfoRow
          label={artistCoinDetails.circulatingSupply}
          value={props.circulatingSupply.toLocaleString()}
          hasTooltip
          tooltipContent={artistCoinDetails.tooltips.circulatingSupply}
          variant='block'
        />
      ) : null}
    </Flex>
  )
}
