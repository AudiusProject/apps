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
  useDownloadTrackArchiveModal,
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

/**
 * Figma-aligned Stems & Downloads card for the contest page.
 *
 * References:
 * - Collapsed + expanded: 2857-95763
 * - Stems count pill: 2857-95741 (outlined, subdued — NOT a filled
 *   surface2 chip; sits on the same background as the card)
 * - Mobile: 2888-128802 (same layout, narrower)
 *
 * Why a custom card instead of reusing the track-page
 * `DownloadSection`: the track-page surface has its own "Stems &
 * Downloads" header chrome, expand caret, and download-all button
 * that collide with the contest card chrome the Figma calls for.
 * Nesting the two added a stray outer title, duplicated carets, and
 * fought the visual hierarchy. The download data itself (stems,
 * file sizes, quality, gating) is shared — we call the same
 * `useStems` / `useFileSizes` / `useWaitForDownloadModal` hooks here
 * so per-stem downloads behave identically to the track page.
 */
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
  const { onOpen: openDownloadTrackArchiveModal } =
    useDownloadTrackArchiveModal()
  const { onOpen: openWaitForDownloadModal } = useWaitForDownloadModal()

  // Auto-follow the contest when a signed-in user kicks off a stem
  // download — downloading a stem is a strong engagement signal that
  // the user wants to participate. Fires on tap (rather than on
  // download completion) because the download saga doesn't expose a
  // success hook to the caller; the follow mutation is optimistic so
  // the UI updates instantly, and the user can unfollow at any time.
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
  // Default to expanded for short lists so users can see the stems
  // without an extra click; collapse when there are more than
  // STEMS_COLLAPSE_THRESHOLD entries so a long list doesn't push the
  // followers + comments tiles way down the page. The user's explicit
  // toggle (override) wins over the heuristic.
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

  // Same file-size query the track page runs. `stemTracks.map(...)` is
  // what feeds per-stem row sizes; adding the parent trackId means
  // "Full Track" row shows its own size even when the parent isn't a
  // stem.
  const { data: fileSizes } = useFileSizes(
    {
      trackIds: [trackId, ...stems.map((s) => s.track_id)],
      downloadQuality: DownloadQuality.ORIGINAL
    },
    { enabled: stems.length > 0 || !!track?.is_downloadable }
  )

  // Action: Download All archive modal (parent + stems).
  const handleDownloadAll = useRequiresAccountCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (!track) return
      followContestIfNeeded()
      openDownloadTrackArchiveModal({
        trackId,
        fileCount: stemsCount + (track.is_downloadable ? 1 : 0)
      })
    },
    [
      followContestIfNeeded,
      openDownloadTrackArchiveModal,
      trackId,
      stemsCount,
      track
    ]
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

  // Action: per-row download. Mirrors the `handleDownload` path on
  // DownloadSection — opens the wait-for-download modal with the
  // specific trackId the user clicked.
  //
  // Deliberately does NOT pass `parentTrackId`: the download saga appends
  // the parent to the file list (`[...trackIds, parentTrackId]`), so doing
  // so would pull the full track down alongside every single-stem download.
  // When the parent isn't downloadable its download URL 404s and takes the
  // whole batch with it. `DownloadRow` on the track page has always called
  // this with just the row's own id — match it.
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

  // Click-through to the track page. Guarded: action buttons inside
  // the row call stopPropagation to avoid hijacking clicks meant for
  // download/expand affordances.
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

  // Numbered rows. First row is the parent "Full Track" when the
  // track is downloadable, followed by each stem. Index numbers the
  // user sees start at 1 — matches the Figma leading-column numerals.
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

/**
 * Outlined "{N} Stems" pill. No filled background — the Figma shows
 * just the border, so both light and dark modes pick up the card
 * surface behind it and contrast comes entirely from the border +
 * text treatment. The previous surface2 fill was the source of the
 * dark-mode bug.
 */
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
