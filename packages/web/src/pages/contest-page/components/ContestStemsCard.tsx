import { MouseEvent, useCallback, useState } from 'react'

import {
  useCurrentUserId,
  useEventFollowState,
  useFileSizes,
  useFollowEvent,
  useRemixContest,
  useStems,
  useTrack,
  useTrackByPermalink,
  useUser
} from '@audius/common/api'
import { useDownloadableContentAccess } from '@audius/common/hooks'
import {
  DownloadQuality,
  ModalSource,
  ID,
  SquareSizes,
  stemCategoryFriendlyNames
} from '@audius/common/models'
import {
  usePremiumContentPurchaseModal,
  useWaitForDownloadModal,
  PurchaseableContentType
} from '@audius/common/store'
import { formatBytes } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconButton,
  IconCaretDown,
  IconReceive,
  Paper,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony'
import { useLinkClickHandler } from 'react-router'

import { UserLink } from 'components/link/UserLink'
import { useDownloadTrackStemsZip } from 'hooks/useDownloadTrackStemsZip'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

const messages = {
  heading: 'STEMS & DOWNLOADS',
  downloadHeading: 'DOWNLOAD',
  publicFree: 'Public Free',
  unlockAll: (price: string) => `Unlock All ${price}`,
  download: 'Download',
  downloadAll: 'Download All',
  stemsCount: (n: number) => (n === 1 ? '1 Stem' : `${n} Stems`),
  fullTrack: 'Full Track',
  downloadStem: 'Download stem'
}

type ContestStemsCardProps = {
  trackId: ID
}

export const ContestStemsCard = ({ trackId }: ContestStemsCardProps) => {
  const { color } = useTheme()
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
  const downloadStemsZip = useDownloadTrackStemsZip(trackId)
  const { onOpen: openWaitForDownloadModal } = useWaitForDownloadModal()

  const { data: contest } = useRemixContest(trackId)
  const contestEventId = contest?.eventId
  const { data: currentUserId } = useCurrentUserId()
  const { data: followState } = useEventFollowState(contestEventId)
  const { mutate: followEvent } = useFollowEvent()

  const followContestIfNeeded = useCallback(() => {
    if (!contestEventId || !currentUserId) return
    if (followState?.isFollowed) return
    followEvent({ userId: currentUserId, eventId: contestEventId })
  }, [contestEventId, currentUserId, followState?.isFollowed, followEvent])

  const stemsCount = stems.length
  const hasStems = stemsCount > 0
  const STEMS_COLLAPSE_THRESHOLD = 5
  const stemsBelowThreshold = stemsCount <= STEMS_COLLAPSE_THRESHOLD
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null)
  const expanded = hasStems && (expandedOverride ?? stemsBelowThreshold)
  const heading = hasStems ? messages.heading : messages.downloadHeading
  const setExpanded = (next: boolean | ((prev: boolean) => boolean)) => {
    setExpandedOverride((prev) => {
      const current = prev ?? stemsBelowThreshold
      return typeof next === 'function' ? next(current) : next
    })
  }

  const { data: fileSizes } = useFileSizes(
    {
      trackIds: [trackId, ...stems.map((s) => s.track_id)],
      downloadQuality: DownloadQuality.ORIGINAL
    },
    { enabled: stems.length > 0 || !!track?.is_downloadable }
  )

  const handleDownloadAll = useRequiresAccountCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (!track) return
      followContestIfNeeded()
      downloadStemsZip()
    },
    [followContestIfNeeded, downloadStemsZip, track]
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

  const handleDownloadOne = useRequiresAccountCallback(
    (downloadTrackId: ID) => {
      followContestIfNeeded()
      openWaitForDownloadModal({
        trackIds: [downloadTrackId],
        quality: DownloadQuality.ORIGINAL
      })
    },
    [followContestIfNeeded, openWaitForDownloadModal]
  )

  const handleNavigate = useLinkClickHandler<HTMLDivElement>(
    track?.permalink ?? ''
  )
  const handleRowClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (track?.permalink) handleNavigate(e)
    },
    [handleNavigate, track?.permalink]
  )

  if (!track || !artist) return null

  type StemRow = {
    trackId: ID
    title: string
    subtitle: string
    size?: number
  }
  const rows: StemRow[] = []
  if (track.is_downloadable) {
    rows.push({
      trackId: track.track_id,
      title: messages.fullTrack,
      subtitle: track.orig_filename ?? '',
      size: fileSizes?.[track.track_id]?.[DownloadQuality.ORIGINAL]
    })
  }
  stems.forEach((stem) => {
    const friendly = stem.stem_of?.category
      ? stemCategoryFriendlyNames[stem.stem_of.category]
      : ''
    rows.push({
      trackId: stem.track_id,
      title: friendly || stem.title || '',
      subtitle: stem.orig_filename ?? '',
      size: fileSizes?.[stem.track_id]?.[DownloadQuality.ORIGINAL]
    })
  })

  return (
    <Paper
      direction='column'
      borderRadius='m'
      border='default'
      backgroundColor='white'
      shadow='flat'
      css={{ overflow: 'hidden' }}
    >
      {/* Label — sits in top padding slot, matches FOLLOWERS and
          COMMENTS tiles. */}
      <Box pt='l' ph='l'>
        <Text variant='label' size='m' color='subdued'>
          {heading}
        </Text>
      </Box>

      {/* Collapsed summary row. Whole row is a click target → track
          page, except the caret island which toggles expansion. */}
      <Flex direction='column'>
        <Flex
          p='l'
          gap='m'
          alignItems='center'
          role='button'
          tabIndex={0}
          onClick={handleRowClick}
          css={{
            cursor: 'pointer',
            '&:hover .contest-stems-card-title': {
              color: color.primary.primary
            }
          }}
        >
          <Box
            w={64}
            h={64}
            css={{
              borderRadius: 8,
              backgroundImage: coverArtUrl ? `url(${coverArtUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: color.background.surface2,
              flexShrink: 0
            }}
          />
          <Flex direction='column' gap='2xs' css={{ flex: 1, minWidth: 0 }}>
            <Text
              variant='title'
              size='m'
              color='default'
              className='contest-stems-card-title'
              css={{
                transition: 'color var(--harmony-quick)'
              }}
            >
              {track.title}
            </Text>
            <Flex onClick={(e) => e.stopPropagation()}>
              <UserLink userId={artist.user_id} popover size='s' />
            </Flex>
          </Flex>
          {hasStems ? (
            <IconCaretDown
              size='m'
              color='default'
              css={{
                transition: 'transform var(--harmony-expressive)',
                transform: expanded ? 'rotate(-180deg)' : undefined,
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse stems' : 'Expand stems'}
              role='button'
            />
          ) : null}
        </Flex>

        {/* Secondary action row: stems pill + Download All / Unlock
            All. Stop-propagation so clicks here don't navigate. */}
        <Flex
          ph='l'
          pb='l'
          gap='m'
          justifyContent='space-between'
          alignItems='center'
          onClick={(e) => e.stopPropagation()}
        >
          {hasStems ? <StemCountPill count={stemsCount} /> : <Box />}
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
              {hasStems ? messages.downloadAll : messages.download}
            </PlainButton>
          )}
        </Flex>
      </Flex>

      {/* Expanded rows. Each row is numbered, shows the friendly
          stem category as the title + original filename as the
          subtitle, the file size, and a download IconButton on the
          right. Rows are separated by a top border. Matches Figma
          node 2857-95763. */}
      {expanded && rows.length > 0 ? (
        <Box>
          {rows.map((row, i) => (
            <ContestStemDownloadRow
              key={`${row.trackId}-${i}`}
              index={i + 1}
              title={row.title}
              subtitle={row.subtitle}
              size={row.size}
              onDownload={() => handleDownloadOne(row.trackId)}
            />
          ))}
        </Box>
      ) : null}
    </Paper>
  )
}

const StemCountPill = ({ count }: { count: number }) => (
  <Flex
    ph='m'
    pv='2xs'
    alignItems='center'
    justifyContent='center'
    border='default'
    css={{ borderRadius: 999 }}
  >
    <Text variant='body' size='s' color='subdued'>
      {messages.stemsCount(count)}
    </Text>
  </Flex>
)

type ContestStemDownloadRowProps = {
  index: number
  title: string
  subtitle: string
  size?: number
  onDownload: () => void
}

const ContestStemDownloadRow = ({
  index,
  title,
  subtitle,
  size,
  onDownload
}: ContestStemDownloadRowProps) => {
  return (
    <>
      <Divider />
      <Flex
        p='l'
        alignItems='center'
        justifyContent='space-between'
        gap='m'
        role='row'
      >
        {/* Left: number + stacked title / filename */}
        <Flex
          direction='row'
          alignItems='center'
          gap='l'
          css={{ flex: 1, minWidth: 0 }}
        >
          <Text
            variant='body'
            size='s'
            color='subdued'
            css={{ width: 20, flexShrink: 0 }}
          >
            {index}
          </Text>
          <Flex direction='column' gap='2xs' css={{ minWidth: 0, flex: 1 }}>
            <Text variant='title' size='s' color='default'>
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant='body'
                size='s'
                color='subdued'
                css={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </Flex>
        </Flex>
        {/* Right: size + download icon. `formatBytes` mirrors how
            the track-page DownloadRow renders this column. */}
        <Flex alignItems='center' gap='l' css={{ flexShrink: 0 }}>
          {size ? (
            <Text
              variant='body'
              size='s'
              color='subdued'
              css={{ whiteSpace: 'nowrap' }}
            >
              {formatBytes(size)}
            </Text>
          ) : null}
          <IconButton
            icon={IconReceive}
            size='s'
            color='default'
            aria-label={messages.downloadStem}
            onClick={onDownload}
          />
        </Flex>
      </Flex>
    </>
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
