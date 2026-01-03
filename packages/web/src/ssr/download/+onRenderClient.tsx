// Simple SSR pages use createRoot instead of hydrateRoot
// to avoid hydration mismatches since we only render meta tags during SSR

import 'setimmediate'
import { Buffer } from 'buffer'

import processBrowser from 'process/browser'
import { createRoot } from 'react-dom/client'

import '../../index.css'
import RootWithProviders from 'ssr/RootWithProviders'
import { isMobile as getIsMobile } from 'utils/clientUtil'

// @ts-ignore
window.global ||= window
// @ts-ignore
window.Buffer = Buffer
window.process = { ...processBrowser, env: process.env }

export default function render() {
  const container = document.getElementById('root')
  if (container) {
    const isMobile = getIsMobile()
    const root = createRoot(container)
    root.render(<RootWithProviders isServerSide={false} isMobile={isMobile} />)
  }
}
