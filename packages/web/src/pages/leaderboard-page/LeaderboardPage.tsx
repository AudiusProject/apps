import { Flex } from '~harmony/components'

import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { CoinLeaderboardUserList } from 'components/user-list/lists/CoinLeaderboardUserList'

export const LeaderboardPage = () => {
  return (
    <MobilePageContainer fullHeight>
      <Flex column w='100%' backgroundColor='white'>
        <CoinLeaderboardUserList />
      </Flex>
    </MobilePageContainer>
  )
}
