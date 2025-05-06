import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  useGetCurrentUserId,
  useGetCurrentWeb3User,
  useManagedAccounts
} from '@audius/common/api'
import { useAccountSwitcher } from '@audius/common/hooks'
import { UserMetadata } from '@audius/common/models'
import { accountSelectors } from '@audius/common/store'
import { Box, IconButton, IconCaretDown, Popup } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { AccountListContent } from './AccountListContent'

export const AccountSwitcher = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isAccountComplete = useSelector(accountSelectors.getIsAccountComplete)
  const [checkedAccess, setCheckedAccess] = useState(false)

  const { data: currentWeb3User } = useGetCurrentWeb3User(
    {},
    { enabled: !isAccountComplete }
  )
  const { data: currentUserId } = useGetCurrentUserId(
    {},
    { enabled: !isAccountComplete }
  )

  const { switchAccount, switchToWeb3User } = useAccountSwitcher()

  const onAccountSelected = useCallback(
    (user: UserMetadata) => {
      switchAccount(user)
    },
    [switchAccount]
  )

  const web3UserId = currentWeb3User?.user_id ?? null

  const { data: managedAccounts = [], isSuccess: isManagedAccountsSuccess } =
    useManagedAccounts(web3UserId)

  const parentElementRef = useRef<HTMLDivElement>(null)
  const onClickExpander = useCallback(
    () => setIsExpanded((expanded) => !expanded),
    []
  )

  const accounts = useMemo(() => {
    return managedAccounts.filter(({ grant }) => grant.is_approved)
  }, [managedAccounts])

  // Reset to the web3User if we detect that the current user is no longer in
  // the managed accounts list
  useEffect(() => {
    if (
      !currentUserId ||
      !currentWeb3User ||
      !isManagedAccountsSuccess ||
      checkedAccess
    ) {
      return
    }
    // Check this only once per mount
    setCheckedAccess(true)
    if (
      currentUserId !== currentWeb3User.user_id &&
      !accounts.some(({ user: { user_id } }) => user_id === currentUserId)
    ) {
      switchToWeb3User()
    }
  }, [
    accounts,
    checkedAccess,
    currentUserId,
    currentWeb3User,
    isManagedAccountsSuccess,
    switchToWeb3User
  ])

  return !currentWeb3User || !currentUserId || accounts.length === 0 ? null : (
    <Box ref={parentElementRef}>
      <IconButton
        color='default'
        size='2xs'
        aria-label='Open Account Switcher'
        icon={IconCaretDown}
        onClick={onClickExpander}
      />
      <Popup
        checkIfClickInside={(target: EventTarget) => {
          if (target instanceof Element && parentElementRef.current) {
            return parentElementRef.current.contains(target)
          }
          return false
        }}
        anchorRef={parentElementRef}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        dismissOnMouseLeave={false}
        isVisible={isExpanded}
        onClose={() => setIsExpanded(false)}
        css={{
          overflow: 'hidden'
        }}
      >
        <AccountListContent
          managerAccount={currentWeb3User}
          currentUserId={currentUserId!}
          onAccountSelected={onAccountSelected}
          accounts={accounts}
        />
      </Popup>
    </Box>
  )
}
