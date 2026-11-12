// Render the public site on the client instead of hydrating the SSR document.

import '../polyfills'

import 'setimmediate'
import { createRoot } from 'react-dom/client'

import '../../index.css'
import RootWithProviders from 'ssr/RootWithProviders'
import { isMobile as getIsMobile } from 'utils/clientUtil'

export default function render() {
  const container = document.getElementById('root')
  if (container) {
    const isMobile = getIsMobile()
    const root = createRoot(container)
    root.render(<RootWithProviders isServerSide={false} isMobile={isMobile} />)
  }
}
