import { useCallback, useMemo, useState } from 'react'

import { useCurrentUserId, useManagers } from '@audius/common/api'
import { User } from '@audius/common/models'
import { Box, Flex, IconShieldUser, Text, useTheme } from '@audius/harmony'

import ArtistChip from 'components/artist/ArtistChip'
import { UsersSearch } from 'components/search-users-modal/SearchUsersModal'

import { sharedMessages } from './sharedMessages'
import { AccountsManagingYouPages, FindAccountManagerPageProps } from './types'

const messages = {
  description: 'Invite a manager to join your account.',
  searchUsers: 'Search Users',
  searchForManager: 'Search for Account Manager',
  accessWarning: 'Only grant manager access to people you trust.'
}

export const FindAccountManagerPage = (props: FindAccountManagerPageProps) => {
  const { color } = useTheme()
  const { setPageState, params } = props
  const [query, setQuery] = useState(params?.query ?? '')
  const { data: userId } = useCurrentUserId()
  const { data: managers } = useManagers(userId)
  const excludedUserIds = useMemo(() => {
    const res: number[] = managers?.map((m) => m.manager.user_id) ?? []
    if (userId) {
      res.push(userId)
    }
    return res
  }, [managers, userId])

  const renderEmpty = useCallback(() => {
    return (
      <Flex direction='column' gap='l' alignItems='center' mt='xl' h='100%'>
        <IconShieldUser color='subdued' size='3xl' />
        <Text variant='heading' size='s'>
          {messages.searchForManager}
        </Text>
        <Text variant='body' size='l'>
          {messages.accessWarning}
        </Text>
      </Flex>
    )
  }, [])

  const renderUser = useCallback(
    (user: User) => {
      return (
        <Box
          key={user.user_id}
          pv='l'
          borderTop='default'
          ph='xl'
          css={{
            '&:hover': {
              cursor: 'pointer',
              backgroundColor: color.background.surface1
            }
          }}
        >
          <ArtistChip
            userId={user.user_id}
            showPopover={false}
            onClickArtistName={() => {
              setPageState({
                page: AccountsManagingYouPages.CONFIRM_NEW_MANAGER,
                params: {
                  user,
                  query
                }
              })
            }}
          />
        </Box>
      )
    },
    [query, setPageState, color]
  )

  return (
    <Flex direction='column' gap='xl'>
      <Box ph='xl'>
        <Text variant='body' size='l'>
          {messages.description} {sharedMessages.accountManagersExplanation}{' '}
        </Text>
      </Box>
      <UsersSearch
        excludedUserIds={excludedUserIds}
        query={query}
        onChange={setQuery}
        disableAutofocus
        renderUser={renderUser}
        renderEmpty={renderEmpty}
      />
    </Flex>
  )
}
