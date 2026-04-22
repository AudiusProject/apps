import { MouseEvent } from 'react'

import {
  useStems,
  useTrack,
  useTrackByPermalink,
  useUser
} from '@audius/common/api'
import { useDownloadableContentAccess } from '@audius/common/hooks'
import { ModalSource, ID, SquareSizes } from '@audius/common/models'
import {
  useDownloadTrackArchiveModal,
  usePremiumContentPurchaseModal,
  PurchaseableContentType
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import {
  Box,
  Button,
  Flex,
  IconReceive,
  Paper,
  PlainButton,
  Text
} from '@audius/harmony'

import { UserLink } from 'components/link/UserLink'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

const messages = {
  heading: 'STEMS & DOWNLOADS',
  publicFree: 'Public Free',
  unlockAll: (price: string) => `Unlock All ${price}`,
  downloadAll: 'Download All',
  stemsCount: (n: number) => (n === 1 ? '1 Stem' : `${n} Stems`)
}

type ContestStemsCardProps = {
  trackId: ID
}

/**
 * Figma-aligned Stems & Downloads card for the contest page
 * (reference: node 2857-102408). Replaces the plain track-page
 * `DownloadSection` header with an enriched preview row — artwork
 * thumbnail on the left, access label ("Public Free" / "Unlock All
 * $X") + track display name + artist badges in the middle, and an
 * expand chevron on the right. A bottom row surfaces the stems
 * count as a chip alongside a "Download All ↓" PlainButton. The
 * actual expand body reuses the shared DownloadSection so we keep
 * the access-gated stems list + download flow — the Figma-specific
 * chrome lives only in the collapsed header.
 */
export const ContestStemsCard = ({ trackId }: ContestStemsCardProps) => {
  const { data: track } = useTrack(trackId)
  const { data: artist } = useUser(track?.owner_id)
  const { data: stems = [] } = useStems(trackId)
  const { imageUrl: coverArtUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })
  const { price, shouldDisplayPremiumDownloadLocked } =
    useDownloadableContentAccess({ trackId })
  const formattedPrice = price ? USDC(price / 100).toLocaleString() : undefined

  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const { onOpen: openDownloadTrackArchiveModal } =
    useDownloadTrackArchiveModal()

  const stemsCount = stems.length

  const handleDownloadAll = useRequiresAccountCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (!track) return
      openDownloadTrackArchiveModal({
        trackId,
        // DownloadSection counts the parent track when it's marked
        // downloadable; mirror that here so the modal shows the
        // same file count.
        fileCount: stemsCount + (track.is_downloadable ? 1 : 0)
      })
    },
    [openDownloadTrackArchiveModal, trackId, stemsCount, track]
  )

  const handleUnlockAll = useRequiresAccountCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      openPremiumContentPurchaseModal(
        { contentId: trackId, contentType: PurchaseableContentType.TRACK },
        { source: ModalSource.TrackDetails }
      )
    },
    [openPremiumContentPurchaseModal, trackId]
  )

  if (!track || !artist) return null

  const accessLabel =
    shouldDisplayPremiumDownloadLocked && formattedPrice
      ? messages.unlockAll(formattedPrice)
      : messages.publicFree

  return (
    <Paper
      direction='column'
      borderRadius='m'
      border='default'
      backgroundColor='white'
      shadow='flat'
      css={{ overflow: 'hidden' }}
    >
      {/* STEMS & DOWNLOADS label + enriched content row, both inside
          the Paper. Label sits in the top padding slot, content below
          with a divider between. */}
      <Box pt='l' ph='l'>
        <Text variant='label' size='m' color='subdued'>
          {messages.heading}
        </Text>
      </Box>
      <Flex direction='column'>
        {/* Header row: artwork + label/name. No expand affordance —
            the card is a stems summary + Download All; per-file
            granular download lives on the track page proper for now. */}
        <Flex p='l' gap='m' alignItems='flex-start'>
          <Box
            w={64}
            h={64}
            css={{
              borderRadius: 'var(--harmony-unit-2, 8px)',
              backgroundImage: coverArtUrl ? `url(${coverArtUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'var(--harmony-background-surface-2, #EEE)',
              flexShrink: 0
            }}
          />
          <Flex direction='column' gap='2xs' css={{ flex: 1, minWidth: 0 }}>
            <Text variant='label' size='s' color='default' strength='strong'>
              {accessLabel}
            </Text>
            <UserLink userId={artist.user_id} />
          </Flex>
        </Flex>

        {/* Bottom row: stems count chip + Download All / Unlock All action */}
        <Flex
          ph='l'
          pb='l'
          gap='m'
          justifyContent='space-between'
          alignItems='center'
        >
          {stemsCount > 0 ? (
            <Box
              ph='m'
              pv='xs'
              borderRadius='2xl'
              css={{
                backgroundColor: 'var(--harmony-background-surface-2, #F2F2F4)'
              }}
            >
              <Text variant='label' size='s' color='default' strength='strong'>
                {messages.stemsCount(stemsCount)}
              </Text>
            </Box>
          ) : (
            <Box />
          )}
          {shouldDisplayPremiumDownloadLocked && formattedPrice ? (
            <Button
              size='small'
              variant='primary'
              color='lightGreen'
              onClick={handleUnlockAll}
            >
              {messages.unlockAll(formattedPrice)}
            </Button>
          ) : (
            <PlainButton
              variant='default'
              iconRight={IconReceive}
              onClick={handleDownloadAll}
            >
              {messages.downloadAll}
            </PlainButton>
          )}
        </Flex>
      </Flex>
    </Paper>
  )
}

type ContestStemsCardFromPermalinkProps = {
  permalink: string | null | undefined
}

export const ContestStemsCardFromPermalink = ({
  permalink
}: ContestStemsCardFromPermalinkProps) => {
  const { data: track } = useTrackByPermalink(permalink ?? null)
  if (!track) return null
  return <ContestStemsCard trackId={track.track_id} />
}
