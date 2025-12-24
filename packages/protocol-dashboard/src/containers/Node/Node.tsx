import { IconEmbed } from '@audius/harmony'
import clsx from 'clsx'
import { useParams } from 'react-router'

import IndividualNodeUptimeChart from 'components/IndividualNodeUptimeChart'
import IndividualServiceApiCallsChart from 'components/IndividualServiceApiCallsChart'
import IndividualServiceUniqueUsersChart from 'components/IndividualServiceUniqueUsersChart'
import NodeOverview from 'components/NodeOverview'
import Page from 'components/Page'
import { useAccount } from 'store/account/hooks'
import { useContentNode } from 'store/cache/contentNode/hooks'
import { useDiscoveryProvider } from 'store/cache/discoveryProvider/hooks'
import { useValidator } from 'store/cache/validator/hooks'
import { Address, ServiceType, Status } from 'types'
import { usePushRoute } from 'utils/effects'
import { createStyles } from 'utils/mobile'

import desktopStyles from './Node.module.css'
import mobileStyles from './NodeMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  discovery: 'Discovery Node',
  content: 'Content Node',
  validator: 'Validator'
}

type ContentNodeProps = { spID: number; accountWallet: Address | undefined }
const ContentNode: React.FC<ContentNodeProps> = ({
  spID,
  accountWallet
}: ContentNodeProps) => {
  const { node: contentNode, status } = useContentNode({ spID })

  if (status === Status.Failure) {
    return null
  }

  const isOwner = accountWallet === contentNode?.owner

  return (
    <>
      <div className={styles.section}>
        <NodeOverview
          spID={spID}
          serviceType={ServiceType.ContentNode}
          version={contentNode?.version}
          endpoint={contentNode?.endpoint}
          operatorWallet={contentNode?.owner}
          delegateOwnerWallet={contentNode?.delegateOwnerWallet}
          isOwner={isOwner}
          isDeregistered={contentNode?.isDeregistered}
          isLoading={status === Status.Loading}
        />
      </div>
      {contentNode ? (
        <div className={clsx(styles.section, styles.chart)}>
          <IndividualNodeUptimeChart
            nodeType={ServiceType.ContentNode}
            node={contentNode.endpoint}
          />
        </div>
      ) : null}
    </>
  )
}

type DiscoveryNodeProps = {
  spID: number
  accountWallet: Address | undefined
}
const DiscoveryNode: React.FC<DiscoveryNodeProps> = ({
  spID,
  accountWallet
}: DiscoveryNodeProps) => {
  const { node: discoveryNode, status } = useDiscoveryProvider({ spID })

  const pushRoute = usePushRoute()
  if (status === Status.Failure) {
    pushRoute(NOT_FOUND)
    return null
  }

  const isOwner = accountWallet === discoveryNode?.owner

  return (
    <>
      <div className={styles.section}>
        <NodeOverview
          spID={spID}
          serviceType={ServiceType.DiscoveryProvider}
          version={discoveryNode?.version}
          endpoint={discoveryNode?.endpoint}
          operatorWallet={discoveryNode?.owner}
          delegateOwnerWallet={discoveryNode?.delegateOwnerWallet}
          isOwner={isOwner}
          isDeregistered={discoveryNode?.isDeregistered}
          isLoading={status === Status.Loading}
        />
      </div>
      {discoveryNode ? (
        <>
          <div className={clsx(styles.section, styles.chart)}>
            <IndividualServiceApiCallsChart node={discoveryNode?.endpoint} />
            <IndividualServiceUniqueUsersChart node={discoveryNode?.endpoint} />
          </div>
          <div className={clsx(styles.section, styles.chart)}>
            <IndividualNodeUptimeChart
              nodeType={ServiceType.DiscoveryProvider}
              node={discoveryNode.endpoint}
            />
          </div>
        </>
      ) : null}
    </>
  )
}

type ValidatorProps = { spID: number; accountWallet: Address | undefined }
const Validator: React.FC<ValidatorProps> = ({
  spID,
  accountWallet
}: ContentNodeProps) => {
  const { node: validator, status } = useValidator({ spID })

  if (status === Status.Failure) {
    return null
  }

  const isOwner = accountWallet === validator?.owner

  return (
    <>
      <div className={styles.section}>
        <NodeOverview
          spID={spID}
          serviceType={ServiceType.Validator}
          version={validator?.version}
          endpoint={validator?.endpoint}
          operatorWallet={validator?.owner}
          delegateOwnerWallet={validator?.delegateOwnerWallet}
          isOwner={isOwner}
          isDeregistered={validator?.isDeregistered}
          isLoading={status === Status.Loading}
        />
      </div>
      {validator ? (
        <div className={clsx(styles.section, styles.chart)}>
          <IndividualNodeUptimeChart
            nodeType={ServiceType.Validator}
            node={validator.endpoint}
          />
        </div>
      ) : null}
    </>
  )
}

type NodeProps = {
  nodeType: ServiceType
}
const Node = ({ nodeType }: NodeProps) => {
  const { spID: spIDParam } = useParams<{ spID: string }>()
  const spID = parseInt(spIDParam, 10)
  const { wallet: accountWallet } = useAccount()

  return (
    <Page
      icon={IconEmbed}
      title={
        nodeType === ServiceType.DiscoveryPovider
          ? messages.discovery
          : messages.validator
      }
      className={styles.container}
    >
      {nodeType === ServiceType.DiscoveryProvider ? (
        <DiscoveryNode spID={spID} accountWallet={accountWallet} />
      ) : nodeType === ServiceType.ContentNode ? (
        <ContentNode spID={spID} accountWallet={accountWallet} />
      ) : (
        <Validator spID={spID} accountWallet={accountWallet} />
      )}
    </Page>
  )
}

export default Node
