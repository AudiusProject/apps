import type { ReactNode } from 'react'
import { PureComponent } from 'react'

import { Feature } from '@audius/common/models'

type NotificationErrorBoundaryProps = {
  children: ReactNode
}

export class NotificationErrorBoundary extends PureComponent<NotificationErrorBoundaryProps> {
  state = {
    error: null
  }

  componentDidCatch(error: Error | null, errorInfo: any) {
    this.setState({ error: error?.message })

    // Sentry removed - log to console
    console.error('[NotificationErrorBoundary]', error, {
      feature: Feature.Notifications,
      ...errorInfo
    })
  }

  render() {
    const { error } = this.state
    const { children } = this.props

    if (error) return null
    return <>{children}</>
  }
}
