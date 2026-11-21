import React, { useCallback } from 'react'

import { exploreMessages as messages } from '@audius/common/messages'

import {
  Flex,
  IconButton,
  IconCloseAlt,
  IconSearch,
  TextInput,
  TextInputSize
} from '@audius/harmony-native'

import {
  useSearchQuery,
  useSearchAutoFocus
} from '../../search-screen/searchState'

export const SearchInput = () => {
  const [query, setQuery] = useSearchQuery()
  const [autoFocus] = useSearchAutoFocus()

  const handleClearSearch = useCallback(() => {
    setQuery('')
  }, [setQuery])

  return (
    <Flex>
      <TextInput
        label='Search'
        autoFocus={autoFocus}
        placeholder={messages.searchPlaceholder}
        size={TextInputSize.SMALL}
        startIcon={IconSearch}
        onChangeText={setQuery}
        value={query}
        endIcon={(props) => (
          <IconButton
            icon={IconCloseAlt}
            color='subdued'
            onPress={handleClearSearch}
            hitSlop={10}
            {...props}
          />
        )}
      />
    </Flex>
  )
}
