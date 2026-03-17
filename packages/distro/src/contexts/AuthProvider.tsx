import { sdk, User } from '@audius/sdk'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { useSdk } from '../hooks/useSdk'
import { Status } from './types'

type AuthContext = {
  user?: User
  status: Status
  logout: () => void
}

export const distributorAppKeyStorageKey = '@audius/distro/appKey'
const tokenLocalStorageKey = '@audius/sdk/token'

const AuthContext = createContext<AuthContext>({
  status: Status.IDLE,
  logout: () => {}
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { sdk: audiusSdk } = useSdk()
  const [user, setUser] = useState<User | undefined>(undefined)
  const [status, setStatus] = useState(Status.IDLE)

  useEffect(() => {
    if (!audiusSdk) return
    const fn = async () => {
      try {
        setStatus(Status.LOADING)

        const appKey = localStorage.getItem(distributorAppKeyStorageKey)
        if (!appKey) {
          setStatus(Status.SUCCESS)
          return
        }
        const distroSdk = sdk({ apiKey: appKey })

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
        localStorage.removeItem(tokenLocalStorageKey)
        setStatus(Status.ERROR)
      }
    }
    fn()
  }, [audiusSdk])

  const logout = useCallback(() => {
    localStorage.removeItem(tokenLocalStorageKey)
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
