import React from 'react'

import { createRoot } from 'react-dom/client'
import { Route, Routes, BrowserRouter } from 'react-router'

import './util/initWeb3'
import App from './components/app'
import { HASH_ID_ROUTE, ID_ROUTE } from './routes'

const Index = () => (
  <BrowserRouter>
    <Routes>
      <Route exact path={ID_ROUTE} element={<App path={ID_ROUTE} />} />
      <Route
        exact
        path={HASH_ID_ROUTE}
        element={<App path={HASH_ID_ROUTE} />}
      />
    </Routes>
  </BrowserRouter>
)

window.global ||= window

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Index />)
}
