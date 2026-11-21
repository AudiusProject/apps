import React, { ReactNode, useCallback } from 'react'

import clsx from 'clsx'
import { useSelector } from 'react-redux'

import DisplayAudio from 'components/DisplayAudio'
import Proposal from 'components/Proposal'
import { BasicTooltip, Position } from 'components/Tooltip/Tooltip'
import {
  ClaimProcessedEvent,
  DelegateClaimEvent,
  DelegateDecreaseStakeEvent,
  DelegateIncreaseStakeEvent,
  GovernanceProposalEvent,
  GovernanceVoteEvent,
  GovernanceVoteUpdateEvent,
  ServiceProviderDecreaseStakeEvent,
  ServiceProviderDeregisteredEvent,
  ServiceProviderIncreaseStakeEvent,
  ServiceProviderRegisteredEvent,
  TimelineEvent as TimelineEventType
} from 'models/TimelineEvents'
import { useProposal } from 'store/cache/proposals/hooks'
import { useBlock } from 'store/cache/protocol/hooks'
import { getUser } from 'store/cache/user/hooks'
import { Address } from 'types'
import { TICKER } from 'utils/consts'
import { usePushRoute } from 'utils/effects'
import { formatShortWallet, getDate } from 'utils/format'
import { createStyles } from 'utils/mobile'
import { accountPage } from 'utils/routes'

import desktopStyles from './TimelineEvent.module.css'
import mobileStyles from './TimelineEventMobile.module.css'
const styles = createStyles({ desktopStyles, mobileStyles })

const DisplayUser = ({ wallet }: { wallet: Address }) => {
  const user = useSelector(getUser(wallet))
  const pushRoute = usePushRoute()
  const onClick = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      pushRoute(accountPage(wallet))
    },
    [pushRoute, wallet]
  )

  if (!user || !user.name || wallet === user.name) {
    return (
      <BasicTooltip
        position={Position.TOP}
        text={wallet}
        className={clsx(styles.userWalletName)}
      >
        <span onClick={onClick}>{formatShortWallet(wallet)}</span>
      </BasicTooltip>
    )
  }
  return (
    <BasicTooltip
      position={Position.TOP}
      text={wallet}
      className={clsx(styles.userWalletName)}
    >
      <span onClick={onClick}>{user.name}</span>
    </BasicTooltip>
  )
}

const VoteTimelineEvent = ({
  className,
  onClick,
  isDisabled,
  event
}: {
  className?: string
  onClick?: () => void
  isDisabled?: boolean
  event: GovernanceVoteEvent | GovernanceVoteUpdateEvent
}) => {
  const { proposal } = useProposal(event.proposalId)
  const header = 'VOTED'
  return proposal ? (
    <Proposal
      header={header}
      onClick={onClick}
      className={className}
      proposal={proposal}
      isDisabled={isDisabled}
      vote={event.vote}
    />
  ) : null
}

const ProposalTimelineEvent = ({
  event,
  className,
  isDisabled,
  onClick
}: {
  event: GovernanceProposalEvent
  className?: string
  isDisabled?: boolean
  onClick?: () => void
}) => {
  const { proposal } = useProposal(event.proposalId)
  const header = 'PROPOSED'
  if (proposal) {
    const modified = {
      ...proposal,
      description: `Proposed: ${proposal.description}`
    }
    return (
      <Proposal
        header={header}
        onClick={onClick}
        className={className}
        isDisabled={isDisabled}
        proposal={modified}
      />
    )
  }
  return null
}

const GenericTimelineEvent = ({
  className,
  header,
  title,
  blockNumber,
  isDisabled,
  onClick = () => {}
}: {
  onClick?: () => void
  header?: string
  className?: string
  isDisabled?: boolean
  title: ReactNode
  blockNumber: number
}) => {
  const block = useBlock(blockNumber)
  return (
    <div
      onClick={isDisabled ? onClick : () => {}}
      className={clsx(styles.container, {
        [styles.onClick]: !!onClick && !isDisabled,
        [className!]: !!className
      })}
    >
      <div className={styles.header}>{header}</div>
      <div className={styles.title}>{title}</div>
      {block && (
        <div className={styles.executed}>
          {`Executed ${getDate(block.timestamp * 1000)}`}
        </div>
      )}
    </div>
  )
}

const DelegationIncreaseEvent: React.FC<{
  event: DelegateIncreaseStakeEvent
  parentOnClick?: () => void
  className?: string
  isDisabled?: boolean
}> = ({ event, className, isDisabled, parentOnClick }) => {
  const received = event.direction === 'Received'
  const userWallet = received ? event.delegator : event.serviceProvider

  const onClick = () => {
    if (parentOnClick) parentOnClick()
  }

  const header = received ? 'DELEGATION' : 'DELEGATED'
  const title = (
    <span className={styles.titleContainer}>
      {received ? `Received` : `Delegated`}
      <DisplayAudio
        className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
        amount={event.increaseAmount}
      />
      {`${TICKER} ${received ? 'from' : 'to'} `}
      <span className={styles.titleSpacingLeft}>
        <DisplayUser wallet={userWallet} />
      </span>
    </span>
  )
  return (
    <GenericTimelineEvent
      header={header}
      onClick={onClick}
      isDisabled={isDisabled}
      className={className}
      title={title}
      blockNumber={event.blockNumber}
    />
  )
}

const DelegationDecreaseEvent: React.FC<{
  event: DelegateDecreaseStakeEvent
  parentOnClick?: () => void
  className?: string
  isDisabled?: boolean
}> = ({ event, className, parentOnClick, isDisabled }) => {
  const onClick = () => {
    if (parentOnClick) parentOnClick()
  }

  const renderRequestSent = () => {
    return (
      <>
        {`Requested to decrease delegation to`}
        <span className={styles.titleSpacingLeft}>
          <DisplayUser wallet={event.serviceProvider} />
        </span>
        <span className={styles.titleSpacingLeft}>{' by'}</span>
        <DisplayAudio
          className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
          amount={event.amount}
          label={TICKER}
        />
      </>
    )
  }

  const renderRequestReceived = () => {
    return (
      <>
        {`Delegator`}
        <span className={styles.titleSpacingLeft}>
          <DisplayUser wallet={event.delegator} />
        </span>
        <span
          className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
        >
          {`requested to decrease delegation by`}
        </span>
        <DisplayAudio
          className={clsx(styles.titleSpacingRight)}
          amount={event.amount}
          label={TICKER}
        />
      </>
    )
  }

  const renderEvaluatedSent = () => {
    return (
      <>
        {`Decreased delegation`}
        <DisplayAudio
          className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
          amount={event.amount}
        />
        {`${TICKER} to `}
        <span className={styles.titleSpacingLeft}>
          <DisplayUser wallet={event.serviceProvider} />
        </span>
      </>
    )
  }

  const renderEvaluatedReceived = () => {
    return (
      <>
        {`Delegator`}
        <span className={styles.titleSpacingLeft}>
          <DisplayUser wallet={event.delegator} />
        </span>
        <span
          className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
        >
          {'decreased delegation by'}
        </span>
        <DisplayAudio
          className={clsx(styles.titleSpacingRight)}
          amount={event.amount}
        />
        {TICKER}
      </>
    )
  }

  const renderCancelledSent = () => {
    return (
      <>
        {`Cancelled request to decrease delegation to `}
        <span className={styles.titleSpacingLeft}>
          <DisplayUser wallet={event.serviceProvider} />
        </span>
        <span className={styles.titleSpacingLeft}>{' by'}</span>
        <DisplayAudio
          className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
          amount={event.amount}
        />
        {TICKER}
      </>
    )
  }

  const renderCancelledReceived = () => {
    return (
      <>
        {'Delegator '}
        <span className={styles.titleSpacingLeft}>
          <DisplayUser wallet={event.delegator} />
        </span>
        <span className={styles.titleSpacingLeft}>
          {` cancelled request to decrease delegation by`}
        </span>
        <DisplayAudio
          className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
          amount={event.amount}
        />
        {TICKER}
      </>
    )
  }

  const headersMap = {
    Evaluated: {
      Sent: 'UNDELEGATED',
      Received: 'UNDELEGATION'
    },
    Cancelled: {
      Sent: 'UNDELEGATE REQUEST CANCELLED',
      Received: 'UNDELEGATION REQUEST CANCELLED'
    },
    Requested: {
      Sent: 'UNDELEGATE REQUESTED',
      Received: 'UNDELEGATION REQUESTED'
    }
  }

  const bodyMap = {
    Requested: { Sent: renderRequestSent, Received: renderRequestReceived },
    Evaluated: { Sent: renderEvaluatedSent, Received: renderEvaluatedReceived },
    Cancelled: { Sent: renderCancelledSent, Received: renderCancelledReceived }
  }

  const header = headersMap[event.data._type][event.direction]
  const body = bodyMap[event.data._type][event.direction]()
  const title = <span className={styles.titleContainer}>{body}</span>
  return (
    <GenericTimelineEvent
      onClick={onClick}
      isDisabled={isDisabled}
      className={className}
      header={header}
      title={title}
      blockNumber={event.blockNumber}
    />
  )
}

const RegistrationDeregistrationEvent: React.FC<{
  parentOnClick?: () => void
  event: ServiceProviderRegisteredEvent | ServiceProviderDeregisteredEvent
  className?: string
  isDisabled?: boolean
}> = ({ event, parentOnClick, className, isDisabled }) => {
  const didRegister = event._type === 'ServiceProviderRegistered'

  const onClick = () => {
    if (parentOnClick) parentOnClick()
  }
  const header = didRegister ? 'REGISTERED SERVICE' : 'DEREGISTERED SERVICE'
  const title = (
    <span className={styles.titleContainer}>
      {`${didRegister ? 'Registered' : 'Deregistered'} ${
        event.serviceType
      } at ${event.endpoint}`}
    </span>
  )
  return (
    <GenericTimelineEvent
      onClick={onClick}
      isDisabled={isDisabled}
      className={className}
      header={header}
      title={title}
      blockNumber={event.blockNumber}
    />
  )
}
const ClaimEvent: React.FC<{
  parentOnClick?: () => void
  event: DelegateClaimEvent | ClaimProcessedEvent
  className?: string
  isDisabled?: boolean
}> = ({ event, parentOnClick, className, isDisabled }) => {
  const onClick = () => {
    if (parentOnClick) parentOnClick()
  }
  const header = 'CLAIMED'
  const title = (
    <span className={styles.titleContainer}>
      <span className={styles.titleSpacingRight}>
        <DisplayUser wallet={event.claimer} />
      </span>
      {` Claims`}
      <DisplayAudio
        className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
        amount={event.rewards}
      />
      {` ${TICKER}`}
    </span>
  )
  return (
    <GenericTimelineEvent
      onClick={onClick}
      isDisabled={isDisabled}
      className={className}
      header={header}
      title={title}
      blockNumber={event.blockNumber}
    />
  )
}

const ServiceProviderStakeEvent: React.FC<{
  parentOnClick?: () => void
  event: ServiceProviderIncreaseStakeEvent | ServiceProviderDecreaseStakeEvent
  className?: string
  isDisabled?: boolean
}> = ({ event, parentOnClick, className, isDisabled }) => {
  const onClick = () => {
    if (parentOnClick) parentOnClick()
    // do nothing for stake actions
  }

  const decreaseStakeHeaders = {
    Requested: 'REQUESTED STAKE DECREASE',
    Evaluated: 'DECREASED STAKE',
    Cancelled: 'CANCELLED DECREASE STAKE REQUEST'
  }
  const header =
    event._type === 'ServiceProviderIncreaseStake'
      ? 'INCREASED STAKE'
      : decreaseStakeHeaders[event.data._type]

  const sentenceFragmentMap1 = {
    Requested: 'Requested to decrease',
    Evaluated: 'Decreased',
    Cancelled: 'Cancelled request to decrease'
  }
  const sentenceFragment1 =
    event._type === 'ServiceProviderIncreaseStake'
      ? 'Increased'
      : sentenceFragmentMap1[event.data._type]

  const amount =
    event._type === 'ServiceProviderIncreaseStake'
      ? event.increaseAmount
      : event.decreaseAmount

  const renderTitle = () => {
    let newAmount = null
    if (event._type === 'ServiceProviderIncreaseStake') {
      newAmount = event.newStakeAmount
    } else if (event.data._type === 'Evaluated') {
      newAmount = event.data.newStakeAmount
    }

    return (
      <span className={styles.titleContainer}>
        {`${sentenceFragment1} stake by`}
        <DisplayAudio
          className={clsx(styles.titleSpacingLeft, styles.titleSpacingRight)}
          amount={amount}
        />
        {newAmount ? (
          <>
            {'to'}
            <DisplayAudio
              className={clsx(
                styles.titleSpacingLeft,
                styles.titleSpacingRight
              )}
              amount={newAmount}
              label={TICKER}
            />
          </>
        ) : (
          TICKER
        )}
      </span>
    )
  }

  return (
    <GenericTimelineEvent
      onClick={onClick}
      className={className}
      isDisabled={isDisabled}
      header={header}
      title={renderTitle()}
      blockNumber={event.blockNumber}
    />
  )
}

type OwnProps = {
  className?: string
  isDisabled?: boolean
  onClick?: () => void
  event: TimelineEventType
}

type TimelineEventProps = OwnProps

const TimelineEvent: React.FC<TimelineEventProps> = ({
  onClick: parentOnClick,
  className,
  isDisabled,
  event
}: TimelineEventProps) => {
  if (!event) return null

  switch (event._type) {
    case 'GovernanceVote':
    case 'GovernanceVoteUpdate':
      return (
        <VoteTimelineEvent
          onClick={parentOnClick}
          isDisabled={isDisabled}
          className={clsx(styles.proposalEvent, { [className!]: !!className })}
          event={event}
        />
      )
    case 'GovernanceProposal':
      return (
        <ProposalTimelineEvent
          onClick={parentOnClick}
          isDisabled={isDisabled}
          className={clsx(styles.proposalEvent, { [className!]: !!className })}
          event={event}
        />
      )

    case 'DelegateIncreaseStake':
      return (
        <DelegationIncreaseEvent
          event={event}
          parentOnClick={parentOnClick}
          isDisabled={isDisabled}
        />
      )
    case 'DelegateDecreaseStake':
      return (
        <DelegationDecreaseEvent
          event={event}
          parentOnClick={parentOnClick}
          isDisabled={isDisabled}
        />
      )

    case 'ServiceProviderRegistered':
    case 'ServiceProviderDeregistered':
      return (
        <RegistrationDeregistrationEvent
          event={event}
          parentOnClick={parentOnClick}
          isDisabled={isDisabled}
        />
      )
    case 'ServiceProviderIncreaseStake':
    case 'ServiceProviderDecreaseStake':
      return (
        <ServiceProviderStakeEvent
          event={event}
          className={className}
          parentOnClick={parentOnClick}
          isDisabled={isDisabled}
        />
      )

    case 'DelegateClaim':
    case 'ClaimProcessed':
      return (
        <ClaimEvent
          event={event}
          className={className}
          parentOnClick={parentOnClick}
          isDisabled={isDisabled}
        />
      )
  }

  return (
    <GenericTimelineEvent
      className={className}
      onClick={parentOnClick}
      isDisabled={isDisabled}
      title={JSON.stringify(event)}
      blockNumber={event.blockNumber}
    />
  )
}

export default TimelineEvent
