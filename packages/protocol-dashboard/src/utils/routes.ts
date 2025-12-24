import { useLocation } from 'react-router'

/**
 * All Routes for the Audius Protocol Dashboard
 */

export const HOME = '/'
export const HOME_TITLE = 'Overview'

export const API = '/api'
export const API_TITLE = 'API Leaderboard'

export const API_LEADERBOARD = '/api/leaderboard'
export const API_LEADERBOARD_TITLE = 'API Leaderboard'

export const ANALYTICS = '/analytics'
export const ANALYTICS_TITLE = 'Analytics'

// Services Pages
export const NODES = '/nodes'
export const SERVICES = '/services' // deprecated
export const SERVICES_TITLE = 'Services Overview'

export const NODES_VALIDATORS = '/nodes/validators'
export const NODES_VALIDATOR = '/nodes/validators/:spID'
export const NODES_VALIDATORS_TITLE = 'Validators'
export const NODES_VALIDATOR_TITLE = 'Validator'

export const NODES_DISCOVERY = '/nodes/discovery-node'
export const SERVICES_DISCOVERY_PROVIDER = '/services/discovery-node' // deprecated
export const SERVICES_DISCOVERY_PROVIDER_TITLE = 'Discovery Nodes'

export const NODES_DISCOVERY_NODE = '/nodes/discovery-node/:spID'
export const SERVICES_DISCOVERY_PROVIDER_NODE = '/services/discovery-node/:spID' // deprecated
export const SERVICES_DISCOVERY_PROVIDER_NODE_TITLE = 'Discovery Node'
export const NODES_UNREGISTERED_DISCOVERY_NODE =
  '/nodes/discovery-node/unregistered'
export const SERVICES_UNREGISTERED_DISCOVERY_NODE =
  '/services/discovery-node/unregistered' // deprecated
export const SERVICES_UNREGISTERED_DISCOVERY_NODE_TITLE = 'Unregistered Node'

export const NODES_CONTENT = '/nodes/content-node'
export const SERVICES_CONTENT = '/services/content-node' // deprecated
export const SERVICES_CONTENT_TITLE = 'Content Nodes'

export const NODES_CONTENT_NODE = '/nodes/content-node/:spID'
export const SERVICES_CONTENT_NODE = '/services/content-node/:spID' // deprecated
export const SERVICES_CONTENT_NODE_TITLE = 'Content Node'
export const NODES_UNREGISTERED_CONTENT_NODE =
  '/nodes/content-node/unregistered'
export const SERVICES_UNREGISTERED_CONTENT_NODE =
  '/services/content-node/unregistered' // deprecated
export const SERVICES_UNREGISTERED_CONTENT_NODE_TITLE = 'Unregistered Node'

export const NODES_SERVICE_PROVIDERS = '/nodes/service-providers'
export const SERVICES_SERVICE_PROVIDERS = '/services/service-providers' // deprecated
export const SERVICES_SERVICE_PROVIDERS_TITLE = 'All Service Operators'

export const NODES_USERS = '/nodes/users'
export const SERVICES_USERS = '/services/users' // deprecated
export const SERVICES_USERS_TITLE = 'All Users'

export const NODES_ACCOUNT = '/nodes/user'
export const SERVICES_ACCOUNT = '/services/user' // deprecated
export const NODES_ACCOUNT_USER = '/nodes/user/:wallet'
export const SERVICES_ACCOUNT_USER = '/services/user/:wallet' // deprecated
export const SERVICES_ACCOUNT_USER_TITLE = 'User'

export const SERVICES_OPERATOR = '/services/operator' // deprecated
export const NODES_OPERATOR = '/nodes/operator'
export const SERVICES_ACCOUNT_OPERATOR = '/services/operator/:wallet' // deprecated
export const NODES_ACCOUNT_OPERATOR = '/nodes/operator/:wallet'
export const SERVICES_ACCOUNT_OPERATOR_TITLE = 'Operator'

// Governance Pages
export const GOVERNANCE = '/governance'
export const GOVERNANCE_TITLE = 'Governance'
export const GOVERNANCE_PROPOSAL = '/governance/proposal/:proposalId'
export const GOVERNANCE_PROPOSAL_TITLE = 'Proposal'

export const NOT_FOUND = '/404'

// External Routes
export const AUDIUS_API_URL = 'https://audius.org/api'
export const OAF_URL = 'https://audius.org'
export const WHITEPAPER_URL = 'https://whitepaper.audius.co'
export const AUDIUS_DAPP_URL =
  import.meta.env.VITE_AUDIUS_URL || 'https://audius.co'
export const DOCS_URL = 'https://docs.audius.org/'
export const REGISTER_NODE_DOCS_URL =
  'https://docs.openaudio.org/tutorials/running-a-node'
export const COOLDOWN_PERIOD_DOCS_URL =
  'https://docs.audius.org/node-operator/staking/delegate#cooldown-period'

// Get Routes
export const accountPage = (address: string) => {
  return `${NODES_ACCOUNT}/${address}`
}

export const operatorPage = (address: string) => {
  return `${NODES_OPERATOR}/${address}`
}

export const discoveryNodePage = (spID: number) => {
  return `${NODES_DISCOVERY}/${spID}`
}

export const contentNodePage = (spID: number) => {
  return `${NODES_CONTENT}/${spID}`
}

export const validatorPage = (spID: number) => {
  return `${NODES_VALIDATORS}/${spID}`
}

export const proposalPage = (proposalId: number) => {
  return `${GOVERNANCE}/proposal/${proposalId}`
}

export const SIMPLE_DEPRECATED_SERVICE_ROUTES_TO_NODES_ROUTES = {
  [SERVICES]: NODES,
  [SERVICES_UNREGISTERED_DISCOVERY_NODE]: NODES_UNREGISTERED_DISCOVERY_NODE,
  [SERVICES_DISCOVERY_PROVIDER]: NODES_DISCOVERY,
  [SERVICES_UNREGISTERED_CONTENT_NODE]: NODES_UNREGISTERED_CONTENT_NODE,
  [SERVICES_CONTENT]: NODES_CONTENT,
  [SERVICES_SERVICE_PROVIDERS]: NODES_SERVICE_PROVIDERS,
  [SERVICES_USERS]: NODES_USERS
  // Exclude these bc they have path params:
  // [SERVICES_CONTENT_NODE]: NODES_CONTENT_NODE,
  // [SERVICES_DISCOVERY_PROVIDER_NODE]: NODES_DISCOVERY_NODE,
  // [SERVICES_ACCOUNT_USER]: NODES_ACCOUNT_USER,
  // [SERVICES_ACCOUNT_OPERATOR]: NODES_ACCOUNT_OPERATOR
}

const routeTitles = {
  [HOME]: HOME_TITLE,
  [ANALYTICS]: ANALYTICS_TITLE,
  [NODES_DISCOVERY]: SERVICES_DISCOVERY_PROVIDER_TITLE,
  [NODES]: SERVICES_TITLE,
  [GOVERNANCE]: GOVERNANCE_TITLE,
  [GOVERNANCE_PROPOSAL]: GOVERNANCE_TITLE,
  [NODES_USERS]: SERVICES_USERS_TITLE,
  [NODES_ACCOUNT_USER]: SERVICES_ACCOUNT_USER_TITLE,
  [NODES_ACCOUNT_OPERATOR]: SERVICES_ACCOUNT_OPERATOR_TITLE,
  [NODES_SERVICE_PROVIDERS]: SERVICES_SERVICE_PROVIDERS_TITLE,
  [NODES_CONTENT_NODE]: SERVICES_CONTENT_NODE_TITLE,
  [NODES_CONTENT]: SERVICES_CONTENT_TITLE,
  [NODES_DISCOVERY_NODE]: SERVICES_DISCOVERY_PROVIDER_NODE_TITLE,
  [NODES_VALIDATORS]: NODES_VALIDATORS_TITLE,
  [NODES_VALIDATOR]: NODES_VALIDATOR_TITLE,
  [API]: API_TITLE,
  [API_LEADERBOARD]: API_LEADERBOARD_TITLE
}

export const getPageTitle = (route: string) => {
  return routeTitles[route] // If no routes matched, the 404 page was reached
}

export const usePageTitle = () => {
  const location = useLocation()
  return getPageTitle(location.pathname)
}

export const isCryptoPage = (route: string) => {
  return route.startsWith(GOVERNANCE) || route.startsWith(NODES)
}

export const navRoutes = [
  {
    baseRoute: HOME,
    matchParams: [{ path: HOME, exact: true }],
    text: 'OVERVIEW'
  },
  {
    baseRoute: ANALYTICS,
    matchParams: [{ path: ANALYTICS, exact: true }, { path: API }],
    text: 'ANALYTICS'
  },
  {
    baseRoute: NODES,
    matchParams: [{ path: `${NODES}/*` }, { path: `${SERVICES}/*` }],
    text: 'NODES'
  },
  {
    baseRoute: GOVERNANCE,
    matchParams: [{ path: `${GOVERNANCE}/*` }],
    text: 'GOVERNANCE'
  }
]
