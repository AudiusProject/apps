import { FormEvent, useCallback, useMemo, useState } from 'react'

import { accountFromSDK } from '@audius/common/adapters'
import {
  useCurrentUserId,
  useCurrentWeb3Account,
  useManagedAccounts,
  useCurrentAccountUser
} from '@audius/common/api'
import { useAccountSwitcher } from '@audius/common/hooks'
import { Name, ErrorLevel, UserMetadata } from '@audius/common/models'
import { SignInResponse } from '@audius/common/services'
import { signOutActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Flex,
  IconCaretLeft,
  IconEmbed,
  IconTransaction,
  IconUserArrowRotate,
  IconValidationX,
  PlainButton,
  Text,
  TextLink
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import AppIcon from 'assets/img/appIcon.png'
import { make, useRecord } from 'common/store/analytics/actions'
import Input from 'components/data-entry/Input'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { AccountListContent } from 'components/nav/desktop/AccountSwitcher/AccountListContent'
import { ProfileInfo } from 'components/profile-info/ProfileInfo'
import { audiusSdk, authService } from 'services/audius-sdk'
import { fingerprintClient } from 'services/fingerprint'
import { reportToSentry } from 'store/errors/reportToSentry'

import styles from './OAuthLoginPage.module.css'
import { ApproveTransactionScreen } from './components/ApproveTransactionScreen'
import { CTAButton } from './components/CTAButton'
import { ContentWrapper } from './components/ContentWrapper'
import { PermissionsSection } from './components/PermissionsSection'
import { useOAuthSetup } from './hooks'
import { messages } from './messages'
import { WriteOnceTx } from './utils'

const { SIGN_UP_PAGE } = route
const { signOut } = signOutActions

export const OAuthLoginPage = () => {
  const record = useRecord()
  const { data: account } = useCurrentAccountUser()
  const isLoggedIn = Boolean(account?.user_id)

  const dispatch = useDispatch()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [otpEmail, setOtpEmail] = useState<string | null>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [generalSubmitError, setGeneralSubmitError] = useState<string | null>(
    null
  )
  const [metaMaskTransactionStatus, setMetaMaskTransactionStatus] = useState<
    null | 'pending' | 'approved'
  >(null) // Only applicable when tx = connect_dashboard_wallet

  const clearErrors = () => {
    setGeneralSubmitError(null)
    setSignInError(null)
  }

  const toggleOtpUI = (on: boolean) => {
    if (on) {
      setShowOtpInput(true)
      setSignInError(messages.otpError)
    } else {
      setSignInError(null)
      setShowOtpInput(false)
      setOtpInput('')
    }
  }

  const handleEmailInputChange = (input: string) => {
    if (
      generalSubmitError === messages.disconnectDashboardWalletWrongUserError
    ) {
      setGeneralSubmitError(null)
    }
    if (otpEmail !== input) {
      toggleOtpUI(false)
    } else if (otpEmail === input && !showOtpInput) {
      toggleOtpUI(true)
    }
    setEmailInput(input)
  }

  const setAndLogGeneralSubmitError = (
    isUserError: boolean,
    errorMessage: string,
    error?: Error
  ) => {
    setGeneralSubmitError(errorMessage)
    record(
      make(Name.AUDIUS_OAUTH_ERROR, {
        isUserError,
        error: errorMessage,
        appId: (apiKey || appName)!,
        scope: scope!
      })
    )
    if (error && !isUserError) {
      reportToSentry({ level: ErrorLevel.Error, error })
    }
  }

  const setAndLogInvalidCredentialsError = () => {
    setSignInError(messages.invalidCredentialsError)
    record(
      make(Name.AUDIUS_OAUTH_ERROR, {
        isUserError: true,
        error: messages.invalidCredentialsError,
        appId: (apiKey || appName)!,
        scope: scope!
      })
    )
  }

  const handleAuthError = ({
    isUserError,
    errorMessage,
    error
  }: {
    isUserError: boolean
    errorMessage: string
    error?: Error
  }) => {
    setIsSubmitting(false)
    setMetaMaskTransactionStatus(null)
    setAndLogGeneralSubmitError(isUserError, errorMessage, error)
  }

  const handlePendingTransactionApproval = () => {
    setMetaMaskTransactionStatus('pending')
  }

  const handleReceiveTransactionApproval = () => {
    setMetaMaskTransactionStatus('approved')
  }

  const {
    scope,
    tx,
    queryParamsError,
    loading,
    userAlreadyWriteAuthorized,
    apiKey,
    appName,
    appImage,
    userEmail,
    authorize,
    txParams,
    display
  } = useOAuthSetup({
    onError: handleAuthError,
    onPendingTransactionApproval: handlePendingTransactionApproval,
    onReceiveTransactionApproval: handleReceiveTransactionApproval
  })

  const handleSignInFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    record(
      make(Name.AUDIUS_OAUTH_SUBMIT, {
        alreadySignedIn: false,
        appId: (apiKey || appName)!,
        scope: scope!
      })
    )
    clearErrors()
    if (!emailInput || !passwordInput || (showOtpInput && !otpInput)) {
      setAndLogGeneralSubmitError(true, messages.missingFieldError)
      return
    }
    setIsSubmitting(true)
    let signInResponse: SignInResponse
    try {
      const fpResponse = await fingerprintClient.identify(emailInput, 'web')
      const sanitizedOtp = otpInput ? otpInput.replace(/\s/g, '') : undefined
      signInResponse = await authService.signIn(
        emailInput,
        passwordInput,
        fpResponse?.visitorId,
        sanitizedOtp
      )

      const sdk = await audiusSdk()
      const { data } = await sdk.full.users.getUserAccount({
        wallet: signInResponse.walletAddress
      })
      if (!data) {
        throw new Error('invalid user')
      }
      const account = accountFromSDK(data)
      if (!account || !account.user.handle || !account.user.name) {
        throw new Error('invalid user')
      }

      await authorize({
        account: account.user
      })
    } catch (err: any) {
      const error = String(err)
      const statusCode = err.response?.status
      if (error.includes('403')) {
        setIsSubmitting(false)
        setOtpEmail(emailInput)
        toggleOtpUI(true)
      } else if (
        statusCode === 401 ||
        statusCode === 404 ||
        error.includes('invalid user')
      ) {
        setIsSubmitting(false)
        setAndLogGeneralSubmitError(false, messages.accountIncompleteError)
      } else if (statusCode === 400) {
        setIsSubmitting(false)
        setAndLogInvalidCredentialsError()
      } else {
        setIsSubmitting(false)
        setAndLogGeneralSubmitError(
          false,
          messages.miscError,
          err instanceof Error ? err : undefined
        )
      }
    }
  }

  const handleAlreadySignedInAuthorizeSubmit = () => {
    clearErrors()
    record(
      make(Name.AUDIUS_OAUTH_SUBMIT, {
        alreadySignedIn: true,
        appId: (apiKey || appName)!,
        scope: scope!
      })
    )
    if (!account) {
      setAndLogGeneralSubmitError(false, messages.miscError)
    } else {
      setIsSubmitting(true)
      authorize({ account })
    }
  }

  const handleSignOut = () => {
    dispatch(signOut({ fromOAuth: true }))
  }

  const { data: currentWeb3User } = useCurrentWeb3Account()
  const { data: currentUserId } = useCurrentUserId()
  const { switchAccount } = useAccountSwitcher()

  const onAccountSelected = useCallback(
    (user: UserMetadata) => {
      switchAccount(user)
    },
    [switchAccount]
  )

  const web3UserId = currentWeb3User?.user_id ?? null

  const { data: managedAccounts = [] } = useManagedAccounts(web3UserId)

  const accounts = useMemo(() => {
    return managedAccounts.filter(({ grant }) => grant.is_approved)
  }, [managedAccounts])

  const isInManagerMode = account?.user_id === currentWeb3User?.user_id

  const [isAccountSwitcherOpen, setAccountSwitcherOpen] = useState(false)

  const onOpenAccountSwitcher = useCallback(() => {
    setAccountSwitcherOpen(true)
  }, [setAccountSwitcherOpen])

  const onCloseAccountSwitcher = useCallback(() => {
    setAccountSwitcherOpen(false)
  }, [setAccountSwitcherOpen])

  const isSubmitDisabled =
    generalSubmitError === messages.disconnectDashboardWalletWrongUserError

  if (queryParamsError) {
    return (
      <ContentWrapper display={display}>
        <div className={cn(styles.centeredContent, styles.titleContainer)}>
          <span className={styles.errorText}>{queryParamsError}</span>
        </div>
      </ContentWrapper>
    )
  }
  if (loading) {
    return (
      <ContentWrapper display={display}>
        <Flex p='4xl' alignItems='center' justifyContent='center'>
          <LoadingSpinner className={styles.loadingStateSpinner} />
        </Flex>
      </ContentWrapper>
    )
  }

  if (metaMaskTransactionStatus != null) {
    return <ApproveTransactionScreen status={metaMaskTransactionStatus} />
  }

  return (
    <ContentWrapper display={display}>
      {isAccountSwitcherOpen && currentWeb3User && currentUserId ? (
        <Flex className={display === 'popup' ? styles.container : undefined}>
          <AccountListContent
            fullWidth
            managerAccount={currentWeb3User}
            currentUserId={currentUserId}
            onAccountSelected={onAccountSelected}
            accounts={accounts}
            navBackElement={
              <PlainButton
                size='large'
                iconLeft={IconCaretLeft}
                onClick={onCloseAccountSwitcher}
              >
                {messages.back}
              </PlainButton>
            }
          />
        </Flex>
      ) : (
        <div className={styles.container}>
          <Flex alignItems='center' direction='column'>
            <Flex gap='l' alignItems='center' mb='l'>
              <Flex h='88px' w='88px'>
                <img src={AppIcon} alt='Audius Logo' />
              </Flex>
              <IconTransaction color='default' />
              <Flex
                h='88px'
                w='88px'
                borderRadius='l'
                css={{ overflow: 'hidden' }}
              >
                {appImage ? (
                  <img src={appImage} alt={`${appName} Image`} />
                ) : (
                  <Flex
                    w='100%'
                    justifyContent='center'
                    alignItems='center'
                    borderRadius='l'
                    css={{ backgroundColor: 'var(--harmony-n-200)' }}
                  >
                    <IconEmbed
                      color='subdued'
                      css={{ width: '48px', height: '48px' }}
                    />
                  </Flex>
                )}
              </Flex>
            </Flex>
            <Text variant='body' size='l'>{`${messages.allow}:`}</Text>
            <Text variant='heading' size='s'>
              {appName}
            </Text>
          </Flex>
          {userAlreadyWriteAuthorized ? null : (
            <PermissionsSection
              scope={scope}
              tx={tx as WriteOnceTx}
              userEmail={isInManagerMode ? userEmail : null}
              isLoggedIn={isLoggedIn}
              isLoading={userEmail === null}
              txParams={txParams}
            />
          )}
          <div className={styles.formArea}>
            {isLoggedIn ? (
              <div className={styles.userInfoContainer}>
                <Text
                  variant='body'
                  size='m'
                  css={{ color: 'var(--harmony-n-600)' }}
                >
                  {messages.signedInAs}
                </Text>
                <div className={styles.tile}>
                  <ProfileInfo
                    displayNameClassName={styles.userInfoDisplayName}
                    handleClassName={styles.userInfoHandle}
                    centered={false}
                    imgClassName={styles.profileImg}
                    className={styles.userInfo}
                    user={account}
                  />
                </div>
                <Flex mt='l' alignItems='center' justifyContent='space-between'>
                  <TextLink variant='visible' size='s' onClick={handleSignOut}>
                    {messages.signOut}
                  </TextLink>
                  {accounts.length > 0 ? (
                    <PlainButton
                      iconLeft={IconUserArrowRotate}
                      aria-label={messages.switchAccount}
                      color='default'
                      onClick={onOpenAccountSwitcher}
                    >
                      {messages.switchAccount}
                    </PlainButton>
                  ) : null}
                </Flex>
                <CTAButton
                  isLoading={isSubmitting}
                  disabled={isSubmitDisabled}
                  onClick={handleAlreadySignedInAuthorizeSubmit}
                >
                  {userAlreadyWriteAuthorized
                    ? messages.continueButton
                    : messages.authorizeButton}
                </CTAButton>
              </div>
            ) : (
              <div className={styles.signInFormContainer}>
                <form onSubmit={handleSignInFormSubmit}>
                  <Input
                    placeholder='Email'
                    size='medium'
                    type='email'
                    name='email'
                    id='email-input'
                    isRequired
                    autoComplete='username'
                    value={emailInput}
                    onChange={handleEmailInputChange}
                  />
                  <Input
                    className={styles.passwordInput}
                    placeholder='Password'
                    size='medium'
                    name='password'
                    id='password-input'
                    isRequired
                    autoComplete='current-password'
                    value={passwordInput}
                    type='password'
                    onChange={setPasswordInput}
                  />
                  {signInError == null ? null : (
                    <div className={styles.credentialsErrorContainer}>
                      <IconValidationX
                        width={14}
                        height={14}
                        className={styles.credentialsErrorIcon}
                      />
                      <span className={styles.errorText}>{signInError}</span>
                    </div>
                  )}
                  {showOtpInput ? (
                    <Input
                      placeholder='Verification Code'
                      size='medium'
                      name='otp'
                      value={otpInput}
                      characterLimit={6}
                      type='number'
                      variant={'normal'}
                      onChange={setOtpInput}
                      className={cn(styles.otpInput)}
                    />
                  ) : null}
                  <CTAButton type='submit' isLoading={isSubmitting}>
                    {messages.signInButton}
                  </CTAButton>
                </form>
                <div className={styles.signUpButtonContainer}>
                  <a
                    className={styles.linkButton}
                    href={SIGN_UP_PAGE}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    {messages.signUp}
                  </a>
                </div>
              </div>
            )}
            {generalSubmitError == null ? null : (
              <div className={styles.generalErrorContainer}>
                <span className={styles.errorText}>{generalSubmitError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </ContentWrapper>
  )
}
