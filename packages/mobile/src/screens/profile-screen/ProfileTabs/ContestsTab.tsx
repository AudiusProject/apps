import { useProfileUser, useUserRemixContests } from '@audius/common/api'
import { useIsFocused } from '@react-navigation/native'
import { View } from 'react-native'

import { Box, Flex, LoadingSpinner } from '@audius/harmony-native'
import { ContestCard } from 'app/components/contest-card/ContestCard'
import { FlatList } from 'app/components/core'
import { spacing } from 'app/styles/spacing'

import { EmptyProfileTile } from '../EmptyProfileTile'

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
      contentContainerStyle={{
        paddingTop: spacing(4),
        paddingBottom: spacing(6)
      }}
      showsVerticalScrollIndicator={false}
    />
  )
}
