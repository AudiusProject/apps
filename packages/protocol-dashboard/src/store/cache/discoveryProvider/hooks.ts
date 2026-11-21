import { useMemo, useState, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'
import semver from 'semver'

import Audius from 'services/Audius'
import { AppState } from 'store/types'
import {
  Address,
  Node,
  Status,
  SortNode,
  ServiceType,
  DiscoveryProvider
} from 'types'

import { setLoading, setNodes, setTotal } from './slice'

type UseDiscoveryProvidersProps = {
  owner?: Address
  sortBy?: SortNode
  limit?: number
}

const filterNodes = (
  nodes: {
    [spId: number]: DiscoveryProvider
  },
  { owner, sortBy, limit }: UseDiscoveryProvidersProps = {}
) => {
  let dpNodes = Object.values(nodes)

  const filterFunc = (node: DiscoveryProvider) => {
    return (!owner || node.owner === owner) && !node.isDeregistered
  }

  const sortFunc = (n1: DiscoveryProvider, n2: DiscoveryProvider) => {
    if (semver.gt(n1.endpoint, n2.endpoint)) return 1
    else if (semver.lt(n1.endpoint, n2.endpoint)) return -1
    return 0
  }

  dpNodes = dpNodes.filter(filterFunc)
  if (sortBy) dpNodes = dpNodes.sort(sortFunc)
  if (limit) dpNodes = dpNodes.slice(0, limit)

  return dpNodes
}

export const getStatus = (state: AppState) =>
  state.cache.discoveryProvider.status
export const getTotal = (state: AppState) => state.cache.discoveryProvider.total
export const getNode = (spID: number) => (state: AppState) =>
  state.cache.discoveryProvider.nodes[spID]

export const getNodes = (state: AppState) => state.cache.discoveryProvider.nodes
export const getFilteredNodes =
  ({ owner, sortBy, limit }: UseDiscoveryProvidersProps = {}) =>
  (state: AppState) => {
    const nodes = getNodes(state)
    return filterNodes(nodes, { owner, sortBy, limit })
  }

const processDP = async (
  node: Node,
  aud: Audius
): Promise<DiscoveryProvider> => {
  const { version, country } = await Audius.getDiscoveryNodeMetadata(
    node.endpoint
  )
  const isDeregistered = node.endpoint === ''
  let previousInfo = {}
  if (isDeregistered) {
    previousInfo = await aud.ServiceProviderClient.getDeregisteredService(
      ServiceType.DiscoveryProvider,
      node.spID
    )
  }
  return {
    ...node,
    ...previousInfo,
    type: ServiceType.DiscoveryProvider,
    version,
    country,
    isDeregistered
  }
}

export function fetchDiscoveryProviders(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const status = getStatus(getState())
    if (status) return

    dispatch(setLoading())
    const discoveryProviders =
      await aud.ServiceProviderClient.getServiceProviderList(
        ServiceType.DiscoveryProvider
      )
    const legacy = (
      await aud.ServiceProviderClient.getServiceProviderList(
        // @ts-ignore
        'discovery-provider'
      )
    ).map((d, i) => ({ ...d, spID: 100 + i }))

    const discoveryProviderVersions = await Promise.all(
      discoveryProviders.concat(legacy).map((node) => processDP(node, aud))
    )
    const nodes = discoveryProviderVersions.reduce(
      (acc: { [spId: number]: DiscoveryProvider }, dp) => {
        acc[dp.spID] = dp
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

export function getDiscoveryProvider(
  spID: number,
  setStatus?: (status: Status) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    const numDiscoveryProviders =
      await aud.ServiceProviderClient.getTotalServiceTypeProviders(
        ServiceType.DiscoveryProvider
      )
    dispatch(setTotal({ total: numDiscoveryProviders }))
    if (spID > numDiscoveryProviders) {
      if (setStatus) setStatus(Status.Failure)
      return null
    }

    const dpNode = await aud.ServiceProviderClient.getServiceEndpointInfo(
      ServiceType.DiscoveryProvider,
      spID
    )
    const node = await processDP(dpNode, aud)

    dispatch(setNodes({ nodes: { [dpNode.spID]: node } }))
    if (setStatus) setStatus(Status.Success)
  }
}

export const useDiscoveryProviders = ({
  owner,
  sortBy,
  limit
}: UseDiscoveryProvidersProps) => {
  const status = useSelector(getStatus)
  const allNodes = useSelector(getNodes)
  const nodes = useMemo(
    () => filterNodes(allNodes, { owner, sortBy, limit }),
    [allNodes, owner, sortBy, limit]
  )

  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (!status) {
      dispatch(fetchDiscoveryProviders())
    }
  }, [dispatch, status])

  return { status, nodes }
}

type UseDiscoveryProviderProps = { spID: number }
export const useDiscoveryProvider = ({ spID }: UseDiscoveryProviderProps) => {
  const [status, setStatus] = useState(Status.Loading)
  const totalDpNodes = useSelector(getTotal)
  const dp = useSelector(getNode(spID))
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (!dp && typeof totalDpNodes !== 'number') {
      dispatch(getDiscoveryProvider(spID, setStatus))
    }
  }, [dispatch, dp, totalDpNodes, spID])
  if (dp && status !== Status.Success) setStatus(Status.Success)
  if (status === Status.Success) {
    return { node: dp, status }
  }
  return {
    node: null,
    status
  }
}
