import { useCallback, useContext } from 'react'

import { useHasAccount } from '@audius/common/api'
import { useChallengeCooldownSchedule } from '@audius/common/hooks'
import { Name, Status } from '@audius/common/models'
import { accountSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { connect } from 'react-redux'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import { Dispatch } from 'redux'

import { make, useRecord } from 'common/store/analytics/actions'
import {
  RouterContext,
  SlideDirection
} from 'components/animated-switch/RouterContextProvider'
import { AppState } from 'store/types'
import { getIsIOS } from 'utils/browser'
import { push, goBack } from 'utils/navigation'

import NavBar from './NavBar'

const { NOTIFICATION_PAGE, SETTINGS_PAGE, REWARDS_PAGE } = route
const { getAccountStatus } = accountSelectors

type ConnectedNavBarProps = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps> &
  RouteComponentProps<any>

const ConnectedNavBar = ({
  goToRoute,
  accountStatus,
  history,
  goBack
}: ConnectedNavBarProps) => {
  const hasAccount = useHasAccount()
  const { setStackReset, setSlideDirection } = useContext(RouterContext)
  const { claimableAmount: rewardsCount } = useChallengeCooldownSchedule({
    multiple: true
  })

  const search = (query: string) => {
    history.push({
      pathname: history.location.pathname,
      search: query ? new URLSearchParams({ query }).toString() : undefined,
      state: {}
    })
  }

  const record = useRecord()
  const goToNotificationPage = useCallback(() => {
    if (getIsIOS()) {
      setSlideDirection(SlideDirection.FROM_RIGHT)
    } else {
      setStackReset(true)
    }
    setImmediate(() => goToRoute(NOTIFICATION_PAGE))
    record(make(Name.NOTIFICATIONS_OPEN, { source: 'button' }))
  }, [goToRoute, setStackReset, setSlideDirection, record])

  const goToSettingsPage = useCallback(() => {
    setStackReset(true)
    setImmediate(() => goToRoute(SETTINGS_PAGE))
  }, [goToRoute, setStackReset])

  const signUp = useCallback(() => {
    setStackReset(true)
  }, [setStackReset])

  const goToRewardsPage = useCallback(() => {
    setStackReset(true)
    setImmediate(() => goToRoute(REWARDS_PAGE))
  }, [goToRoute, setStackReset])

  return (
    <NavBar
      isSignedIn={hasAccount}
      isLoading={accountStatus === Status.LOADING}
      signUp={signUp}
      rewardsCount={rewardsCount}
      goToNotificationPage={goToNotificationPage}
      goToSettingsPage={goToSettingsPage}
      search={search}
      goBack={goBack}
      history={history}
      goToRewardsPage={goToRewardsPage}
    />
  )
}

function mapStateToProps(state: AppState) {
  return {
    accountStatus: getAccountStatus(state)
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    goToRoute: (route: string) => dispatch(push(route)),
    goBack: () => dispatch(goBack())
  }
}

export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(ConnectedNavBar)
)
