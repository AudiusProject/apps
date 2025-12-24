import { useLocation, useMatch } from 'react-router'

import NodeOverview from 'components/NodeOverview'
import Page from 'components/Page'
import { useAccount } from 'store/account/hooks'
import { ServiceType } from 'types'
import { NODES_UNREGISTERED_DISCOVERY_NODE } from 'utils/routes'

import styles from './UnregisteredNode.module.css'

const messages = {
  title: 'UNREGISTERED SERVICE'
}

const UnregisteredNode = () => {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const endpoint = query.get('endpoint')
  const { wallet: accountWallet } = useAccount()
  const isDiscovery = !!useMatch(NODES_UNREGISTERED_DISCOVERY_NODE)

  return (
    <Page title={messages.title} className={styles.container}>
      {isDiscovery ? (
        <NodeOverview
          isUnregistered={true}
          endpoint={endpoint}
          serviceType={ServiceType.DiscoveryProvider}
          operatorWallet={accountWallet}
        />
      ) : (
        <NodeOverview
          isUnregistered={true}
          endpoint={endpoint}
          serviceType={ServiceType.ContentNode}
          operatorWallet={accountWallet}
        />
      )}
    </Page>
  )
}

export default UnregisteredNode
