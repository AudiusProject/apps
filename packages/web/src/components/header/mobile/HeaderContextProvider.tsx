import {
  memo,
  ReactNode,
  ReactElement,
  isValidElement,
  createContext,
  useState,
  useEffect,
  useContext
} from 'react'

import { useLocation } from 'react-router'

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

export const HeaderContextConsumer = (): ReactElement | null => {
  const location = useLocation()
  const { pathname } = location
  const [getPreviousPathname, setPreviousPathname] = useInstanceVar(pathname)
  const { header, setHeader } = useContext(HeaderContext)

  useEffect(() => {
    if (getPreviousPathname() !== pathname) {
      setHeader(null)
    }
    setPreviousPathname(pathname)
  }, [pathname, setHeader, getPreviousPathname, setPreviousPathname])

  return isValidElement(header) ? header : null
}
