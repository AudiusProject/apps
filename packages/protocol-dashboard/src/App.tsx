import { useEffect, useState } from 'react'

import { ApolloProvider } from '@apollo/client'
import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useWeb3ModalAccount, useWeb3ModalState } from '@web3modal/ethers/react'
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

import Header from 'components/Header'
import API from 'containers/API'
import APILeaderboard from 'containers/APILeaderboard'
import Analytics from 'containers/Analytics'
import ContentNodes from 'containers/ContentNodes'
import DiscoveryProviders from 'containers/DiscoveryProviders'
import Governance from 'containers/Governance'
import Home from 'containers/Home'
import Node from 'containers/Node'
import NotFound from 'containers/NotFound'
import Proposal from 'containers/Proposal'
import ServiceOperators from 'containers/ServiceOperators'
import ServiceUsers from 'containers/ServiceUsers'
import Services from 'containers/Services'
import UnregisteredNode from 'containers/UnregisteredNode'
import User from 'containers/User'
import Validators from 'containers/Validators'
import { getDidGraphError } from 'store/api/hooks'
import { ServiceType } from 'types'
import { createStyles } from 'utils/mobile'
import * as routes from 'utils/routes'

import desktopStyles from './App.module.css'
import mobileStyles from './AppMobile.module.css'
import { RouteHistoryProvider } from './providers/RouteHistoryContext'
import { client, getBackupClient, createStore } from './store'

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
  const { selectedNetworkId } = useWeb3ModalState()

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
  }, [address, chainId, selectedNetworkId, willReload])

  useEffect(() => {
    if (!isConnected && window.aud.hasValidAccount && !willReload) {
      setWillReload(true)
      window.location.reload()
    }
  }, [isConnected, willReload])

  return (
    <ApolloProvider client={apolloClient}>
      <HarmonyThemeProvider theme='dark'>
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
                    element={<Node nodeType={ServiceType.DiscoveryProvider} />}
                  />
                  <Route
                    path={routes.SERVICES_DISCOVERY_PROVIDER_NODE}
                    element={
                      <NavigateWithParams
                        to={(params) =>
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
                  <Route
                    path={routes.NODES_CONTENT_NODE}
                    element={<Node nodeType={ServiceType.ContentNode} />}
                  />
                  <Route
                    path={routes.NODES_VALIDATORS}
                    element={<Validators />}
                  />
                  <Route
                    path={routes.NODES_VALIDATOR}
                    element={<Node nodeType={ServiceType.Validator} />}
                  />
                  <Route
                    path={routes.SERVICES_CONTENT_NODE}
                    element={
                      <NavigateWithParams
                        to={(params) =>
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
                        to={(params) =>
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
                        to={(params) =>
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
                  ).map((old) => (
                    <Route
                      path={old}
                      key={old}
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
                  <Route path='*' element={<NotFound />} />
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
