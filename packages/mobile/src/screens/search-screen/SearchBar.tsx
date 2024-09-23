import { useCallback, useEffect, useRef, useState } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import {
  fetchSearch,
  clearSearch
} from '@audius/web/src/common/store/search-bar/actions'
import {
  getSearchBarStatus,
  getSearchBarText
} from '@audius/web/src/common/store/search-bar/selectors'
import { useDispatch, useSelector } from 'react-redux'
import { useTimeoutFn } from 'react-use'

import type { TextInputProps, TextInputRef } from '@audius/harmony-native'
import {
  IconButton,
  IconClose,
  IconSearch,
  TextInput,
  TextInputSize
} from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

const messages = {
  label: 'Search'
}

const useStyles = makeStyles(({ spacing }) => ({
  loadingSpinner: {
    height: spacing(4) + 2,
    width: spacing(4) + 2
  }
}))

// Amount of time to wait before focusing TextInput
// after the SearchBar renders
const TEXT_INPUT_FOCUS_DELAY = 350

type SearchBarProps = Partial<TextInputProps>

export const SearchBar = (props: SearchBarProps) => {
  const searchQuery = useSelector(getSearchBarText)
  const searchStatus = useSelector(getSearchBarStatus)
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const inputRef = useRef<TextInputRef>(null)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const styles = useStyles()

  // Wait to focus TextInput to prevent keyboard animation
  // from causing UI stutter as the screen transitions in
  useTimeoutFn(() => inputRef.current?.focus(), TEXT_INPUT_FOCUS_DELAY)

  const handleFetchSearch = useDebouncedCallback(
    (text: string) => {
      // Do nothing for tag search (no autocomplete)
      if (!text.startsWith('#')) {
        dispatch(fetchSearch(text))
      }
    },
    [dispatch],
    250
  )
  const handleChangeText = useCallback(
    (text: string) => {
      setSearchInput(text)
      handleFetchSearch(text)
      if (text === '') {
        dispatch(clearSearch())
      }
    },
    [handleFetchSearch, dispatch]
  )

  // Handle case where search query is set by pressing search history item
  useEffect(() => {
    if (searchInput === '' && searchQuery) {
      handleChangeText(searchQuery)
    }
  }, [searchInput, searchQuery, handleChangeText])

  const handleSubmit = useCallback(() => {
    if (searchInput.startsWith('#')) {
      navigation.push('TagSearch', { query: searchInput })
    }
  }, [searchInput, navigation])

  const handleClear = useCallback(() => {
    dispatch(clearSearch())
    setSearchInput('')
    inputRef.current?.focus()
  }, [dispatch])

  const isLoading = searchStatus === Status.LOADING

  const endAdornmentElement = isLoading ? (
    <LoadingSpinner style={styles.loadingSpinner} />
  ) : searchInput ? (
    <IconButton
      icon={IconClose}
      color='subdued'
      onPress={handleClear}
      size='xs'
    />
  ) : undefined

  return (
    <TextInput
      {...props}
      autoCapitalize='none'
      autoCorrect={false}
      startIcon={IconSearch}
      size={TextInputSize.SMALL}
      label={messages.label}
      placeholder={messages.label}
      ref={inputRef}
      value={searchInput}
      onChangeText={handleChangeText}
      onSubmitEditing={handleSubmit}
      returnKeyType='search'
      endAdornment={endAdornmentElement}
    />
  )
}
