import { useRef, useState } from 'react'

import { accountFromSDK } from '@audius/common/adapters'
import { Name, ErrorLevel } from '@audius/common/models'
import { Flex } from '@audius/harmony'
import cn from 'classnames'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router'

import { make, useRecord } from 'common/store/analytics/actions'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { audiusSdk, authService } from 'services/audius-sdk'
import { reportToSentry } from 'store/errors/reportToSentry'

import styles from './OAuthLoginPage.module.css'
import { ContentWrapper } from './components/ContentWrapper'
import { useOAuthSetup } from './hooks'
import { messages } from './messages'
import { OAuthCreateEmailPage } from './pages/OAuthCreateEmailPage'
import { OAuthCreatePasswordPage } from './pages/OAuthCreatePasswordPage'
import { OAuthPickDisplayNamePage } from './pages/OAuthPickDisplayNamePage'
import { OAuthPickHandlePage } from './pages/OAuthPickHandlePage'

type SignUpData = {
  email: string
  password: string
  handle: string
  displayName: string
}

export const OAuthSignUpPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const record = useRecord()
  const [signUpData, setSignUpData] = useState<Partial<SignUpData>>({})
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const oauthContextRef = useRef<{
    apiKey?: string | string[] | null
    appName?: string | string[] | null
    scope?: string | string[]
  }>({})

  // Helper to navigate to a step while preserving query params
  const navigateToStep = (step: string) => {
    const basePath =
      location.pathname.split('/').slice(0, -1).join('/') ||
      '/oauth/auth/signup'
    navigate(`${basePath}/${step}${location.search}`, { replace: true })
  }

  // Get query string to preserve across navigation
  const queryString = location.search

  const {
    scope,
    queryParamsError,
    loading,
    apiKey,
    appName,
    appImage,
    authorize,
    display
  } = useOAuthSetup({
    onError: ({
      isUserError,
      errorMessage,
      error
    }: {
      isUserError: boolean
      errorMessage: string
      error?: Error
    }) => {
      setIsCreatingAccount(false)
      setError(errorMessage)
      const getAppId = () => {
        const apiKey = oauthContextRef.current.apiKey
        const appName = oauthContextRef.current.appName
        if (Array.isArray(apiKey) && apiKey[0]) return String(apiKey[0])
        if (Array.isArray(appName) && appName[0]) return String(appName[0])
        if (typeof apiKey === 'string') return apiKey
        if (typeof appName === 'string') return appName
        return ''
      }

      const getScope = () => {
        const scope = oauthContextRef.current.scope
        if (Array.isArray(scope) && scope[0]) return String(scope[0])
        if (typeof scope === 'string') return scope
        return ''
      }

      record(
        make(Name.AUDIUS_OAUTH_ERROR, {
          isUserError,
          error: errorMessage,
          appId: getAppId(),
          scope: getScope()
        })
      )
      if (error && !isUserError) {
        reportToSentry({ level: ErrorLevel.Error, error })
      }
    },
    onPendingTransactionApproval: () => {},
    onReceiveTransactionApproval: () => {}
  })

  // Update ref with current values
  oauthContextRef.current = { apiKey, appName, scope }

  const updateSignUpData = (updates: Partial<SignUpData>) => {
    setSignUpData((prev) => ({ ...prev, ...updates }))
  }

  const createAccount = async (data: SignUpData) => {
    setIsCreatingAccount(true)
    setError(null)

    try {
      // Sign up via Hedgehog
      await authService.hedgehogInstance.signUp({
        username: data.email,
        password: data.password
      })

      const sdk = await audiusSdk()
      const [wallet] = await sdk.services.audiusWalletClient.getAddresses()

      // Get location for account creation (format: "City, Region" or null)
      let locationString: string | undefined
      try {
        const locationData = await sdk.utils.getLocation()
        if (locationData?.city) {
          locationString = locationData.region
            ? `${locationData.city}, ${locationData.region}`
            : locationData.city
        }
      } catch (e) {
        // Location is optional, continue without it
        console.debug('Failed to get location:', e)
      }

      // Create user on chain
      const { metadata, blockHash, blockNumber } = await sdk.users.createUser({
        metadata: {
          handle: data.handle,
          name: data.displayName.trim(),
          wallet,
          location: locationString
        }
      })

      // Wait for transaction confirmation
      if (blockHash && blockNumber) {
        await sdk.services.entityManager.confirmWrite({
          blockHash,
          blockNumber
        })
      }

      // Wait for account to be available - try by wallet first, then by userId
      let accountData
      let retries = 0
      const maxRetries = 15
      while (retries < maxRetries) {
        try {
          // Try fetching by wallet first (faster)
          const response = await sdk.full.users.getUserAccount({
            wallet
          })
          if (response.data) {
            accountData = response.data
            break
          }
        } catch (e) {
          // Try by userId as fallback
          try {
            const response = await sdk.full.users.getUserAccount({
              userId: metadata.user_id
            })
            if (response.data) {
              accountData = response.data
              break
            }
          } catch (e2) {
            // Account not ready yet, wait and retry
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
        retries++
      }

      if (!accountData) {
        throw new Error('Account creation completed but account not found')
      }

      const account = accountFromSDK(accountData)
      if (!account || !account.user.handle || !account.user.name) {
        throw new Error('Invalid account data')
      }

      // Authorize the app
      await authorize({
        account: account.user
      })
    } catch (err: any) {
      setIsCreatingAccount(false)
      let errorMessage = messages.miscError
      if (err?.message && typeof err.message === 'string') {
        errorMessage = err.message
      } else if (err?.response?.data?.error) {
        const errorData = err.response.data.error
        errorMessage =
          typeof errorData === 'string' ? errorData : messages.miscError
      }
      setError(errorMessage)
      const getAppId = () => {
        if (Array.isArray(apiKey) && apiKey[0]) return String(apiKey[0])
        if (Array.isArray(appName) && appName[0]) return String(appName[0])
        if (typeof apiKey === 'string') return apiKey
        if (typeof appName === 'string') return appName
        return ''
      }

      const getScope = () => {
        if (Array.isArray(scope) && scope[0]) return String(scope[0])
        if (typeof scope === 'string') return scope
        return ''
      }

      record(
        make(Name.AUDIUS_OAUTH_ERROR, {
          isUserError: false,
          error: errorMessage,
          appId: getAppId(),
          scope: getScope()
        })
      )
      if (err instanceof Error) {
        reportToSentry({ level: ErrorLevel.Error, error: err })
      }
    }
  }

  if (queryParamsError) {
    return (
      <ContentWrapper display={display ?? 'popup'}>
        <div className={cn(styles.centeredContent, styles.titleContainer)}>
          <span className={styles.errorText}>{queryParamsError}</span>
        </div>
      </ContentWrapper>
    )
  }

  if (loading) {
    return (
      <ContentWrapper display={display ?? 'popup'}>
        <Flex p='4xl' alignItems='center' justifyContent='center'>
          <LoadingSpinner className={styles.loadingStateSpinner} />
        </Flex>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper display={display ?? 'popup'}>
      <Routes>
        <Route
          path='/'
          element={
            <Navigate to={{ pathname: 'email', search: queryString }} replace />
          }
        />
        <Route
          path='email'
          element={
            <OAuthCreateEmailPage
              appName={appName}
              appImage={appImage}
              onNext={(email) => {
                updateSignUpData({ email })
                navigateToStep('password')
              }}
            />
          }
        />
        <Route
          path='password'
          element={
            <OAuthCreatePasswordPage
              email={signUpData.email ?? ''}
              onNext={(password) => {
                updateSignUpData({ password })
                navigateToStep('handle')
              }}
            />
          }
        />
        <Route
          path='handle'
          element={
            <OAuthPickHandlePage
              onNext={(handle) => {
                updateSignUpData({ handle })
                navigateToStep('display-name')
              }}
            />
          }
        />
        <Route
          path='display-name'
          element={
            <OAuthPickDisplayNamePage
              handle={signUpData.handle ?? ''}
              onNext={(displayName) => {
                const finalData: SignUpData = {
                  email: signUpData.email!,
                  password: signUpData.password!,
                  handle: signUpData.handle!,
                  displayName
                }
                createAccount(finalData)
              }}
              isCreatingAccount={isCreatingAccount}
              error={error}
            />
          }
        />
      </Routes>
    </ContentWrapper>
  )
}
