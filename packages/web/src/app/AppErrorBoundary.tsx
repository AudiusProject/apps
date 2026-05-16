import { ReactNode, useCallback } from 'react'

import { ErrorBoundary, ErrorBoundaryProps } from 'react-error-boundary'
import { useDispatch } from 'react-redux'

import { handleError as handleErrorAction } from 'store/errors/actions'

type HandleError = NonNullable<ErrorBoundaryProps['onError']>

type AppErrorBoundaryProps = {
  children: ReactNode
}

export const AppErrorBoundary = ({ children }: AppErrorBoundaryProps) => {
  const dispatch = useDispatch()

  const handleError: HandleError = useCallback(
    (error, errorInfo) => {
      dispatch(
        handleErrorAction({
          name: 'ReactErrorBoundary',
          message: error.message,
          shouldRedirect: true,
          additionalInfo: errorInfo
        })
      )
    },
    [dispatch]
  )

  return (
    <ErrorBoundary fallbackRender={() => null} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
