import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useManagers,
  useRequestAddManager,
  useSearchUsersModal
} from '@audius/common/api'
import type { User } from '@audius/common/models'
import { Portal } from '@gorhom/portal'
import { FlatList, Keyboard, TouchableOpacity } from 'react-native'
import { useDebounce } from 'react-use'

import {
  Flex,
  Hint,
  IconError,
  IconSearch,
  IconShieldUser,
  Text,
  TextInput,
  TextInputSize
} from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { ConfirmationDrawerWithoutRedux } from 'app/components/drawers'
import LoadingSpinner from 'app/components/loading-spinner'
import { AccountRow } from 'app/components/manager-mode/AccountRow'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'

import { managerModeMessages } from './messages'

const DEBOUNCE_MS = 250

const messages = {
  title: 'Find Account Manager',
  description: 'Invite a manager to join your account.',
  searchUsers: 'Search Users',
  searchForManager: 'Search for Account Manager',
  accessWarning: 'Only grant manager access to people you trust.',
  confirmTitle: 'Confirm New Manager',
  confirmDescription:
    'Are you sure you want to authorize the following user to manage your Audius account?',
  confirm: 'Confirm',
  inviteSent: 'Invite sent'
}

export const FindAccountManagerScreen = () => {
  const navigation = useNavigation()
  const { toast } = useToast()
  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')
  useDebounce(() => setQuery(inputValue.trim()), DEBOUNCE_MS, [inputValue])

  const { data: userId } = useCurrentUserId()
  const { data: managers } = useManagers(userId)
  const { users, isLoading } = useSearchUsersModal({ query })
  const { mutate: requestAddManager, isPending: isRequesting } =
    useRequestAddManager()

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleSelectUser = useCallback((user: User) => {
    Keyboard.dismiss()
    setSelectedUser(user)
    setIsConfirmOpen(true)
  }, [])

  const results = useMemo(() => {
    const excluded = new Set(managers?.map((m) => m.manager.user_id))
    if (userId) excluded.add(userId)
    return (users ?? []).filter((user) => !excluded.has(user.user_id))
  }, [managers, userId, users])

  const handleConfirm = useCallback(() => {
    if (!userId || !selectedUser) return
    requestAddManager(
      { userId, managerUser: selectedUser },
      {
        onSuccess: () => {
          toast({ content: messages.inviteSent })
          navigation.goBack()
        },
        onError: () => {
          toast({
            content: managerModeMessages.somethingWentWrong,
            type: 'error'
          })
        }
      }
    )
  }, [navigation, requestAddManager, selectedUser, toast, userId])

  return (
    <Screen
      variant='secondary'
      title={messages.title}
      icon={IconShieldUser}
      topbarRight={null}
    >
      <ScreenContent>
        <Flex flex={1} backgroundColor='white'>
          <Flex p='xl' gap='l' borderBottom='default'>
            {isRequesting ? (
              <Flex alignItems='center'>
                <LoadingSpinner style={{ width: 24, height: 24 }} />
              </Flex>
            ) : null}
            <Text variant='body' size='m'>
              {messages.description}{' '}
              {managerModeMessages.accountManagersExplanation}
            </Text>
            <TextInput
              label={messages.searchUsers}
              placeholder={messages.searchUsers}
              autoCorrect={false}
              autoCapitalize='none'
              size={TextInputSize.SMALL}
              startIcon={IconSearch}
              value={inputValue}
              onChangeText={setInputValue}
            />
          </Flex>
          <FlatList
            data={query ? results : []}
            keyExtractor={(user) => String(user.user_id)}
            keyboardShouldPersistTaps='handled'
            renderItem={({ item: user }) => (
              <TouchableOpacity
                disabled={isRequesting}
                onPress={() => handleSelectUser(user)}
              >
                <Flex ph='xl' pv='m' borderBottom='default'>
                  <AccountRow user={user} />
                </Flex>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query && isLoading ? (
                <Flex alignItems='center' pv='2xl'>
                  <LoadingSpinner style={{ width: 32, height: 32 }} />
                </Flex>
              ) : (
                <Flex alignItems='center' gap='l' p='2xl'>
                  <IconShieldUser color='subdued' size='3xl' />
                  <Text variant='heading' size='s'>
                    {messages.searchForManager}
                  </Text>
                  <Text variant='body' size='l' textAlign='center'>
                    {messages.accessWarning}
                  </Text>
                </Flex>
              )
            }
          />
        </Flex>
      </ScreenContent>
      {/* Above the tab bar */}
      <Portal hostName='DrawerPortal'>
        <ConfirmationDrawerWithoutRedux
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          variant='affirmative'
          messages={{
            header: messages.confirmTitle,
            description: messages.confirmDescription,
            confirm: messages.confirm,
            cancel: managerModeMessages.cancel
          }}
          onConfirm={handleConfirm}
        >
          {selectedUser ? (
            <Flex gap='l' w='100%'>
              <Flex border='default' borderRadius='s' p='l'>
                <AccountRow user={selectedUser} />
              </Flex>
              <Hint icon={IconError}>
                {managerModeMessages.accountManagersExplanation}
              </Hint>
            </Flex>
          ) : null}
        </ConfirmationDrawerWithoutRedux>
      </Portal>
    </Screen>
  )
}
