import React, { useState, useCallback, useEffect } from 'react'

import { IconCheck, IconRemove } from '@audius/stems'
import BN from 'bn.js'
import clsx from 'clsx'

import IconThumbDown from 'assets/img/iconThumbDown.svg'
import IconThumbUp from 'assets/img/iconThumbUp.svg'
import Button, { ButtonType } from 'components/Button'
import ConfirmTransactionModal from 'components/ConfirmTransactionModal'
import { StandaloneBox } from 'components/ConfirmTransactionModal/ConfirmTransactionModal'
import DisplayAudio from 'components/DisplayAudio'
import Loading from 'components/Loading'
import Paper from 'components/Paper'
import ProposalStatusBadge from 'components/ProposalStatusBadge'
import { Position } from 'components/Tooltip'
import UserImage from 'components/UserImage'
import VoteMeter from 'components/VoteMeter'
import { useAccountUser } from 'store/account/hooks'
import { useExecuteProposal } from 'store/actions/executeProposal'
import { useSubmitVote } from 'store/actions/submitVote'
import {
  useProposalTimeRemaining,
  useAmountAbstained,
  useGetInProgressProposalSubstate,
  useProposalMilestoneBlocks,
  useExecutionDelayTimeRemaining
} from 'store/cache/proposals/hooks'
import { Proposal, Outcome, Vote, Address, Status } from 'types'
import getActiveStake from 'utils/activeStake'
import { leftPadZero, getDate, getHumanReadableTime } from 'utils/format'
import { createStyles } from 'utils/mobile'

import desktopStyles from './ProposalHero.module.css'
import mobileStyles from './ProposalHeroMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  voteFor: 'Vote For',
  voteAgainst: 'Vote Against',
  timeRemaining: 'Est. Voting Period Remaining',
  executionDelay: 'Voting Ended, Can Execute In',
  awaitExecuteProposal: 'Awaiting Proposal Execution',
  targetBlock: 'Target Block',
  notVoted: 'NOT-VOTED',
  voted: 'VOTED',
  quorum: 'QUORUM',
  quorumMet: 'Quorum Met',
  quorumNotMet: 'Quorum Not Met',
  executeProposal: 'Execute Proposal'
}

type VoteCTAProps = {
  onVoteFor: () => void
  onVoteAgainst: () => void
  currentVote: Vote
  submissionBlock: number
}

const VoteCTA: React.FC<VoteCTAProps> = ({
  onVoteFor,
  onVoteAgainst,
  currentVote,
  submissionBlock
}) => {
  const { timeRemaining, targetBlock } =
    useProposalTimeRemaining(submissionBlock)

  const { status: userStatus, user: accountUser } = useAccountUser()
  const activeStake = accountUser ? getActiveStake(accountUser) : new BN('0')
  const isUserStaker = userStatus === Status.Success && !activeStake.isZero()

  return (
    <div className={styles.voteCTA}>
      <div className={styles.voteStatusContainer}>
        {timeRemaining !== null && (
          <>
            <div className={styles.title}>{messages.timeRemaining}</div>
            <div className={styles.time}>
              {getHumanReadableTime(timeRemaining)}
            </div>
          </>
        )}
        <div className={styles.blocks}>
          <span>{`${messages.targetBlock}: ${targetBlock}`}</span>
        </div>
      </div>
      {isUserStaker && (
        <div className={styles.vote}>
          <Button
            leftIcon={<IconThumbUp />}
            className={styles.voteFor}
            text={messages.voteFor}
            type={ButtonType.GREEN}
            onClick={onVoteFor}
            isDepressed={currentVote === Vote.Yes}
            isDisabled={currentVote === Vote.Yes}
          />
          <Button
            leftIcon={<IconThumbDown />}
            className={styles.voteAgainst}
            text={messages.voteAgainst}
            type={ButtonType.RED}
            onClick={onVoteAgainst}
            isDepressed={currentVote === Vote.No}
            isDisabled={currentVote === Vote.No}
          />
        </div>
      )}
    </div>
  )
}

type ExecutionDelayCTAProps = {
  votingDeadlineBlock: number
}

const ExecutionDelayCTA: React.FC<ExecutionDelayCTAProps> = ({
  votingDeadlineBlock
}) => {
  const { timeRemaining, targetBlock } =
    useExecutionDelayTimeRemaining(votingDeadlineBlock)

  return (
    <div className={styles.voteCTA}>
      <div className={styles.voteStatusContainer}>
        {timeRemaining !== null && (
          <>
            <div className={styles.title}>{messages.executionDelay}</div>
            <div className={styles.time}>
              {getHumanReadableTime(timeRemaining)}
            </div>
          </>
        )}
        <div className={styles.blocks}>
          <span>{`${messages.targetBlock}: ${targetBlock}`}</span>
        </div>
      </div>
      <div>
        <Button
          text={messages.executeProposal}
          type={ButtonType.GREEN}
          isDepressed={true}
          isDisabled={true}
        />
      </div>
    </div>
  )
}

type ExecuteProposalCTAProps = {
  onExecuteProposal: () => void
}

const ExecuteProposalCTA: React.FC<ExecuteProposalCTAProps> = ({
  onExecuteProposal
}) => {
  return (
    <div className={styles.voteCTA}>
      <div className={styles.voteStatusContainer}>
        <div className={styles.title}>{messages.awaitExecuteProposal}</div>
      </div>
      <div>
        <Button
          text={messages.executeProposal}
          type={ButtonType.GREEN}
          onClick={onExecuteProposal}
        />
      </div>
    </div>
  )
}

const User = ({ wallet }: { wallet: Address }) => {
  return (
    <div className={styles.user}>
      <div className={styles.image}>
        <UserImage wallet={wallet} alt='User' />
      </div>
      {wallet}
    </div>
  )
}

type OwnProps = {
  proposal: Proposal
  userVote: Vote
}

type ProposalHeroProps = OwnProps

const ProposalHero: React.FC<ProposalHeroProps> = ({
  proposal,
  userVote
}: ProposalHeroProps) => {
  const [reset, setReset] = useState(false)
  useEffect(() => {
    if (reset) setReset(false)
  }, [reset, setReset])

  const { status, error, submitVote } = useSubmitVote(reset)

  const [currentVote, setCurrentVote] = useState<Vote>(userVote)
  const [newVote, setNewVote] = useState<Vote>(userVote)
  useEffect(() => {
    setCurrentVote(userVote)
  }, [userVote, setCurrentVote])

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const onCloseConfirm = useCallback(() => setIsConfirmModalOpen(false), [])

  const onVoteFor = useCallback(() => {
    setNewVote(Vote.Yes)
    setIsConfirmModalOpen(true)
  }, [setNewVote, setIsConfirmModalOpen])

  const onVoteAgainst = useCallback(() => {
    setNewVote(Vote.No)
    setIsConfirmModalOpen(true)
  }, [setNewVote, setIsConfirmModalOpen])

  const onConfirm = useCallback(() => {
    if (newVote) {
      submitVote(proposal.proposalId, newVote, currentVote)
    }
  }, [submitVote, newVote, currentVote, proposal])

  useEffect(() => {
    if (status === Status.Success) {
      setCurrentVote(newVote)
      setIsConfirmModalOpen(false)
      setReset(true)
    }
  }, [status, newVote, setCurrentVote, setReset])

  const amountAbstained = useAmountAbstained(proposal) || new BN('0')

  const inProgressProposalSubstate = useGetInProgressProposalSubstate(proposal)
  const proposalMilestoneBlocks = useProposalMilestoneBlocks(proposal)

  const isActive =
    proposal?.outcome === Outcome.InProgress &&
    (inProgressProposalSubstate === Outcome.InProgress ||
      inProgressProposalSubstate === Outcome.InProgressAwaitingExecution ||
      inProgressProposalSubstate === Outcome.InProgressExecutionDelay)

  const evaluatedBlockTimestamp = proposal?.evaluatedBlock?.timestamp ?? null

  const submitVoteBox = (
    <StandaloneBox className={styles.confirmation}>
      {`Voting ${newVote === Vote.Yes ? 'for' : 'against'} proposal ${
        proposal?.proposalId
      }`}
    </StandaloneBox>
  )

  const totalMagnitudeVoted = proposal
    ? proposal?.voteMagnitudeYes.add(proposal?.voteMagnitudeNo)
    : new BN('0')
  const hasMetQuorum = proposal
    ? totalMagnitudeVoted.gte(proposal.quorum)
    : false

  const [executeProposalReset, setExecuteProposalReset] = useState(false)
  useEffect(() => {
    if (executeProposalReset) setExecuteProposalReset(false)
  }, [executeProposalReset, setExecuteProposalReset])

  const {
    executeProposal,
    error: executeError,
    status: executeStatus
  } = useExecuteProposal(reset)
  const [isExecuteConfirmModalOpen, setIsExecuteConfirmModalOpen] =
    useState(false)

  const onExecuteCloseConfirm = useCallback(
    () => setIsExecuteConfirmModalOpen(false),
    []
  )

  const onExecuteProposal = useCallback(() => {
    setIsExecuteConfirmModalOpen(true)
  }, [setIsExecuteConfirmModalOpen])

  const onExecuteConfirm = useCallback(() => {
    executeProposal(proposal.proposalId)
  }, [executeProposal, proposal])

  useEffect(() => {
    if (executeStatus === Status.Success) {
      setIsExecuteConfirmModalOpen(false)
      setExecuteProposalReset(true)
    }
  }, [executeStatus, setIsExecuteConfirmModalOpen, setExecuteProposalReset])

  const confirmExecuteProposalBox = (
    <StandaloneBox className={styles.confirmation}>
      {`Executing proposal ${proposal?.proposalId}`}
    </StandaloneBox>
  )

  return (
    <Paper className={styles.container}>
      {proposal && proposal.proposer ? (
        <>
          <User wallet={proposal.proposer} />
          {isActive && inProgressProposalSubstate === Outcome.InProgress && (
            <VoteCTA
              currentVote={currentVote}
              onVoteFor={onVoteFor}
              onVoteAgainst={onVoteAgainst}
              submissionBlock={proposal.submissionBlockNumber}
            />
          )}
          {isActive &&
            inProgressProposalSubstate === Outcome.InProgressExecutionDelay &&
            proposalMilestoneBlocks?.votingDeadlineBlock && (
              <ExecutionDelayCTA
                votingDeadlineBlock={
                  proposalMilestoneBlocks.votingDeadlineBlock
                }
              />
            )}
          {isActive &&
            inProgressProposalSubstate ===
              Outcome.InProgressAwaitingExecution && (
              <ExecuteProposalCTA onExecuteProposal={onExecuteProposal} />
            )}
          <div className={styles.bottom}>
            <div className={styles.left}>
              <div className={styles.description}>{proposal.name}</div>
              <div className={styles.info}>
                <ProposalStatusBadge
                  outcome={inProgressProposalSubstate || proposal.outcome}
                />
                <div className={styles.id}>
                  {leftPadZero(proposal.proposalId, 3)}
                </div>
                {evaluatedBlockTimestamp && (
                  <div className={styles.executed}>
                    {`Executed ${getDate(evaluatedBlockTimestamp * 1000)}`}
                  </div>
                )}
              </div>
              {isActive && hasMetQuorum && (
                <div className={styles.quorumStatusContainer}>
                  <div className={clsx(styles.circle, styles.met)}>
                    <IconCheck className={styles.icon} />
                  </div>
                  {messages.quorumMet}
                </div>
              )}
              {isActive && !hasMetQuorum && (
                <div className={styles.quorumStatusContainer}>
                  <div className={clsx(styles.circle, styles.notMet)}>
                    <IconRemove className={styles.icon} />
                  </div>
                  {messages.quorumNotMet}
                </div>
              )}
            </div>
            <div className={styles.stats}>
              <VoteMeter
                votesFor={proposal.voteMagnitudeYes}
                votesAgainst={proposal.voteMagnitudeNo}
              />
              <DisplayAudio
                position={Position.BOTTOM}
                className={styles.abstained}
                amount={amountAbstained}
                label={messages.notVoted}
              />
              {isActive && (
                <div className={styles.quorumContainer}>
                  <DisplayAudio
                    position={Position.BOTTOM}
                    className={styles.quorumValue}
                    amount={totalMagnitudeVoted}
                    label={messages.voted}
                  />
                  {' / '}
                  <DisplayAudio
                    position={Position.BOTTOM}
                    className={styles.quorumValue}
                    amount={proposal.quorum}
                    label={messages.quorum}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.loadingContainer}>
          <Loading />
        </div>
      )}
      {/* submit vote modal */}
      <ConfirmTransactionModal
        withArrow={false}
        isOpen={isConfirmModalOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        topBox={submitVoteBox}
        error={error}
        status={status}
      />
      {/* execute proposal modal */}
      <ConfirmTransactionModal
        withArrow={false}
        isOpen={isExecuteConfirmModalOpen}
        onClose={onExecuteCloseConfirm}
        onConfirm={onExecuteConfirm}
        topBox={confirmExecuteProposalBox}
        error={executeError}
        status={executeStatus}
      />
    </Paper>
  )
}

export default ProposalHero
