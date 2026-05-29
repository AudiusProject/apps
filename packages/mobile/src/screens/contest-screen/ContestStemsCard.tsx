import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useEventFollowState,
  useFileSizes,
  useFollowEvent,
  useRemixContest,
  useStems,
  useTrack,
  useUser
} from '@audius/common/api'
import type { ID } from '@audius/common/models'
import {
  DownloadQuality,
  SquareSizes,
  stemCategoryFriendlyNames
} from '@audius/common/models'
import { useWaitForDownloadModal } from '@audius/common/store'
import { formatBytes } from '@audius/common/utils'
import { Image, Pressable, View } from 'react-native'

import {
  Divider,
  Flex,
  IconButton,
  IconCaretDown,
  IconReceive,
  Paper,
  Text
} from '@audius/harmony-native'
import { useTrackImage } from 'app/components/image/TrackImage'
import { UserLink } from 'app/components/user-link'

/**
 * Native Stems & Downloads tile — same treatment as the desktop
 * `ContestStemsCard` refactor (Figma 2925-18101).
 *
 * Collapsed state renders a single summary row:
 *   [artwork] Public Free / Artist   [caret]
 *   [N Stems pill]                    Download All ↓
 *
 * Tapping the caret expands an inner list of numbered rows, each
 * showing:
 *   index · Stem category / filename · size · [download icon]
 *
 * The inner "source track + stems" block is wrapped in its own
 * bordered inner container so it reads as a distinct unit inside
 * the outer card — Figma calls for a separator between the
 * collapsed header, the expanded list, and any future siblings.
 *
 * The download actions reuse `useWaitForDownloadModal` — the same
 * hook the track-page download flow uses — so per-file downloads
 * route through the existing native modal and progress UI.
 */

const messages = {
  heading: 'STEMS & DOWNLOADS',
  downloadHeading: 'DOWNLOAD',
  publicFree: 'Public Free',
  download: 'Download',
  downloadAll: 'Download All',
  stemsCount: (n: number) => (n === 1 ? '1 Stem' : `${n} Stems`),
  fullTrack: 'Full Track',
  downloadStem: 'Download stem'
}

type ContestStemsCardProps = {
  trackId: ID
}

type StemRow = {
  trackId: ID
  title: string
  subtitle: string
  size?: number
}

export const ContestStemsCard = ({ trackId }: ContestStemsCardProps) => {
  const { data: track } = useTrack(trackId)
  const { data: artist } = useUser(track?.owner_id)
  const { data: stems = [] } = useStems(trackId)
  const { source } = useTrackImage({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })
  const src =
    source && typeof source === 'object' && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined
  const stemsCount = stems.length
  const hasStems = stemsCount > 0

  const { data: fileSizes } = useFileSizes(
    {
      trackIds: [trackId, ...stems.map((s) => s.track_id)],
      downloadQuality: DownloadQuality.ORIGINAL
    },
    { enabled: stems.length > 0 || !!track?.is_downloadable }
  )

  // Default to expanded for short lists so the user sees the stems
  // without an extra tap; auto-collapse when there are more than
  // STEMS_COLLAPSE_THRESHOLD entries so a long list doesn't push the
  // comments tab way down the screen. Explicit user toggle wins.
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

  const handleDownloadOne = (downloadTrackId: ID) => {
    followContestIfNeeded()
    openWaitForDownloadModal({
      parentTrackId: trackId,
      trackIds: [downloadTrackId],
      quality: DownloadQuality.ORIGINAL
    })
  }

  const handleDownloadAll = () => {
    if (!track) return
    followContestIfNeeded()
    // All stems + (optionally) the parent track.
    const ids = [
      ...(track.is_downloadable ? [trackId] : []),
      ...stems.map((s) => s.track_id)
    ]
    openWaitForDownloadModal({
      parentTrackId: trackId,
      trackIds: ids,
      quality: DownloadQuality.ORIGINAL
    })
  }

  const rows: StemRow[] = useMemo(() => {
    if (!track) return []
    const list: StemRow[] = []
    if (track.is_downloadable) {
      list.push({
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
      list.push({
        trackId: stem.track_id,
        title: friendly || stem.title || '',
        subtitle: stem.orig_filename ?? '',
        size: fileSizes?.[stem.track_id]?.[DownloadQuality.ORIGINAL]
      })
    })
    return list
  }, [track, stems, fileSizes])

  if (!track || !artist) return null

  return (
    <Paper direction='column' p='l' gap='m' borderRadius='m' shadow='flat'>
      <Text variant='label' size='m' color='subdued'>
        {heading}
      </Text>

      {/* Inner bordered container — separates the source-track +
          stems block from the card heading and any future siblings,
          matching Figma 2925-18101. */}
      <Paper direction='column' borderRadius='m' shadow='flat' border='default'>
        {/* Collapsed summary row: artwork + access label + artist +
            caret. */}
        <Flex direction='row' p='l' gap='m' alignItems='center'>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: 'rgba(0,0,0,0.08)'
            }}
          >
            {src ? (
              <Image
                source={{ uri: src }}
                style={{ width: '100%', height: '100%' }}
                resizeMode='cover'
              />
            ) : null}
          </View>
          <Flex direction='column' gap='2xs' flex={1}>
            <Text variant='title' size='s'>
              {track.title}
            </Text>
            <UserLink userId={artist.user_id} size='s' />
          </Flex>
          {hasStems ? (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole='button'
              accessibilityLabel={expanded ? 'Collapse stems' : 'Expand stems'}
              style={{
                padding: 4,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <View
                style={{
                  // Rotate the caret via transform — react-native
                  // doesn't support CSS transitions, so this is a
                  // discrete flip rather than an animated rotation.
                  transform: [{ rotate: expanded ? '180deg' : '0deg' }]
                }}
              >
                <IconCaretDown size='m' color='default' />
              </View>
            </Pressable>
          ) : null}
        </Flex>

        {/* Footer row: N Stems outlined pill + Download All text. */}
        <Flex
          direction='row'
          ph='l'
          pb='l'
          alignItems='center'
          justifyContent='space-between'
          gap='m'
        >
          {hasStems ? (
            <Flex
              ph='m'
              pv='2xs'
              alignItems='center'
              justifyContent='center'
              border='default'
              style={{ borderRadius: 999 }}
            >
              <Text variant='body' size='s' color='subdued'>
                {messages.stemsCount(stemsCount)}
              </Text>
            </Flex>
          ) : (
            <View />
          )}
          <Pressable onPress={handleDownloadAll}>
            <Flex direction='row' gap='xs' alignItems='center'>
              <Text variant='label' size='s' strength='strong'>
                {hasStems ? messages.downloadAll : messages.download}
              </Text>
              <IconReceive size='s' color='default' />
            </Flex>
          </Pressable>
        </Flex>

        {/* Expanded numbered-row list. Each row: index, title,
            filename, size, per-file download icon. Matches Figma
            2857-95763 / 2925-18101. */}
        {expanded && rows.length > 0 ? (
          <View>
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
          </View>
        ) : null}
      </Paper>
    </Paper>
  )
}

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
        direction='row'
        p='l'
        alignItems='center'
        justifyContent='space-between'
        gap='m'
      >
        <Flex
          direction='row'
          alignItems='center'
          gap='l'
          style={{ flex: 1, minWidth: 0 }}
        >
          <Text variant='body' size='s' color='subdued' style={{ width: 20 }}>
            {index}
          </Text>
          <Flex direction='column' gap='2xs' style={{ flex: 1, minWidth: 0 }}>
            <Text variant='title' size='s'>
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant='body'
                size='s'
                color='subdued'
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {subtitle}
              </Text>
            ) : null}
          </Flex>
        </Flex>
        <Flex direction='row' alignItems='center' gap='l'>
          {size ? (
            <Text variant='body' size='s' color='subdued'>
              {formatBytes(size)}
            </Text>
          ) : null}
          <IconButton
            icon={IconReceive}
            size='s'
            color='default'
            aria-label={messages.downloadStem}
            onPress={onDownload}
          />
        </Flex>
      </Flex>
    </>
  )
}
