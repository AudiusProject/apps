import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import BN from 'bn.js'

import { ServiceType } from 'types'

type ServiceInfo = {
  isValid: boolean
  minStake: BN
  maxStake: BN
  currentVersion?: string
}

export type State = {
  totalStaked?: BN
  ethBlockNumber?: number
  // Average block processing time
  averageBlockTime?: number
  delegator: {
    minDelegationAmount?: BN
    maxDelegators?: number
  }
  services: {
    discoveryProvider?: ServiceInfo
    contentNode?: ServiceInfo
    validator?: ServiceInfo
  }
}

export const initialState: State = {
  delegator: {},
  services: {}
}

type SetTotalStaked = BN
type SetDelegator = {
  minDelegationAmount: BN
  maxDelegators: number
}

type SetServiceTypeInfo = {
  contentNode: ServiceInfo
  discoveryProvider: ServiceInfo
  validator: ServiceInfo
}

const slice = createSlice({
  name: 'protocol',
  initialState,
  reducers: {
    setTotalStaked: (state, action: PayloadAction<SetTotalStaked>) => {
      state.totalStaked = action.payload
    },
    setDelgator: (state, action: PayloadAction<SetDelegator>) => {
      state.delegator.minDelegationAmount = action.payload.minDelegationAmount
      state.delegator.maxDelegators = action.payload.maxDelegators
    },
    setServiceTypeInfo: (state, action: PayloadAction<SetServiceTypeInfo>) => {
      state.services.discoveryProvider = action.payload.discoveryProvider
      state.services.contentNode = action.payload.contentNode
      state.services.validator = action.payload.validator
    },
    setEthBlockNumber: (state, action: PayloadAction<number>) => {
      state.ethBlockNumber = action.payload
    },
    setAverageBlockTime: (state, action: PayloadAction<number>) => {
      state.averageBlockTime = action.payload
    },
    setCurrentVersion: (
      state,
      action: PayloadAction<{
        serviceType: ServiceType
        currentVersion: string
      }>
    ) => {
      switch (action.payload.serviceType) {
        case ServiceType.DiscoveryProvider:
          state.services.discoveryProvider.currentVersion =
            action.payload.currentVersion
          break
        case ServiceType.ContentNode:
          state.services.contentNode.currentVersion =
            action.payload.currentVersion
          break
        case ServiceType.Validator:
          state.services.validator.currentVersion =
            action.payload.currentVersion
          break
      }
    }
  }
})

export const {
  setDelgator,
  setTotalStaked,
  setServiceTypeInfo,
  setEthBlockNumber,
  setAverageBlockTime,
  setCurrentVersion
} = slice.actions

export default slice.reducer
