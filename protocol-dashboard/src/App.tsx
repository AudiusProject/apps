import { ApolloProvider } from '@apollo/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { Provider, useSelector } from 'react-redux'
import {
  Routes,
  Route,
  HashRouter,
  Navigate,
  useParams,
  To,
  NavigateProps
} from 'react-router-dom'
import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony'

import Header from 'components/Header'
import Home from 'containers/Home'
import Governance from 'containers/Governance'
import Services from 'containers/Services'
import Node from 'containers/Node'
import User from 'containers/User'
import DiscoveryProviders from 'containers/DiscoveryProviders'
import ContentNodes from 'containers/ContentNodes'
import ServiceOperators from 'containers/ServiceOperators'
import ServiceUsers from 'containers/ServiceUsers'
import Analytics from 'containers/Analytics'
import API from 'containers/API'
import APILeaderboard from 'containers/APILeaderboard'
import * as routes from 'utils/routes'

import { client, getBackupClient, createStore } from './store'
import desktopStyles from './App.module.css'
import mobileStyles from './AppMobile.module.css'
import NotFound from 'containers/NotFound'
import Proposal from 'containers/Proposal'
import { createStyles } from 'utils/mobile'
import { getDidGraphError } from 'store/api/hooks'
import UnregisteredNode from 'containers/UnregisteredNode'
import { RouteHistoryProvider } from './providers/RouteHistoryContext'
import { useWeb3ModalAccount } from '@web3modal/ethers/react'

const styles = createStyles({ desktopStyles, mobileStyles })
const store = createStore()
const queryClient = new QueryClient()

const Root = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </Provider>
)

type NavigateWithParamsParams = Omit<NavigateProps, 'to'> & {
  to: To | ((params: Record<string, string>) => To)
}
const NavigateWithParams = ({ to, ...rest }: NavigateWithParamsParams) => {
  const params = useParams()
  let toValue: To
  if (typeof to === 'function') {
    toValue = to(params)
  } else {
    toValue = to
  }
  return <Navigate to={toValue} {...rest} />
}

const App = () => {
  //  If the client fails, set it to the backup client
  const [apolloClient, setApolloClient] = useState(client)
  const [willReload, setWillReload] = useState(false)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])
  const didClientError = useSelector(getDidGraphError)
  useEffect(() => {
    if (didClientError) {
      const backupClient = getBackupClient()
      if (backupClient) {
        setApolloClient(backupClient)
      }
    }
  }, [didClientError])

  const { address, chainId, isConnected } = useWeb3ModalAccount()
  useEffect(() => {
    if (window.aud.hasValidAccount && !willReload) {
      setWillReload(true)
      window.location.reload()
    }
  }, [address, chainId])

  useEffect(() => {
    if (!isConnected && window.aud.hasValidAccount && !willReload) {
      setWillReload(true)
      window.location.reload()
    }
  }, [isConnected])

  return (
    <ApolloProvider client={apolloClient}>
      <HarmonyThemeProvider theme="dark">
        <HashRouter>
          <RouteHistoryProvider>
            <div className={styles.appContainer}>
              <Header />
              <div className={styles.appContent}>
                <Routes>
                  <Route path={routes.HOME} element={<Home />} />
                  <Route path={routes.NODES} element={<Services />} />
                  <Route
                    path={routes.NODES_UNREGISTERED_DISCOVERY_NODE}
                    element={<UnregisteredNode />}
                  />
                  <Route
                    path={routes.NODES_DISCOVERY}
                    element={<DiscoveryProviders />}
                  />
                  <Route
                    path={routes.NODES_DISCOVERY_NODE}
                    element={<Node />}
                  />
                  <Route
                    path={routes.SERVICES_DISCOVERY_PROVIDER_NODE}
                    element={
                      <NavigateWithParams
                        to={params =>
                          routes.NODES_DISCOVERY_NODE.replace(
                            ':spID',
                            params.spID
                          )
                        }
                      />
                    }
                  />
                  <Route
                    path={routes.NODES_UNREGISTERED_CONTENT_NODE}
                    element={<UnregisteredNode />}
                  />
                  <Route
                    path={routes.NODES_CONTENT}
                    element={<ContentNodes />}
                  />
                  <Route path={routes.NODES_CONTENT_NODE} element={<Node />} />
                  <Route
                    path={routes.SERVICES_CONTENT_NODE}
                    element={
                      <NavigateWithParams
                        to={params =>
                          routes.NODES_CONTENT_NODE.replace(
                            ':spID',
                            params.spID
                          )
                        }
                      />
                    }
                  />
                  <Route
                    path={routes.NODES_SERVICE_PROVIDERS}
                    element={<ServiceOperators />}
                  />
                  <Route path={routes.NODES_USERS} element={<ServiceUsers />} />
                  <Route path={routes.NODES_ACCOUNT_USER} element={<User />} />
                  <Route
                    path={routes.SERVICES_ACCOUNT_USER}
                    element={
                      <NavigateWithParams
                        to={params =>
                          routes.NODES_ACCOUNT_USER.replace(
                            ':wallet',
                            params.wallet
                          )
                        }
                      />
                    }
                  />
                  <Route
                    path={routes.NODES_ACCOUNT_OPERATOR}
                    element={<User />}
                  />
                  <Route
                    path={routes.SERVICES_ACCOUNT_OPERATOR}
                    element={
                      <NavigateWithParams
                        to={params =>
                          routes.NODES_ACCOUNT_OPERATOR.replace(
                            ':wallet',
                            params.wallet
                          )
                        }
                      />
                    }
                  />
                  {Object.keys(
                    routes.SIMPLE_DEPRECATED_SERVICE_ROUTES_TO_NODES_ROUTES
                  ).map(old => (
                    <Route
                      path={old}
                      element={
                        <Navigate
                          to={
                            routes
                              .SIMPLE_DEPRECATED_SERVICE_ROUTES_TO_NODES_ROUTES[
                              old
                            ]
                          }
                        />
                      }
                    />
                  ))}
                  <Route path={routes.GOVERNANCE} element={<Governance />} />
                  <Route
                    path={routes.GOVERNANCE_PROPOSAL}
                    element={<Proposal />}
                  />
                  <Route path={routes.ANALYTICS} element={<Analytics />} />
                  <Route path={routes.API} element={<API />} />
                  <Route
                    path={routes.API_LEADERBOARD}
                    element={<APILeaderboard />}
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </RouteHistoryProvider>
        </HashRouter>
      </HarmonyThemeProvider>
    </ApolloProvider>
  )
}

export default Root
