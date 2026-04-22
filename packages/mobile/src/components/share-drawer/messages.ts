import type { ShareType } from '@audius/common/store'

const shareTypeMap: Record<ShareType, string> = {
  track: 'Track',
  profile: 'Profile',
  album: 'Album',
  playlist: 'Playlist',
  contest: 'Contest'
}

export const messages = {
  modalTitle: (asset: ShareType) => `Share ${shareTypeMap[asset]}`,
  hiddenPlaylistShareHelperText:
    'Spread the word! Share your playlist with friends and fans! Hidden playlists will be visible to anyone on the internet with the link.',
  directMessage: 'Direct Message',
  x: 'X (Formerly Twitter)',
  instagramStory: 'Instagram Story',
  snapchat: 'Snapchat',
  tikTokVideo: 'TikTok',
  copyLink: 'Copy Link',
  shareToStoryError: 'Sorry, something went wrong.',
  shareSheet: 'More...',
  toast: (asset: ShareType) => `Copied Link to ${shareTypeMap[asset]}`,
  trackShareText: (title: string, handle: string) =>
    `Check out ${title} by ${handle} on @audius $AUDIO`,
  contestShareText: (title: string, handle: string) =>
    `Check out ${handle}'s remix contest for ${title} on @audius $AUDIO`,
  profileShareText: (handle: string) => `Check out ${handle} on @audius $AUDIO`,
  albumShareText: (albumName: string, handle: string) =>
    `Check out ${albumName} by ${handle} @audius $AUDIO`,
  playlistShareText: (playlistName: string, handle: string) =>
    `Check out ${playlistName} by ${handle} @audius $AUDIO`,
  loadingStoryModalTitle: 'Generating Story',
  loadingInstagramStorySubtitle: 'Preparing to open Instagram',
  loadingSnapchatSubtitle: 'Preparing to open Snapchat',
  loadingTikTokSubtitle: 'Preparing to open TikTok',
  cancel: 'Cancel',
  addToPhotoLibraryDenied:
    'You must allow Audius to add to your photo library in order to share to TikTok.',
  addToPhotoLibraryBlocked:
    'Audius is blocked from adding to your photo library. Please give Audius access to Photos in your Security & Privacy settings in order to use Share to TikTok.'
}
