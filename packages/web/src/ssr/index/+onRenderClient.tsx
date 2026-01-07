// For all routes except the explicitly defined ones
// simply render the SPA without SSR
// TODO: Use vike SPA setting

import '../polyfills'

import 'setimmediate'
import { createRoot } from 'react-dom/client'

import '../../index.css'
import RootWithProviders from 'ssr/RootWithProviders'

export default function render() {
  const container = document.getElementById('root')
  if (container) {
    const root = createRoot(container)
    root.render(<RootWithProviders isServerSide={false} isMobile={false} />)
  }
}
