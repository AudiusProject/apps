import type { ReactNode } from 'react'
import { PureComponent } from 'react'

type NotificationErrorBoundaryProps = {
  children: ReactNode
}

export class NotificationErrorBoundary extends PureComponent<NotificationErrorBoundaryProps> {
  state = {
    error: null
  }

  componentDidCatch(error: Error | null, errorInfo: any) {
    this.setState({ error: error?.message })
    console.error('[NotificationErrorBoundary]', error, errorInfo)
  }

  render() {
    const { error } = this.state
    const { children } = this.props

    if (error) return null
    return <>{children}</>
  }
}
