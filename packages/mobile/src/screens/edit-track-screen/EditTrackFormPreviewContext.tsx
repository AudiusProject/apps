import type { ReactNode } from 'react'
import { createContext, useCallback, useMemo, useState } from 'react'

import { playerActions, playerSelectors } from '@audius/common/store'
import Video from 'react-native-video'
import { useDispatch, useSelector } from 'react-redux'

type PreviewContextProps = {
  isPlaying: boolean
  playPreview: (url: string) => void
  stopPreview: () => void
}

export const EditTrackFormPreviewContext = createContext<PreviewContextProps>({
  isPlaying: false,
  playPreview: () => {},
  stopPreview: () => {}
})

export const EditTrackFormPreviewContextProvider = (props: {
  children: ReactNode
}) => {
  const dispatch = useDispatch()
  const [sourceUri, setSourceUri] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayerPlaying = useSelector(playerSelectors.getPlaying)

  // Request preview playback
  const playPreview = useCallback(
    async (url: string) => {
      if (isPlayerPlaying) dispatch(playerActions.pause())

      setSourceUri(url)
      setIsPlaying(true)
    },
    [dispatch, isPlayerPlaying]
  )

  // Stop preview playback
  const stopPreview = useCallback(async () => {
    setIsPlaying(false)
    setSourceUri('')
  }, [])

  const context = useMemo(
    () => ({
      isPlaying,
      playPreview,
      stopPreview
    }),
    [isPlaying, playPreview, stopPreview]
  )

  return (
    <EditTrackFormPreviewContext.Provider value={context}>
      {props.children}
      <Video
        style={{ display: 'none' }}
        source={{ uri: sourceUri }}
        paused={!isPlaying}
        onEnd={() => {
          setIsPlaying(false)
        }}
      />
    </EditTrackFormPreviewContext.Provider>
  )
}
