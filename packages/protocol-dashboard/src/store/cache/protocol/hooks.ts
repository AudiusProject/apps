import { useEffect, useState, useRef } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { AppState } from 'store/types'
import { ServiceType, Block } from 'types'

import {
  setTotalStaked,
  setDelgator,
  setServiceTypeInfo,
  setEthBlockNumber,
  setAverageBlockTime,
  setCurrentVersion
} from './slice'

// -------------------------------- Selectors  --------------------------------
export const getTotalStaked = (state: AppState) =>
  state.cache.protocol.totalStaked
export const getServiceInfo = (state: AppState) => state.cache.protocol.services
export const getEthBlockNumber = (state: AppState) =>
  state.cache.protocol.ethBlockNumber
export const getAverageBlockTime = (state: AppState) =>
  state.cache.protocol.averageBlockTime
export const getDelegatorInfo = (state: AppState) =>
  state.cache.protocol.delegator
export const getCurrentVersion = (
  state: AppState,
  serviceType: ServiceType
) => {
  switch (serviceType) {
    case ServiceType.DiscoveryProvider:
      return state.cache.protocol.services.discoveryProvider.currentVersion
    case ServiceType.ContentNode:
      return state.cache.protocol.services.contentNode.currentVersion
    case ServiceType.Validator:
      return state.cache.protocol.services.validator?.currentVersion ?? '1.0.0'
  }
}

// -------------------------------- Thunk Actions  --------------------------------// -------------------------------- Thunk Actions  --------------------------------

// Async function to get
export function fetchProtocolDelegation(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const maxDelegators = await aud.Delegate.getMaxDelegators()
    const minDelegationAmount = await aud.Delegate.getMinDelegationAmount()

    dispatch(setDelgator({ maxDelegators, minDelegationAmount }))
  }
}

export function fetchServiceStakeValues(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const discoveryProvider = await aud.NodeType.getServiceTypeInfo(
      ServiceType.DiscoveryProvider
    )
    const contentNode = await aud.NodeType.getServiceTypeInfo(
      ServiceType.ContentNode
    )
    const validator = await aud.NodeType.getServiceTypeInfo(
      ServiceType.Validator
    )

    dispatch(setServiceTypeInfo({ discoveryProvider, contentNode, validator }))
  }
}

export function fetchCurrentVersion(
  serviceType: ServiceType
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    const currentVersion = await aud.NodeType.getCurrentVersion(serviceType)
    dispatch(setCurrentVersion({ serviceType, currentVersion }))
  }
}

export function fetchTotalStaked(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const totalStated = await aud.Staking.totalStaked()
    dispatch(setTotalStaked(totalStated))
  }
}

let isWindowActive = true
window.addEventListener('focus', () => {
  isWindowActive = true
})
window.addEventListener('blur', () => {
  isWindowActive = false
})

export function fetchEthBlockNumber(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const updateEthBlockNumber = async () => {
      if (isWindowActive) {
        const ethBlockNumber = await aud.getEthBlockNumber()
        dispatch(setEthBlockNumber(ethBlockNumber))
      }
    }
    await updateEthBlockNumber()
    setInterval(updateEthBlockNumber, 10000)
  }
}

export function fetchAverageBlockTime(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch, getState, aud) => {
    const averageBlockTime = await aud.getAverageBlockTime()
    dispatch(setAverageBlockTime(averageBlockTime))
  }
}

// -------------------------------- Hooks  --------------------------------

export const useTotalStaked = () => {
  const totalStaked = useSelector(getTotalStaked)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (totalStaked === undefined) dispatch(fetchTotalStaked())
  }, [dispatch, totalStaked])

  return totalStaked
}

export const useServiceInfo = () => {
  const services = useSelector(getServiceInfo)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (
      services.discoveryProvider === undefined ||
      services.contentNode === undefined
    ) {
      dispatch(fetchServiceStakeValues())
    }
  }, [dispatch, services])

  return services
}

export const useProtocolDelegator = () => {
  const delegatorInfo = useSelector(getDelegatorInfo)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (
      delegatorInfo.maxDelegators === undefined ||
      delegatorInfo.minDelegationAmount === undefined
    ) {
      dispatch(fetchProtocolDelegation())
    }
  }, [delegatorInfo, dispatch])

  return delegatorInfo
}

export const useEthBlockNumber = () => {
  const blockNumber = useSelector(getEthBlockNumber)
  return blockNumber
}

export const useDispatchBasedOnBlockNumber = (
  actions: ThunkAction<void, AppState, Audius, Action<string>>[],
  mod: number = 10
) => {
  const didMount = useRef(false)
  const ethBlockNumber = useEthBlockNumber()
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (didMount.current && ethBlockNumber && ethBlockNumber % mod === 0) {
      actions.forEach((action) => {
        dispatch(action)
      })
    }
    if (ethBlockNumber) {
      didMount.current = true
    }
    // Intentionally, do not re-run the effect based on changes to actions
    // eslint-disable-next-line
  }, [ethBlockNumber, dispatch, mod, didMount])
}

export const useAverageBlockTime = () => {
  const blockTime = useSelector(getAverageBlockTime)
  return blockTime
}

export const useBlock = (blockNumber: number) => {
  const [block, setBlock] = useState<Block>(null)
  useEffect(() => {
    const fetchBlock = async () => {
      // TODO: Move this window dependency out
      const web3 = window.audiusLibs.ethWeb3Manager!.web3
      const b = await web3.eth.getBlock(blockNumber)
      setBlock(b)
    }
    fetchBlock()
  }, [blockNumber, setBlock])

  return block
}

export const useTimeRemaining = (block: number, period: number | null) => {
  const averageBlockTime = useAverageBlockTime()
  const currentBlock = useEthBlockNumber()
  const [timeRemaining, setTimeRemaining] = useState<null | number>(null)

  const targetBlock = block + (period || 0)

  useEffect(() => {
    if (block && targetBlock && averageBlockTime && currentBlock) {
      if (currentBlock > targetBlock) {
        setTimeRemaining(0)
      } else {
        setTimeRemaining((targetBlock - currentBlock) * averageBlockTime * 1000)
      }
    }
  }, [averageBlockTime, currentBlock, block, period, targetBlock])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((timeRemaining) => {
        if (timeRemaining !== null) {
          if (timeRemaining === 0) return 0
          if (timeRemaining > 1000) {
            return timeRemaining - 1000
          }
          return timeRemaining
        }
        return null
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [setTimeRemaining])

  return { timeRemaining, targetBlock, currentBlock }
}

export const useCurrentVersion = (serviceType: ServiceType) => {
  const currentVersion = useSelector((state) =>
    getCurrentVersion(state as AppState, serviceType)
  )
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (currentVersion === undefined) dispatch(fetchCurrentVersion(serviceType))
  }, [dispatch, currentVersion, serviceType])
  return currentVersion
}

export const useInit = () => {
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    dispatch(fetchServiceStakeValues())
    dispatch(fetchProtocolDelegation())
    dispatch(fetchTotalStaked())
    dispatch(fetchEthBlockNumber())
    dispatch(fetchAverageBlockTime())
  }, [dispatch])
}
