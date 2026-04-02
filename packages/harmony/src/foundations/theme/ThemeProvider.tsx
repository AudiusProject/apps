import { useEffect, useRef, type ReactNode } from 'react'

import { ThemeProvider as EmotionThemeProvider } from '@emotion/react'

import { SVGDefs } from '../../icons/SVGDefs'
import { GlobalStyles } from '../reset/GlobalStyles'

import { themes } from './theme'
import type { Theme } from './types'

type ThemeProviderProps = {
  theme: Theme
  children: ReactNode
}

type ThemeProviderInstance = {
  id: number
  theme: Theme
}

let instanceId = 0
let providerStack: ThemeProviderInstance[] = []

const syncDocumentTheme = () => {
  if (typeof document === 'undefined') return

  const activeProvider = providerStack[providerStack.length - 1]
  if (activeProvider) {
    document.documentElement.setAttribute('data-theme', activeProvider.theme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children, theme } = props
  const providerIdRef = useRef<number | null>(null)
  if (providerIdRef.current == null) {
    providerIdRef.current = ++instanceId
  }
  const providerId = providerIdRef.current

  useEffect(() => {
    providerStack = [...providerStack, { id: providerId, theme }]
    syncDocumentTheme()

    return () => {
      providerStack = providerStack.filter(
        (provider) => provider.id !== providerId
      )
      syncDocumentTheme()
    }
  }, [providerId])

  useEffect(() => {
    providerStack = providerStack.map((provider) =>
      provider.id === providerId ? { ...provider, theme } : provider
    )
    syncDocumentTheme()
  }, [providerId, theme])

  return (
    <EmotionThemeProvider theme={themes[theme]}>
      <GlobalStyles />
      <SVGDefs />
      {children}
    </EmotionThemeProvider>
  )
}
