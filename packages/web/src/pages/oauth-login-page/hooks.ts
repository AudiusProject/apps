import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAccountStatus, useCurrentUserId } from '@audius/common/api'
import {
  Name,
  ErrorLevel,
  statusIsNotFinalized,
  UserMetadata
} from '@audius/common/models'
import { Id } from '@audius/sdk'
import * as queryString from 'query-string'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router'

import { make, useRecord } from 'common/store/analytics/actions'
import { audiusSdk } from 'services/audius-sdk'
import { identityService } from 'services/audius-sdk/identity'
import * as errorActions from 'store/errors/actions'
import { reportToSentry } from 'store/errors/reportToSentry'

import { messages } from './messages'
import { Display } from './types'
import {
  authWrite,
  exchangeForAuthorizationCode,
  formOAuthResponse,
  getDeveloperApp,
  getIsAppAuthorized,
  getIsRedirectValid,
  getIsUserConnectedToDashboardWallet,
  handleAuthorizeConnectDashboardWallet,
  handleAuthorizeDisconnectDashboardWallet,
  isValidApiKey,
  validateDashboardWalletParams,
  DashboardWalletParams
} from './utils'

// Collapse space-separated OAuth scopes (e.g. 'read write') to the highest privilege.
// This handles Swagger UI sending 'scope=read write' when multiple scopes are selected.
const collapseScopes = (
  raw: string | string[] | (string | null)[] | null | undefined
): string | null => {
  if (!raw) return null
  // Normalize to an array of individual scope tokens, splitting on whitespace
  const strings = Array.isArray(raw)
    ? raw.filter((t): t is string => typeof t === 'string')
    : [raw]
  const tokens = strings
    .flatMap((s) => (s != null ? s.split(/\s+/) : []))
    .filter((t) => t.length > 0)
  if (tokens.includes('write')) return 'write'
  if (tokens.includes('read')) return 'read'
  return typeof raw === 'string' ? raw : null
}

const useParsedQueryParams = () => {
  const { search } = useLocation()

  const {
    scope: rawScope,
    state,
    redirect_uri: redirectUri,
    app_name: appName,
    response_mode: responseMode,
    api_key,
    client_id,
    origin,
    tx,
    display: displayQueryParam,
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    ...rest
  } = queryString.parse(search)

  const scope = collapseScopes(rawScope)

  const apiKey =
    typeof api_key === 'string'
      ? api_key
      : typeof client_id === 'string'
        ? client_id
        : undefined

  const parsedRedirectUri = useMemo<'postmessage' | URL | null>(() => {
    if (redirectUri && typeof redirectUri === 'string') {
      if (redirectUri.toLowerCase() === 'postmessage') {
        return 'postmessage'
      }
      try {
        return new URL(decodeURIComponent(redirectUri))
      } catch {
        return null
      }
    }
    return null
  }, [redirectUri])

  const isRedirectValid = useMemo(() => {
    return getIsRedirectValid({ parsedRedirectUri, redirectUri })
  }, [parsedRedirectUri, redirectUri])

  const parsedOrigin = useMemo(() => {
    if (origin && typeof origin === 'string') {
      try {
        return new URL(origin)
      } catch {
        return null
      }
    }
    return null
  }, [origin])

  const { error, txParams } = useMemo(() => {
    let error: string | null = null
    let txParams: DashboardWalletParams | null = null
    if (isRedirectValid === false) {
      error = messages.redirectURIInvalidError
    } else if (parsedRedirectUri === 'postmessage' && !parsedOrigin) {
      // Only applicable if redirect URI set to `postMessage`
      error = messages.originInvalidError
    } else if (scope !== 'read' && scope !== 'write') {
      error = messages.scopeError
    } else if (
      responseMode &&
      responseMode !== 'query' &&
      responseMode !== 'fragment'
    ) {
      error = messages.responseModeError
    } else if (scope === 'read') {
      // Read scope-specific validations:
      if (!appName && !apiKey) {
        error = messages.missingAppNameError
      }
    } else if (scope === 'write') {
      // Write scope-specific validations:
      if (!apiKey) {
        error = messages.missingApiKeyError
      } else if (!isValidApiKey(apiKey)) {
        error = messages.invalidApiKeyError
      }
      // PKCE-specific validations when response_type=code
      if (!error && responseType === 'code') {
        if (!codeChallenge || typeof codeChallenge !== 'string') {
          error = messages.missingCodeChallengeError
        } else if (codeChallengeMethod !== 'S256') {
          error = messages.invalidCodeChallengeMethodError
        }
      }
      // Optional dashboard wallet tx params
      if (!error && tx) {
        const { error: txParamsError, txParams: txParamsRes } =
          validateDashboardWalletParams({
            tx,
            params: rest,
            willUsePostMessage: parsedRedirectUri === 'postmessage'
          })
        txParams = txParamsRes
        if (txParamsError) {
          error = txParamsError
        }
      }
    }
    return { txParams, error }
    // This is exhaustive despite what eslint thinks:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRedirectValid, parsedOrigin, parsedRedirectUri, search])

  const display: Display =
    displayQueryParam === 'fullScreen' ? 'fullScreen' : 'popup'

  return {
    apiKey,
    appName,
    scope,
    redirectUri,
    state,
    responseMode,
    origin,
    parsedRedirectUri,
    isRedirectValid,
    parsedOrigin,
    error,
    tx,
    txParams,
    display,
    responseType,
    codeChallenge,
    codeChallengeMethod
  }
}

export const useOAuthSetup = ({
  onError,
  onPendingTransactionApproval,
  onReceiveTransactionApproval
}: {
  onError: ({
    isUserError,
    errorMessage,
    error
  }: {
    isUserError: boolean
    errorMessage: string
    error?: Error
  }) => void
  onPendingTransactionApproval: () => void
  onReceiveTransactionApproval: () => void
}) => {
  const record = useRecord()
  const dispatch = useDispatch()

  const {
    appName: queryParamAppName,
    apiKey,
    scope,
    redirectUri,
    state,
    responseMode,
    origin: originParam,
    parsedRedirectUri,
    isRedirectValid,
    parsedOrigin,
    txParams,
    tx,
    display,
    responseType,
    codeChallenge,
    codeChallengeMethod,
    error: initError
  } = useParsedQueryParams()
  const { data: accountStatus } = useAccountStatus()
  const accountIsLoading = accountStatus && statusIsNotFinalized(accountStatus)
  const { data: accountUserId } = useCurrentUserId()
  const isLoggedIn = Boolean(accountUserId)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [queryParamsError, setQueryParamsError] = useState<string | null>(
    initError
  )
  /** The fetched developer app name if write OAuth (we use `queryParamAppName` if read OAuth and no API key is given) */
  const [registeredDeveloperAppName, setRegisteredDeveloperAppName] =
    useState<string>()
  const appName = registeredDeveloperAppName ?? queryParamAppName
  const [appImage, setAppImage] = useState<string>()

  const [userAlreadyWriteAuthorized, setUserAlreadyWriteAuthorized] =
    useState<boolean>()

  const loading =
    accountIsLoading ||
    (apiKey &&
      (registeredDeveloperAppName === undefined ||
        userAlreadyWriteAuthorized === undefined))

  useEffect(() => {
    if (!queryParamsError) {
      record(
        make(Name.AUDIUS_OAUTH_START, {
          redirectUriParam:
            parsedRedirectUri === 'postmessage' ? 'postmessage' : redirectUri!,
          originParam,
          responseMode,
          scope: scope!,
          apiKeyParam: apiKey,
          appId: (apiKey || appName)!
        })
      )
    }
  }, [
    appName,
    originParam,
    parsedRedirectUri,
    queryParamsError,
    record,
    redirectUri,
    responseMode,
    apiKey,
    scope
  ])

  useEffect(() => {
    const fetchDeveloperAppName = async () => {
      if (!apiKey || queryParamsError) {
        return
      }
      let developerApp
      try {
        developerApp = await getDeveloperApp(apiKey as string)
      } catch {
        setQueryParamsError(messages.invalidApiKeyError)
        return
      }
      if (!developerApp) {
        setQueryParamsError(messages.invalidApiKeyError)
        return
      }
      const registeredUris = developerApp.redirectUris
      if (
        registeredUris &&
        registeredUris.length > 0 &&
        typeof redirectUri === 'string' &&
        !registeredUris.includes(redirectUri)
      ) {
        setQueryParamsError(messages.redirectUriNotRegisteredError(redirectUri))
        return
      }
      setRegisteredDeveloperAppName(developerApp.name)
      setAppImage(developerApp.imageUrl)
    }
    fetchDeveloperAppName()
  }, [apiKey, queryParamAppName, queryParamsError, scope, redirectUri])

  useEffect(() => {
    const getAndSetEmail = async () => {
      let email: string
      try {
        email = await identityService.getUserEmail()
      } catch {
        setUserEmail(null)
        dispatch(
          errorActions.handleError({
            name: 'Get User Email',
            message: 'Get User Email',
            shouldRedirect: true
          })
        )
        return
      }
      setUserEmail(email)
    }
    if (isLoggedIn) {
      getAndSetEmail()
    } else {
      setUserEmail(null)
    }
  }, [isLoggedIn, dispatch])

  useEffect(() => {
    const verifyValidWalletIfApplicable = async () => {
      if (
        txParams?.wallet &&
        (tx === 'disconnect_dashboard_wallet' ||
          tx === 'connect_dashboard_wallet')
      ) {
        const sdk = await audiusSdk()
        const res = await sdk.dashboardWalletUsers.bulkGetDashboardWalletUsers({
          wallets: [txParams.wallet]
        })
        const walletHasConnectedUser = res.data?.length === 1
        if (walletHasConnectedUser && tx === 'connect_dashboard_wallet') {
          setQueryParamsError(messages.connectWalletAlreadyConnectedError)
        } else if (
          !walletHasConnectedUser &&
          tx === 'disconnect_dashboard_wallet'
        ) {
          setQueryParamsError(messages.disconnectWalletNotConnectedError)
        }
      }
    }
    verifyValidWalletIfApplicable()
  }, [tx, txParams?.wallet])

  const formResponseAndRedirect = useCallback(
    async ({
      account,
      grantCreated
    }: {
      account: UserMetadata
      grantCreated?: boolean | undefined
    }) => {
      const jwt = await formOAuthResponse({
        account,
        userEmail,
        apiKey,
        onError: () => {
          dispatch(
            errorActions.handleError({
              name: 'Form OAuth Response Error',
              message: 'Form OAuth Response Error',
              shouldRedirect: true
            })
          )
        }
      })
      if (jwt == null) {
        onError({ isUserError: false, errorMessage: messages.miscError })
        return
      }
      if (isRedirectValid === true) {
        record(
          make(Name.AUDIUS_OAUTH_COMPLETE, {
            appId: (apiKey || appName)!,
            scope: scope!,
            alreadyAuthorized: grantCreated
          })
        )
        if (parsedRedirectUri === 'postmessage') {
          if (parsedOrigin) {
            if (!window.opener) {
              onError({
                isUserError: false,
                errorMessage: messages.noWindowError
              })
            } else {
              window.opener.postMessage(
                { state, token: jwt },
                parsedOrigin.origin
              )
            }
          }
        } else {
          if (responseMode !== 'fragment') {
            if (state != null) {
              parsedRedirectUri!.searchParams.append('state', state as string)
            }
            parsedRedirectUri!.searchParams.append('token', jwt)
          } else {
            const statePart = state != null ? `state=${state}&` : ''
            parsedRedirectUri!.hash = `#${statePart}token=${jwt}`
          }
          window.location.href = parsedRedirectUri!.toString()
        }
      }
    },
    [
      isRedirectValid,
      parsedOrigin,
      parsedRedirectUri,
      record,
      responseMode,
      state,
      userEmail,
      apiKey,
      appName,
      scope,
      dispatch,
      onError
    ]
  )

  useEffect(() => {
    const getInitialAuthorizationStatus = async () => {
      if (queryParamsError || !apiKey || !isLoggedIn) {
        setUserAlreadyWriteAuthorized(false)
        return
      }
      let appAlreadyAuthorized
      try {
        appAlreadyAuthorized = await getIsAppAuthorized({
          userId: Id.parse(accountUserId!), // We know account exists because isLoggedIn is true
          apiKey: apiKey as string
        })
      } catch (e) {
        if (e instanceof Error) {
          reportToSentry({ level: ErrorLevel.Error, error: e })
        }
        dispatch(
          errorActions.handleError({
            name: 'Get Is App Authorized',
            message: 'Get Is App Authorized',
            shouldRedirect: true
          })
        )
        return
      }
      setUserAlreadyWriteAuthorized(appAlreadyAuthorized)
    }
    getInitialAuthorizationStatus()
  }, [
    accountUserId,
    apiKey,
    formResponseAndRedirect,
    isLoggedIn,
    queryParamsError,
    scope,
    dispatch
  ])

  useEffect(() => {
    const verifyDisconnectWalletUser = async () => {
      if (
        accountUserId != null &&
        txParams?.wallet != null &&
        tx === 'disconnect_dashboard_wallet'
      ) {
        const isCorrectUser = await getIsUserConnectedToDashboardWallet({
          userId: accountUserId,
          wallet: txParams.wallet
        })
        if (!isCorrectUser) {
          onError({
            isUserError: true,
            errorMessage: messages.disconnectDashboardWalletWrongUserError
          })
        }
      }
    }
    verifyDisconnectWalletUser()
  }, [accountUserId, onError, tx, txParams?.wallet])

  const authorize = async ({ account }: { account: UserMetadata }) => {
    let shouldCreateWriteGrant = false

    if (scope === 'write') {
      try {
        shouldCreateWriteGrant = !(await getIsAppAuthorized({
          userId: Id.parse(account.user_id),
          apiKey: apiKey as string
        }))
        if (shouldCreateWriteGrant) {
          await authWrite({
            userId: Id.parse(account.user_id),
            appApiKey: apiKey as string
          })
        }
      } catch (e: unknown) {
        let error = 'Creating write grant failed'
        if (typeof e === 'string') {
          error = e.toUpperCase()
        } else if (e instanceof Error) {
          error = e.message
        }
        onError({
          isUserError: false,
          errorMessage: messages.miscError,
          error: e instanceof Error ? e : new Error(error)
        })
        return
      }

      // Handle dashboard wallet tx if present
      if (tx && txParams) {
        if (tx === 'connect_dashboard_wallet') {
          const success = await handleAuthorizeConnectDashboardWallet({
            state,
            originUrl: parsedOrigin,
            onError,
            onWaitForWalletSignature: onPendingTransactionApproval,
            onReceivedWalletSignature: onReceiveTransactionApproval,
            account,
            txParams
          })
          if (!success) {
            return
          }
        } else if (tx === 'disconnect_dashboard_wallet') {
          const success = await handleAuthorizeDisconnectDashboardWallet({
            account,
            txParams,
            onError
          })
          if (!success) {
            return
          }
        }
      }
    }

    // PKCE flow: exchange for authorization code and redirect with code
    if (responseType === 'code') {
      const code = await exchangeForAuthorizationCode({
        account,
        userEmail,
        apiKey: apiKey as string,
        redirectUri: (redirectUri as string) ?? 'postMessage',
        codeChallenge: codeChallenge as string,
        codeChallengeMethod: (codeChallengeMethod as string) ?? 'S256',
        scope: scope as string,
        onError: () => {
          onError({
            isUserError: false,
            errorMessage: messages.miscError
          })
        }
      })
      if (!code) return

      record(
        make(Name.AUDIUS_OAUTH_COMPLETE, {
          appId: (apiKey || appName)!,
          scope: scope!,
          alreadyAuthorized: !shouldCreateWriteGrant
        })
      )

      if (parsedRedirectUri === 'postmessage') {
        if (parsedOrigin && window.opener) {
          window.opener.postMessage({ state, code }, parsedOrigin.origin)
        } else {
          onError({
            isUserError: false,
            errorMessage: messages.noWindowError
          })
        }
      } else if (parsedRedirectUri) {
        if (responseMode !== 'fragment') {
          if (state != null) {
            parsedRedirectUri.searchParams.append('state', state as string)
          }
          parsedRedirectUri.searchParams.append('code', code)
          window.location.href = parsedRedirectUri.toString()
        } else {
          const statePart = state != null ? `state=${state}&` : ''
          parsedRedirectUri.hash = `#${statePart}code=${code}`
          window.location.href = parsedRedirectUri.toString()
        }
      }
      return
    }

    // Implicit flow: form JWT and redirect
    await formResponseAndRedirect({
      account,
      grantCreated: shouldCreateWriteGrant
    })
  }

  return {
    scope,
    queryParamsError,
    loading,
    userAlreadyWriteAuthorized,
    apiKey,
    appName,
    appImage,
    userEmail,
    authorize,
    tx,
    txParams,
    display
  }
}
