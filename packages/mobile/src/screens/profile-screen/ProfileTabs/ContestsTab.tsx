import { useProfileUser, useUserRemixContests } from '@audius/common/api'
import { useIsFocused } from '@react-navigation/native'
import { View } from 'react-native'

import { Box, Flex, LoadingSpinner } from '@audius/harmony-native'
import { ContestCard } from 'app/components/contest-card/ContestCard'
import { FlatList } from 'app/components/core'
import { spacing } from 'app/styles/spacing'

import { EmptyProfileTile } from '../EmptyProfileTile'

/**
 * Profile "Contests" tab on native. Lists the contests hosted by this
 * profile as a stacked list of `ContestCard`s that link out to the
 * dedicated contest screen (Figma 2864-13286 / 2888-22006).
 *
 * Uses the shared `FlatList` from `app/components/core` so the list
 * integrates with the parent `CollapsibleTabNavigator`'s scroll-tracking
 * — a regular `ScrollView` here breaks the collapsible header behaviour.
 *
 * Backed by `GET /v1/users/{id}/contests` (active first by soonest end,
 * then ended) so the tab no longer needs to walk the global list and
 * filter client-side.
 */
export const ContestsTab = () => {
  const { user_id: hostUserId } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id })
    }).user ?? {}
  const isFocused = useIsFocused()

  const { data: trackIds, isPending } = useUserRemixContests(
    { userId: hostUserId, pageSize: 50 },
    { enabled: isFocused && !!hostUserId }
  )

  const contestTrackIds = trackIds ?? []

  if (!hostUserId) {
    return null
  }

  if (isPending) {
    return (
      <Flex justifyContent='center' style={{ marginTop: spacing(6) }}>
        <Box style={{ width: 24 }}>
          <LoadingSpinner />
        </Box>
      </Flex>
    )
  }

  if (contestTrackIds.length === 0) {
    return <EmptyProfileTile tab='contests' />
  }

  return (
    <FlatList
      data={contestTrackIds}
      keyExtractor={(trackId) => String(trackId)}
      renderItem={({ item: trackId }) => (
        <View
          style={{ paddingHorizontal: spacing(4), paddingBottom: spacing(4) }}
        >
          <ContestCard trackId={trackId} variant='grid' />
        </View>
      )}
      // Pad the top of the list so the first card has breathing room
      // below the sticky tab strip (otherwise the cover banner butts
      // straight up against the tab underline — the bug surfaced in
      // simulator verification).
      contentContainerStyle={{
        paddingTop: spacing(4),
        paddingBottom: spacing(6)
      }}
      showsVerticalScrollIndicator={false}
    />
  )
}
