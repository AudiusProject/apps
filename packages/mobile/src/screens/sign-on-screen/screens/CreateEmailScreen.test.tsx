import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Provider } from 'react-redux'
import { createStore } from 'redux'

import { CreateEmailScreen } from './CreateEmailScreen'

const mockCheckEmail = jest.fn()

jest.mock('@audius/common/api', () => ({
  useQueryContext: () => ({})
}))

jest.mock('@audius/common/messages', () => ({
  createEmailPageMessages: new Proxy({}, { get: (_, key) => String(key) })
}))

// Stands in for the shared schema, whose refinement calls /users/check
jest.mock('@audius/common/schemas', () => {
  const { z } = require('zod')
  return {
    emailSchema: () =>
      z.object({
        email: z.string().superRefine(async (email: string) => {
          await mockCheckEmail(email)
        })
      })
  }
})

jest.mock(
  'common/store/pages/signon/actions',
  () => ({
    setValueField: (field: string, value: string) => ({
      type: 'SIGN_ON/SET_VALUE_FIELD',
      field,
      value
    }),
    startSignUp: () => ({ type: 'SIGN_ON/START_SIGN_UP' })
  }),
  { virtual: true }
)

jest.mock(
  'common/store/pages/signon/selectors',
  () => ({
    getEmailField: (state: { signOn: { email: unknown } }) => state.signOn.email
  }),
  { virtual: true }
)

jest.mock('app/hooks/useNavigation', () => ({
  useNavigation: () => ({ navigate: jest.fn() })
}))

jest.mock('app/services/analytics', () => ({ identify: jest.fn() }))

jest.mock('../utils/useTrackScreen', () => ({ useTrackScreen: jest.fn() }))

jest.mock('../components/layout', () => ({ Heading: () => null }))

jest.mock(
  '@audius/harmony-native',
  () => {
    const React = require('react')
    const { View } = require('react-native')
    const Passthrough = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children)
    return {
      Button: Passthrough,
      Flex: Passthrough,
      IconArrowRight: () => null,
      Text: Passthrough,
      TextLink: Passthrough
    }
  },
  { virtual: true }
)

// Mirrors EmailField: the value is written to redux on every keystroke
jest.mock('../components/NewEmailField', () => {
  const React = require('react')
  const { TextInput } = require('react-native')
  const { useField } = require('formik')
  const { useDispatch } = require('react-redux')
  return {
    NewEmailField: ({ name }: { name: string }) => {
      const [field] = useField(name)
      const dispatch = useDispatch()
      return React.createElement(TextInput, {
        testID: 'email-input',
        value: field.value,
        onChangeText: (text: string) => {
          dispatch({
            type: 'SIGN_ON/SET_VALUE_FIELD',
            field: name,
            value: text
          })
          field.onChange(name)(text)
        }
      })
    }
  }
})

const reducer = (
  state = { signOn: { email: { value: '', error: '' } } },
  action: { type: string; field?: string; value?: string }
) =>
  action.type === 'SIGN_ON/SET_VALUE_FIELD' && action.field === 'email'
    ? { signOn: { email: { value: action.value ?? '', error: '' } } }
    : state

const renderScreen = () =>
  render(
    <Provider store={createStore(reducer)}>
      <QueryClientProvider client={new QueryClient()}>
        <CreateEmailScreen onChangeScreen={jest.fn()} />
      </QueryClientProvider>
    </Provider>
  )

describe('CreateEmailScreen', () => {
  beforeEach(() => {
    mockCheckEmail.mockReset()
  })

  it('does not check the email while typing', async () => {
    renderScreen()
    const input = screen.getByTestId('email-input')
    const email = 'user@audius.co'

    for (let i = 1; i <= email.length; i++) {
      await act(async () => {
        fireEvent.changeText(input, email.slice(0, i))
      })
    }

    expect(mockCheckEmail).not.toHaveBeenCalled()
  })
})
