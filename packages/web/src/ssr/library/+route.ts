import { makePageRoute } from 'ssr/util'

export default makePageRoute(
  ['/library', '/library/tracks', '/library/albums', '/library/playlists'],
  'Library Page'
)
