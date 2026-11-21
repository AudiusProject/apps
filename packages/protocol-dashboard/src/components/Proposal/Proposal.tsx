import React, { useCallback } from 'react'

import clsx from 'clsx'

import ProposalStatusBadge from 'components/ProposalStatusBadge'
import ProposalStatusChip from 'components/ProposalStatusChip'
import VoteMeter from 'components/VoteMeter'
import Voted from 'components/Voted'
import {
  useExecutionDelayTimeRemaining,
  useGetInProgressProposalSubstate,
  useProposalMilestoneBlocks,
  useProposalTimeRemaining
} from 'store/cache/proposals/hooks'
import { Outcome, Proposal as ProposalType, Vote } from 'types'
import { usePushRoute } from 'utils/effects'
import { leftPadZero, getHumanReadableTime, getDate } from 'utils/format'
import { createStyles } from 'utils/mobile'
import { proposalPage } from 'utils/routes'

import desktopStyles from './Proposal.module.css'
import mobileStyles from './ProposalMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  timeRemaining: 'remaining'
}

type OwnProps = {
  className?: string
  header?: string
  proposal: ProposalType
  vote?: Vote
  onClick?: () => void
  isDisabled?: boolean
}

type ProposalProps = OwnProps

const InProgressTimeRemaining: React.FC<{ proposal: ProposalType }> = ({
  proposal
}) => {
  const { timeRemaining } = useProposalTimeRemaining(
    proposal.submissionBlockNumber
  )
  return timeRemaining ? (
    <div
      className={clsx(styles.timeRemaining, {
        [styles.show]: timeRemaining
      })}
    >
      {`${getHumanReadableTime(timeRemaining)} ${messages.timeRemaining}`}
    </div>
  ) : null
}

const ExecutionDelayTimeRemaining: React.FC<{
  votingDeadlineBlock: number
}> = ({ votingDeadlineBlock }) => {
  const { timeRemaining } = useExecutionDelayTimeRemaining(votingDeadlineBlock)
  return timeRemaining ? (
    <div
      className={clsx(styles.timeRemaining, {
        [styles.show]: timeRemaining
      })}
    >
      {`${getHumanReadableTime(timeRemaining)} ${messages.timeRemaining}`}
    </div>
  ) : null
}

const Proposal: React.FC<ProposalProps> = ({
  header,
  proposal,
  vote,
  className,
  isDisabled,
  onClick
}) => {
  const pushRoute = usePushRoute()
  const onClickProposal = useCallback(() => {
    if (onClick) onClick()
    pushRoute(proposalPage(proposal.proposalId))
  }, [proposal, pushRoute, onClick])
  const inProgressProposalSubstate = useGetInProgressProposalSubstate(proposal)
  const proposalMilestoneBlocks = useProposalMilestoneBlocks(proposal)

  const evaluatedBlockTimestamp = proposal?.evaluatedBlock?.timestamp ?? null

  return (
    <div
      className={clsx(styles.proposal, {
        [className!]: !!className,
        [styles.disabled]: isDisabled
      })}
      onClick={isDisabled ? () => {} : onClickProposal}
    >
      <div className={styles.left}>
        {header && <div className={styles.header}>{header}</div>}
        <div className={styles.name}>
          {proposal.name || proposal.description || proposal.functionSignature}
        </div>
        <div className={clsx(styles.info, { [styles.infoHeader]: !!header })}>
          <ProposalStatusBadge
            outcome={inProgressProposalSubstate || proposal.outcome}
          />
          <div className={styles.id}>{leftPadZero(proposal.proposalId, 3)}</div>
          {evaluatedBlockTimestamp ? (
            <div className={styles.executed}>
              {`Executed ${getDate(evaluatedBlockTimestamp * 1000)}`}
            </div>
          ) : (
            <>
              {inProgressProposalSubstate === Outcome.InProgress && (
                <InProgressTimeRemaining proposal={proposal} />
              )}
              {inProgressProposalSubstate ===
                Outcome.InProgressExecutionDelay &&
                proposalMilestoneBlocks?.votingDeadlineBlock && (
                  <ExecutionDelayTimeRemaining
                    votingDeadlineBlock={
                      proposalMilestoneBlocks.votingDeadlineBlock
                    }
                  />
                )}
            </>
          )}
        </div>
      </div>
      <div className={styles.right}>
        {vote ? (
          <Voted vote={vote} />
        ) : proposal?.evaluatedBlock ? (
          <ProposalStatusChip outcome={proposal.outcome} />
        ) : (
          <VoteMeter
            votesFor={proposal.voteMagnitudeYes}
            votesAgainst={proposal.voteMagnitudeNo}
          />
        )}
      </div>
    </div>
  )
}

export default Proposal
