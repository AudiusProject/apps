import { ReactNode, createContext, useEffect, useState, useRef } from 'react'

import { useLocation, useNavigationType } from 'react-router'

export const RouteContext = createContext({
  isGoBack: false
})

type RouteContextProviderProps = {
  children: ReactNode
}

export const RouteContextProvider = (props: RouteContextProviderProps) => {
  const { children } = props

  const location = useLocation()
  const navigationType = useNavigationType()
  const [isGoBack, setIsGoBack] = useState(false)
  const previousLocationRef = useRef(location)

  useEffect(() => {
    // In React Router v6, navigationType can be 'POP', 'PUSH', or 'REPLACE'
    // 'POP' indicates browser back/forward navigation
    if (navigationType === 'POP') {
      setIsGoBack(true)
    } else {
      setIsGoBack(false)
    }
    previousLocationRef.current = location
  }, [location, navigationType])

  return (
    <RouteContext.Provider value={{ isGoBack }}>
      {children}
    </RouteContext.Provider>
  )
}
