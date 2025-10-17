import { PropsWithChildren, useCallback } from 'react'

import {
  Box,
  Divider,
  Flex,
  HarmonyTheme,
  Text,
  useTheme
} from '@audius/harmony'
import BN from 'bn.js'
import { useSelector } from 'react-redux'

import Button, { ButtonType } from 'components/Button'
import { Card } from 'components/Card/Card'
import ConfirmTransactionModal, {
  Delegating,
  StandaloneBox,
  ToOperator
} from 'components/ConfirmTransactionModal'
import DelegateStakeModal from 'components/DelegateStakeModal'
import DelegatorsModal from 'components/DelegatorsModal'
import DisplayAudio from 'components/DisplayAudio'
import { InfoBox } from 'components/InfoBox/InfoBox'
import {
  AggregateContributionInfoTooltip,
  AppliedInfoTooltipProps,
  DelegatedAudioInfoTooltip,
  DelegatorsInfoTooltip,
  EstimatedAudioRewardsPoolInfoTooltip,
  NodeOperatorInfoTooltip,
  NodesInfoTooltip,
  NodeServiceFeeInfoTooltip,
  OperatorStakeInfoTooltip
} from 'components/InfoTooltip/InfoTooltips'
import Loading from 'components/Loading'
import MinimumDelegationAmountModal from 'components/MinimumDelegationAmountModal'
import MyEstimatedRewards from 'components/MyEstimatedRewards'
import OperatorCutModal from 'components/OperatorCutModal'
import { PlainLink } from 'components/PlainLink/PlainLink'
import { BasicTooltip, Position } from 'components/Tooltip/Tooltip'
import { TransactionStatusContent } from 'components/TransactionStatus/TransactionStatus'
import { ManageDelegation } from 'components/UpdateDelegationModal/UpdateDelegationModal'
import UpdateStakeModal from 'components/UpdateStakeModal'
import AudiusClient from 'services/Audius/AudiusClient'
import {
  useAccount,
  useAccountUser,
  usePendingTransactions
} from 'store/account/hooks'
import { useMakeClaim } from 'store/actions/makeClaim'
import useUndelegateStake from 'store/actions/undelegateStake'
import { usePendingClaim } from 'store/cache/claims/hooks'
import { getDelegatorInfo, useEthBlockNumber } from 'store/cache/protocol/hooks'
import { useUser, useUserDelegates } from 'store/cache/user/hooks'
import { Address, Operator, PendingTransactionName, Status } from 'types'
import getActiveStake, { getTotalActiveDelegatedStake } from 'utils/activeStake'
import { TICKER } from 'utils/consts'
import { formatShortWallet } from 'utils/format'
import { useModalControls } from 'utils/hooks'
import { COOLDOWN_PERIOD_DOCS_URL } from 'utils/routes'
import { sharedMessages } from 'utils/sharedMessages'

import styles from './ManageService.module.css'

const messages = {
  ownerTitle: 'Your Nodes',
  nonOwnertitle: 'Operator’s Nodes',
  increase: 'Increase Stake',
  decrease: 'Decrease Stake',
  deployerCut: 'Deployer Cut',
  activeServices: 'Active Services',
  minimunDelegationAmount: 'Minimum Delegation Amount',
  aggregateContribution: 'Aggregate Contribution',
  contentNodes: 'Content Nodes',
  contentNodesSingular: 'Content Node',
  discoveryNodes: 'Discovery Nodes',
  discoveryNodesSingular: 'Discovery Node',
  nodes: 'Nodes',
  nodesSingular: 'Node',
  delegators: 'Delegators',
  delegatorsSingular: 'Delegator',
  change: 'Change',
  manage: 'Manage',
  view: 'View',
  claim: 'Make Claim',
  claimForOperator: 'Claim For Operator',
  rewardsPool: `Estimated ${TICKER} Rewards Pool`,
  weekly: 'Weekly',
  annual: 'Annual',
  operatorStake: `Operator Stake (${TICKER})`,
  operatorServiceFee: 'Operator Service Fee',
  minimumAmount: 'Minimum Delegation Amount',
  unclaimed: 'Unclaimed',
  rewardDistribution: 'Reward Distribution',
  registerNode: 'Register Node',
  delegatedAudio: `Your Delegated ${TICKER}`,
  delegatorLimitReached: 'This operator has reached its delegator limit.',
  delegate: 'Delegate',
  undelegate: 'Undelegate',
  operatorName: 'Operator Name',
  operatorImage: 'Operator Profile Image',
  undelegateAudio: `Undelegate ${TICKER}`,
  cantUndelegateMultiple:
    'Cannot undelegate while you have another pending Undelegate (Decrease Delegation) transaction.',
  cantUndelegatePendingClaim:
    'Cannot undelegate while the operator has an unclaimed reward distribution',
  cantDelegatePendingClaim:
    'Cannot delegate while the operator has an unclaimed reward distribution',
  cantDelegateTotalStakeOutOfBounds:
    "Cannot delegate because the operator's total stake is out of bounds",
  cantUpdateDelegationPendingClaim:
    'Cannot update delegation while the operator has an unclaimed reward distribution',
  delegatorCantClaimTotalStakeOutOfBounds:
    "Cannot claim because the operator's total stake is out of bounds",
  operatorCantClaimTotalStakeOufOfBounds:
    'Cannot claim because your total stake is out of bounds.',
  open: 'Open'
}

interface ManageServiceProps {
  className?: string
  showViewActiveServices?: boolean
  showPendingTransactions?: boolean
  wallet: string
  onClickNodesTable?: () => void
}

const Delegators = ({
  wallet,
  numberDelegators
}: {
  wallet: Address
  numberDelegators: number
}) => {
  const { isOpen, onClick, onClose } = useModalControls()
  return (
    <>
      <ServiceBigStat
        onClick={onClick}
        data={numberDelegators}
        label={
          numberDelegators === 1
            ? messages.delegatorsSingular
            : messages.delegators
        }
        tooltipComponent={DelegatorsInfoTooltip}
      />
      <DelegatorsModal wallet={wallet} isOpen={isOpen} onClose={onClose} />
    </>
  )
}

type UndelegateSectionProps = {
  name?: string
  wallet: string
  delegates: BN
  cantUndelegateReason: string
}

const UndelegateSection = ({
  name,
  wallet,
  delegates,
  cantUndelegateReason
}: UndelegateSectionProps) => {
  const {
    isOpen: isUndelegateOpen,
    onClick: onClickUndelegate,
    onClose: onCloseUndelegate
  } = useModalControls()

  const {
    status: undelegateStatus,
    error: undelegateError,
    undelegateStake
  } = useUndelegateStake()

  const onConfirmUndelegate = useCallback(() => {
    undelegateStake(wallet, delegates)
  }, [undelegateStake, delegates, wallet])

  const bottomBox = (
    <Flex direction='column' gap='xl' mb='xl'>
      <ToOperator
        name={name || formatShortWallet(wallet ?? '')}
        wallet={wallet}
        isFrom
      />
      <InfoBox
        description={sharedMessages.undelegateCooldown}
        ctaHref={COOLDOWN_PERIOD_DOCS_URL}
        ctaText={sharedMessages.unddelegateCooldownCta}
      />
    </Flex>
  )
  const undelegateBox = <Delegating isUndelegating amount={delegates} />

  return (
    <>
      <BasicTooltip
        position={Position.TOP}
        text={cantUndelegateReason}
        isDisabled={!cantUndelegateReason}
      >
        <Button
          className={styles.undelegateButton}
          text={messages.undelegate}
          type={ButtonType.PRIMARY}
          isDisabled={Boolean(cantUndelegateReason)}
          onClick={onClickUndelegate}
        />
      </BasicTooltip>
      <ConfirmTransactionModal
        topBox={undelegateBox}
        bottomBox={bottomBox}
        onConfirm={onConfirmUndelegate}
        onClose={onCloseUndelegate}
        isOpen={isUndelegateOpen}
        error={undelegateError}
        status={undelegateStatus}
        withArrow={false}
      />
    </>
  )
}

type ActionPlainLinkProps = PropsWithChildren<{
  onClick?: () => void
  disabled?: boolean
  tooltipText?: string
  tooltipDisabled?: boolean
}>

const ActionPlainLink = ({
  children,
  onClick,
  tooltipText,
  disabled,
  tooltipDisabled
}: ActionPlainLinkProps) => {
  return (
    <BasicTooltip
      position={Position.TOP}
      text={tooltipText}
      isDisabled={tooltipDisabled || !tooltipText}
    >
      <PlainLink onClick={onClick} disabled={disabled}>
        {children}
      </PlainLink>
    </BasicTooltip>
  )
}

type ServiceBigStatProps = {
  data: number | string
  label: string
  onClick?: () => void
  tooltipComponent?: React.ComponentType<AppliedInfoTooltipProps>
}

const ServiceBigStat = ({
  data,
  label,
  onClick,
  tooltipComponent
}: ServiceBigStatProps) => {
  const { color } = useTheme() as HarmonyTheme
  const TooltipComponent = tooltipComponent
  return (
    <Card
      ph='l'
      h='100%'
      aria-role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${messages.open} ${label}` : undefined}
      onClick={onClick}
      css={{
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: color.background.surface1,
        '&:hover': {
          backgroundColor: onClick
            ? color.background.surface2
            : color.background.surface1
        }
      }}
    >
      <Flex gap='s' alignItems='center' h='100%'>
        <Text variant='heading' size='s'>
          {data}
        </Text>
        <Flex inline gap='xs' alignItems='center'>
          <Text variant='body' size='l' strength='strong' color='subdued'>
            {label}
          </Text>
          <TooltipComponent color='subdued' />
        </Flex>
      </Flex>
    </Card>
  )
}

type ServiceSmallStatProps = {
  data: BN | number | string
  isAudioAmount?: boolean
  label: string
  tooltipComponent?: React.ComponentType<AppliedInfoTooltipProps>
}
const ServiceSmallStat = ({
  data,
  isAudioAmount,
  label,
  tooltipComponent
}: ServiceSmallStatProps) => {
  const TooltipComponent = tooltipComponent
  return (
    <Flex gap='s'>
      <Text variant='heading' size='s'>
        {isAudioAmount ? (
          <DisplayAudio amount={data as BN} />
        ) : (
          (data as number | string)
        )}
      </Text>
      <Flex inline gap='xs' alignItems='center'>
        <Text variant='body' size='l' strength='strong' color='subdued'>
          {label}
        </Text>
        {TooltipComponent == null ? null : <TooltipComponent color='subdued' />}
      </Flex>
    </Flex>
  )
}

type OperatorServiceFeeProps = {
  deployerCut: number
  enableChange?: boolean
}

const OperatorServiceFee = ({
  deployerCut,
  enableChange
}: OperatorServiceFeeProps) => {
  const { isOpen, onClick, onClose } = useModalControls()

  return (
    <Flex gap='l' alignItems='baseline'>
      <ServiceSmallStat
        data={`${deployerCut}%`}
        label={messages.operatorServiceFee}
        tooltipComponent={NodeServiceFeeInfoTooltip}
      />
      {enableChange ? (
        <ActionPlainLink onClick={onClick}>{messages.change}</ActionPlainLink>
      ) : null}
      {enableChange ? (
        <OperatorCutModal cut={deployerCut} isOpen={isOpen} onClose={onClose} />
      ) : null}
    </Flex>
  )
}

type MinimumDelegationAmountProps = {
  minimumDelegationAmount: BN
  enableChange?: boolean
}

const MinimumDelegationAmount = ({
  minimumDelegationAmount,
  enableChange
}: MinimumDelegationAmountProps) => {
  const { isOpen, onClick, onClose } = useModalControls()
  return (
    <Flex gap='l' alignItems='baseline'>
      <ServiceSmallStat
        data={minimumDelegationAmount}
        isAudioAmount
        label={messages.minimunDelegationAmount}
      />
      {enableChange ? (
        <ActionPlainLink onClick={onClick}>{messages.change}</ActionPlainLink>
      ) : null}
      {enableChange ? (
        <MinimumDelegationAmountModal
          minimumDelegationAmount={minimumDelegationAmount}
          isOpen={isOpen}
          onClose={onClose}
        />
      ) : null}
    </Flex>
  )
}

type StakeProps = {
  stake: BN
  enableChange?: boolean
  disabledReason?: string
}

const Stake = ({ stake, enableChange, disabledReason }: StakeProps) => {
  const { isOpen, onClick, onClose } = useModalControls()

  return (
    <Flex gap='l' alignItems='baseline'>
      <ServiceSmallStat
        data={stake}
        label={messages.operatorStake}
        isAudioAmount
        tooltipComponent={OperatorStakeInfoTooltip}
      />
      {enableChange ? (
        <ActionPlainLink onClick={onClick}>{messages.change}</ActionPlainLink>
      ) : null}
      <UpdateStakeModal isOpen={isOpen} onClose={onClose} />
    </Flex>
  )
}

const ManageService = (props: ManageServiceProps) => {
  const { wallet } = props

  const { isLoggedIn } = useAccount()
  const { status: accountUserStatus, user: accountUser } = useAccountUser()
  const { maxDelegators } = useSelector(getDelegatorInfo)
  const {
    user: serviceUser,
    status: serviceUserStatus,
    audiusProfile: serviceUserAudiusProfile
  } = useUser({ wallet })
  const { status: userDelegatesStatus, delegates } = useUserDelegates({
    wallet
  })
  const { color } = useTheme() as HarmonyTheme
  const activeStake = getActiveStake(serviceUser)
  const totalActiveDelegated = getTotalActiveDelegatedStake(serviceUser)
  const pendingTx = usePendingTransactions()
  const ethBlockNumber = useEthBlockNumber()
  const pendingClaim = usePendingClaim(wallet)

  const isServiceProvider =
    serviceUserStatus === Status.Success && 'serviceProvider' in serviceUser
  const aggregateContribution = activeStake.add(totalActiveDelegated)
  const currentUserHasPendingTx =
    pendingTx.status === Status.Success &&
    Array.isArray(pendingTx.transactions) &&
    pendingTx.transactions?.length !== 0
  const currentUserHasPendingUndelegateRequest =
    currentUserHasPendingTx &&
    pendingTx.transactions.some(
      (tx) => tx.name === PendingTransactionName.Undelegate
    )

  const isTotalStakeInBounds =
    (serviceUser as Operator)?.serviceProvider?.validBounds ?? false
  const numNodes =
    isServiceProvider &&
    (serviceUser as Operator).discoveryProviders.length +
      (serviceUser as Operator).contentNodes.length +
      (serviceUser as Operator).validators.length
  const numDelegators = isServiceProvider
    ? (serviceUser as Operator).delegators.length
    : 0
  const deployerCut = isServiceProvider
    ? (serviceUser as Operator)?.serviceProvider?.deployerCut
    : null
  const isOwner =
    accountUserStatus === Status.Success && wallet === accountUser?.wallet
  const minDelegationAmount = isServiceProvider
    ? (serviceUser as Operator)?.minDelegationAmount
    : null

  const isDoneLoading =
    accountUserStatus === Status.Success &&
    pendingClaim.status === Status.Success &&
    userDelegatesStatus === Status.Success
  const showDelegate =
    isDoneLoading && (numNodes ?? 0) > 0 && !isOwner && delegates.isZero()
  const showUndelegate =
    isDoneLoading &&
    !isOwner &&
    pendingTx.status === Status.Success &&
    !delegates.isZero()
  const cantUndelegateReason = pendingClaim.hasClaim
    ? messages.cantUndelegatePendingClaim
    : currentUserHasPendingUndelegateRequest
      ? messages.cantUndelegateMultiple
      : null
  const isDelegatorLimitReached =
    maxDelegators !== undefined &&
    (serviceUser as Operator)?.delegators?.length >= maxDelegators
  const cantDelegateReason = isDelegatorLimitReached
    ? messages.delegatorLimitReached
    : pendingClaim.hasClaim
      ? messages.cantDelegatePendingClaim
      : !isTotalStakeInBounds
        ? messages.cantDelegateTotalStakeOutOfBounds
        : null

  const isClaimDisabled = !isTotalStakeInBounds

  const {
    isOpen: isClaimModalOpen,
    onClick: onClickClaimModal,
    onClose: onCloseClaimModal
  } = useModalControls()

  const {
    isOpen: isDelegateOpen,
    onClick: onClickDelegate,
    onClose: onCloseDelegate
  } = useModalControls()
  const { status: claimStatus, error, makeClaim } = useMakeClaim()

  const onConfirm = useCallback(() => {
    makeClaim(serviceUser.wallet)
  }, [serviceUser?.wallet, makeClaim])

  const makeClaimBox = <StandaloneBox> {messages.claim} </StandaloneBox>

  return (
    <Card direction='column'>
      <Flex
        pv='l'
        ph='xl'
        borderBottom='default'
        justifyContent='space-between'
        alignItems='center'
        w='100%'
      >
        <Flex inline gap='xs' alignItems='center'>
          <Text variant='heading' size='s'>
            {isOwner ? messages.ownerTitle : messages.nonOwnertitle}
          </Text>
          {isOwner ? null : <NodeOperatorInfoTooltip />}
        </Flex>
        <Flex gap='xl' alignItems='center'>
          <Box css={{ textAlign: 'end' }}>
            <Text variant='heading' size='m' color='accent'>
              {AudiusClient.displayShortAud(aggregateContribution)}
            </Text>

            <Flex inline gap='xs' alignItems='center'>
              <Text variant='body' size='m' strength='strong' color='subdued'>
                {messages.aggregateContribution}
              </Text>
              <AggregateContributionInfoTooltip color='subdued' />
            </Flex>
          </Box>
        </Flex>
      </Flex>
      <Flex pv='l' ph='xl' gap='2xl' alignItems='stretch' wrap='wrap'>
        <Flex direction='column' alignItems='stretch' gap='s'>
          {numNodes ? (
            <ServiceBigStat
              data={numNodes}
              label={numNodes === 1 ? messages.nodesSingular : messages.nodes}
              tooltipComponent={NodesInfoTooltip}
              onClick={() => props.onClickNodesTable?.()}
            />
          ) : null}
          {numDelegators ? (
            <Delegators
              wallet={serviceUser?.wallet}
              numberDelegators={numDelegators}
            />
          ) : null}
        </Flex>
        <Flex direction='column' gap='xl' css={{ flexGrow: 1 }}>
          <Flex direction='column' gap='l'>
            <Flex inline gap='xs' alignItems='center'>
              <Text variant='body' size='l' strength='strong' color='subdued'>
                {messages.rewardsPool}
              </Text>
              <EstimatedAudioRewardsPoolInfoTooltip color='subdued' />
            </Flex>
            <Flex direction='column' gap='m'>
              <MyEstimatedRewards wallet={wallet} />
            </Flex>
          </Flex>
          <Divider css={{ borderColor: color.neutral.n100 }} />
          <Flex direction='column' gap='m'>
            <Stake stake={activeStake} enableChange={isOwner} />
            {deployerCut == null ? (
              <Loading />
            ) : (
              <OperatorServiceFee
                deployerCut={deployerCut}
                enableChange={isOwner}
              />
            )}
            {minDelegationAmount == null ? (
              <Loading />
            ) : (
              <MinimumDelegationAmount
                minimumDelegationAmount={minDelegationAmount}
                enableChange={isOwner}
              />
            )}
            {pendingClaim.status !== Status.Success ||
            !pendingClaim.hasClaim ? null : (
              <>
                <Flex gap='l' alignItems='baseline'>
                  <Flex gap='s'>
                    <ServiceSmallStat
                      data={messages.unclaimed}
                      label={messages.rewardDistribution}
                    />
                  </Flex>
                  {isLoggedIn ? (
                    <ActionPlainLink
                      tooltipDisabled={!isClaimDisabled}
                      tooltipText={
                        isOwner
                          ? messages.operatorCantClaimTotalStakeOufOfBounds
                          : messages.delegatorCantClaimTotalStakeOutOfBounds
                      }
                      onClick={onClickClaimModal}
                      disabled={isClaimDisabled}
                    >
                      {isOwner ? messages.claim : messages.claimForOperator}
                    </ActionPlainLink>
                  ) : null}
                </Flex>
                <ConfirmTransactionModal
                  isOpen={isClaimModalOpen}
                  onClose={onCloseClaimModal}
                  withArrow={false}
                  topBox={makeClaimBox}
                  onConfirm={onConfirm}
                  status={claimStatus}
                  error={error}
                />
              </>
            )}
          </Flex>
        </Flex>
      </Flex>
      {!!ethBlockNumber &&
      props.showPendingTransactions &&
      currentUserHasPendingTx &&
      isOwner ? (
        <Box p='xl' borderTop='default'>
          <TransactionStatusContent
            ethBlockNumber={ethBlockNumber}
            transactions={pendingTx.transactions}
          />
        </Box>
      ) : null}
      {userDelegatesStatus === Status.Success && !delegates.isZero() ? (
        <Flex
          alignItems='center'
          justifyContent='space-between'
          p='xl'
          borderTop='default'
        >
          <Flex
            gap='l'
            alignItems='center'
            css={{ flexGrow: 1, maxWidth: 226 }}
          >
            <ManageDelegation
              delegates={delegates}
              wallet={wallet}
              disabledReason={
                pendingClaim.status === Status.Success && pendingClaim.hasClaim
                  ? messages.cantUpdateDelegationPendingClaim
                  : null
              }
            />
            {showUndelegate ? (
              <UndelegateSection
                cantUndelegateReason={cantUndelegateReason}
                wallet={serviceUser.wallet}
                name={serviceUserAudiusProfile?.name || serviceUser.name}
                delegates={delegates}
              />
            ) : null}
          </Flex>
          <Flex direction='column' alignItems='flex-end'>
            <Text variant='heading' size='m' color='accent'>
              {AudiusClient.displayShortAud(delegates)}
            </Text>
            <Flex inline gap='xs' alignItems='center'>
              <Text variant='body' size='l' color='subdued' strength='strong'>
                {messages.delegatedAudio}
              </Text>
              <DelegatedAudioInfoTooltip color='subdued' />
            </Flex>
          </Flex>
        </Flex>
      ) : null}
      {showDelegate ? (
        <Flex
          alignItems='center'
          justifyContent='space-between'
          p='xl'
          borderTop='default'
        >
          <BasicTooltip
            position={Position.TOP}
            text={cantDelegateReason}
            isDisabled={!cantDelegateReason}
          >
            <Button
              text={messages.delegate}
              type={ButtonType.PRIMARY}
              isDisabled={Boolean(cantDelegateReason)}
              onClick={onClickDelegate}
            />
          </BasicTooltip>
          <DelegateStakeModal
            serviceOperatorWallet={wallet}
            isOpen={isDelegateOpen}
            onClose={onCloseDelegate}
          />
        </Flex>
      ) : null}
    </Card>
  )
}

export default ManageService
