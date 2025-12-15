import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'

import { Root } from '../Root'

import { SsrContextProvider, SsrContextType } from './SsrContext'

// Create cache for client-side rendering
const cache = createCache({ key: 'harmony', prepend: true })

type RootWithProvidersProps = SsrContextType

export const RootWithProviders = (props: RootWithProvidersProps) => {
  return (
    <CacheProvider value={cache}>
      <SsrContextProvider value={props}>
        <>
          <Root />

          {/* This is used in E2E tests to determine that client-side JS is loaded */}
          <div data-testid='app-hydrated'></div>
        </>
      </SsrContextProvider>
    </CacheProvider>
  )
}

export default RootWithProviders
