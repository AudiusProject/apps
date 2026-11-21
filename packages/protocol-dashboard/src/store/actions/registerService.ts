import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { getAccountWallet } from 'store/account/hooks'
import { getContentNode } from 'store/cache/contentNode/hooks'
import { getDiscoveryProvider } from 'store/cache/discoveryProvider/hooks'
import { fetchUser } from 'store/cache/user/hooks'
import { getValidator } from 'store/cache/validator/hooks'
import { AppState } from 'store/types'
import { Status, ServiceType, BigNumber, Address } from 'types'

function registerAudiusService(
  serviceType: ServiceType,
  endpoint: string,
  stakingAmount: BigNumber,
  delegateOwnerWallet: string | undefined,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)

    const state = getState()
    const wallet = getAccountWallet(state)

    try {
      let spID
      if (delegateOwnerWallet) {
        const res = await aud.ServiceProviderClient.registerWithDelegate(
          serviceType,
          endpoint,
          stakingAmount,
          delegateOwnerWallet
        )
        spID = res.spID
      } else {
        const res = await aud.ServiceProviderClient.register(
          serviceType,
          endpoint,
          stakingAmount
        )
        spID = res.spID
      }

      try {
        const senderEthAddress = delegateOwnerWallet || wallet
        const createSenderPublicReceipt =
          await aud.libs.Rewards.createSenderPublic({
            senderEthAddress,
            operatorEthAddress: wallet,
            senderEndpoint: endpoint
          })
        if (createSenderPublicReceipt.error) {
          console.error(
            `Received error with code ${createSenderPublicReceipt.errorCode}`,
            createSenderPublicReceipt.error
          )
          throw new Error(createSenderPublicReceipt.errorCode)
        }
      } catch (e) {
        console.error('Failed to create new solana sender', e)
      }

      if (wallet) await dispatch(fetchUser(wallet))
      if (serviceType === ServiceType.DiscoveryProvider) {
        await dispatch(getDiscoveryProvider(spID))
      } else if (serviceType === ServiceType.ContentNode) {
        await dispatch(getContentNode(spID))
      } else {
        await dispatch(getValidator(spID))
      }

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useRegisterService = (shouldReset?: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const registerService = useCallback(
    (
      serviceType: ServiceType,
      endpoint: string,
      stakingAmount: BigNumber,
      delegateOwnerWallet: Address
    ) => {
      if (status !== Status.Loading) {
        dispatch(
          registerAudiusService(
            serviceType,
            endpoint,
            stakingAmount,
            delegateOwnerWallet,
            setStatus,
            setError
          )
        )
      }
    },
    [dispatch, status, setStatus, setError]
  )
  return { status, error, registerService }
}
