import { useCallback } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { useArtistCoinDetailsModal } from '@audius/common/store'
import { formatCurrencyWithSubscript } from '@audius/common/utils'
import Clipboard from '@react-native-clipboard/clipboard'

import { Flex, Text, Divider, Button, useTheme } from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core'
import Drawer from 'app/components/drawer/Drawer'
import { useToast } from 'app/hooks/useToast'

import { DrawerHeader } from '../drawer/DrawerHeader'

const { artistCoinDetails } = coinDetailsMessages

export const ArtistCoinDetailsDrawer = () => {
  const { spacing } = useTheme()
  const { toast } = useToast()
  const { isOpen, onClose, data: modalData } = useArtistCoinDetailsModal()
  const mint = modalData?.mint
  const { data: artistCoin } = useArtistCoin(mint)

  const handleCopyAddress = useCallback(() => {
    if (artistCoin?.mint) {
      Clipboard.setString(artistCoin.mint)
      toast({ content: artistCoinDetails.copied, type: 'info' })
    }
  }, [artistCoin?.mint, toast])

  if (!artistCoin?.mint) {
    return null
  }

  const renderHeader = () => {
    return (
      <Flex pv='l' ph='xl' gap='m' mb='m'>
        <DrawerHeader onClose={onClose} title={artistCoinDetails.title} />
        <Divider />
      </Flex>
    )
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} drawerHeader={renderHeader}>
      <Flex direction='column' gap='xl' ph='xl'>
        {/* Token Info Section */}
        <Flex direction='column' gap='m'>
          <Flex row alignItems='center' gap='m'>
            {/* Token Icon */}
            <TokenIcon logoURI={artistCoin?.logoUri} size={spacing['4xl']} />
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
          <Flex direction='column' gap='xs'>
            <Text variant='label' size='s' color='subdued'>
              {artistCoinDetails.coinAddress}
            </Text>
            <Text
              variant='body'
              size='s'
              numberOfLines={1}
              ellipsizeMode='middle'
              onPress={handleCopyAddress}
            >
              {artistCoin.mint}
            </Text>
          </Flex>
        ) : null}

        {/* On-Chain Description */}
        {artistCoin?.description ? (
          <Flex direction='column' gap='xs'>
            <Text variant='label' size='s' color='subdued'>
              {artistCoinDetails.onChainDescription}
            </Text>
            <Text variant='body' size='s'>
              {artistCoin.description}
            </Text>
          </Flex>
        ) : null}

        {/* Token Details */}
        <Flex direction='column' gap='m'>
          {artistCoin?.totalSupply ? (
            <Flex direction='column' gap='xs'>
              <Text variant='label' size='s' color='subdued'>
                {artistCoinDetails.totalSupply}
              </Text>
              <Text variant='body' size='s'>
                {artistCoin.totalSupply.toLocaleString()}
              </Text>
            </Flex>
          ) : null}

          {artistCoin?.marketCap ? (
            <Flex direction='column' gap='xs'>
              <Text variant='label' size='s' color='subdued'>
                {artistCoinDetails.marketCap}
              </Text>
              <Text variant='body' size='s'>
                ${artistCoin.marketCap.toLocaleString()}
              </Text>
            </Flex>
          ) : null}

          {artistCoin?.price ? (
            <Flex direction='column' gap='xs'>
              <Text variant='label' size='s' color='subdued'>
                {artistCoinDetails.price}
              </Text>
              <Text variant='body' size='s'>
                {formatCurrencyWithSubscript(artistCoin.price)}
              </Text>
            </Flex>
          ) : null}

          {artistCoin?.liquidity ? (
            <Flex direction='column' gap='xs'>
              <Text variant='label' size='s' color='subdued'>
                {artistCoinDetails.liquidity}
              </Text>
              <Text variant='body' size='s'>
                ${artistCoin.liquidity.toLocaleString()}
              </Text>
            </Flex>
          ) : null}

          {artistCoin?.circulatingSupply ? (
            <Flex direction='column' gap='xs'>
              <Text variant='label' size='s' color='subdued'>
                {artistCoinDetails.circulatingSupply}
              </Text>
              <Text variant='body' size='s'>
                {artistCoin.circulatingSupply.toLocaleString()}
              </Text>
            </Flex>
          ) : null}
        </Flex>

        {/* Close Button */}
        <Button variant='primary' fullWidth onPress={onClose}>
          {artistCoinDetails.close}
        </Button>
      </Flex>
    </Drawer>
  )
}
