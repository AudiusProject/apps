import { useMemo, useState, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'
import semver from 'semver'

import Audius from 'services/Audius'
import { AppState } from 'store/types'
import { Address, Node, Status, SortNode, ServiceType, Validator } from 'types'

import { setLoading, setNodes, setTotal } from './slice'

type UseValidatorsProps = {
  owner?: Address
  sortBy?: SortNode
  limit?: number
}

const filterNodes = (
  nodes: {
    [spId: number]: Validator
  },
  { owner, sortBy, limit }: UseValidatorsProps = {}
) => {
  let cnNodes = Object.values(nodes)

  const filterFunc = (node: Validator) => {
    return (!owner || node.owner === owner) && !node.isDeregistered
  }

  const sortFunc = (n1: Validator, n2: Validator) => {
    if (semver.gt(n1.endpoint, n2.endpoint)) return 1
    else if (semver.lt(n1.endpoint, n2.endpoint)) return -1
    return 0
  }

  cnNodes = cnNodes.filter(filterFunc)
  if (sortBy) cnNodes = cnNodes.sort(sortFunc)
  if (limit) cnNodes = cnNodes.slice(0, limit)

  return cnNodes
}

// -------------------------------- Selectors  --------------------------------
export const getStatus = (state: AppState) => state.cache.validator.status
export const getTotal = (state: AppState) => state.cache.validator.total
export const getNode = (spID: number) => (state: AppState) =>
  state.cache.validator.nodes[spID]

export const getNodes = (state: AppState) => state.cache.validator.nodes
export const getFilteredNodes =
  ({ owner, sortBy, limit }: UseValidatorsProps = {}) =>
  (state: AppState) => {
    const nodes = state.cache.validator.nodes
    return filterNodes(nodes)
  }

// -------------------------------- Helpers  --------------------------------

const processNode = async (node: Node, aud: Audius): Promise<Validator> => {
  const { country, version } = await Audius.getValidatorMetadata(node.endpoint)
  const isDeregistered = node.endpoint === ''
  let previousInfo = {}
  if (isDeregistered) {
    previousInfo = await aud.ServiceProviderClient.getDeregisteredService(
      ServiceType.Validator,
      node.spID
    )
  }

  return {
    ...node,
    ...previousInfo,
    type: ServiceType.Validator,
    version,
    country,
    isDeregistered
  }
}

// -------------------------------- Thunk Actions  --------------------------------

// Async function to get
export function fetchValidators(
  props: UseValidatorsProps = {}
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    dispatch(setLoading())
    const validators = await aud.ServiceProviderClient.getServiceProviderList(
      ServiceType.Validator
    )
    const validatorVersions = await Promise.all(
      validators.map((node) => processNode(node, aud))
    )
    const nodes = validatorVersions.reduce(
      (acc: { [spID: number]: Validator }, cn) => {
        acc[cn.spID] = cn
        return acc
      },
      {}
    )
    dispatch(
      setNodes({
        status: Status.Success,
        nodes
      })
    )
  }
}

// Async function to get
export function getValidator(
  spID: number,
  setStatus?: (status: Status) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    const numValidators =
      await aud.ServiceProviderClient.getTotalServiceTypeProviders(
        ServiceType.Validator
      )
    dispatch(setTotal({ total: numValidators }))
    if (spID > numValidators) {
      if (setStatus) setStatus(Status.Failure)
      return null
    }

    const cnNode = await aud.ServiceProviderClient.getServiceEndpointInfo(
      ServiceType.Validator,
      spID
    )
    const node = await processNode(cnNode, aud)

    dispatch(setNodes({ nodes: { [cnNode.spID]: node } }))
    if (setStatus) setStatus(Status.Success)
  }
}

// -------------------------------- Hooks  --------------------------------

export const useValidators = ({ owner, sortBy, limit }: UseValidatorsProps) => {
  const status = useSelector(getStatus)
  const allNodes = useSelector(getNodes)
  const nodes = useMemo(
    () => filterNodes(allNodes, { owner, sortBy, limit }),
    [allNodes, owner, sortBy, limit]
  )

  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (!status) {
      dispatch(fetchValidators({ owner, sortBy, limit }))
    }
  }, [dispatch, status, owner, sortBy, limit])

  return { status, nodes }
}

type UseValidatorProps = { spID: number }
export const useValidator = ({ spID }: UseValidatorProps) => {
  const [status, setStatus] = useState(Status.Loading)
  const totalNodes = useSelector(getTotal)
  const node = useSelector(getNode(spID))
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (!node && typeof totalNodes !== 'number') {
      dispatch(getValidator(spID, setStatus))
    }
  }, [dispatch, node, totalNodes, spID])
  if (node && status !== Status.Success) setStatus(Status.Success)
  if (status === Status.Success) {
    return { node, status }
  }
  return {
    node: null,
    status
  }
}
