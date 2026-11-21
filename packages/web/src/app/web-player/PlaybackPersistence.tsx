import { usePlaybackPositionPersistence } from 'hooks/usePlaybackPositionPersistence'
import { usePlaybackPositionPolling } from 'hooks/usePlaybackPositionPolling'
import { usePlaybackRatePersistence } from 'hooks/usePlaybackRatePersistence'

export const PlaybackPersistence = () => {
  usePlaybackRatePersistence()
  usePlaybackPositionPersistence()
  usePlaybackPositionPolling()
  return null
}
