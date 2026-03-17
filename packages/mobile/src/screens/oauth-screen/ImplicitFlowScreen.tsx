import { useCallback, useState } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { Id } from '@audius/sdk'
import { useNavigation } from '@react-navigation/native'
import { ActivityIndicator, Linking, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, Flex, Text, useTheme } from '@audius/harmony-native'
import { audiusSdk } from 'app/services/sdk/audius-sdk'

import { AppHeader } from './components/AppHeader'
import { PermissionsSection } from './components/PermissionsSection'
import { SignedInAs } from './components/SignedInAs'
import { useAppInfo } from './hooks/useAppInfo'
import { useUserEmail } from './hooks/useUserEmail'
import { messages } from './messages'
import type { ParsedParams } from './types'
import { buildErrorUrl, buildRedirectUrl, buildUserJwt } from './utils'

type Props = { params: ParsedParams }

export const ImplicitFlowScreen = ({ params }: Props) => {
  const {
    scope,
    apiKey,
    appName: queryParamAppName,
    state,
    redirectUri,
    responseMode
  } = params

  const { color, spacing } = useTheme()
  const { bottom: bottomInset } = useSafeAreaInsets()
  const navigation = useNavigation()

  const { data: account } = useCurrentAccountUser()
  const isLoggedIn = Boolean(account?.user_id)
  const userEmail = useUserEmail(isLoggedIn)

  const { appName, appImage, userAlreadyWriteAuthorized, loading, error } =
    useAppInfo({
      apiKey,
      queryParamAppName,
      scope,
      userId: account?.user_id,
      skip: false
    })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('HomeStack' as never)
    }
  }, [navigation])

  const handleAuthorize = useCallback(async () => {
    if (!account || !redirectUri || !scope) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      if (scope === 'write' && apiKey && !userAlreadyWriteAuthorized) {
        const sdk = await audiusSdk()
        await sdk.grants.createGrant({
          userId: Id.parse(account.user_id),
          appApiKey: apiKey
        })
      }
      const jwt = await buildUserJwt(account, userEmail, apiKey)
      await Linking.openURL(
        buildRedirectUrl(redirectUri, { token: jwt }, state, responseMode)
      )
      closeScreen()
    } catch {
      setSubmitError(messages.miscError)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    account,
    redirectUri,
    scope,
    apiKey,
    userAlreadyWriteAuthorized,
    userEmail,
    state,
    responseMode,
    closeScreen
  ])

  const handleCancel = useCallback(async () => {
    if (redirectUri) {
      try {
        await Linking.openURL(buildErrorUrl(redirectUri, state, responseMode))
      } catch {}
    }
    closeScreen()
  }, [redirectUri, state, responseMode, closeScreen])

  if (error) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        p='xl'
        backgroundColor='surface1'
      >
        <Text variant='body' size='m' color='danger' textAlign='center'>
          {error}
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
          {appName ? `${messages.allow} ${appName}` : 'Authorization Request'}
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
          <AppHeader appName={appName} appImageUri={appImage} />
          {userAlreadyWriteAuthorized ? null : (
            <PermissionsSection scope={scope} userEmail={userEmail} />
          )}
          {account && <SignedInAs account={account} />}
          {submitError ? (
            <Text variant='body' size='s' color='danger'>
              {submitError}
            </Text>
          ) : null}
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
