import { makePageRoute } from 'ssr/util'

// A shared Weekly Rotation. The bare /explore/weekly-rotation stays with the
// explore handler: it's per-viewer and has no card of its own.
export default makePageRoute(
  ['/explore/weekly-rotation/@handle'],
  'Weekly Rotation Page'
)
