import { ReactElement, ReactNode, useEffect } from 'react'

import fs from 'fs'
import path from 'path'

import { QueryContext, QueryContextType } from '@audius/common/api'
import { AppContext } from '@audius/common/context'
import { FeatureFlags } from '@audius/common/services'
import { MediaProvider, ThemeProvider } from '@audius/harmony'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions, configure } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { Provider } from 'react-redux'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { PartialDeep } from 'type-fest'
import { it as vitestIt } from 'vitest'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { mock } from 'wagmi/connectors'

import { RouterContextProvider } from 'components/animated-switch/RouterContextProvider'
import { ToastContextProvider } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { env } from 'services/env/env.dev'
import { queryClient } from 'services/query-client'
import { configureStore } from 'store/configureStore'
import { setNavigateRef } from 'store/navigationMiddleware'
import { AppState } from 'store/types'

import { createMockAppContext } from './mocks/app-context'
import { audiusSdk } from './mocks/audiusSdk'

// Create a mock wagmi config for testing
const mockWagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    mock({
      accounts: ['0x0000000000000000000000000000000000000000']
    })
  ],
  transports: {
    [mainnet.id]: http()
  }
})

type TestOptions = {
  reduxState?: PartialDeep<AppState>
  featureFlags?: Partial<Record<FeatureFlags, boolean>>
  skipRouter?: boolean // If true, don't wrap in BrowserRouter (useful when using MemoryRouter in test)
}

type ReduxProviderProps = {
  children: ReactNode
  initialStoreState?: PartialDeep<AppState>
}

export const ReduxProvider = ({
  children,
  initialStoreState
}: ReduxProviderProps) => {
  const isMobile = useIsMobile()
  const { store } = configureStore({
    isMobile,
    initialStoreState,
    isTest: true
  })

  return <Provider store={store}>{children}</Provider>
}

type TestProvidersProps = {
  children: ReactNode
}

// Component to set up navigation ref for middleware when using BrowserRouter
const NavigationSetup = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()

  useEffect(() => {
    setNavigateRef(navigate)
    return () => {
      setNavigateRef(null as any)
    }
  }, [navigate])

  return <>{children}</>
}

const TestProviders =
  (options?: TestOptions) => (props: TestProvidersProps) => {
    const { children } = props
    const { reduxState, featureFlags, skipRouter } = options ?? {}
    const mockAppContext = createMockAppContext(featureFlags)
    const queryContext = {
      audiusSdk,
      env
    } as unknown as QueryContextType

    const content = (
      <RouterContextProvider>
        <AppContext.Provider value={mockAppContext}>
          <ToastContextProvider>{children}</ToastContextProvider>
        </AppContext.Provider>
      </RouterContextProvider>
    )

    return (
      <WagmiProvider config={mockWagmiConfig}>
        <MediaProvider>
          <QueryClientProvider client={queryClient}>
            <QueryContext.Provider value={queryContext}>
              <ThemeProvider theme='day'>
                <ReduxProvider initialStoreState={reduxState}>
                  {skipRouter ? (
                    content
                  ) : (
                    <BrowserRouter>
                      <NavigationSetup>{content}</NavigationSetup>
                    </BrowserRouter>
                  )}
                </ReduxProvider>
              </ThemeProvider>
            </QueryContext.Provider>
          </QueryClientProvider>
        </MediaProvider>
      </WagmiProvider>
    )
  }

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & TestOptions

const customRender = (ui: ReactElement, options?: CustomRenderOptions) =>
  render(ui, { wrapper: TestProviders(options), ...options })

export * from '@testing-library/react'
export type { CustomRenderOptions as RenderOptions }
export { customRender as render }

export const mswServer = setupServer()

// Removes the long DOM output from failed queries
// the DOM output is usually too short to show anything useful but also so large that it floods the console
function getElementError(message: any) {
  const error = new Error(message)
  // Remove this function from the stack trace so the trace points
  // to where the test actually failed (in the testing library code)
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, getElementError)
  } else {
    // Fallback: remove frames related to getElementError
    const stack = error.stack?.split('\n') || []
    // Keep the first line (error message) and filter out getElementError frames
    const filteredStack = stack.filter(
      (line, index) =>
        index === 0 || // Keep error message line
        (!line.includes('getElementError') && !line.includes('test-utils.tsx'))
    )
    error.stack = filteredStack.join('\n')
  }
  return error
}

configure({
  getElementError
})

/**
 * Saves the current document DOM (or a provided node) to an HTML file.
 *
 * @param filename  Optional filename (defaults to timestamped file)
 * @param node      Optional specific node (defaults to document.body)
 * @param maxLength Max number of characters to include (default: 10_000)
 */
export function saveDomToFile(
  filename?: string,
  node?: HTMLElement | DocumentFragment
) {
  const target = node ?? document.body
  if (!target) {
    console.warn('No DOM available to save.')
    return
  }

  const html =
    (target as HTMLElement).outerHTML ??
    Array.from((target as DocumentFragment).children || [])
      .map((c: Element) => c.outerHTML)
      .join('\n')
  const outputDir = path.resolve(process.cwd(), 'test-output')
  fs.mkdirSync(outputDir, { recursive: true })

  const name =
    filename || `dom-${new Date().toISOString().replace(/[:.]/g, '-')}.html`

  const filePath = path.join(outputDir, name)
  fs.writeFileSync(filePath, html, 'utf8')

  // eslint-disable-next-line no-console
  console.log(`🧾 DOM snapshot written to: ${filePath}`)
}

/**
 * Wrapper around vitest's it() to add a feature that automatically capture DOM snapshots on test failure.
 * The snapshot filename is based on the test name (sanitized for filesystem).
 */
function createItWrapper(): typeof vitestIt {
  const itWrapper = (
    name: string,
    fn?: () => void | Promise<void>,
    timeout?: number
  ) => {
    const wrappedFn = fn
      ? async () => {
          try {
            return await fn()
          } catch (error) {
            // Capture DOM before cleanup happens
            const sanitizedName = name
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')
            const filename = `${sanitizedName}.html`
            saveDomToFile(filename)
            throw error
          }
        }
      : undefined

    return vitestIt(name, wrappedFn, timeout)
  }

  // Use a Proxy to forward all property access to vitestIt
  // This ensures all methods (skip, only, todo, concurrent, fails, each, withContext, etc.) are available
  return new Proxy(itWrapper, {
    get(target, prop) {
      // If the property exists on our wrapper function, return it
      if (prop in target) {
        return (target as any)[prop]
      }
      // Otherwise, forward to vitestIt
      return (vitestIt as any)[prop]
    },
    has(target, prop) {
      return prop in target || prop in vitestIt
    },
    ownKeys(target) {
      // Combine keys from both target and vitestIt
      const targetKeys = Reflect.ownKeys(target)
      const vitestKeys = Reflect.ownKeys(vitestIt)
      return Array.from(new Set([...targetKeys, ...vitestKeys]))
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Reflect.getOwnPropertyDescriptor(target, prop)
      }
      return Reflect.getOwnPropertyDescriptor(vitestIt, prop)
    }
  }) as typeof vitestIt
}

export const it = createItWrapper()
