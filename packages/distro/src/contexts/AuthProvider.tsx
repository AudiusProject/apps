import { sdk, User } from '@audius/sdk'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { Status } from './types'

type AuthContext = {
  user?: User
  status: Status
  logout: () => void
}

export const distributorAppKeyStorageKey = '@audius/distro/appKey'

const AuthContext = createContext<AuthContext>({
  status: Status.IDLE,
  logout: () => {}
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | undefined>(undefined)
  const [status, setStatus] = useState(Status.IDLE)

  useEffect(() => {
    const fn = async () => {
      try {
        setStatus(Status.LOADING)

        const appKey = localStorage.getItem(distributorAppKeyStorageKey)
        if (!appKey) {
          setStatus(Status.SUCCESS)
          return
        }
        const env = import.meta.env.VITE_ENVIRONMENT as 'dev' | 'prod'
        const distroSdk = sdk({
          apiKey: appKey,
          appName: 'ddex',
          environment: env === 'dev' ? 'development' : 'production'
        })

        if (distroSdk.oauth.hasRedirectResult()) {
          await distroSdk.oauth.handleRedirect()
        }

        const isAuthed = await distroSdk.oauth.isAuthenticated()
        if (isAuthed) {
          const user = await distroSdk.oauth.getUser()
          setUser(user)
        }

        setStatus(Status.SUCCESS)
      } catch (e) {
        console.error(e)
        setStatus(Status.ERROR)
      }
    }
    fn()
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(distributorAppKeyStorageKey)
    window.location.href = window.location.pathname
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
