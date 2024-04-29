import type { full as FullSdk } from '@audius/sdk'

export type SsrPageProps = {
  track?: FullSdk.TrackFull
  user?: FullSdk.UserFull
  collection?: FullSdk.PlaylistFull
  error?: { isErrorPageOpen: boolean }
}
