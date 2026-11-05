import React from 'react'

import type { ReactTestRenderer } from 'react-test-renderer'
import { act, create } from 'react-test-renderer'

import { FormScreen } from '../../screens/edit-profile-screen/FormScreen'

import { BottomBarInsetContext } from './BottomBarInsetContext'
import {
  FixedFooter,
  FixedFooterContent,
  FIXED_FOOTER_HEIGHT
} from './FixedFooter'

const mockGoBack = jest.fn()
let mockSafeBottom = 0

// React 19 requires this flag when using the renderer directly.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

jest.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: mockSafeBottom })
}))
jest.mock('@emotion/native', () => ({ css: (style: unknown) => style }))
jest.mock(
  '@audius/harmony-native',
  () => ({
    Button: 'Button',
    IconUser: () => null,
    Text: 'Text',
    Flex: 'Flex',
    Paper: 'Paper',
    spacing: { l: 16, xl: 24, unit5: 20 }
  }),
  { virtual: true }
)
jest.mock('../now-playing-drawer/constants', () => ({ PLAY_BAR_HEIGHT: 46 }))
jest.mock('./ScreenFooterLayout', () => ({
  ScreenFooterLayout: ({ children, footer }: any) => (
    <>
      {children}
      {footer}
    </>
  )
}))
jest.mock('./KeyboardAvoidingView', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView'
}))

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: () => ({ goBack: mockGoBack })
  }),
  { virtual: true }
)
jest.mock('./Screen', () => ({
  Screen: 'Screen',
  ScreenContent: 'ScreenContent'
}))

describe('FixedFooter floating navigation clearance', () => {
  let renderer: ReactTestRenderer

  afterEach(() => {
    act(() => renderer?.unmount())
    mockGoBack.mockClear()
  })

  it.each([
    ['Android without a track', 0, 41],
    ['Android with a track', 24, 41 + 24 + 46],
    ['iPhone without a track', 34, 41 + 34],
    ['iPhone with a track', 34, 41 + 34 + 46]
  ])('%s keeps actions above navigation', (_name, safeBottom, inset) => {
    mockSafeBottom = safeBottom as number
    act(() => {
      renderer = create(
        <BottomBarInsetContext.Provider value={inset as number}>
          <FixedFooter avoidKeyboard keyboardShowingOffset={20}>
            Save
          </FixedFooter>
        </BottomBarInsetContext.Provider>
      )
    })

    const footer = renderer.root.findByType('Flex' as any)
    expect(footer.props.style.bottom).toBe(inset)
    expect(footer.props.w).toBe('100%')
    // The safe area is already part of the navigation inset.
    expect(
      renderer.root.findByType('Paper' as any).props.style.paddingBottom
    ).toBe(16)
    // Adding the inset to the translation offset avoids lifting the footer twice.
    expect(
      renderer.root.findByType('KeyboardAvoidingView' as any).props
        .keyboardShowingOffset
    ).toBe(20 + (inset as number))
  })

  it.each([0, 34])(
    'preserves modal placement with safe area %s',
    (safeBottom) => {
      mockSafeBottom = safeBottom
      act(() => {
        renderer = create(<FixedFooter>Done</FixedFooter>)
      })
      expect(renderer.root.findByType('Flex' as any).props.style.bottom).toBe(
        safeBottom === 0 ? 16 : 0
      )
      expect(
        renderer.root.findByType('Paper' as any).props.style.paddingBottom
      ).toBe(safeBottom)
    }
  )

  it('updates footer and content clearance when the mini-player appears or disappears', () => {
    const content = (inset: number) => (
      <BottomBarInsetContext.Provider value={inset}>
        <FixedFooterContent>Fields</FixedFooterContent>
        <FixedFooter>Save</FixedFooter>
      </BottomBarInsetContext.Provider>
    )
    act(() => {
      renderer = create(content(75))
    })
    for (const inset of [75, 121, 75]) {
      act(() => renderer.update(content(inset)))
      const [body, footer] = renderer.root.findAllByType('Flex' as any)
      expect(body.props.style.paddingBottom).toBe(FIXED_FOOTER_HEIGHT + inset)
      expect(footer.props.style.bottom).toBe(inset)
    }
  })

  it('profile Save sits in the header and submits', () => {
    const onSubmit = jest.fn()
    act(() => {
      renderer = create(
        <FormScreen onSubmit={onSubmit} canSubmit>
          Profile fields
        </FormScreen>
      )
    })
    const save = renderer.root.findByType('Screen' as any).props.topbarRight
    expect(save.props.disabled).toBe(false)
    act(() => save.props.onPress())
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('profile Save is disabled until there is something to save', () => {
    const onSubmit = jest.fn()
    act(() => {
      renderer = create(
        <FormScreen onSubmit={onSubmit} canSubmit={false}>
          Profile fields
        </FormScreen>
      )
    })
    const save = renderer.root.findByType('Screen' as any).props.topbarRight
    expect(save.props.disabled).toBe(true)
    act(() => save.props.onPress())
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
