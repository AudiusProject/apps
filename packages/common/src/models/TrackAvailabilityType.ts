// TODO: Remove hidden and public when we go live with upload/edit updates
export enum StreamTrackAvailabilityType {
  PUBLIC = 'PUBLIC',
  FREE = 'FREE',
  USDC_PURCHASE = 'USDC_PURCHASE',
  SPECIAL_ACCESS = 'SPECIAL_ACCESS',
  TOKEN_GATED = 'TOKEN_GATED',
  HIDDEN = 'HIDDEN'
}

export enum DownloadTrackAvailabilityType {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  USDC_PURCHASE = 'USDC_PURCHASE'
}
