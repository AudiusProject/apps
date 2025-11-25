import {
  memo,
  ReactNode,
  createContext,
  useState,
  useEffect,
  useContext
} from 'react'

import { useLocation } from 'react-router-dom'

import { useInstanceVar } from 'hooks/useInstanceVar'
import { useIsMobile } from 'hooks/useIsMobile'

type HeaderContextProps = {
  header: ReactNode
  setHeader: (updated: ReactNode) => void
}

export const HeaderContext = createContext<HeaderContextProps>({
  header: null,
  setHeader: () => {}
})

export const HeaderContextProvider = memo(
  (props: { children: JSX.Element }) => {
    const [header, setHeader] = useState<ReactNode>(null)
    const isMobile = useIsMobile()

    if (isMobile) {
      return (
        <HeaderContext.Provider
          value={{
            header,
            setHeader
          }}
        >
          {props.children}
        </HeaderContext.Provider>
      )
    }
    return props.children
  }
)

export const HeaderContextConsumer = () => {
  const location = useLocation()
  const { pathname } = location
  const [getPreviousPathname, setPreviousPathname] = useInstanceVar(pathname)
  const { header, setHeader } = useContext(HeaderContext)

  // Reset the header on location changes since they shouldn't ever
  // apply to more than one page.
  // This way, users of the HeaderContext need only to set it and not
  // worry about cleanup (the header goes away when the user goes to another page).
  useEffect(() => {
    if (getPreviousPathname() !== pathname) {
      setHeader(null)
    }
    setPreviousPathname(pathname)
  }, [pathname, setHeader, getPreviousPathname, setPreviousPathname])

  return header
}
