import { useState } from 'react'

import {
  selectIsAccountComplete,
  useCurrentAccount,
  useCurrentAccountUser,
  useAccountStatus
} from '@audius/common/api'
import { useIsManagedAccount } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Box, Flex, Skeleton, Text, useTheme } from '@audius/harmony'

import { Avatar } from 'components/avatar/Avatar'
import { TextLink, UserLink } from 'components/link'
import { backgroundOverlay } from 'utils/styleUtils'

import { AccountSwitcher } from './AccountSwitcher/AccountSwitcher'

const { SIGN_IN_PAGE, SIGN_UP_PAGE, profilePage } = route
const messages = {
  haveAccount: 'Have an account?',
  managedAccount: 'Managed Account',
  signIn: 'Sign In',
  finishSignUp: 'Finish Signing Up'
}

type AccountDetailsContainerProps = {
  children: React.ReactNode
  isManagedAccount?: boolean
}

const AccountDetailsContainer = ({
  children,
  isManagedAccount
}: AccountDetailsContainerProps) => {
  const { color } = useTheme()
  return (
    <Flex direction='column' pb='unit1' w='100%'>
      {isManagedAccount ? (
        <Box pv='xs' ph='m' backgroundColor='accent'>
          <Text variant='label' size='xs' color='white'>
            {messages.managedAccount}
          </Text>
        </Box>
      ) : null}
      <Flex
        pv='s'
        pr='s'
        pl='m'
        {...(isManagedAccount
          ? {
              borderBottom: 'strong',
              css: {
                ...backgroundOverlay({
                  color: color.background.accent,
                  opacity: 0.03
                })
              }
            }
          : undefined)}
      >
        {children}
      </Flex>
    </Flex>
  )
}

type AccountContentWrapperProps = {
  children: React.ReactNode
}

const AccountContentWrapper = ({ children }: AccountContentWrapperProps) => (
  <Flex alignItems='center' w='100%' justifyContent='flex-start' gap='s'>
    {children}
  </Flex>
)

type AccountInfoProps = {
  children: React.ReactNode
}

const AccountInfo = ({ children }: AccountInfoProps) => (
  <Flex
    direction='column'
    gap='xs'
    flex={1}
    css={{
      textAlign: 'left',
      whiteSpace: 'nowrap',
      wordBreak: 'keep-all',
      overflow: 'hidden'
    }}
  >
    {children}
  </Flex>
)

type SignedInViewProps = {
  userId: number
  handle: string
  isManagedAccount: boolean
}

const SignedInView = ({
  userId,
  handle,
  isManagedAccount
}: SignedInViewProps) => {
  const { color } = useTheme()
  const profileLink = profilePage(handle)

  const [isAccountSwitcherVisible, setIsAccountSwitcherVisible] =
    useState(false)

  return (
    <AccountContentWrapper>
      <Avatar userId={userId} h={48} w={48} />
      <AccountInfo>
        <Flex alignItems='center' justifyContent='space-between' gap='s' h={20}>
          <Flex
            css={{
              maxWidth: isAccountSwitcherVisible ? '85%' : '100%',
              overflow: 'hidden'
            }}
          >
            <UserLink
              popover
              textVariant='title'
              size='s'
              userId={userId}
              badgeSize='xs'
              ellipses
              css={{
                ...(isManagedAccount && {
                  color: color.secondary.s500,
                  '&:hover': { color: color.secondary.s500 }
                })
              }}
            />
          </Flex>
          <AccountSwitcher onVisibilityChange={setIsAccountSwitcherVisible} />
        </Flex>
        <TextLink
          size='s'
          to={profileLink}
          css={
            isManagedAccount && {
              color: color.secondary.s500,
              '&:hover': { color: color.secondary.s500 }
            }
          }
        >{`@${handle}`}</TextLink>
      </AccountInfo>
    </AccountContentWrapper>
  )
}

const SignedOutView = () => (
  <AccountContentWrapper>
    <Avatar userId={null} h={48} w={48} borderWidth='thin' />
    <AccountInfo>
      <Text variant='title' size='s'>
        {messages.haveAccount}
      </Text>
      <TextLink to={SIGN_IN_PAGE} variant='visible' size='s'>
        {messages.signIn}
      </TextLink>
    </AccountInfo>
  </AccountContentWrapper>
)

const GuestView = () => {
  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })
  return (
    <AccountContentWrapper>
      <Avatar userId={null} h={48} w={48} />
      <AccountInfo>
        <Text variant='title' size='s' ellipses>
          {guestEmail}
        </Text>
        <TextLink to={SIGN_UP_PAGE} variant='visible' size='s'>
          {messages.finishSignUp}
        </TextLink>
      </AccountInfo>
    </AccountContentWrapper>
  )
}

const LoadingView = () => {
  return (
    <AccountContentWrapper>
      <Skeleton w={48} h={48} css={{ borderRadius: '50%' }} />
      <AccountInfo>
        <Skeleton w='100%' h={20} />
        <Skeleton w='100%' h={20} />
      </AccountInfo>
    </AccountContentWrapper>
  )
}

export const AccountDetails = () => {
  const { data: user } = useCurrentAccountUser({
    select: (user) => ({
      userId: user?.user_id,
      handle: user?.handle
    })
  })
  const { userId, handle: accountHandle } = user ?? {}
  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })
  const { data: accountStatus } = useAccountStatus()
  const { data: hasCompletedAccount } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })
  const isManagedAccount = useIsManagedAccount()

  // Determine which state to show
  if (userId && accountHandle) {
    return (
      <AccountDetailsContainer isManagedAccount={isManagedAccount}>
        <SignedInView
          userId={userId}
          handle={accountHandle}
          isManagedAccount={isManagedAccount}
        />
      </AccountDetailsContainer>
    )
  }

  if (!hasCompletedAccount && guestEmail) {
    return (
      <AccountDetailsContainer>
        <GuestView />
      </AccountDetailsContainer>
    )
  }

  // Only shows briefly when the account is currently being loaded in during sign in
  if (accountStatus === Status.LOADING || accountStatus === Status.SUCCESS) {
    return (
      <AccountDetailsContainer>
        <LoadingView />
      </AccountDetailsContainer>
    )
  }

  return (
    <AccountDetailsContainer>
      <SignedOutView />
    </AccountDetailsContainer>
  )
}
