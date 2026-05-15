import { useEventFollowers } from '@audius/common/api'

import { IconUserFollowers } from '@audius/harmony-native'
import { useRoute } from 'app/hooks/useRoute'

import { UserList } from '../user-list-screen/UserList'
import { UserListScreen } from '../user-list-screen/UserListScreen'

const messages = {
  title: 'Followers'
}

/**
 * Followers list for a remix-contest event. Surfaces the full list
 * of users who have followed the contest so they can be browsed past
 * the face-pile on the details tab.
 *
 * We reuse the shared `UserList` + `UserListScreen` scaffolding that
 * powers Followers/Following/Mutuals, wired up to `useEventFollowers`
 * instead of the per-user follow hooks. The event-followers hook
 * isn't paginated today, so we request the same upper bound the web
 * modal uses (100) — values above that come back empty from the
 * indexer's response, which is what was producing a blank list.
 * Pagination can be wired in later without touching this screen if
 * the hook grows it.
 */
export const ContestFollowersScreen = () => {
  const { params } = useRoute<'ContestFollowers'>()
  const { eventId } = params

  const { userIds, isPending } = useEventFollowers({ eventId, limit: 100 })

  return (
    <UserListScreen title={messages.title} titleIcon={IconUserFollowers}>
      <UserList
        data={userIds ?? []}
        isFetchingNextPage={false}
        isPending={isPending}
        tag='CONTEST_FOLLOWERS'
      />
    </UserListScreen>
  )
}
