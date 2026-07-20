import { fireEvent, render, screen } from '@testing-library/react-native'

import { AccountLoadingScreen } from './AccountLoadingScreen'

const mockDispatch = jest.fn()
const mockNavigate = jest.fn()
const mockSignUpAction = { type: 'SIGN_ON/SIGN_UP' }
const mockFinishSignUpAction = { type: 'SIGN_ON/FINISH_SIGN_UP' }
let mockIsFastReferral = false
let mockSignOnState: { accountReady: boolean; status: string } = {
  accountReady: false,
  status: 'loading'
}

jest.mock('@audius/web/src/common/store/pages/signon/actions', () => ({
  finishSignUp: () => mockFinishSignUpAction,
  signUp: () => mockSignUpAction
}))

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ signOn: mockSignOnState })
}))

jest.mock('app/hooks/useNavigation', () => ({
  useNavigation: () => ({ navigate: mockNavigate })
}))

jest.mock('../hooks/useFastReferral', () => ({
  useFastReferral: () => mockIsFastReferral
}))

jest.mock('app/components/loading-spinner', () => {
  const React = require('react')
  const { View } = require('react-native')
  return (props: Record<string, unknown>) =>
    React.createElement(View, { ...props, testID: 'loading-spinner' })
})

jest.mock('../components/layout', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    Page: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    Heading: ({
      heading,
      description
    }: {
      heading: string
      description: string
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, heading),
        React.createElement(Text, null, description)
      )
  }
})

jest.mock(
  '@audius/harmony-native',
  () => {
    const React = require('react')
    const { Pressable, Text, View } = require('react-native')
    return {
      Button: ({
        children,
        onPress
      }: {
        children: React.ReactNode
        onPress: () => void
      }) =>
        React.createElement(
          Pressable,
          { accessibilityRole: 'button', onPress },
          React.createElement(Text, null, children)
        ),
      Flex: ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, null, children)
    }
  },
  { virtual: true }
)

describe('AccountLoadingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsFastReferral = false
    mockSignOnState = {
      accountReady: false,
      status: 'loading'
    }
  })

  it('shows a retry action when account creation fails', () => {
    mockSignOnState.status = 'failure'

    render(<AccountLoadingScreen />)

    expect(
      screen.getByText("We Couldn't Finish Creating Your Account")
    ).toBeOnTheScreen()
    expect(screen.queryByTestId('loading-spinner')).not.toBeOnTheScreen()

    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }))

    expect(mockDispatch).toHaveBeenCalledWith(mockSignUpAction)
  })

  it('continues showing progress while account creation is pending', () => {
    render(<AccountLoadingScreen />)

    expect(screen.getByTestId('loading-spinner')).toBeOnTheScreen()
    expect(screen.queryByText('Try Again')).not.toBeOnTheScreen()
  })

  it('finishes signup and navigates home when the account is ready', () => {
    mockSignOnState.status = 'success'

    render(<AccountLoadingScreen />)

    expect(mockDispatch).toHaveBeenCalledWith(mockFinishSignUpAction)
    expect(mockNavigate).toHaveBeenCalledWith('HomeStack', {
      screen: 'Trending'
    })
  })
})
