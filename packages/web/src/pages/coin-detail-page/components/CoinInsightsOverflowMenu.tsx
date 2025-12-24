import { useCallback, useContext, useState } from 'react'

import { useArtistCoin, useCurrentUserId, useUser } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { COIN_DETAIL_MOBILE_WEB_ROUTE } from '@audius/common/src/utils/route'
import { route } from '@audius/common/utils'
import {
  PopupMenu,
  PopupMenuItem,
  IconCopy,
  IconExternalLink,
  IconButton,
  IconKebabHorizontal,
  IconInfo,
  IconX,
  IconLink
} from '@audius/harmony'
import { useNavigate } from 'react-router'

import ActionDrawer from 'components/action-drawer/ActionDrawer'
import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { env } from 'services/env'

import {
  copyLinkToClipboard,
  copyToClipboard,
  getCopyableLink
} from '../../../utils/clipboardUtil'
import { openXLink } from '../../../utils/xShare'

import { ArtistCoinDetailsModal } from './ArtistCoinDetailsModal'

// Mobile route helper function
const coinDetailMobilePage = (ticker: string) =>
  COIN_DETAIL_MOBILE_WEB_ROUTE.replace(
    ':ticker',
    ticker.startsWith('$') ? ticker.slice(1) : ticker
  )

const messages = coinDetailsMessages.overflowMenu

type CoinInsightsOverflowMenuProps = {
  /**
   * The mint address of the artist coin
   */
  mint: string
}

export const CoinInsightsOverflowMenu = ({
  mint
}: CoinInsightsOverflowMenuProps) => {
  const navigate = useNavigate()
  const { toast } = useContext(ToastContext)
  const { data: artistCoin } = useArtistCoin(mint)
  const { data: currentUserId } = useCurrentUserId()
  const { data: artist } = useUser(artistCoin?.ownerId)
  const isMobile = useIsMobile()
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isMobileOverflowOpen, setIsMobileOverflowOpen] = useState(false)

  const isAudio = artistCoin?.mint === env.WAUDIO_MINT_ADDRESS

  const onCopyCoinAddress = () => {
    if (artistCoin?.mint) {
      copyToClipboard(artistCoin.mint)
      toast(messages.copiedToClipboard)
    }
  }

  const onCopyLink = () => {
    if (artistCoin?.ticker) {
      copyLinkToClipboard(route.coinPage(artistCoin.ticker))
      toast(messages.copiedLinkToClipboard)
    }
  }

  const onOpenBirdeye = () => {
    if (artistCoin?.mint) {
      window.open(
        route.birdeyeUrl(
          isAudio ? env.ETH_TOKEN_ADDRESS : artistCoin.mint,
          isAudio ? 'ethereum' : 'solana'
        ),
        '_blank',
        'noopener,noreferrer'
      )
    }
  }

  const onOpenDetails = () => {
    if (isMobile) {
      if (artistCoin?.ticker) {
        navigate(coinDetailMobilePage(artistCoin.ticker))
      }
    } else {
      setIsDetailsModalOpen(true)
    }
  }

  const onShareToX = () => {
    if (!artistCoin?.ticker || !artistCoin?.mint || !artist?.handle) return

    const isArtistOwner = currentUserId === artistCoin.ownerId
    const coinUrl = getCopyableLink(route.coinPage(artistCoin.ticker))

    const shareText = isArtistOwner
      ? messages.shareToXArtistCopy(artistCoin.ticker, artistCoin.mint)
      : messages.shareToXUserCopy(
          artistCoin.ticker,
          artist.handle,
          artistCoin.mint
        )

    openXLink(coinUrl, shareText)
  }
  const onOpenMobileOverflow = useCallback(() => {
    setIsMobileOverflowOpen(true)
  }, [setIsMobileOverflowOpen])

  const onCloseMobileOverflow = useCallback(() => {
    setIsMobileOverflowOpen(false)
  }, [setIsMobileOverflowOpen])

  const menuItems: PopupMenuItem[] = [
    {
      text: messages.copyCoinAddress,
      icon: <IconCopy color='default' />,
      onClick: onCopyCoinAddress
    },
    {
      text: messages.openBirdeye,
      icon: <IconExternalLink color='default' />,
      onClick: onOpenBirdeye
    },
    {
      text: messages.details,
      icon: <IconInfo color='default' />,
      onClick: onOpenDetails
    },
    ...(isAudio
      ? []
      : [
          {
            text: messages.shareToX,
            icon: <IconX color='default' />,
            onClick: onShareToX
          }
        ]),
    {
      text: messages.copyLink,
      icon: <IconLink color='default' />,
      onClick: onCopyLink
    }
  ]

  // Don't render if no artist coin data
  if (!artistCoin?.mint) {
    return null
  }

  if (isMobile) {
    return (
      <>
        <IconButton
          icon={IconKebabHorizontal}
          onClick={onOpenMobileOverflow}
          aria-label='More options'
        />
        <ActionDrawer
          actions={menuItems.map((item) => ({
            text: item.text as string,
            icon: item.icon,
            onClick: (e) => {
              // @ts-ignore - Element vs HTMLElement
              item.onClick?.(e)
              onCloseMobileOverflow()
            }
          }))}
          isOpen={isMobileOverflowOpen}
          onClose={onCloseMobileOverflow}
        />
      </>
    )
  }

  return (
    <>
      <PopupMenu
        items={menuItems}
        renderTrigger={(anchorRef, triggerPopup, triggerProps) => (
          <IconButton
            ref={anchorRef}
            icon={IconKebabHorizontal}
            onClick={() => triggerPopup()}
            aria-label='More options'
            size='l'
            ripple
          />
        )}
      />

      <ArtistCoinDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        mint={mint}
      />
    </>
  )
}
