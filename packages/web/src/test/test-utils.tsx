import { ReactElement, ReactNode } from 'react'

import fs from 'fs'
import path from 'path'

import { QueryContext, QueryContextType } from '@audius/common/api'
import { AppContext } from '@audius/common/context'
import { FeatureFlags } from '@audius/common/services'
import { MediaProvider, ThemeProvider } from '@audius/harmony'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions, configure } from '@testing-library/react'
import { History } from 'history'
import { setupServer } from 'msw/node'
import { Provider } from 'react-redux'
import { Router } from 'react-router-dom'
import { CompatRouter } from 'react-router-dom-v5-compat'
import { PartialDeep } from 'type-fest'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { mock } from 'wagmi/connectors'

import {
  HistoryContext,
  HistoryContextProvider,
  useHistoryContext
} from 'app/HistoryProvider'
import { RouterContextProvider } from 'components/animated-switch/RouterContextProvider'
import { ToastContextProvider } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { env } from 'services/env/env.dev'
import { queryClient } from 'services/query-client'
import { configureStore } from 'store/configureStore'
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
  customHistory?: History
}

type ReduxProviderProps = {
  children: ReactNode
  initialStoreState?: PartialDeep<AppState>
}

export const ReduxProvider = ({
  children,
  initialStoreState
}: ReduxProviderProps) => {
  const { history } = useHistoryContext()
  const isMobile = useIsMobile()
  const { store } = configureStore({
    history,
    isMobile,
    initialStoreState,
    isTest: true
  })

  return <Provider store={store}>{children}</Provider>
}

type TestProvidersProps = {
  children: ReactNode
}

const TestProviders =
  (options?: TestOptions) => (props: TestProvidersProps) => {
    const { children } = props
    const { reduxState, featureFlags, customHistory } = options ?? {}
    const mockAppContext = createMockAppContext(featureFlags)
    const queryContext = {
      audiusSdk,
      env
    } as unknown as QueryContextType

    return (
      <WagmiProvider config={mockWagmiConfig}>
        <HistoryContextProvider historyOverride={customHistory}>
          <MediaProvider>
            <QueryClientProvider client={queryClient}>
              <QueryContext.Provider value={queryContext}>
                <ThemeProvider theme='day'>
                  <ReduxProvider initialStoreState={reduxState}>
                    <RouterContextProvider>
                      <AppContext.Provider value={mockAppContext}>
                        <ToastContextProvider>
                          <HistoryContext.Consumer>
                            {({ history }) => {
                              return (
                                <Router history={history}>
                                  <CompatRouter>{children}</CompatRouter>
                                </Router>
                              )
                            }}
                          </HistoryContext.Consumer>
                        </ToastContextProvider>
                      </AppContext.Provider>
                    </RouterContextProvider>
                  </ReduxProvider>
                </ThemeProvider>
              </QueryContext.Provider>
            </QueryClientProvider>
          </MediaProvider>
        </HistoryContextProvider>
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
configure({
  getElementError: (message: any) => new Error(message)
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
