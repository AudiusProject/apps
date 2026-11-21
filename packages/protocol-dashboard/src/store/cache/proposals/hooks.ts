import { useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { useEffectOnce } from 'react-use'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import {
  useTotalStaked,
  useDispatchBasedOnBlockNumber,
  useTimeRemaining,
  useEthBlockNumber
} from 'store/cache/protocol/hooks'
import { AppState } from 'store/types'
import { Proposal, ProposalEvent, Outcome } from 'types'

import {
  setActiveProposals,
  setAllProposals,
  setExecutionDelay,
  setProposal,
  setRecentProposals,
  setVotingPeriod
} from './slice'

export const getActiveProposals = (state: AppState) =>
  state.cache.proposals.activeProposals
export const getRecentProposals = (state: AppState) =>
  state.cache.proposals.recentProposals
export const getAllProposals = (state: AppState) =>
  state.cache.proposals.allProposals
export const getResolvedProposals = (state: AppState) => {
  const allProposals = getAllProposals(state)
  return (
    state.cache.proposals.resolvedProposals?.map((p) => allProposals[p]) ?? null
  )
}

export const getProposal = (
  state: AppState,
  { proposalId }: { proposalId: number }
) => state.cache.proposals.allProposals[proposalId]

export const getVotingPeriod = (state: AppState) =>
  state.cache.proposals.votingPeriod

export const getExecutionDelay = (state: AppState) =>
  state.cache.proposals.executionDelay

const filteredProposals = new Set([82, 83, 84, 85])
filteredProposals.add(130)
filteredProposals.add(131)

export function fetchActiveProposals(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    let proposalIds = await aud.Governance.getInProgressProposalIds()
    proposalIds = proposalIds.filter((p) => !filteredProposals.has(p))
    const proposals = (
      await Promise.all(
        proposalIds.map(async (id) => {
          const proposal = await aud.Governance.getProposalById(id)
          const quorum = await aud.Governance.getProposalQuorum(id)
          const { name, description } =
            await aud.Governance.getProposalSubmissionById(id)
          proposal.name = name
          proposal.description = description
          proposal.quorum = quorum
          return proposal
        })
      )
    ).reverse()

    dispatch(setActiveProposals({ proposals }))
  }
}

const proposalHistoryRequests = new WeakMap<Audius, Promise<void>>()

export function fetchAllProposals(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const pending = proposalHistoryRequests.get(aud)
    if (pending) return pending

    const request = (async () => {
      const proposalEvents: ProposalEvent[] =
        await aud.Governance.getProposals()
      const cached = getState().cache.proposals.allProposals
      const proposals: Proposal[] = []
      const pendingEvents = proposalEvents
        .filter((p) => !filteredProposals.has(p.proposalId))
        .sort((a, b) => b.proposalId - a.proposalId)
        .filter((event) => {
          const proposal = cached[event.proposalId]
          if (
            proposal &&
            proposal.outcome !== Outcome.InProgress &&
            proposal.outcome !== Outcome.Evaluating &&
            proposal.evaluatedBlock
          ) {
            proposals.push(proposal)
            return false
          }
          return true
        })
      const publish = () => {
        dispatch(
          setAllProposals({
            proposals: [...proposals].sort(
              (a, b) => a.proposalId - b.proposalId
            )
          })
        )
      }

      if (proposals.length || !pendingEvents.length) publish()

      for (let i = 0; i < pendingEvents.length; i += 5) {
        const batch = await Promise.allSettled(
          pendingEvents.slice(i, i + 5).map(async (event) => {
            const { proposalId, description, name } = event
            const [proposal, quorum] = await Promise.all([
              aud.Governance.getProposalById(proposalId),
              aud.Governance.getProposalQuorum(proposalId)
            ])
            proposal.description = description
            proposal.name = name
            proposal.quorum = quorum
            if (proposal.outcome !== Outcome.InProgress) {
              proposal.evaluatedBlock =
                await aud.Governance.getProposalEvaluationBlock(
                  proposalId,
                  proposal.submissionBlockNumber
                )
            }
            return proposal
          })
        )
        for (const result of batch) {
          if (result.status === 'fulfilled') proposals.push(result.value)
          else
            console.error('Unable to load governance proposal', result.reason)
        }
        if (proposals.length) publish()
      }
    })()
    proposalHistoryRequests.set(aud, request)
    try {
      await request
    } finally {
      proposalHistoryRequests.delete(aud)
    }
  }
}

export function fetchRecentProposals(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const proposalEvents = (await aud.Governance.getProposals()).slice(-5)
    const allProposals: (Proposal | null)[] = await Promise.all(
      proposalEvents.map(async (p: ProposalEvent) => {
        const { proposalId, description, name } = p
        if (filteredProposals.has(proposalId)) {
          return null
        }
        const proposal = await aud.Governance.getProposalById(proposalId)
        const quorum = await aud.Governance.getProposalQuorum(proposalId)
        proposal.description = description
        proposal.name = name
        proposal.quorum = quorum
        if (proposal.outcome !== Outcome.InProgress) {
          const evaluationBlockNumber =
            await aud.Governance.getProposalEvaluationBlock(
              proposalId,
              proposal.submissionBlockNumber
            )
          proposal.evaluatedBlock = evaluationBlockNumber
        }
        return proposal
      })
    )

    const proposals = allProposals.filter(Boolean) as Proposal[]

    const sortedProposals = proposals.sort((a, b) => {
      const timestampA = a.evaluatedBlock?.timestamp || a.submissionBlockNumber
      const timestampB = b.evaluatedBlock?.timestamp || b.submissionBlockNumber
      return timestampB - timestampA
    })

    dispatch(setRecentProposals({ proposals: sortedProposals }))
  }
}

export function fetchProposal(
  proposalId: number
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    const proposal = await aud.Governance.getProposalById(proposalId)
    const quorum = await aud.Governance.getProposalQuorum(proposalId)
    const { name, description } =
      await aud.Governance.getProposalSubmissionById(proposalId)
    proposal.name = name
    proposal.description = description
    proposal.quorum = quorum
    if (proposal.outcome !== Outcome.InProgress) {
      const evaluationBlockNumber =
        await aud.Governance.getProposalEvaluationBlock(
          proposalId,
          proposal.submissionBlockNumber
        )
      proposal.evaluatedBlock = evaluationBlockNumber
    }

    dispatch(setProposal({ proposal }))
  }
}

export function fetchVotingPeriod(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const votingPeriod = await aud.Governance.getVotingPeriod()
    dispatch(setVotingPeriod({ votingPeriod }))
  }
}

export function fetchExecutionDelay(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const executionDelay = await aud.Governance.getExecutionDelay()
    dispatch(setExecutionDelay({ executionDelay }))
  }
}

export const useActiveProposals = () => {
  const activeProposals = useSelector(getActiveProposals)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffectOnce(() => {
    if (activeProposals === null) {
      dispatch(fetchActiveProposals())
    }
  })

  return { activeProposals }
}

export const useRecentProposals = () => {
  const recentProposals = useSelector(getRecentProposals)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffectOnce(() => {
    if (recentProposals === null) {
      dispatch(fetchRecentProposals())
    }
  })

  return { recentProposals }
}

export const useProposals = () => {
  const activeProposals = useSelector(getActiveProposals)
  const allProposals = useSelector(getAllProposals)
  const resolvedProposals = useSelector(getResolvedProposals)
  const recentProposals = useSelector(getRecentProposals)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffectOnce(() => {
    if (recentProposals === null) {
      dispatch(fetchRecentProposals())
    }
    if (activeProposals === null) {
      dispatch(fetchActiveProposals())
    }
    if (resolvedProposals === null) {
      dispatch(fetchAllProposals())
    }
  })

  useDispatchBasedOnBlockNumber(
    [fetchActiveProposals(), fetchAllProposals()],
    5
  )

  return { activeProposals, allProposals, resolvedProposals, recentProposals }
}

export const useProposal = (proposalId: number) => {
  const proposal = useSelector((state) =>
    getProposal(state as AppState, { proposalId })
  )
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (proposal === null || proposal === undefined) {
      dispatch(fetchProposal(proposalId))
    }
  }, [dispatch, proposal, proposalId])

  return { proposal }
}

export const useVotingPeriod = () => {
  const votingPeriod = useSelector(getVotingPeriod)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (!votingPeriod) {
      dispatch(fetchVotingPeriod())
    }
  }, [dispatch, votingPeriod])

  return { votingPeriod }
}

export const useExecutionDelay = () => {
  const executionDelay = useSelector(getExecutionDelay)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (!executionDelay) {
      dispatch(fetchExecutionDelay())
    }
  }, [dispatch, executionDelay])

  return { executionDelay }
}

export const useProposalTimeRemaining = (submissionBlock: number) => {
  const { votingPeriod } = useVotingPeriod()
  const remaining = useTimeRemaining(submissionBlock, votingPeriod)
  return remaining
}

export const useExecutionDelayTimeRemaining = (votingDeadlineBlock: number) => {
  const { executionDelay } = useExecutionDelay()
  const remaining = useTimeRemaining(votingDeadlineBlock, executionDelay)
  return remaining
}

export const useAmountAbstained = (proposal: Proposal) => {
  const totalStaked = useTotalStaked()
  if (!proposal || !totalStaked) return null
  const voteMagnitude = proposal.voteMagnitudeYes.add(proposal.voteMagnitudeNo)
  return totalStaked.sub(voteMagnitude)
}

export const useGetInProgressProposalSubstate = (proposal: Proposal) => {
  const { votingPeriod } = useVotingPeriod()
  const { executionDelay } = useExecutionDelay()
  const currentBlockNumber = useEthBlockNumber()

  if (
    !proposal ||
    !proposal.submissionBlockNumber ||
    proposal.outcome !== Outcome.InProgress
  )
    return null

  const { submissionBlockNumber } = proposal
  if (
    !submissionBlockNumber ||
    !votingPeriod ||
    !executionDelay ||
    !currentBlockNumber
  )
    return null

  if (
    currentBlockNumber >=
    submissionBlockNumber + votingPeriod + executionDelay
  ) {
    return Outcome.InProgressAwaitingExecution
  } else if (currentBlockNumber >= submissionBlockNumber + votingPeriod) {
    return Outcome.InProgressExecutionDelay
  }
  return Outcome.InProgress
}

export const useProposalMilestoneBlocks = (proposal: Proposal) => {
  const { votingPeriod } = useVotingPeriod()
  const { executionDelay } = useExecutionDelay()

  if (!proposal || !proposal.submissionBlockNumber) return null

  const { submissionBlockNumber } = proposal
  if (!submissionBlockNumber || !votingPeriod || !executionDelay) return null

  return {
    submissionBlock: submissionBlockNumber,
    votingDeadlineBlock: submissionBlockNumber + votingPeriod,
    executionDeadlineBlock:
      submissionBlockNumber + votingPeriod + executionDelay
  }
}
