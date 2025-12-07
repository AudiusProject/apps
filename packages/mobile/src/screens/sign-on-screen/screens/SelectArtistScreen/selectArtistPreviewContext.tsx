import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useUser,
  useUserTracksByHandle
} from '@audius/common/api'
import { type ID } from '@audius/common/models'
import { Id, OptionalId } from '@audius/sdk'
import { Formik } from 'formik'
import TrackPlayer, { RepeatMode, State } from 'react-native-track-player'
import { useAsync, useEffectOnce } from 'react-use'

import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import { audiusSdk } from 'app/services/sdk/audius-sdk'

type PreviewContextProps = {
  hasPlayed: boolean
  isPlaying: boolean
  nowPlayingArtistId: number
  playPreview: (artistId: ID) => void
  togglePreview: () => void
}

export const SelectArtistsPreviewContext = createContext<PreviewContextProps>({
  hasPlayed: true,
  isPlaying: false,
  nowPlayingArtistId: -1,
  playPreview: () => {},
  togglePreview: () => {}
})

export const SelectArtistsPreviewContextProvider = (props: {
  children: ReactNode
}) => {
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [nowPlayingArtistId, setNowPlayingArtistId] = useState(-1)
  const [trackUrl, setTrackUrl] = useState<string | null>(null)
  const { data: currentUserId } = useCurrentUserId()

  useEffectOnce(() => {
    TrackPlayer.setRepeatMode(RepeatMode.Track)
  })

  const { data: artistHandle } = useUser(nowPlayingArtistId, {
    select: (user) => user.handle
  })

  const { data: artistTracks } = useUserTracksByHandle({
    handle: artistHandle,
    // We just need one playable track. It's unlikely all 3 of an artist's top tracks are unavailable.
    limit: 3
  })
  useEffect(() => {
    if (!nowPlayingArtistId || !currentUserId || !artistTracks) return

    const fn = async () => {
      const sdk = await audiusSdk()
      const trackId = artistTracks?.find(
        (track) => track.is_available
      )?.track_id
      if (!trackId) return

      const { data, signature } =
        await audiusBackendInstance.signGatedContentRequest({
          sdk
        })

      const url = await sdk.tracks.getTrackStreamUrl({
        trackId: Id.parse(trackId),
        userId: OptionalId.parse(currentUserId),
        userSignature: signature,
        userData: data
      })

      setTrackUrl(url)
    }
    fn()
  }, [nowPlayingArtistId, currentUserId, artistTracks])

  // Request preview playback
  const playPreview = useCallback(async (artistId: ID) => {
    setHasPlayed(true)
    setNowPlayingArtistId(artistId)
    setIsPlaying(true)
    TrackPlayer.reset()
  }, [])

  // Initiates preview playback once trackUrl is available
  useAsync(async () => {
    if (!trackUrl) return
    setIsPlaying(true)
    await TrackPlayer.add({ url: trackUrl })
    await TrackPlayer.play()
  }, [nowPlayingArtistId, trackUrl])

  const togglePreview = useCallback(async () => {
    const { state } = await TrackPlayer.getPlaybackState()
    if (state !== State.Paused) {
      setIsPlaying(false)
      await TrackPlayer.pause()
    } else if (state === State.Paused) {
      setIsPlaying(true)
      await TrackPlayer.play()
    }
  }, [])

  const context = useMemo(
    () => ({
      hasPlayed,
      isPlaying,
      nowPlayingArtistId,
      playPreview,
      togglePreview
    }),
    [hasPlayed, isPlaying, nowPlayingArtistId, playPreview, togglePreview]
  )

  useEffect(() => {
    TrackPlayer.reset()
  }, [])

  return (
    <SelectArtistsPreviewContext.Provider value={context}>
      {/* fake formik context to ensure useFormikContext works */}
      <Formik initialValues={{}} onSubmit={() => {}}>
        {props.children}
      </Formik>
    </SelectArtistsPreviewContext.Provider>
  )
}
