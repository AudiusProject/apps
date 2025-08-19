import { useCallback } from 'react'

import { useArtistCoinMembers, useUsers } from '@audius/common/api'
import { TouchableOpacity } from 'react-native'

import {
  Divider,
  Flex,
  IconButton,
  IconCaretRight,
  LoadingSpinner,
  Paper,
  Text
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { ProfilePictureList } from 'app/screens/notifications-screen/Notification'

const messages = {
  title: 'Members Leaderboard',
  leaderboard: 'Leaderboard'
}

export const CoinLeaderboardCard = ({ mint }: { mint: string }) => {
  const navigation = useNavigation()
  const { data: leaderboardUsers, isPending: isLeaderboardPending } =
    useArtistCoinMembers({ mint })
  const { data: users, isPending: isUsersPending } = useUsers(
    leaderboardUsers?.map((user) => user.userId)
  )
  const isPending = isLeaderboardPending || isUsersPending

  const handleViewLeaderboard = useCallback(() => {
    navigation.navigate('CoinLeaderboard', {
      mint
    })
  }, [mint, navigation])

  if (!mint || !users?.length) return null

  return (
    <Paper
      borderRadius='l'
      shadow='far'
      border='default'
      column
      alignItems='flex-start'
    >
      <Flex alignItems='center' gap='xs' pv='l' ph='xl'>
        <Text variant='heading' size='s' color='heading'>
          {messages.title}
        </Text>
      </Flex>
      <Divider style={{ width: '100%' }} />
      <Flex
        row
        pv='l'
        ph='xl'
        justifyContent='space-between'
        alignItems='center'
        w='100%'
      >
        {isPending ? (
          <Flex alignItems='center'>
            <LoadingSpinner />
          </Flex>
        ) : (
          <TouchableOpacity onPress={handleViewLeaderboard}>
            <ProfilePictureList
              interactive={false}
              users={users ?? []}
              totalUserCount={leaderboardUsers?.length ?? 0}
              limit={7}
            />
          </TouchableOpacity>
        )}
        <IconButton
          color='subdued'
          icon={IconCaretRight}
          aria-label='Open the leaderboard modal'
          onPress={handleViewLeaderboard}
          disabled={isPending}
        />
      </Flex>
    </Paper>
  )
}
