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
  ContentNode
} from 'types'

import { setLoading, setNodes, setTotal } from './slice'

type UseContentNodesProps = {
  owner?: Address
  sortBy?: SortNode
  limit?: number
}

const filterNodes = (
  nodes: {
    [spId: number]: ContentNode
  },
  { owner, sortBy, limit }: UseContentNodesProps = {}
) => {
  let cnNodes = Object.values(nodes)

  const filterFunc = (node: ContentNode) => {
    return (!owner || node.owner === owner) && !node.isDeregistered
  }

  const sortFunc = (n1: ContentNode, n2: ContentNode) => {
    if (semver.gt(n1.endpoint, n2.endpoint)) return 1
    else if (semver.lt(n1.endpoint, n2.endpoint)) return -1
    return 0
  }

  cnNodes = cnNodes.filter(filterFunc)
  if (sortBy) cnNodes = cnNodes.sort(sortFunc)
  if (limit) cnNodes = cnNodes.slice(0, limit)

  return cnNodes
}

export const getStatus = (state: AppState) => state.cache.contentNode.status
export const getTotal = (state: AppState) => state.cache.contentNode.total
export const getNode = (spID: number) => (state: AppState) =>
  state.cache.contentNode.nodes[spID]

export const getNodes = (state: AppState) => state.cache.contentNode.nodes
export const getFilteredNodes =
  ({ owner, sortBy, limit }: UseContentNodesProps = {}) =>
  (state: AppState) => {
    const nodes = state.cache.contentNode.nodes
    return filterNodes(nodes)
  }

const processNode = async (node: Node, aud: Audius): Promise<ContentNode> => {
  const { country, version } = await Audius.getContentNodeMetadata(
    node.endpoint
  )
  const isDeregistered = node.endpoint === ''
  let previousInfo = {}
  if (isDeregistered) {
    previousInfo = await aud.ServiceProviderClient.getDeregisteredService(
      ServiceType.ContentNode,
      node.spID
    )
  }

  return {
    ...node,
    ...previousInfo,
    type: ServiceType.ContentNode,
    version,
    country,
    isDeregistered
  }
}

export function fetchContentNodes(
  props: UseContentNodesProps = {}
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    dispatch(setLoading())
    const contentNodes = await aud.ServiceProviderClient.getServiceProviderList(
      ServiceType.ContentNode
    )
    const contentNodeVersions = await Promise.all(
      contentNodes.map((node) => processNode(node, aud))
    )
    const nodes = contentNodeVersions.reduce(
      (acc: { [spID: number]: ContentNode }, cn) => {
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

export function getContentNode(
  spID: number,
  setStatus?: (status: Status) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    const numContentNodes =
      await aud.ServiceProviderClient.getTotalServiceTypeProviders(
        ServiceType.ContentNode
      )
    dispatch(setTotal({ total: numContentNodes }))
    if (spID > numContentNodes) {
      if (setStatus) setStatus(Status.Failure)
      return null
    }

    const cnNode = await aud.ServiceProviderClient.getServiceEndpointInfo(
      ServiceType.ContentNode,
      spID
    )
    const node = await processNode(cnNode, aud)

    dispatch(setNodes({ nodes: { [cnNode.spID]: node } }))
    if (setStatus) setStatus(Status.Success)
  }
}

export const useContentNodes = ({
  owner,
  sortBy,
  limit
}: UseContentNodesProps) => {
  const status = useSelector(getStatus)
  const allNodes = useSelector(getNodes)
  const nodes = useMemo(
    () => filterNodes(allNodes, { owner, sortBy, limit }),
    [allNodes, owner, sortBy, limit]
  )

  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (!status) {
      dispatch(fetchContentNodes({ owner, sortBy, limit }))
    }
  }, [dispatch, status, owner, sortBy, limit])

  return { status, nodes }
}

type UseContentNodeProps = { spID: number }
export const useContentNode = ({ spID }: UseContentNodeProps) => {
  const [status, setStatus] = useState(Status.Loading)
  const totalNodes = useSelector(getTotal)
  const node = useSelector(getNode(spID))
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (!node && typeof totalNodes !== 'number') {
      dispatch(getContentNode(spID, setStatus))
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
