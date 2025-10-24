import { useEffect } from 'react'

import { useArtistCoin, useArtistCoinMembers } from '@audius/common/api'
import {
  coinLeaderboardUserListActions,
  coinLeaderboardUserListSelectors
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { IconTrophy, Text } from '@audius/harmony-native'
import { useRoute } from 'app/hooks/useRoute'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: (ticker: string) => `${ticker} Members`
}

export const CoinLeaderboardScreen = () => {
  const dispatch = useDispatch()
  const { params } = useRoute<'CoinLeaderboard'>()
  const { mint } = params
  const reduxMint = useSelector(coinLeaderboardUserListSelectors.getMint)
  const { data: coin } = useArtistCoin(reduxMint ?? mint)

  const { data, isFetchingNextPage, fetchNextPage, isPending } =
    useArtistCoinMembers({ mint: reduxMint ?? mint })

  useEffect(() => {
    if (mint) {
      dispatch(coinLeaderboardUserListActions.setCoinLeaderboard(mint))
    }

    return () => {
      // Clean up when component unmounts
      dispatch(coinLeaderboardUserListActions.setCoinLeaderboard(null))
    }
  }, [dispatch, mint])

  if (!mint && !reduxMint) return null

  return (
    <UserListScreen
      title={messages.title(coin?.ticker || '')}
      titleIcon={IconTrophy}
    >
      <UserList
        data={data?.map((member) => member.userId)}
        isFetchingNextPage={isFetchingNextPage}
        isPending={isPending}
        fetchNextPage={fetchNextPage}
        tag='COIN_LEADERBOARD'
        showRank={true}
        renderRightContent={(userId) => {
          const member = data?.find((m) => m.userId === userId)
          return member ? (
            <Text size='s' strength='strong'>
              {member.balanceLocaleString}
            </Text>
          ) : null
        }}
      />
    </UserListScreen>
  )
}
