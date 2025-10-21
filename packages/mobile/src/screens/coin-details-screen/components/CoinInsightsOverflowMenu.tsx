import { useCallback } from 'react'

import { useArtistCoin, useCurrentUserId, useUser } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { useArtistCoinDetailsModal } from '@audius/common/store'
import { route, makeXShareUrl } from '@audius/common/utils'
import Clipboard from '@react-native-clipboard/clipboard'
import { Linking } from 'react-native'

import ActionDrawer, {
  type ActionDrawerRow
} from 'app/components/action-drawer/ActionDrawer'
import { useDrawer } from 'app/hooks/useDrawer'
import { useToast } from 'app/hooks/useToast'

const messages = coinDetailsMessages.overflowMenu

export const CoinInsightsOverflowMenu = () => {
  const { data: drawerData } = useDrawer('CoinInsightsOverflowMenu')
  const mint = drawerData?.mint
  const { data: artistCoin } = useArtistCoin(mint)
  const { data: currentUserId } = useCurrentUserId()
  const { data: artist } = useUser(artistCoin?.ownerId)
  const { toast } = useToast()
  const { onOpen: openArtistCoinDetailsModal } = useArtistCoinDetailsModal()

  const handleCopyCoinAddress = useCallback(() => {
    if (artistCoin?.mint) {
      Clipboard.setString(artistCoin.mint)
      toast({ content: messages.copiedToClipboard, type: 'info' })
    }
  }, [artistCoin?.mint, toast])

  const handleOpenBirdeye = useCallback(() => {
    if (artistCoin?.mint) {
      Linking.openURL(`https://birdeye.com/solana/${artistCoin.mint}`)
    }
  }, [artistCoin?.mint])

  const handleOpenDetails = useCallback(() => {
    if (mint) {
      openArtistCoinDetailsModal({ mint, isOpen: true })
    }
  }, [mint, openArtistCoinDetailsModal])

  const handleShareToX = useCallback(async () => {
    if (!artistCoin?.ticker || !artistCoin?.mint || !artist?.handle) return

    const isArtistOwner = currentUserId === artistCoin.ownerId
    const coinUrl = `https://audius.co${route.coinPage(artistCoin.ticker)}`

    const shareText = isArtistOwner
      ? messages.shareToXArtistCopy(artistCoin.ticker, artistCoin.mint)
      : messages.shareToXUserCopy(
          artistCoin.ticker,
          artist.handle,
          artistCoin.mint
        )

    const xShareUrl = makeXShareUrl(coinUrl, shareText)

    const isSupported = await Linking.canOpenURL(xShareUrl)
    if (isSupported) {
      Linking.openURL(xShareUrl)
    } else {
      console.error(`Can't open: ${xShareUrl}`)
    }
  }, [artistCoin, currentUserId, artist])

  const rows: ActionDrawerRow[] = [
    {
      text: messages.copyCoinAddress,
      callback: handleCopyCoinAddress
    },
    {
      text: messages.openBirdeye,
      callback: handleOpenBirdeye
    },
    {
      text: messages.details,
      callback: handleOpenDetails
    },
    {
      text: messages.shareToX,
      callback: handleShareToX
    }
  ]

  // Don't render if no artist coin data
  if (!artistCoin?.mint) {
    return null
  }

  return <ActionDrawer drawerName='CoinInsightsOverflowMenu' rows={rows} />
}
