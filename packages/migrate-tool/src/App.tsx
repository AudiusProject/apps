import { useEffect, useState } from 'react'

import { Admin } from './pages/Admin'
import { Home } from './pages/Home'
import { Status } from './pages/Status'

type Route =
  | { page: 'home' }
  | { page: 'status'; requestId: string }
  | { page: 'admin' }

function parseRoute(): Route {
  const url = new URL(window.location.href)
  if (url.pathname.startsWith('/admin')) return { page: 'admin' }
  if (url.pathname.startsWith('/status')) {
    return { page: 'status', requestId: url.searchParams.get('id') ?? '' }
  }
  return { page: 'home' }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute())

  useEffect(() => {
    const handler = () => setRoute(parseRoute())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setRoute(parseRoute())
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
            Audius Track Migration
          </a>
        </h1>
        <p className="tagline">
          Move tracks from an old Audius account to a new one. Each migration
          requires approval from an Audius team member.
        </p>
      </header>

      <main>
        {route.page === 'home' && <Home navigate={navigate} />}
        {route.page === 'status' && (
          <Status requestId={route.requestId} navigate={navigate} />
        )}
        {route.page === 'admin' && <Admin />}
      </main>

      <footer className="footer">
        <a
          href="/admin"
          onClick={(e) => { e.preventDefault(); navigate('/admin') }}
        >
          Admin
        </a>
      </footer>
    </div>
  )
}
