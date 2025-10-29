import { User } from '~/models/User'
import { AccountState } from '~/store/account/types'

import { SelectableQueryOptions } from '../../types'
import { useUser } from '../useUser'

import { useCurrentAccount } from './useCurrentAccount'

/**
 * Some helper utils that can be used to pass into the select option
 */
export const selectIsGuestAccount = (user?: User | null) => {
  return Boolean(!user?.handle && !user?.name)
}

export const selectIsAccountComplete = (user?: User | null) => {
  if (!user) return false

  const { handle, name } = user
  return Boolean(handle && name)
}

/**
 * Returns the account with collections sorted by name, separated into playlists and albums
 */
export const selectNameSortedPlaylistsAndAlbums = (
  account: AccountState | undefined | null
) => {
  if (!account) return undefined

  const collections = Object.values(account.collections)
  const nameSortedCollections = collections.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  )

  return {
    playlists: nameSortedCollections.filter((c) => !c.is_album),
    albums: nameSortedCollections.filter((c) => c.is_album)
  }
}

export const useCurrentAccountUser = <TResult = User>(
  options?: SelectableQueryOptions<User, TResult>
) => {
  const { data: currentAccount } = useCurrentAccount()
  return useUser(currentAccount?.userId, options)
}

export const useHasAccount = () => {
  const { data: hasUserId } = useCurrentAccount({
    select: (account) => !!account?.userId
  })

  return !!hasUserId
}
