import {
  useArtistCoinByTicker,
  useCoinGeckoCoin,
  useUser
} from '@audius/common/api'
import {
  formatTickerForUrl,
  formatCurrencyWithSubscript
} from '@audius/common/utils'
import { FixedDecimal } from '@audius/fixed-decimal'
import { Divider, Flex, Text, useTheme } from '@audius/harmony'
import { useLocation } from 'react-router-dom-v5-compat'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { UserGeneratedTextV2 } from 'components/user-generated-text/UserGeneratedTextV2'
import { TokenInfoRow } from 'pages/artist-coins-launchpad-page/components'
import { LAUNCHPAD_COIN_DESCRIPTION } from 'pages/artist-coins-launchpad-page/constants'

import {
  convertCoinGeckoResponseToStatsDetailsProps,
  type TokenDetailsStatsSectionProps
} from '../ArtistCoinDetailsModal'

const messages = {
  details: 'Details',
  unknown: 'Unknown',
  unknownToken: 'Unknown Token',
  unknownTicker: 'UNKNOWN',
  coinAddress: 'Coin Address',
  onChainDescription: 'On-Chain Description',
  totalSupply: 'Total Supply',
  marketCap: 'Market Cap',
  price: 'Current Price',
  liquidity: 'Liquidity',
  circulatingSupply: 'Circulating Supply'
}

const tooltipContent = {
  totalSupply:
    'The total number of your Artist Coins that will ever exist. This amount is fixed and never changes.',
  marketCap:
    'The current total value of all your Artist Coins in circulation, calculated by multiplying the current price by the total supply.',
  price: 'The current price of a single artist coin in USD.',
  liquidity:
    'The amount of funds available for trading your artist coin, which affects how easily it can be bought or sold.',
  circulatingSupply:
    'The number of Artist Coins currently available for trading, excluding any tokens that are locked or reserved.'
}

export const ArtistCoinDetailsPage = () => {
  const location = useLocation()
  // Locations should be in the format /coins/:ticker/details (COIN_DETAIL_MOBILE_WEB_ROUTE)
  const ticker = location.pathname.split('/')[2]
  const { data: artistCoin } = useArtistCoinByTicker({
    ticker
  })
  const { data: artist } = useUser(artistCoin?.ownerId)
  const { spacing } = useTheme()
  const isAudio = formatTickerForUrl(ticker) === 'AUDIO'
  const { data: coingeckoResponse } = useCoinGeckoCoin(
    { coinId: 'audius' },
    { enabled: isAudio }
  )

  return (
    <MobilePageContainer fullHeight>
      <Flex column w='100%' backgroundColor='white'>
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
                  {artistCoin?.name ?? messages.unknownToken}
                </Text>
                <Text
                  variant={artistCoin?.name ? 'body' : 'title'}
                  size={artistCoin?.name ? 'm' : 'l'}
                  color={artistCoin?.name ? 'subdued' : 'default'}
                >
                  {artistCoin?.ticker ?? messages.unknownTicker}
                </Text>
              </Flex>
            </Flex>
          </Flex>

          <Divider />

          {/* Coin Address */}
          <Flex direction='column' gap='xs'>
            <Text variant='label' size='s' color='subdued'>
              {messages.coinAddress}
            </Text>
            <Text variant='body' size='s' color='default'>
              {artistCoin?.mint ?? messages.unknown}
            </Text>
          </Flex>

          {/* On-Chain Description */}
          <Flex direction='column' gap='xs'>
            <Text variant='label' size='s'>
              {messages.onChainDescription}
            </Text>
            <UserGeneratedTextV2 variant='body' size='s' color='default'>
              {LAUNCHPAD_COIN_DESCRIPTION(
                artist?.handle ?? '',
                artistCoin?.ticker ?? ''
              )}
            </UserGeneratedTextV2>
          </Flex>

          <Divider />

          {/* Token Details */}
          <TokenDetailsStatsSection
            {...(isAudio
              ? convertCoinGeckoResponseToStatsDetailsProps(coingeckoResponse)
              : artistCoin)}
          />
        </Flex>
      </Flex>
    </MobilePageContainer>
  )
}

const TokenDetailsStatsSection = (props?: TokenDetailsStatsSectionProps) => {
  return (
    <Flex direction='column' gap='m'>
      <TokenInfoRow
        label={messages.totalSupply}
        value={
          props?.totalSupply
            ? new FixedDecimal(props.totalSupply.toString(), 0).toLocaleString()
            : messages.unknown
        }
        hasTooltip
        tooltipContent={tooltipContent.totalSupply}
        variant='block'
      />

      <TokenInfoRow
        label={messages.marketCap}
        value={
          props?.displayMarketCap
            ? `$${new FixedDecimal(props.displayMarketCap.toString(), 2).toLocaleString()}`
            : messages.unknown
        }
        hasTooltip
        tooltipContent={tooltipContent.marketCap}
        variant='block'
      />

      <TokenInfoRow
        label={messages.price}
        value={
          props?.displayPrice
            ? formatCurrencyWithSubscript(props.displayPrice)
            : messages.unknown
        }
        hasTooltip
        tooltipContent={tooltipContent.price}
        variant='block'
      />

      <TokenInfoRow
        label={messages.liquidity}
        value={
          props?.liquidity
            ? `$${new FixedDecimal(props.liquidity.toString(), 2).toLocaleString()}`
            : messages.unknown
        }
        hasTooltip
        tooltipContent={tooltipContent.liquidity}
        variant='block'
      />

      <TokenInfoRow
        label={messages.circulatingSupply}
        value={
          props?.circulatingSupply
            ? new FixedDecimal(
                props.circulatingSupply.toString(),
                0
              ).toLocaleString()
            : messages.unknown
        }
        hasTooltip
        tooltipContent={tooltipContent.circulatingSupply}
        variant='block'
      />
    </Flex>
  )
}
