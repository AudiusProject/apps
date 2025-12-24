import React, { createContext, useContext, useState, useEffect } from 'react'

import { useLocation } from 'react-router'

type RouteHistoryContextType = {
  historyStack: string[]
  setHistoryStack: React.Dispatch<React.SetStateAction<string[]>>
}

const RouteHistoryContext = createContext<RouteHistoryContextType | undefined>(
  undefined
)

export const RouteHistoryProvider = ({ children }) => {
  const [historyStack, setHistoryStack] = useState<string[]>([])
  const location = useLocation()

  useEffect(() => {
    // Prevent duplicates of the same path in the history stack
    if (
      historyStack.length === 0 ||
      historyStack[historyStack.length - 1] !== location.pathname
    ) {
      setHistoryStack((prev) => [...prev, location.pathname])
    }
  }, [location.pathname, historyStack])

  const contextValue = { historyStack, setHistoryStack }

  return (
    <RouteHistoryContext.Provider value={contextValue}>
      {children}
    </RouteHistoryContext.Provider>
  )
}

export const useRouteHistory = () => {
  const context = useContext(RouteHistoryContext)

  if (!context) {
    throw new Error(
      'useRouteHistory must be used within a RouteHistoryProvider'
    )
  }

  const getPreviousRoute = (): string | null => {
    const length = context.historyStack.length
    return length >= 2 ? context.historyStack[length - 2] : null
  }

  return { getPreviousRoute, historyStack: context.historyStack }
}

export const usePreviousRoute = () => {
  const { getPreviousRoute } = useRouteHistory()
  return getPreviousRoute()
}
