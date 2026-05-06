import { useMemo, useState } from 'react'

import { useFileSizes, useStems, useTrack, useUser } from '@audius/common/api'
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

  const { data: fileSizes } = useFileSizes(
    {
      trackIds: [trackId, ...stems.map((s) => s.track_id)],
      downloadQuality: DownloadQuality.ORIGINAL
    },
    { enabled: stems.length > 0 || !!track?.is_downloadable }
  )

  // Default to expanded so the stems list is visible without an extra
  // tap. Once we support multiple source tracks per contest we'll flip
  // back to collapsed-by-default to keep the surface compact. Matches
  // the web ContestStemsCard.
  const [expanded, setExpanded] = useState(true)

  const { onOpen: openWaitForDownloadModal } = useWaitForDownloadModal()

  const handleDownloadOne = (downloadTrackId: ID) => {
    openWaitForDownloadModal({
      parentTrackId: trackId,
      trackIds: [downloadTrackId],
      quality: DownloadQuality.ORIGINAL
    })
  }

  const handleDownloadAll = () => {
    if (!track) return
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
    <Paper direction='column' borderRadius='m' shadow='flat'>
      {/* Heading sits in the top padding slot — matches the web
          ContestStemsCard. The inner padding+border wrapper that used
          to live here was dropped per the contest QA pass: web has no
          inner container, so the mobile card now reads as one surface
          with the same vertical rhythm. */}
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Text variant='label' size='m' color='subdued'>
          {messages.heading}
        </Text>
      </View>

      <Flex direction='column'>
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
          {stemsCount > 0 ? (
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
                {stemsCount > 0 ? messages.downloadAll : messages.download}
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
      </Flex>
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
