import { useCallback, useEffect, useRef } from 'react'

import { Flex, IconUser } from '@audius/harmony'
import { matchPath, useLocation, useParams } from 'react-router'

import { ConnectAudiusProfileCard } from 'components/ConnectAudiusProfileCard/ConnectAudiusProfileCard'
import { ManageAccountCard } from 'components/ManageAccountCard/ManageAccountCard'
import ManageService from 'components/ManageService'
import NodeTable from 'components/NodeTable'
import Page from 'components/Page'
import ProfileInfoCard from 'components/ProfileInfoCard/ProfileInfoCard'
import { RegisterNodeCard } from 'components/RegisterNodeCard/RegisterNodeCard'
import Timeline from 'components/Timeline'
import TransactionStatus from 'components/TransactionStatus'
import { useAccount } from 'store/account/hooks'
import { useUser } from 'store/cache/user/hooks'
import { Operator, Status, User } from 'types'
import { useReplaceRoute } from 'utils/effects'
import { createStyles } from 'utils/mobile'
import { NODES_ACCOUNT_USER, accountPage, operatorPage } from 'utils/routes'

import desktopStyles from './User.module.css'
import mobileStyles from './UserMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  operator: 'Node Operator',
  user: 'User',
  owner: 'Your Account'
}

const UserPage = () => {
  const { wallet } = useParams<{ wallet: string }>()
  const location = useLocation()
  const nodeTableRef = useRef(null)
  const scrollToNodeTables = useCallback(() => {
    window.scrollTo({
      top: nodeTableRef.current?.offsetTop,
      behavior: 'smooth'
    })
  }, [])

  const handleClickNodes = nodeTableRef?.current
    ? scrollToNodeTables
    : undefined

  const { pathname } = location
  const { status, user: userAccount, audiusProfile } = useUser({ wallet })

  const { wallet: accountWallet } = useAccount()

  const isOwner = accountWallet === wallet

  const user = userAccount as User | Operator

  const isServiceProvider = user && 'serviceProvider' in user

  const replaceRoute = useReplaceRoute()

  // Check if on user or operator page
  useEffect(() => {
    if (status !== Status.Success) return
    const isUserPath = !!matchPath(pathname, NODES_ACCOUNT_USER)
    if (isServiceProvider && isUserPath) replaceRoute(operatorPage(wallet))
    else if (!isServiceProvider && !isUserPath)
      replaceRoute(accountPage(wallet))
  }, [status, wallet, pathname, isServiceProvider, replaceRoute])

  // const inboundDelegation = useActiveInboundDelegation({ wallet })
  const title = isOwner
    ? messages.owner
    : isServiceProvider
      ? messages.operator
      : messages.user
  return (
    <Page icon={IconUser} title={title}>
      <Flex direction='column' gap='l'>
        <ProfileInfoCard
          isOwner={isOwner}
          user={user}
          audiusProfile={audiusProfile}
          status={status}
        />
        {isOwner ? <ConnectAudiusProfileCard /> : null}
        {isServiceProvider && (
          <>
            <ManageService
              wallet={wallet}
              onClickNodesTable={handleClickNodes}
            />
            <RegisterNodeCard wallet={wallet} />
          </>
        )}
        {<ManageAccountCard wallet={wallet} />}
        {isOwner ? <TransactionStatus /> : null}
        <Timeline
          className={styles.timeline}
          wallet={user?.wallet}
          timelineType={isServiceProvider ? 'ServiceProvider' : 'Delegator'}
        />
        <div className={styles.serviceContainer} ref={nodeTableRef}>
          <NodeTable owner={user?.wallet} className={styles.serviceTable} />
        </div>
      </Flex>
    </Page>
  )
}

export default UserPage
