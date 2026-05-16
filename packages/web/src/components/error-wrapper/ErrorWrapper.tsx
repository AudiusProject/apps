import { PureComponent, ReactNode } from 'react'

type ErrorWrapperProps = {
  children: ReactNode
  errorMessage?: string
}

class ErrorWrapper extends PureComponent<ErrorWrapperProps> {
  state = {
    didError: false
  }

  componentDidCatch(error: Error | null, _errorInfo: object) {
    this.setState({ didError: true })
    const { errorMessage } = this.props
    if (errorMessage) {
      console.error(errorMessage, error)
    } else {
      console.error(error)
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
