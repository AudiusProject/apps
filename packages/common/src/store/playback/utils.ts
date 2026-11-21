import { Track, isContentUSDCPurchaseGated } from '~/models/Track'

import { PlayerBehavior } from './types'

export function calculatePlayerBehavior(
  track?: Track | null,
  playerBehavior?: PlayerBehavior
) {
  if (!track) {
    return { shouldSkip: false, shouldPreview: false }
  }

  const isPreviewAvailable =
    !!track.preview_cid && isContentUSDCPurchaseGated(track.stream_conditions)
  const hasStreamAccess = !track.is_stream_gated || !!track.access?.stream

  let shouldPreview = false
  let shouldSkip = false
  switch (playerBehavior) {
    case 'PREVIEW_OR_FULL':
      if (isPreviewAvailable) {
        shouldPreview = true
      } else if (!hasStreamAccess) {
        shouldSkip = true
      }
      break
    case 'FULL_OR_PREVIEW':
    default:
      if (!hasStreamAccess) {
        if (isPreviewAvailable) {
          shouldPreview = true
        } else {
          shouldSkip = true
        }
      }
      break
  }
  return { shouldSkip, shouldPreview }
}
