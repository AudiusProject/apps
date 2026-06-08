import { useCallback, useContext, useState } from 'react'

import { useFanClub, useCurrentUserId, useUser } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { COIN_DETAIL_MOBILE_WEB_ROUTE } from '@audius/common/src/utils/route'
import { route } from '@audius/common/utils'
import {
  PopupMenu,
  PopupMenuItem,
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
  getCopyableLink
} from '../../../utils/clipboardUtil'
import { openXLink } from '../../../utils/xShare'

import { ArtistFanClubDetailsModal } from './ArtistFanClubDetailsModal'

// Mobile route helper function
const coinDetailMobilePage = (ticker: string) =>
  COIN_DETAIL_MOBILE_WEB_ROUTE.replace(
    ':ticker',
    ticker.startsWith('$') ? ticker.slice(1) : ticker
  )

const messages = coinDetailsMessages.overflowMenu

type FanClubInsightsOverflowMenuProps = {
  /**
   * The mint address of the fan club
   */
  mint: string
}

export const FanClubInsightsOverflowMenu = ({
  mint
}: FanClubInsightsOverflowMenuProps) => {
  const navigate = useNavigate()
  const { toast } = useContext(ToastContext)
  const { data: fanClub } = useFanClub(mint)
  const { data: currentUserId } = useCurrentUserId()
  const { data: artist } = useUser(fanClub?.ownerId)
  const isMobile = useIsMobile()
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isMobileOverflowOpen, setIsMobileOverflowOpen] = useState(false)

  const isAudio = fanClub?.mint === env.WAUDIO_MINT_ADDRESS

  const onCopyLink = () => {
    if (fanClub?.ticker) {
      copyLinkToClipboard(route.coinPage(fanClub.ticker))
      toast(messages.copiedLinkToClipboard)
    }
  }

  const onOpenBirdeye = () => {
    if (fanClub?.mint) {
      window.open(
        route.birdeyeUrl(
          isAudio ? env.ETH_TOKEN_ADDRESS : fanClub.mint,
          isAudio ? 'ethereum' : 'solana'
        ),
        '_blank',
        'noopener,noreferrer'
      )
    }
  }

  const onOpenDetails = () => {
    if (isMobile) {
      if (fanClub?.ticker) {
        navigate(coinDetailMobilePage(fanClub.ticker))
      }
    } else {
      setIsDetailsModalOpen(true)
    }
  }

  const onShareToX = () => {
    if (!fanClub?.ticker || !fanClub?.mint || !artist?.handle) return

    const isArtistOwner = currentUserId === fanClub.ownerId
    const coinUrl = getCopyableLink(route.coinPage(fanClub.ticker))

    const shareText = isArtistOwner
      ? messages.shareToXArtistCopy(fanClub.ticker, fanClub.mint)
      : messages.shareToXUserCopy(fanClub.ticker, artist.handle, fanClub.mint)

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

  // Don't render if no fan club data
  if (!fanClub?.mint) {
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

      <ArtistFanClubDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        mint={mint}
      />
    </>
  )
}
