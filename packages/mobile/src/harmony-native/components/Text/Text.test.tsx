import type { ReactElement } from 'react'

import { render, screen } from '@testing-library/react-native'

import { ThemeProvider } from '../../foundations/theme'

import { Text } from './Text'

const renderWithTheme = (ui: ReactElement) =>
  render(<ThemeProvider themeName='day'>{ui}</ThemeProvider>)

test('renders text correctly', () => {
  renderWithTheme(<Text>hello world</Text>)

  expect(screen.getByText(/hello world/i)).toBeOnTheScreen()
})

test('it renders display variant correctly', () => {
  renderWithTheme(<Text variant='display'>test display</Text>)

  expect(
    screen.getByRole('heading', { name: /test display/i })
  ).toBeOnTheScreen()
})

test('it renders heading variant correctly', () => {
  renderWithTheme(<Text variant='heading'>test heading</Text>)

  expect(
    screen.getByRole('heading', { name: /test heading/i })
  ).toBeOnTheScreen()
})

test('it renders labels correctly', () => {
  renderWithTheme(<Text variant='label'>test label</Text>)

  expect(screen.getByText(/test label/i)).toHaveStyle({
    textTransform: 'uppercase'
  })
})

test('it renders color correctly', () => {
  renderWithTheme(<Text color='subdued'>test label</Text>)

  expect(screen.getByText(/test label/i)).toHaveStyle({
    color: '#A2A0AFFF'
  })
})
