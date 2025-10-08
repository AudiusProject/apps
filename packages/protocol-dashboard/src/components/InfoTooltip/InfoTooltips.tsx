import { IconColors } from '@audius/harmony'

import { InfoTooltip } from './InfoTooltip'

const messages = {
  uniqueUsersTooltipTitle: 'How is this number calculated?',
  uniqueUsersTooltipBody:
    'The unique user number is the sum of unique IP addresses per time interval interacting with Discovery Nodes on the Audius network.',
  uniqueUsersTooltipCtaText: 'More information',
  apiCallsTooltipTitle: 'What are API Calls?',
  apiCallsTooltipBody:
    "API Calls represent the number of requests made to the Audius API. Each call signifies an interaction, such as data retrieval or an update, performed between users' applications and the Audius platform.",
  apiCallsCtaText: 'Build on Audius',
  globalStakedAudioTooltipTitle: 'What is this?',
  globalStakedAudioTooltipBody:
    'Global Staked $AUDIO is the aggregate sum of all the staked $AUDIO across the entire Audius network.',
  estimatedRewardRateTooltipTitle: 'What is this?',
  estimatedRewardRateTooltipBody:
    'This is an estimate of the rate rewards are rewarded to participants across the Audius network.',
  playsTooltipTitle: 'What Counts as a Play?',
  playsTooltipBody:
    "A 'Play' is counted each time a Track is streamed on the Audius platform, including streams initiated through API applications. This comprehensive count aids Artists in gauging the popularity and reach of their music across different access points.",
  topApiAppsTooltipTitle: 'What are Top API Apps?',
  topApiAppsTooltipBody:
    "'Top API Apps' refers to the most actively used third-party applications integrated with the Audius API, showcasing the apps that are currently most impactful within the Audius ecosystem.",
  delegatingToTooltipTitle: 'What is Delegating?',
  delegatingToTooltipBody:
    'This indicates the node operator to whom a user has delegated their $AUDIO tokens. By delegating, users are able to contribute to the network and earn rewards without operating a node. Node operators can set a percentage fee on all rewards distributed.',
  delegatedAudioTooltipTitle: 'What is Delegated $AUDIO?',
  delegatedAudioTooltipBody:
    "'Delegated $AUDIO' refers to the amount of $AUDIO tokens a user has contributed to this node operator.",
  delegatorsTooltipTitle: 'Who are Delegators?',
  delegatorsTooltipBody:
    "'Delegators' are users who have contributed their $AUDIO tokens to this specific node operator.",
  estimatedAudioRewardTooltipTitle: 'What is this?',
  estimatedAudioRewardTooltipBody:
    "'Estimated $AUDIO Rewards' refer to the projected earnings a user can expect from staking, or delegating $AUDIO tokens to a node operator. This estimation is based on current network conditions and the amount of $AUDIO contributed.",
  aggregateContributionTooltipTitle: 'What is Aggregate Contribution?',
  aggregateContributionTooltipBody:
    "'Aggregate Contribution' refers to the total amount of $AUDIO tokens collectively delegated to a specific node operator.",
  topContributorsTooltipTitle: 'Who are Top Contributors?',
  topContributorsTooltipBody:
    "'Top Contributors' is a ranked list of wallet addresses based on their Voting Weight, which reflects the amount of $AUDIO tokens they have staked or delegated.",
  nodesTooltipTitle: 'What are Validator Nodes?',
  nodesTooltipBody:
    'Validator Nodes are vital for storing and maintaining the availability of all of the media on the Audius network as well as validating all transactions that happen on the network.',
  discoveryNodesTooltipTitle: 'What are Discovery Nodes?',
  discoveryNodesTooltipBody:
    'Discovery Nodes are services in the Audius network responsible for indexing metadata and making data available for queries. They store and update information such as user, track, and playlist details, along with social features, facilitating efficient data access for users.',
  contentNodesTooltipTitle: 'What are Content Nodes?',
  contentNodesTooltipBody:
    'Content Nodes are vital for storing and maintaining the availability of all of the media on the Audius network.',
  estimatedAudioRewardsPoolTooltipTitle: 'What is this?',
  estimatedAudioRewardsPoolTooltipBody:
    "The 'Estimated $AUDIO Rewards Pool' represents the total rewards projected to be distributed to a node operator and its delegators.",
  operatorStakeTooltipTitle: 'What is Operator Stake?',
  operatorStakeTooltipBody:
    "'Operator Stake' refers to the total amount of $AUDIO tokens that a node operator has contributed to the network themselves.",
  nodeServiceFeeTooltipTitle: 'What is this?',
  nodeServiceFeeTooltipBody:
    "The 'Operator Service Fee' refers to the percentage of staking rewards that node operators earn for running their nodes. The fee amount is configurable by the node operator and is deducted from the delegator rewards before they're distributed.",
  nodeOperatorTooltipTitle: 'What is a Node Operator?',
  nodeOperatorTooltipBody:
    'A Node Operator is an individual or organization responsible for running a Node on the Audius Network.',
  registerNodeTooltipTitle: 'How to Register a Node?',
  registerNodeTooltipBody:
    'Node Operators run the decentralized infrastructure that powers the Audius Network.  To learn more about running a node, please read the docs.',
  registerNodeCtaText: 'Running a Node',
  storageCommitmentTooltipTitle: 'What is Storage Commitment?',
  storageCommitmentTooltipBody:
    'Storage Commitment is the amount of data that each node is responsible for storing. The calculation is the total storage demand of all files on the protocol, multiplied by the replication factor, and divided by the number of registered nodes.'
}

const CTA_HREFS = {
  uniqueUsers:
    'https://help.audius.co/help/How-Are-User-Numbers-Calculated-on-Audius-718e9',
  registerNode:
    'https://docs.audius.org/token/running-a-node/setup/registration',
  apiCalls: 'https://docs.audius.org/developers'
}

export type AppliedInfoTooltipProps = {
  color?: IconColors
  size?: 'default' | 'large'
}

export const UniqueUsersInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.uniqueUsersTooltipTitle}
      body={messages.uniqueUsersTooltipBody}
      ctaText={messages.uniqueUsersTooltipCtaText}
      ctaHref={CTA_HREFS.uniqueUsers}
    />
  )
}

export const APICallsInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.apiCallsTooltipTitle}
      body={messages.apiCallsTooltipBody}
      ctaText={messages.apiCallsCtaText}
      ctaHref={CTA_HREFS.apiCalls}
    />
  )
}

export const GlobalStakedInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.globalStakedAudioTooltipTitle}
      body={messages.globalStakedAudioTooltipBody}
    />
  )
}

export const EstimatedRewardRateInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.estimatedRewardRateTooltipTitle}
      body={messages.estimatedRewardRateTooltipBody}
    />
  )
}

export const PlaysInfoTooltip = ({ color, size }: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.playsTooltipTitle}
      body={messages.playsTooltipBody}
    />
  )
}

export const TopApiAppsInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.topApiAppsTooltipTitle}
      body={messages.topApiAppsTooltipBody}
    />
  )
}

export const DelegatingToInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.delegatingToTooltipTitle}
      body={messages.delegatingToTooltipBody}
    />
  )
}

export const DelegatedAudioInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.delegatedAudioTooltipTitle}
      body={messages.delegatedAudioTooltipBody}
    />
  )
}

export const EstimatedAudioRewardInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.estimatedAudioRewardTooltipTitle}
      body={messages.estimatedAudioRewardTooltipBody}
    />
  )
}

export const AggregateContributionInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.aggregateContributionTooltipTitle}
      body={messages.aggregateContributionTooltipBody}
    />
  )
}

export const TopContributorsInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.topContributorsTooltipTitle}
      body={messages.topContributorsTooltipBody}
    />
  )
}

export const NodesInfoTooltip = ({ color, size }: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.nodesTooltipTitle}
      body={messages.nodesTooltipBody}
    />
  )
}

export const DiscoveryNodesInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.discoveryNodesTooltipTitle}
      body={messages.discoveryNodesTooltipBody}
    />
  )
}

export const ContentNodesInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.contentNodesTooltipTitle}
      body={messages.contentNodesTooltipBody}
    />
  )
}
export const EstimatedAudioRewardsPoolInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.estimatedAudioRewardsPoolTooltipTitle}
      body={messages.estimatedAudioRewardsPoolTooltipBody}
    />
  )
}

export const OperatorStakeInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.operatorStakeTooltipTitle}
      body={messages.operatorStakeTooltipBody}
    />
  )
}

export const NodeServiceFeeInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.nodeServiceFeeTooltipTitle}
      body={messages.nodeServiceFeeTooltipBody}
    />
  )
}

export const NodeOperatorInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.nodeOperatorTooltipTitle}
      body={messages.nodeOperatorTooltipBody}
    />
  )
}

export const RegisterNodeInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.registerNodeTooltipTitle}
      body={messages.registerNodeTooltipBody}
      ctaHref={CTA_HREFS.registerNode}
      ctaText={messages.registerNodeCtaText}
    />
  )
}

export const DelegatorsInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.delegatorsTooltipTitle}
      body={messages.delegatorsTooltipBody}
    />
  )
}

export const StorageCommitmentInfoTooltip = ({
  color,
  size
}: AppliedInfoTooltipProps) => {
  return (
    <InfoTooltip
      color={color}
      size={size}
      title={messages.storageCommitmentTooltipTitle}
      body={messages.storageCommitmentTooltipBody}
    />
  )
}
