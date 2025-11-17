import { createContext, memo, useContext, useState } from 'react'

import {
  History,
  BrowserHistoryBuildOptions,
  createBrowserHistory,
  createHashHistory,
  HashHistoryBuildOptions,
  createMemoryHistory
} from 'history'

import { env } from 'services/env'

type HistoryContextType = {
  history: History
}

export const useHistoryContext = () => {
  return useContext(HistoryContext)
}

export const HistoryContext = createContext<HistoryContextType>({
  history: null as any
})

const USE_HASH_ROUTING = env.USE_HASH_ROUTING
const basename = env.BASENAME

const getHistoryForEnvironment = () => {
  if (process.env.NODE_ENV === 'test') {
    return createMemoryHistory()
  } else if (USE_HASH_ROUTING) {
    const config: HashHistoryBuildOptions = {}
    if (basename) {
      config.basename = basename
    }
    return createHashHistory(config)
  } else {
    const config: BrowserHistoryBuildOptions = {}
    if (basename) {
      config.basename = basename
    }
    return createBrowserHistory(config)
  }
}

export const HistoryContextProvider = memo(
  (props: { children: JSX.Element; historyOverride?: History }) => {
    const [history] = useState(
      () => props.historyOverride ?? getHistoryForEnvironment()
    )
    return (
      <HistoryContext.Provider value={{ history }}>
        {props.children}
      </HistoryContext.Provider>
    )
  }
)
