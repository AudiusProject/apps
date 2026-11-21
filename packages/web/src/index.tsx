import 'setimmediate'

import { createRoot } from 'react-dom/client'

import './index.css'
import RootWithProviders from 'ssr/RootWithProviders'
import { registerErrorHmrHandler } from 'utils/hmr/errorHmrHandler'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()

  const key = 'chunk-reload'
  const lastReload = sessionStorage.getItem(key)
  const now = Date.now()

  if (!lastReload || now - Number(lastReload) > 10_000) {
    sessionStorage.setItem(key, String(now))
    window.location.reload()
  }
})

// @ts-ignore
window.global ||= window

registerErrorHmrHandler()

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<RootWithProviders isServerSide={false} isMobile={false} />)
}
