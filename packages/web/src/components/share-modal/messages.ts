import { ShareType } from '@audius/common/store'

const shareTypeMap: Record<ShareType, string> = {
  track: 'Track',
  profile: 'Profile',
  album: 'Album',
  playlist: 'Playlist',
  contest: 'Contest'
}

export const messages = {
  modalTitle: (asset: ShareType) => `Share ${shareTypeMap[asset]}`,
  directMessage: 'Direct Message',
  x: 'Share to X',
  copyLink: 'Copy Link',
  embed: 'Embed',
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
  // TODO: See if you can display my when the account user is the user
  shareDescription: 'Spread the word! Share with your friends and fans!',
  hiddenPlaylistShareDescription:
    'Spread the word! Share your playlist with friends and fans! Hidden playlists will be visible to anyone on the internet with the link.'
}
