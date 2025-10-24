import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject
} from '@apollo/client'
import { configureStore } from '@reduxjs/toolkit'
import { combineReducers } from 'redux'

import Audius from 'services/Audius'

import account from './account/slice'
import api from './api/slice'
import analytics from './cache/analytics/slice'
import claims from './cache/claims/slice'
import contentNode from './cache/contentNode/slice'
import discoveryProvider from './cache/discoveryProvider/slice'
import music from './cache/music/slice'
import proposals from './cache/proposals/slice'
import protocol from './cache/protocol/slice'
import rewards from './cache/rewards/slice'
import timeline from './cache/timeline/slice'
import user from './cache/user/slice'
import validator from './cache/validator/slice'
import votes from './cache/votes/slice'

declare global {
  interface Window {
    aud: any
    store: any
    client: ApolloClient<any>
    hostedClient: ApolloClient<any>
  }
}

const gqlUri = import.meta.env.VITE_GQL_URI
const gqlBackupUri = import.meta.env.VITE_GQL_BACKUP_URI

export const client = new ApolloClient({
  uri: gqlUri,
  cache: new InMemoryCache()
})

let hostedClient: ApolloClient<NormalizedCacheObject> | null = null
export const getBackupClient = () => {
  if (hostedClient) {
    return hostedClient
  } else if (gqlBackupUri) {
    hostedClient = new ApolloClient({
      uri: gqlBackupUri,
      cache: new InMemoryCache()
    })

    window.hostedClient = hostedClient
    return hostedClient
  }
  return null
}

export const hasBackupClient = !!gqlBackupUri

const aud = new Audius()
window.aud = aud
aud.setup()

window.client = client

export const createStore = () => {
  const store = configureStore({
    reducer: combineReducers({
      account,
      api,
      cache: combineReducers({
        discoveryProvider,
        contentNode,
        validator,
        protocol,
        user,
        proposals,
        votes,
        timeline,
        claims,
        analytics,
        music,
        rewards
      })
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: aud
        },
        serializableCheck: false
      })
  })
  window.store = store
  return store
}

export default createStore
