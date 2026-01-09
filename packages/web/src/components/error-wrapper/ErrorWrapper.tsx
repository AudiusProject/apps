import { PureComponent, ReactNode } from 'react'

type ErrorWrapperProps = {
  children: ReactNode
  errorMessage?: string
}

class ErrorWrapper extends PureComponent<ErrorWrapperProps> {
  state = {
    didError: false
  }

  async componentDidCatch(error: Error | null, errorInfo: object) {
    this.setState({ didError: true })
    try {
      // Lazy load Sentry SDK
      const Sentry = await import('@sentry/browser')
      const { errorMessage } = this.props
      if (errorMessage) Sentry.captureMessage(errorMessage)
      Sentry.captureException(error)
    } catch (err) {
      console.error('Failed to report error to Sentry:', err)
    }
  }

  render() {
    if (this.state.didError) {
      return null
    }
    return this.props.children
  }
}

export default ErrorWrapper
