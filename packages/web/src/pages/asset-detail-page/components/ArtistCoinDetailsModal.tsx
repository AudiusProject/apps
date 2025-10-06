import type { Coin } from '@audius/common/adapters'
import {
  useArtistCoin,
  useCoinGeckoCoin,
  useUser,
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

import { env } from 'services/env'

import { TokenIcon } from '../../../components/buy-sell-modal/TokenIcon'
import ResponsiveModal from '../../../components/modal/ResponsiveModal'
import { TokenInfoRow } from '../../artist-coins-launchpad-page/components/TokenInfoRow'
import { LAUNCHPAD_COIN_DESCRIPTION } from '../../artist-coins-launchpad-page/constants'

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
  const { data: artistHandle } = useUser(artistCoin?.ownerId, {
    select: (user) => user.handle
  })
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
      <Flex
        direction='column'
        gap='l'
        p='l'
        css={{ overflowY: 'auto', maxHeight: '100%' }}
      >
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
                ${artistCoin?.ticker}
              </Text>
            </Flex>
          </Flex>
        </Flex>

        <Divider />

        {/* Coin Address */}
        {artistCoin?.mint ? (
          <TokenInfoRow
            label={artistCoinDetails.coinAddress}
            value={artistCoin.mint}
            hasTooltip
            tooltipContent={artistCoinDetails.tooltips.coinAddress}
            variant='block'
          />
        ) : null}

        {/* On-Chain Description */}
        {artistCoin?.ticker && artistHandle ? (
          <TokenInfoRow
            label={artistCoinDetails.onChainDescription}
            value={LAUNCHPAD_COIN_DESCRIPTION(artistHandle, artistCoin.ticker)}
            hasTooltip
            tooltipContent={artistCoinDetails.tooltips.onChainDescription}
            variant='block'
          />
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
    | 'totalSupply'
    | 'marketCap'
    | 'price'
    | 'liquidity'
    | 'circulatingSupply'
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
    marketCap: coingeckoResponse.market_data.market_cap.usd,
    price: coingeckoResponse.market_data.current_price.usd,
    liquidity: coingeckoResponse.market_data.total_volume.usd
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

      {props?.displayMarketCap ? (
        <TokenInfoRow
          label={artistCoinDetails.marketCap}
          value={`$${props.displayMarketCap.toLocaleString()}`}
          hasTooltip
          tooltipContent={artistCoinDetails.tooltips.marketCap}
          variant='block'
        />
      ) : null}

      {props?.displayPrice ? (
        <TokenInfoRow
          label={artistCoinDetails.price}
          value={formatCurrencyWithSubscript(props.displayPrice)}
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
    </Flex>
  )
}
