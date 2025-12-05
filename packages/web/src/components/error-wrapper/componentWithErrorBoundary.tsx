import React, { ReactNode, useCallback } from 'react'

import { ErrorLevel } from '@audius/common/models'
import {
  ErrorBoundary,
  ErrorBoundaryProps,
  FallbackProps
} from 'react-error-boundary'
import { useDispatch } from 'react-redux'

import { handleError as handleErrorAction } from 'store/errors/actions'

interface ComponentWithErrorBoundaryOptions {
  fallback?: ReactNode | null
  /**
   * Debugging name (for logs, error reporting)
   */
  name?: string
}

type HandleError = NonNullable<ErrorBoundaryProps['onError']>

export function componentWithErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: ComponentWithErrorBoundaryOptions = {}
) {
  const {
    fallback = null,
    name = WrappedComponent.displayName || WrappedComponent.name || 'Unnamed'
  } = options

  const ComponentWithErrorBoundaryWrapper = (props: P) => {
    const dispatch = useDispatch()

    const handleError: HandleError = useCallback(
      (error, errorInfo) => {
        console.error(`ComponentErrorBoundary (${name}):`, error, errorInfo)
        dispatch(
          handleErrorAction({
            name: `ComponentErrorBoundary: ${name}`,
            message: error.message,
            shouldRedirect: false,
            additionalInfo: errorInfo,
            level: ErrorLevel.Error
          })
        )
      },
      [dispatch]
    )

    const fallbackRender = useCallback((_: FallbackProps) => {
      return React.isValidElement(fallback) ? fallback : <>{fallback}</>
    }, [])

    return (
      <ErrorBoundary fallbackRender={fallbackRender} onError={handleError}>
        {/* @ts-ignore */}
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }

  ComponentWithErrorBoundaryWrapper.displayName = `WithErrorBoundary(${name})`
  if (WrappedComponent.displayName) {
    ComponentWithErrorBoundaryWrapper.displayName += `|${WrappedComponent.displayName}`
  }

  return ComponentWithErrorBoundaryWrapper
}
