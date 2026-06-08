import { useCurrentUserId, useProfileUser } from '@audius/common/api'
import type { StyleProp, ViewStyle } from 'react-native'

import { EmptyTile } from 'app/components/core'

const messages = {
  you: 'You',
  haveNot: "haven't",
  hasNot: "hasn't",
  tracks: 'created any tracks yet',
  albums: 'created any albums yet',
  playlists: 'created any playlists yet',
  reposts: 'reposted anything yet',
  contests: 'hosted any contests yet'
}

type Tab = 'tracks' | 'albums' | 'playlists' | 'reposts' | 'contests'

export const useEmptyProfileText = (tab: Tab) => {
  const { user_id, name } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id, name: user.name })
    }).user ?? {}
  const { data: accountId } = useCurrentUserId()

  const isOwner = user_id === accountId

  const youAction = `${messages.you} ${messages.haveNot}`
  const nameAction = `${name} ${messages.hasNot}`
  return `${isOwner ? youAction : nameAction} ${messages[tab]}`
}

type EmptyProfileTileProps = {
  style?: StyleProp<ViewStyle>
  tab: Tab
}

export const EmptyProfileTile = ({ tab, style }: EmptyProfileTileProps) => {
  const emptyText = useEmptyProfileText(tab)

  return <EmptyTile message={emptyText} style={style} />
}
