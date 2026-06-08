import { useCallback } from 'react'

import { useFanClub, useCurrentUserId, useUser } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { useFanClubDetailsModal } from '@audius/common/store'
import { route, makeXShareUrl } from '@audius/common/utils'
import Clipboard from '@react-native-clipboard/clipboard'
import { useNavigation } from '@react-navigation/native'
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
  const navigation = useNavigation()
  const { data: fanClub } = useFanClub(mint)
  const { data: currentUserId } = useCurrentUserId()
  const { data: artist } = useUser(fanClub?.ownerId)
  const { toast } = useToast()
  const { onOpen: openFanClubDetailsModal } = useFanClubDetailsModal()
  const isOwner = currentUserId === fanClub?.ownerId

  const handleCopyCoinAddress = useCallback(() => {
    if (fanClub?.mint) {
      Clipboard.setString(fanClub.mint)
      toast({ content: messages.copiedToClipboard, type: 'info' })
    }
  }, [fanClub?.mint, toast])

  const handleCopyLink = useCallback(() => {
    if (fanClub?.ticker) {
      // TODO: Should figure out a way to make this use the correct domain
      const coinUrl = `https://audius.co${route.coinPage(fanClub.ticker)}`
      Clipboard.setString(coinUrl)
      toast({ content: messages.copiedLinkToClipboard, type: 'info' })
    }
  }, [fanClub?.ticker, toast])

  const handleOpenBirdeye = useCallback(() => {
    if (fanClub?.mint) {
      Linking.openURL(`https://birdeye.so/solana/${fanClub.mint}`)
    }
  }, [fanClub?.mint])

  const handleOpenDetails = useCallback(() => {
    if (mint) {
      openFanClubDetailsModal({ mint, isOpen: true })
    }
  }, [mint, openFanClubDetailsModal])

  const handleShareToX = useCallback(async () => {
    if (!fanClub?.ticker || !fanClub?.mint || !artist?.handle) return

    const isArtistOwner = currentUserId === fanClub.ownerId
    const coinUrl = `https://audius.co${route.coinPage(fanClub.ticker)}`

    const shareText = isArtistOwner
      ? messages.shareToXArtistCopy(fanClub.ticker, fanClub.mint)
      : messages.shareToXUserCopy(fanClub.ticker, artist.handle, fanClub.mint)

    const xShareUrl = makeXShareUrl(coinUrl, shareText)

    const isSupported = await Linking.canOpenURL(xShareUrl)
    if (isSupported) {
      Linking.openURL(xShareUrl)
    } else {
      console.error(`Can't open: ${xShareUrl}`)
    }
  }, [fanClub, currentUserId, artist])

  const handleEditCoin = useCallback(() => {
    if (fanClub?.ticker) {
      const nav = (navigation as any).navigate
      nav('EditCoinDetailsScreen', { ticker: fanClub.ticker })
    }
  }, [fanClub, navigation])

  const rows: ActionDrawerRow[] = [
    ...(isOwner ? [{ text: messages.editCoin, callback: handleEditCoin }] : []),
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
    },
    {
      text: messages.copyLink,
      callback: handleCopyLink
    }
  ]

  // Don't render if no fan club data
  if (!fanClub?.mint) {
    return null
  }

  return <ActionDrawer drawerName='CoinInsightsOverflowMenu' rows={rows} />
}
