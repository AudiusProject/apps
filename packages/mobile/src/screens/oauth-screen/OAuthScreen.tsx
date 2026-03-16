import { useCallback, useEffect, useState } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import type { UserMetadata } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { Id, OptionalId } from '@audius/sdk'
import { useNavigation, useRoute } from '@react-navigation/native'
import queryString from 'query-string'
import { ActivityIndicator, Linking, Image, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Button,
  Divider,
  Flex,
  Paper,
  IconTransaction,
  IconEmbed,
  IconVisibilityPublic,
  IconPencil,
  IconInfo,
  Text,
  useTheme
} from '@audius/harmony-native'
import { useProfilePicture } from 'app/components/image/UserImage'
import { env } from 'app/services/env'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { identityService } from 'app/services/sdk/identity'

// Messages matching the web OAuth page
const messages = {
  allow: 'Allow Audius to Connect to',
  permissionsRequestedHeader: 'This application will receive',
  readOnlyAccountAccess: 'Read-only Access',
  readOnlyGrants:
    'This app cannot interact with or make changes to your account.',
  writeAccountAccess: 'Read/Write Access',
  writeAccessGrants:
    'Grant this app permission to make changes to your account on your behalf.',
  yourAccountData: 'Your Audius Account Data',
  yourAccountDataAccess:
    'Account activity, and identifying information, including the email address',
  yourAccountDataAccessNoEmail: 'Account activity and identifying information.',
  authorizeButton: 'Sign In & Authorize',
  continueButton: 'Continue',
  signedInAs: "You're Signed in as",
  signInFirst:
    'You must be signed in to the Audius app to authorize this request.',
  cancelButton: 'Cancel',
  miscError: 'An error has occurred. Please try again.',
  pkceOnlyError:
    'Only authorization code flow with PKCE (response_type=code) is supported in the native app.',
  redirectURIInvalidError:
    'Whoops, this is an invalid link (redirect URI missing or invalid).',
  missingAppNameError: 'Whoops, this is an invalid link (app name missing).',
  scopeError: 'Whoops, this is an invalid link (scope missing or invalid).',
  missingApiKeyError: 'Whoops, this is an invalid link (app API Key missing)',
  invalidApiKeyError: 'Whoops, this is an invalid link (app API Key invalid)',
  missingCodeChallengeError:
    'Whoops, this is an invalid link (code_challenge is required for PKCE flow).',
  invalidCodeChallengeMethodError:
    'Whoops, this is an invalid link (code_challenge_method must be S256).'
}

// base64url encode a string (UTF-8 bytes → base64url, no padding)
const toBase64Url = (str: string): string => {
  // Use TextEncoder to correctly encode all Unicode code points as UTF-8
  const utf8Bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const isValidApiKey = (key: string) => {
  if (key.length !== 40) return false
  return /^[0-9a-fA-F]+$/.test(key)
}

const getIsRedirectValid = (
  redirectUri: string | null | undefined
): boolean => {
  if (!redirectUri || typeof redirectUri !== 'string') return false
  try {
    const parsed = new URL(decodeURIComponent(redirectUri))
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:']
    if (dangerousSchemes.includes(parsed.protocol)) return false
    if (parsed.hash || parsed.username || parsed.password) return false
    if (
      parsed.pathname.includes('/..') ||
      parsed.pathname.includes('\\..') ||
      parsed.pathname.includes('../')
    )
      return false
    return true
  } catch {
    return false
  }
}

type ParsedParams = {
  scope: string | null
  state: string | null
  redirectUri: string | null
  apiKey: string | null
  appName: string | null
  responseMode: string | null
  responseType: string | null
  codeChallenge: string | null
  codeChallengeMethod: string | null
  error: string | null
}

const parseAndValidate = (search: string): ParsedParams => {
  const {
    scope: rawScope,
    state,
    redirect_uri: redirectUri,
    api_key,
    client_id,
    app_name: appName,
    response_mode: responseMode,
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod
  } = queryString.parse(search)

  const scope = typeof rawScope === 'string' ? rawScope : null
  const apiKey =
    typeof api_key === 'string'
      ? api_key
      : typeof client_id === 'string'
        ? client_id
        : null

  let error: string | null = null

  // Native app only supports PKCE authorization code flow
  if (responseType !== 'code') {
    error = messages.pkceOnlyError
  } else if (
    !getIsRedirectValid(typeof redirectUri === 'string' ? redirectUri : null)
  ) {
    error = messages.redirectURIInvalidError
  } else if (scope !== 'read' && scope !== 'write') {
    error = messages.scopeError
  } else if (
    responseMode &&
    responseMode !== 'query' &&
    responseMode !== 'fragment'
  ) {
    error = messages.responseModeInvalidError
  } else if (!appName && !apiKey) {
    error = messages.missingAppNameError
  } else if (scope === 'write') {
    if (!apiKey) {
      error = messages.missingApiKeyError
    } else if (typeof apiKey === 'string' && !isValidApiKey(apiKey)) {
      error = messages.invalidApiKeyError
    }
  }

  // PKCE-specific validations
  if (!error) {
    if (!codeChallenge || typeof codeChallenge !== 'string') {
      error = messages.missingCodeChallengeError
    } else if (codeChallengeMethod !== 'S256') {
      error = messages.invalidCodeChallengeMethodError
    }
  }

  return {
    scope,
    state: typeof state === 'string' ? state : null,
    redirectUri: typeof redirectUri === 'string' ? redirectUri : null,
    apiKey,
    appName: typeof appName === 'string' ? appName : null,
    responseMode: typeof responseMode === 'string' ? responseMode : null,
    responseType: typeof responseType === 'string' ? responseType : null,
    codeChallenge: typeof codeChallenge === 'string' ? codeChallenge : null,
    codeChallengeMethod:
      typeof codeChallengeMethod === 'string' ? codeChallengeMethod : null,
    error
  }
}

// Build a signed JWT for the user, used to prove identity when exchanging for an auth code
const buildUserJwt = async (
  account: UserMetadata,
  userEmail: string | null,
  apiKey: string | null
): Promise<string> => {
  const sdk = await audiusSdk()
  const userId = OptionalId.parse(account.user_id)
  const timestamp = Math.round(Date.now() / 1000)
  const payload = {
    userId,
    email: userEmail,
    name: account.name,
    handle: account.handle,
    verified: account.is_verified,
    profilePicture: account.profile_picture,
    ...(apiKey ? { apiKey } : {}),
    sub: userId,
    iat: timestamp
  }
  const header = toBase64Url(JSON.stringify({ typ: 'JWT', alg: 'keccak256' }))
  const payloadEncoded = toBase64Url(JSON.stringify(payload))
  const message = `${header}.${payloadEncoded}`
  const signature = await sdk.services.audiusWalletClient.signMessage({
    message
  })
  return `${header}.${payloadEncoded}.${toBase64Url(signature)}`
}

// Exchange the user JWT + PKCE params for an authorization code
const exchangeForAuthCode = async ({
  jwt,
  apiKey,
  redirectUri,
  codeChallenge,
  codeChallengeMethod,
  scope
}: {
  jwt: string
  apiKey: string | null
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  scope: string
}): Promise<string | null> => {
  try {
    const res = await fetch(`${env.API_URL}/v1/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: jwt,
        client_id: apiKey,
        redirect_uri: decodeURIComponent(redirectUri),
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        scope
      })
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('OAuth exchange failed:', res.status, body)
      return null
    }
    const { code } = await res.json()
    return code as string
  } catch {
    return null
  }
}

// Build the final redirect URI with code + state appended
const buildRedirectUrl = (
  redirectUri: string,
  code: string,
  state: string | null,
  responseMode: string | null
): string => {
  const decoded = decodeURIComponent(redirectUri)
  const statePart = state != null ? `state=${encodeURIComponent(state)}&` : ''
  const codePart = `code=${encodeURIComponent(code)}`
  if (responseMode === 'query') {
    const separator = decoded.includes('?') ? '&' : '?'
    return `${decoded}${separator}${statePart}${codePart}`
  }
  // Default: fragment
  return `${decoded}#${statePart}${codePart}`
}

export const OAuthScreen = () => {
  const route = useRoute<any>()
  const { search = '' } = route.params ?? {}
  const { color, spacing } = useTheme()
  const { bottom: bottomInset } = useSafeAreaInsets()

  const params = parseAndValidate(search)
  const {
    scope,
    state,
    redirectUri,
    apiKey,
    appName: queryParamAppName,
    responseMode,
    codeChallenge,
    codeChallengeMethod,
    error: initError
  } = params

  const { data: account } = useCurrentAccountUser()
  const isLoggedIn = Boolean(account?.user_id)
  const { source: profilePicSource } = useProfilePicture({
    userId: account?.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const [loading, setLoading] = useState(true)
  const [queryParamsError, setQueryParamsError] = useState<string | null>(
    initError
  )
  const [registeredAppName, setRegisteredAppName] = useState<
    string | undefined
  >()
  const [appImage, setAppImage] = useState<string | undefined>()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userAlreadyWriteAuthorized, setUserAlreadyWriteAuthorized] =
    useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const appName = registeredAppName ?? queryParamAppName

  // Fetch developer app info and check existing authorization
  useEffect(() => {
    if (initError) {
      setLoading(false)
      return
    }
    const setup = async () => {
      try {
        const sdk = await audiusSdk()

        // Fetch developer app metadata if api_key provided
        if (apiKey) {
          try {
            const res = await sdk.developerApps.getDeveloperApp({
              address: apiKey
            })
            if (!res.data) {
              setQueryParamsError(messages.invalidApiKeyError)
              setLoading(false)
              return
            }
            setRegisteredAppName(res.data.name)
            if (res.data.imageUrl) setAppImage(res.data.imageUrl)
          } catch {
            setQueryParamsError(messages.invalidApiKeyError)
            setLoading(false)
            return
          }
        }

        // Check if app already authorized for write scope
        if (scope === 'write' && apiKey && account?.user_id) {
          try {
            const id = Id.parse(account.user_id)
            const authorizedApps = await sdk.users.getAuthorizedApps({ id })
            const prefixed = apiKey.startsWith('0x')
              ? apiKey.toLowerCase()
              : `0x${apiKey}`.toLowerCase()
            const found = authorizedApps.data?.some(
              (a) => a.address.toLowerCase() === prefixed
            )
            setUserAlreadyWriteAuthorized(Boolean(found))
          } catch {
            // Non-fatal: assume not yet authorized
          }
        }
      } finally {
        setLoading(false)
      }
    }
    setup()
  }, [apiKey, scope, account?.user_id, initError])

  // Fetch user email for permissions display
  useEffect(() => {
    if (!isLoggedIn) {
      setUserEmail(null)
      return
    }
    identityService
      .getUserEmail()
      .then((email) => {
        setUserEmail(email ?? null)
      })
      .catch(() => {
        setUserEmail(null)
      })
  }, [isLoggedIn])

  const navigation = useNavigation()

  const handleAuthorize = useCallback(async () => {
    if (
      !account ||
      !redirectUri ||
      !codeChallenge ||
      !codeChallengeMethod ||
      !scope
    )
      return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // Create write grant if needed
      if (scope === 'write' && apiKey && !userAlreadyWriteAuthorized) {
        const sdk = await audiusSdk()
        await sdk.grants.createGrant({
          userId: Id.parse(account.user_id),
          appApiKey: apiKey
        })
      }

      // Build signed JWT
      const jwt = await buildUserJwt(account, userEmail, apiKey)

      // Exchange for authorization code
      const code = await exchangeForAuthCode({
        jwt,
        apiKey,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        scope
      })

      if (!code) {
        setSubmitError(messages.miscError)
        return
      }

      // Redirect back to the third-party app
      const finalUrl = buildRedirectUrl(redirectUri, code, state, responseMode)
      await Linking.openURL(finalUrl)

      if (navigation.canGoBack()) {
        navigation.goBack()
      }
    } catch (e) {
      console.error('OAuth authorize error:', e)
      setSubmitError(messages.miscError)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    account,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
    apiKey,
    userAlreadyWriteAuthorized,
    userEmail,
    state,
    responseMode,
    navigation
  ])

  const handleCancel = useCallback(async () => {
    if (redirectUri) {
      // Send error back to calling app
      const decoded = decodeURIComponent(redirectUri)
      const statePart =
        state != null ? `state=${encodeURIComponent(state)}&` : ''
      const errorUrl =
        responseMode === 'query'
          ? `${decoded}${decoded.includes('?') ? '&' : '?'}${statePart}error=access_denied`
          : `${decoded}#${statePart}error=access_denied`
      try {
        await Linking.openURL(errorUrl)
      } catch {
        /* ignore */
      }
    }
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [redirectUri, state, responseMode, navigation])

  if (queryParamsError) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        p='xl'
        backgroundColor='surface1'
      >
        <Text variant='body' size='m' color='danger' textAlign='center'>
          {queryParamsError}
        </Text>
      </Flex>
    )
  }

  if (loading) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        backgroundColor='surface1'
      >
        <ActivityIndicator size='large' color={color.primary.primary} />
      </Flex>
    )
  }

  if (!isLoggedIn) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        p='xl'
        backgroundColor='surface1'
      >
        <Text variant='heading' size='s' color='default' textAlign='center'>
          {appName ? messages.allow + ' ' + appName : 'Authorization Request'}
        </Text>
        <Flex mt='xl'>
          <Text variant='body' size='m' color='subdued' textAlign='center'>
            {messages.signInFirst}
          </Text>
        </Flex>
        <Flex mt='2xl' w='100%'>
          <Button variant='secondary' fullWidth onPress={handleCancel}>
            {messages.cancelButton}
          </Button>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex flex={1} backgroundColor='surface1'>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.unit10,
          paddingBottom: spacing.xl + bottomInset
        }}
      >
        <Flex direction='column' gap='xl'>
          {/* Logos + Title */}
          <Flex alignItems='center' direction='column' gap='l'>
            <Flex
              direction='row'
              gap='l'
              alignItems='center'
              justifyContent='center'
              w='100%'
            >
              {/* Audius app icon */}
              <Flex
                w={64}
                h={64}
                borderRadius='m'
                style={{ overflow: 'hidden' }}
              >
                <Image
                  source={require('../../assets/images/appIcon.png')}
                  style={{ width: 64, height: 64 }}
                  resizeMode='cover'
                />
              </Flex>
              <IconTransaction color='default' />
              {/* Third-party app icon */}
              {appImage ? (
                <Image
                  source={{ uri: appImage }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: spacing.m
                  }}
                />
              ) : (
                <Flex
                  w={64}
                  h={64}
                  borderRadius='m'
                  backgroundColor='surface2'
                  alignItems='center'
                  justifyContent='center'
                >
                  <IconEmbed color='subdued' width={32} height={32} />
                </Flex>
              )}
            </Flex>
            <Flex direction='column' gap='s' alignItems='center'>
              <Text variant='body' size='l' color='default'>
                {messages.allow}:
              </Text>
              <Text variant='heading' size='s' color='default'>
                {appName}
              </Text>
            </Flex>
          </Flex>

          {/* Permissions */}
          {userAlreadyWriteAuthorized ? null : (
            <Flex direction='column' gap='s'>
              <Text variant='body' size='m' color='subdued'>
                {messages.permissionsRequestedHeader}
              </Text>
              <Paper shadow='flat' backgroundColor='white' borderRadius='s'>
                <Flex p='l' direction='column' gap='l'>
                  {/* Access level */}
                  <Flex direction='row' gap='s' alignItems='flex-start'>
                    {scope === 'write' ? (
                      <IconPencil color='default' width={16} height={16} />
                    ) : (
                      <IconVisibilityPublic
                        color='default'
                        width={16}
                        height={16}
                      />
                    )}
                    <Flex direction='column' gap='xs' flex={1}>
                      <Text variant='body' size='m' color='default'>
                        {scope === 'write'
                          ? messages.writeAccountAccess
                          : messages.readOnlyAccountAccess}
                      </Text>
                      <Text variant='body' size='s' color='subdued'>
                        {scope === 'write'
                          ? messages.writeAccessGrants
                          : messages.readOnlyGrants}
                      </Text>
                    </Flex>
                  </Flex>

                  <Divider />

                  {/* Account data */}
                  <Flex direction='row' gap='s' alignItems='flex-start'>
                    <IconInfo color='default' width={16} height={16} />
                    <Flex direction='column' gap='xs' flex={1}>
                      <Text variant='body' size='m' color='default'>
                        {messages.yourAccountData}
                      </Text>
                      <Text variant='body' size='s' color='subdued'>
                        {userEmail
                          ? `${messages.yourAccountDataAccess}: ${userEmail}`
                          : messages.yourAccountDataAccessNoEmail}
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Paper>
            </Flex>
          )}

          {/* Signed in as */}
          {account ? (
            <Flex direction='column' gap='s'>
              <Text variant='body' size='m' color='subdued'>
                {messages.signedInAs}
              </Text>
              <Paper shadow='flat' backgroundColor='white' borderRadius='s'>
                <Flex p='l' direction='row' gap='l' alignItems='center'>
                  <Image
                    source={profilePicSource}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20
                    }}
                  />
                  <Flex direction='column' gap='xs' flex={1}>
                    <Text variant='body' size='m' color='default'>
                      @{account.handle}
                    </Text>
                    {account.name ? (
                      <Text variant='body' size='s' color='subdued'>
                        {account.name}
                      </Text>
                    ) : null}
                  </Flex>
                </Flex>
              </Paper>
            </Flex>
          ) : null}

          {/* Error */}
          {submitError ? (
            <Text variant='body' size='s' color='danger'>
              {submitError}
            </Text>
          ) : null}

          {/* CTA */}
          <Flex direction='column' gap='m' mt='l'>
            <Button
              variant='primary'
              fullWidth
              isLoading={isSubmitting}
              onPress={handleAuthorize}
            >
              {userAlreadyWriteAuthorized
                ? messages.continueButton
                : messages.authorizeButton}
            </Button>
            <Button variant='secondary' fullWidth onPress={handleCancel}>
              {messages.cancelButton}
            </Button>
          </Flex>
        </Flex>
      </ScrollView>
    </Flex>
  )
}
