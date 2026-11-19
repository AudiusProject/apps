import { useCallback, useEffect, useRef, useState } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import { Id, OptionalId } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useUnmount } from 'react-use'

import { audioPlayer } from 'services/audio-player'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { audiusSdk } from 'services/audius-sdk'

const { getPlaying } = playbackSelectors

/**
 * Lightweight, in-place audio preview for contest stems.
 *
 * Stems aren't queued through the main player: they have no title or
 * artwork of their own, so the play bar would show an empty row, and a
 * preview shouldn't replace whatever the listener had queued. Instead we
 * resolve a signed stream url the same way the playback saga does and
 * play it through a standalone `HTMLAudioElement`, pausing the main
 * player first. Previews skip play counting.
 */
export const useStemPreview = () => {
  const dispatch = useDispatch()
  const isQueuePlaying = useSelector(getPlaying)
  const { data: currentUserId } = useCurrentUserId()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Bumped on every play/stop so a slow url lookup for an earlier click
  // can't start playing after the user has moved on.
  const requestIdRef = useRef(0)
  const [playingTrackId, setPlayingTrackId] = useState<ID | null>(null)
  const [loadingTrackId, setLoadingTrackId] = useState<ID | null>(null)

  const stopPreview = useCallback(() => {
    requestIdRef.current += 1
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    audioRef.current = null
    setPlayingTrackId(null)
    setLoadingTrackId(null)
  }, [])

  const playPreview = useCallback(
    async (trackId: ID) => {
      stopPreview()
      const requestId = requestIdRef.current
      if (isQueuePlaying) dispatch(playbackActions.pause())
      setLoadingTrackId(trackId)

      try {
        const sdk = await audiusSdk()
        const { data, signature } =
          await audiusBackendInstance.signGatedContentRequest({ sdk })
        const url = await sdk.tracks.getTrackStreamUrl({
          trackId: Id.parse(trackId),
          userId: OptionalId.parse(currentUserId),
          userSignature: signature,
          userData: data,
          skipPlayCount: true
        })
        if (requestId !== requestIdRef.current) return

        const audio = new Audio(url)
        audio.volume = audioPlayer?.audio.volume ?? 1
        audio.onended = () => {
          if (audioRef.current === audio) stopPreview()
        }
        audioRef.current = audio
        await audio.play()
        if (requestId !== requestIdRef.current) return
        setPlayingTrackId(trackId)
        setLoadingTrackId(null)
      } catch (e) {
        console.error('Failed to preview stem', e)
        if (requestId === requestIdRef.current) stopPreview()
      }
    },
    [currentUserId, dispatch, isQueuePlaying, stopPreview]
  )

  const togglePreview = useCallback(
    (trackId: ID) => {
      if (playingTrackId === trackId || loadingTrackId === trackId) {
        stopPreview()
      } else {
        playPreview(trackId)
      }
    },
    [loadingTrackId, playPreview, playingTrackId, stopPreview]
  )

  // If the listener starts the main player, end the preview so the two
  // never play over each other.
  useEffect(() => {
    if (isQueuePlaying && audioRef.current) stopPreview()
  }, [isQueuePlaying, stopPreview])

  useUnmount(stopPreview)

  return { playingTrackId, loadingTrackId, togglePreview }
}
