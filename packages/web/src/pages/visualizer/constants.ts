import { route } from '@audius/common/utils'

const { UPLOAD_PAGE, UPLOAD_ALBUM_PAGE, UPLOAD_PLAYLIST_PAGE } = route

/** Paths where `openVisualizer` / toggle are ignored (e.g. upload flows). */
export const NO_VISUALIZER_ROUTES = new Set([
  UPLOAD_PAGE,
  UPLOAD_ALBUM_PAGE,
  UPLOAD_PLAYLIST_PAGE
])
