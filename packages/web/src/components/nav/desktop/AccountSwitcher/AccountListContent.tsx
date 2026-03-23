import {
  ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState
} from 'react'

import { ID, ManagedUserMetadata, UserMetadata } from '@audius/common/models'
import {
  Box,
  Flex,
  IconUserArrowRotate,
  Scrollbar,
  Text,
  useTheme
} from '@audius/harmony'

import { useMainContentRef } from 'pages/MainContentContext'

import { AccountSwitcherRow } from './AccountSwitcherRow'

const messages = {
  switchAccount: 'Switch Account',
  managedAccounts: 'Managed Accounts'
}

type AccountListContentProps = {
  accounts: ManagedUserMetadata[]
  managerAccount: UserMetadata
  currentUserId: ID
  onAccountSelected: (user: UserMetadata) => void
  navBackElement?: ReactNode
  fullWidth?: boolean
}

export const AccountListContent = ({
  accounts: accountsProp,
  managerAccount,
  currentUserId,
  onAccountSelected,
  navBackElement,
  fullWidth
}: AccountListContentProps) => {
  const mainContentRef = useMainContentRef()
  const { spacing } = useTheme()
  const [contentHeight, setContentHeight] = useState(0)
  // If the current user is one of the managed account, sort it to the top of
  // the list
  const accounts = useMemo(() => {
    const selectedIdx = accountsProp.findIndex(
      ({ user }) => user.user_id === currentUserId
    )
    if (selectedIdx === -1) return accountsProp
    const withoutSelected = [...accountsProp]
    const selectedAccount = withoutSelected.splice(selectedIdx, 1)[0]
    return [selectedAccount, ...withoutSelected]
  }, [accountsProp, currentUserId])

  // Tracking mainContent height so we can ensure the account list
  // stays well within the viewport
  useLayoutEffect(() => {
    if (mainContentRef.current) {
      const { height } = mainContentRef.current.getBoundingClientRect()
      setContentHeight(height)
      return
    }
    // OAuth routes render outside WebPlayer main content, so fall back to viewport height.
    setContentHeight(window.innerHeight)
  }, [mainContentRef])

  const onUserSelected = useCallback(
    (user: UserMetadata) => {
      if (user.user_id !== currentUserId) {
        onAccountSelected(user)
      }
    },
    [currentUserId, onAccountSelected]
  )
  return (
    <Flex
      direction='column'
      w={fullWidth ? '100%' : 360}
      backgroundColor='white'
      css={{
        overflow: 'hidden',
        maxHeight: `calc(${contentHeight}px - ${spacing.unit12}px)`
      }}
    >
      <Flex
        backgroundColor='white'
        borderBottom='default'
        alignItems='center'
        justifyContent='space-between'
        ph='l'
        pv={navBackElement ? 'l' : 's'}
        gap='s'
      >
        {navBackElement}
        <Flex alignItems='center' gap='s'>
          <IconUserArrowRotate size='s' color='default' />
          <Text
            variant='title'
            size={navBackElement ? 'l' : 'm'}
            color='default'
          >
            {messages.switchAccount}
          </Text>
        </Flex>
      </Flex>
      <Flex
        as='ul'
        flex={1}
        direction='column'
        role='menu'
        tabIndex={-1}
        css={{ listStyle: 'none', overflow: 'hidden' }}
      >
        <li
          role='menuitem'
          tabIndex={0}
          onClick={() => onUserSelected(managerAccount)}
        >
          <AccountSwitcherRow
            user={managerAccount}
            isSelected={currentUserId === managerAccount.user_id}
          />
        </li>
        <Box
          ph='l'
          pv='s'
          backgroundColor='surface1'
          borderTop='default'
          borderBottom='default'
        >
          <Text variant='title' size='xs' color='default'>
            {messages.managedAccounts}
          </Text>
        </Box>

        <Scrollbar>
          {accounts.map(({ user }, i) => (
            <li
              key={user.user_id}
              role='menuitem'
              onClick={() => onUserSelected(user)}
              tabIndex={-1}
            >
              <Box
                borderBottom={i < accounts.length - 1 ? 'default' : undefined}
              >
                <AccountSwitcherRow
                  user={user}
                  isSelected={currentUserId === user.user_id}
                />
              </Box>
            </li>
          ))}
        </Scrollbar>
      </Flex>
    </Flex>
  )
}
