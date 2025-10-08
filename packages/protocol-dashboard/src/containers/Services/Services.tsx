import React, { useCallback, useRef } from 'react'

import { Flex } from '@audius/harmony'

import IconNodes from 'assets/img/iconNodes.svg'
import { ManageAccountCard } from 'components/ManageAccountCard/ManageAccountCard'
import ManageService from 'components/ManageService'
import NodeTable from 'components/NodeTable'
import Page from 'components/Page'
import { RegisterNodeCard } from 'components/RegisterNodeCard/RegisterNodeCard'
import { RewardsTimingCard } from 'components/RewardsTimingCard/RewardsTimingCard'
import TopOperatorsTable from 'components/TopOperatorsTable'
import { useAccount, useAccountUser } from 'store/account/hooks'
import { Status } from 'types'
import { createStyles } from 'utils/mobile'

import desktopStyles from './Services.module.css'
import mobileStyles from './ServicesMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  title: 'Nodes'
}

const NODE_LIMIT = 10

type OwnProps = {}

type ServicesProps = OwnProps

const Services: React.FC<ServicesProps> = () => {
  const { isLoggedIn } = useAccount()
  const { status: userStatus, user: accountUser } = useAccountUser()
  const discoveryTableRef = useRef(null)
  const scrollToNodeTables = useCallback(() => {
    window.scrollTo({
      top: discoveryTableRef.current?.offsetTop,
      behavior: 'smooth'
    })
  }, [])

  const handleClickNodes = discoveryTableRef?.current
    ? scrollToNodeTables
    : undefined

  const isServiceProvider =
    userStatus === Status.Success && 'serviceProvider' in accountUser

  return (
    <Page title={messages.title} icon={IconNodes}>
      <Flex direction='column' gap='l'>
        {isLoggedIn && accountUser ? (
          <ManageAccountCard wallet={accountUser?.wallet} />
        ) : null}
        {isServiceProvider ? (
          <ManageService
            wallet={accountUser?.wallet}
            showPendingTransactions
            onClickDiscoveryTable={handleClickNodes}
            onClickContentTable={handleClickNodes}
          />
        ) : null}
        <RegisterNodeCard wallet={accountUser?.wallet ?? ''} />
        <RewardsTimingCard />
        <TopOperatorsTable
          limit={5}
          className={styles.topAddressesTable}
          alwaysShowMore
        />
        <div className={styles.serviceContainer} ref={discoveryTableRef}>
          <NodeTable
            className={styles.serviceTable}
            limit={NODE_LIMIT}
            alwaysShowMore
          />
        </div>
      </Flex>
    </Page>
  )
}

export default Services
