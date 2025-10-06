import { useCallback } from 'react'

import { useArtistCoin, useCurrentUserId, useUser } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { useArtistCoinDetailsModal } from '@audius/common/store'
import { route, makeXShareUrl } from '@audius/common/utils'
import Clipboard from '@react-native-clipboard/clipboard'
import { Linking } from 'react-native'

import {
  IconCopy,
  IconExternalLink,
  IconInfo,
  IconX
} from '@audius/harmony-native'
import ActionDrawer, {
  type ActionDrawerRow
} from 'app/components/action-drawer/ActionDrawer'
import { useDrawer } from 'app/hooks/useDrawer'
import { useToast } from 'app/hooks/useToast'

const messages = coinDetailsMessages.overflowMenu

export const AssetInsightsOverflowMenu = () => {
  const { data: drawerData } = useDrawer('AssetInsightsOverflowMenu')
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

  const handleOpenDexscreener = useCallback(() => {
    if (artistCoin?.mint) {
      Linking.openURL(`https://dexscreener.com/solana/${artistCoin.mint}`)
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
      icon: <IconCopy color='accent' />,
      callback: handleCopyCoinAddress
    },
    {
      text: messages.openDexscreener,
      icon: <IconExternalLink color='accent' />,
      callback: handleOpenDexscreener
    },
    {
      text: messages.details,
      icon: <IconInfo color='accent' />,
      callback: handleOpenDetails
    },
    {
      text: messages.shareToX,
      icon: <IconX color='accent' />,
      callback: handleShareToX
    }
  ]

  // Don't render if no artist coin data
  if (!artistCoin?.mint) {
    return null
  }

  return <ActionDrawer drawerName='AssetInsightsOverflowMenu' rows={rows} />
}
