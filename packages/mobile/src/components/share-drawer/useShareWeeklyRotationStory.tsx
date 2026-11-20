import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTracks, useUsers, useWeeklyRotation } from '@audius/common/api'
import { Name, ShareSource, SquareSizes } from '@audius/common/models'
import type { Color, ID } from '@audius/common/models'
import type { ShareContent } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import {
  formatWeeklyRotationPeriod,
  getWeeklyRotationPeriod
} from '@audius/common/utils'
import type { ShareSingleOptions } from 'react-native-share'
import Share, { Social } from 'react-native-share'
import type ViewShot from 'react-native-view-shot'

import { useToast } from 'app/hooks/useToast'
import { make, track } from 'app/services/analytics'
import { env } from 'app/services/env'
import { convertRGBToHex } from 'app/utils/convertRGBtoHex'
import {
  getDominantRgb,
  pickTwoMostDominantAndVibrant
} from 'app/utils/dominantColors'
import { isImageUriSource } from 'app/utils/image'
import { getWeeklyRotationRoute } from 'app/utils/routes'

import { useTrackImage } from '../image/TrackImage'

import { STORY_TRACK_COUNT } from './WeeklyRotationStoryCard'
import type { WeeklyRotationStoryTrack } from './WeeklyRotationStoryCard'
import { messages } from './messages'
import {
  PLATFORM_APP_NAMES,
  isAppInstalled,
  waitForHandoff
} from './useShareToStory'

/** Same fallback the track story uses when artwork has no usable colors. */
const DEFAULT_GRADIENT: [string, string] = ['000000', '434343']

/** Matches the screen's query so the drawer reads the mix from cache. */
const MIX_QUERY_LIMIT = 30

/** Give up waiting on artwork after this long and capture what loaded. */
const ARTWORK_LOAD_TIMEOUT_MS = 5000

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Builds and shares the Weekly Rotation Instagram Story: the top tracks of the
 * mix rendered by `WeeklyRotationStoryCard`, captured with ViewShot, and
 * handed to Instagram as the story's background image.
 *
 * Unlike track stories there is no FFmpeg step: a mix has no single track to
 * stream behind the card, so the card itself is the full 9:16 image.
 */
export const useShareWeeklyRotationStory = ({
  content,
  viewShotRef,
  source
}: {
  content: Nullable<ShareContent>
  viewShotRef: React.RefObject<ViewShot>
  source: Nullable<ShareSource>
}) => {
  const { toast } = useToast()
  const owner = content?.type === 'weeklyRotation' ? content.user : null
  const ownerId = owner?.user_id ?? null

  const { trackIds } = useWeeklyRotation(
    { limit: MIX_QUERY_LIMIT, userId: ownerId },
    { enabled: !!ownerId }
  )
  const topTrackIds = useMemo(
    () => trackIds.slice(0, STORY_TRACK_COUNT),
    [trackIds]
  )
  const { byId: tracksById } = useTracks(topTrackIds, {
    enabled: topTrackIds.length > 0
  })
  const artistIds = useMemo(
    () =>
      topTrackIds
        .map((id) => tracksById[id]?.owner_id)
        .filter((id): id is ID => id != null),
    [topTrackIds, tracksById]
  )
  const { byId: usersById } = useUsers(artistIds, {
    enabled: artistIds.length > 0
  })

  const storyTracks: WeeklyRotationStoryTrack[] = useMemo(
    () =>
      topTrackIds.flatMap((id) => {
        const t = tracksById[id]
        if (!t) return []
        return [{ track: t, artist: usersById[t.owner_id] }]
      }),
    [topTrackIds, tracksById, usersById]
  )

  const period = useMemo(
    () => formatWeeklyRotationPeriod(getWeeklyRotationPeriod()),
    []
  )

  // Background colors come from the #1 track's artwork, like the track story.
  const leadArtwork = useTrackImage({
    trackId: topTrackIds[0],
    size: SquareSizes.SIZE_480_BY_480
  })
  const leadArtworkUri =
    leadArtwork?.source && isImageUriSource(leadArtwork.source)
      ? leadArtwork.source.uri
      : null

  const [gradient, setGradient] = useState<[string, string]>(DEFAULT_GRADIENT)

  // Capture waits for every row's artwork, so the story never ships with
  // blank squares. Reset whenever the set of tracks changes.
  const loadedArtworkRef = useRef(new Set<ID>())
  const artworkWaitersRef = useRef<(() => void)[]>([])
  const topTrackIdsKey = topTrackIds.join(',')
  useEffect(() => {
    loadedArtworkRef.current = new Set()
  }, [topTrackIdsKey])

  const isAllArtworkLoaded = useCallback(
    () =>
      storyTracks.length > 0 &&
      storyTracks.every(({ track: t }) =>
        loadedArtworkRef.current.has(t.track_id)
      ),
    [storyTracks]
  )

  const handleArtworkLoad = useCallback(
    (trackId: ID) => {
      loadedArtworkRef.current.add(trackId)
      if (isAllArtworkLoaded()) {
        artworkWaitersRef.current.forEach((resolve) => resolve())
        artworkWaitersRef.current = []
      }
    },
    [isAllArtworkLoaded]
  )

  const waitForArtwork = useCallback(async () => {
    if (isAllArtworkLoaded()) return
    await Promise.race([
      new Promise<void>((resolve) => {
        artworkWaitersRef.current.push(resolve)
      }),
      new Promise<void>((resolve) =>
        setTimeout(resolve, ARTWORK_LOAD_TIMEOUT_MS)
      )
    ])
  }, [isAllArtworkLoaded])

  const resolveGradient = useCallback(async (): Promise<[string, string]> => {
    if (!leadArtworkUri) return DEFAULT_GRADIENT
    try {
      const raw = await getDominantRgb(leadArtworkUri)
      if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_GRADIENT
      const [first, second] = pickTwoMostDominantAndVibrant(raw).map(
        (c: Color) => convertRGBToHex(c)
      )
      // A single dominant color (solid artwork) becomes a flat background.
      return [first, second ?? first]
    } catch {
      return DEFAULT_GRADIENT
    }
  }, [leadArtworkUri])

  const trackShareEvent = useCallback(
    (url: string) => {
      if (!owner) return
      track(
        make({
          eventName: Name.SHARE,
          kind: 'weeklyRotation',
          id: `${owner.user_id}`,
          url,
          source: source ?? ShareSource.PAGE,
          channel: 'instagramStory'
        })
      )
    },
    [owner, source]
  )

  const handleShareToInstagramStory = useCallback(async () => {
    if (!owner || storyTracks.length === 0) return

    if (!(await isAppInstalled('instagram'))) {
      toast({
        content: messages.shareToStoryAppNotInstalled(
          PLATFORM_APP_NAMES.instagram
        ),
        type: 'error'
      })
      return
    }

    let imageUri: string | undefined
    try {
      const nextGradient = await resolveGradient()
      setGradient(nextGradient)
      await waitForArtwork()
      // Let the gradient commit before capturing.
      await nextFrame()
      await nextFrame()
      imageUri = await viewShotRef.current?.capture?.()
    } catch (e) {
      console.error(e)
    }
    if (!imageUri) {
      toast({ content: messages.shareToStoryError, type: 'error' })
      return
    }

    const url = getWeeklyRotationRoute(owner, true)
    const shareOptions: ShareSingleOptions = {
      backgroundImage: imageUri,
      attributionURL: url,
      social: Social.InstagramStories,
      appId: env.FACEBOOK_APP_ID
    }
    try {
      await waitForHandoff(Share.shareSingle(shareOptions))
      trackShareEvent(url)
    } catch (e) {
      console.error(e)
      toast({ content: messages.shareToStoryError, type: 'error' })
    }
  }, [
    owner,
    storyTracks.length,
    toast,
    resolveGradient,
    waitForArtwork,
    viewShotRef,
    trackShareEvent
  ])

  return {
    owner,
    period,
    storyTracks,
    gradient,
    handleArtworkLoad,
    handleShareToInstagramStory,
    canShareStory: !!owner && storyTracks.length > 0
  }
}
