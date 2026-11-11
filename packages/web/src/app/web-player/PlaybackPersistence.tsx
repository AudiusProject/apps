import { usePlaybackPositionPersistence } from 'hooks/usePlaybackPositionPersistence'
import { usePlaybackPositionPolling } from 'hooks/usePlaybackPositionPolling'
import { usePlaybackRatePersistence } from 'hooks/usePlaybackRatePersistence'

/**
 * Renders nothing. Keeps the playback hooks out of WebPlayer so play/pause,
 * track changes and position updates don't re-render the app shell.
 */
export const PlaybackPersistence = () => {
  usePlaybackRatePersistence()
  usePlaybackPositionPersistence()
  usePlaybackPositionPolling()
  return null
}
