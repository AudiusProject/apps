import { pluralize } from '@audius/common/utils'

export const messages = {
  artistPick: 'Artist Pick',
  favorited: 'Favorited',
  getPlays: (listenCount: number) => ` ${pluralize('Play', listenCount)}`,
  played: 'Played',
  reposted: 'Reposted',
  repostedAndFavorited: 'Reposted & Favorited',
  timeLeft: 'left',
  loading: '------'
}
