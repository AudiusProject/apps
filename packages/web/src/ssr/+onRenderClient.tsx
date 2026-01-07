import './polyfills'

import 'setimmediate'
import { hydrateRoot } from 'react-dom/client'
import type { PageContextClient } from 'vike/types'

import { isMobile as getIsMobile } from 'utils/clientUtil'

import '../index.css'
import { checkIsCrawler } from './util'

// Set this to false to turn off client hydration
// Useful for testing the SSR output
const HYDRATE_CLIENT = true

export default async function render(pageContext: PageContextClient) {
  // On client-side, get userAgent from navigator directly
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isCrawler = checkIsCrawler(userAgent)
  const isMobile = getIsMobile()

  if (HYDRATE_CLIENT && !isCrawler) {
    const { RootWithProviders } = await import('./RootWithProviders')
    hydrateRoot(
      document.getElementById('root') as HTMLElement,
      <RootWithProviders isServerSide={false} isMobile={isMobile} />
    )
  }
}
