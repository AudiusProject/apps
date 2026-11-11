import React, { useContext } from 'react'

import type { ReactTestRenderer } from 'react-test-renderer'
import { act, create } from 'react-test-renderer'

import { SetPlayBarVisibilityContext } from './BottomBarInsetContext'
import { BottomBarInsetProvider } from './BottomBarInsetProvider'
import { ScreenFooterLayout } from './ScreenFooterLayout'

let mockSafeBottom = 0
let mockKeyboardHeight = 0
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles }
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: mockSafeBottom })
}))
jest.mock('@react-navigation/elements', () => ({ useHeaderHeight: () => 88 }))
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  useReanimatedKeyboardAnimation: () => ({
    height: { value: mockKeyboardHeight }
  })
}))
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'AnimatedView' },
  useAnimatedStyle: (factory: () => unknown) => factory()
}))
jest.mock('@audius/harmony-native', () => ({ Paper: 'Paper' }), {
  virtual: true
})
jest.mock('../now-playing-drawer/constants', () => ({ PLAY_BAR_HEIGHT: 46 }))

const VisibilityControl = () => {
  const setVisible = useContext(SetPlayBarVisibilityContext)
  return (
    <button onClick={() => setVisible(true)} onBlur={() => setVisible(false)} />
  )
}

describe('ScreenFooterLayout', () => {
  let renderer: ReactTestRenderer
  afterEach(() => act(() => renderer?.unmount()))

  it.each([
    ['Android gesture navigation', 24],
    ['Android three-button navigation', 0],
    ['iPhone home indicator', 34],
    ['iPhone without home indicator', 0]
  ])(
    '%s reserves navigation once and keeps the scrollbar outside the footer',
    (_, safeBottom) => {
      mockSafeBottom = safeBottom as number
      mockKeyboardHeight = 0
      const screen = () => (
        <BottomBarInsetProvider>
          <VisibilityControl />
          <ScreenFooterLayout footer='Save'>Scroll area</ScreenFooterLayout>
        </BottomBarInsetProvider>
      )
      act(() => {
        renderer = create(screen())
      })
      const root = renderer.root.findByType('KeyboardAvoidingView' as any)
      const [content, footer, clearance] = root.children as any[]
      expect(content.props.style).toEqual({ flex: 1, minHeight: 0 })
      expect(content.props.children).toBe('Scroll area')
      expect(footer.props.children).toBe('Save')
      expect(footer.props.style).toEqual({ flexShrink: 0, borderRadius: 0 })
      expect(clearance.props.style.height).toBe(41 + (safeBottom as number))
      expect(root.props.behavior).toBe('height')
      expect(root.props.keyboardVerticalOffset).toBe(88)

      // A loaded/restored track alone does not reserve a hidden mini-player.
      const control = renderer.root.findByType('button')
      act(() => control.props.onClick())
      expect(
        renderer.root.findByType('AnimatedView' as any).props.style.height
      ).toBe(41 + (safeBottom as number) + 46)
      act(() => control.props.onBlur())
      expect(
        renderer.root.findByType('AnimatedView' as any).props.style.height
      ).toBe(41 + (safeBottom as number))

      // Keyboard clearance replaces the tab/mini-player clearance, including during animation.
      for (const keyboardHeight of [-20, -320, 0]) {
        mockKeyboardHeight = keyboardHeight
        act(() => renderer.update(screen()))
        expect(
          renderer.root.findByType('AnimatedView' as any).props.style.height
        ).toBe(Math.max(0, 41 + (safeBottom as number) + keyboardHeight))
      }
    }
  )
})
