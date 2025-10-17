import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { getContentNode } from 'store/cache/contentNode/hooks'
import { getDiscoveryProvider } from 'store/cache/discoveryProvider/hooks'
import { getValidator } from 'store/cache/validator/hooks'
import { AppState } from 'store/types'
import { Status, ServiceType } from 'types'

function deregisterAudiusService(
  serviceType: ServiceType,
  spID: number,
  endpoint: string,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      await aud.ServiceProviderClient.deregister(serviceType, endpoint)

      if (serviceType === ServiceType.DiscoveryProvider) {
        dispatch(getDiscoveryProvider(spID))
      } else if (serviceType === ServiceType.ContentNode) {
        dispatch(getContentNode(spID))
      } else {
        dispatch(getValidator(spID))
      }

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useDeregisterService = (shouldReset?: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const deregisterService = useCallback(
    (serviceType: ServiceType, spID: number, endpoint: string) => {
      if (status !== Status.Loading) {
        dispatch(
          deregisterAudiusService(
            serviceType,
            spID,
            endpoint,
            setStatus,
            setError
          )
        )
      }
    },
    [dispatch, status, setStatus, setError]
  )
  return { status, error, deregisterService }
}
