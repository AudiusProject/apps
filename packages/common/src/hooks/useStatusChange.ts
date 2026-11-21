import { useEffect } from 'react'

import { usePrevious } from 'react-use'

import { Status } from '~/models'

export const useStatusChange = (
  status: Status,
  {
    onLoad,
    onSuccess,
    onError,
    onIdle
  }: {
    onLoad?: (prevStatus: Status) => void
    onSuccess?: (prevStatus: Status) => void
    onError?: (prevStatus: Status) => void
    onIdle?: (prevStatus: Status) => void
  }
) => {
  const prevStatus = usePrevious(status)
  useEffect(() => {
    if (prevStatus !== status && prevStatus !== undefined) {
      if (status === Status.LOADING) {
        onLoad?.(prevStatus)
      }
      if (status === Status.SUCCESS) {
        onSuccess?.(prevStatus)
      }
      if (status === Status.ERROR) {
        onError?.(prevStatus)
      }
      if (status === Status.IDLE) {
        onIdle?.(prevStatus)
      }
    }
  }, [status, prevStatus, onLoad, onSuccess, onError, onIdle])
}
