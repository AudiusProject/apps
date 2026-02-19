import { useRef, useState } from 'react'

import { accountFromSDK } from '@audius/common/adapters'
import { Name, ErrorLevel } from '@audius/common/models'
import { Flex, Text } from '@audius/harmony'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router'

import { make, useRecord } from 'common/store/analytics/actions'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { audiusSdk, authService } from 'services/audius-sdk'
import { reportToSentry } from 'store/errors/reportToSentry'

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
    scope?: string | string[] | null
  }>({})

  const navigateToStep = (step: string) => {
    const basePath =
      location.pathname.split('/').slice(0, -1).join('/') ||
      '/oauth/auth/signup'
    navigate(`${basePath}/${step}${location.search}`, { replace: true })
  }

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
        const { apiKey, appName } = oauthContextRef.current
        if (Array.isArray(apiKey) && apiKey[0]) return String(apiKey[0])
        if (Array.isArray(appName) && appName[0]) return String(appName[0])
        if (typeof apiKey === 'string') return apiKey
        if (typeof appName === 'string') return appName
        return ''
      }

      const getScope = () => {
        const { scope } = oauthContextRef.current
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

  oauthContextRef.current = { apiKey, appName, scope }

  const updateSignUpData = (updates: Partial<SignUpData>) => {
    setSignUpData((prev) => ({ ...prev, ...updates }))
  }

  const createAccount = async (data: SignUpData) => {
    setIsCreatingAccount(true)
    setError(null)

    try {
      await authService.hedgehogInstance.signUp({
        username: data.email,
        password: data.password
      })

      const sdk = await audiusSdk()
      const [wallet] = await sdk.services.audiusWalletClient.getAddresses()

      await sdk.users.createUser({
        metadata: {
          handle: data.handle,
          name: data.displayName.trim(),
          wallet
        }
      })

      let accountData
      let retries = 0
      const maxRetries = 15
      while (retries < maxRetries) {
        try {
          const response = await sdk.users.getUserAccount({
            wallet
          })
          if (response.data) {
            accountData = response.data
            break
          }
        } catch (e) {
          // Account not ready yet
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
        <Flex
          direction='column'
          alignItems='center'
          justifyContent='center'
          mt='s'
        >
          <Text variant='body' size='m' color='danger'>
            {queryParamsError}
          </Text>
        </Flex>
      </ContentWrapper>
    )
  }

  if (loading) {
    return (
      <ContentWrapper display={display ?? 'popup'}>
        <Flex p='4xl' alignItems='center' justifyContent='center'>
          <LoadingSpinner />
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
