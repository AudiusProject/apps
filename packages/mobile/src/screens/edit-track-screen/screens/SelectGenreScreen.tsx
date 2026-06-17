import { useMemo, useState } from 'react'

import { useGenreSuggestions } from '@audius/common/api'
import {
  getGenreSuggestionKey,
  getStaticGenreSuggestions,
  normalizeGenre
} from '@audius/common/utils'
import { useField } from 'formik'

import { Flex } from '@audius/harmony-native'
import IconGenre from 'app/assets/images/iconGenre.svg'
import { Text, TextInput } from 'app/components/core'
import { ListSelectionScreen } from 'app/screens/list-selection-screen'
import { makeStyles } from 'app/styles'

const MAX_GENRE_LENGTH = 100

const messages = {
  screenTitle: 'Select Genre',
  searchPlaceholder: 'Search or enter a custom genre',
  useCustom: (value: string) => `Use "${value}" as a custom genre`
}

const staticSuggestions = getStaticGenreSuggestions()

const useStyles = makeStyles(({ spacing, typography }) => ({
  searchInput: {
    paddingVertical: spacing(3),
    fontSize: typography.fontSize.large
  }
}))

export const SelectGenreScreen = () => {
  const [{ value }, , { setValue }] = useField<string>('genre')
  const [input, setInput] = useState('')
  const { data: suggestions = staticSuggestions } = useGenreSuggestions()
  const styles = useStyles()

  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()
  const normalized = normalizeGenre(trimmed)
  const normalizedKey = getGenreSuggestionKey(normalized)

  const filtered = useMemo(() => {
    if (trimmed === '') return suggestions
    return suggestions.filter(
      (g) =>
        g.label.toLowerCase().includes(lower) ||
        g.value.toLowerCase().includes(lower)
    )
  }, [trimmed, lower, suggestions])

  const data = useMemo(() => {
    if (trimmed === '') return suggestions
    const matchesKnownExactly = suggestions.some(
      (g) =>
        getGenreSuggestionKey(g.label) === normalizedKey ||
        getGenreSuggestionKey(g.value) === normalizedKey
    )
    if (matchesKnownExactly || trimmed.length > MAX_GENRE_LENGTH) {
      return filtered
    }
    return [
      { value: normalized, label: messages.useCustom(normalized) },
      ...filtered
    ]
  }, [trimmed, normalized, normalizedKey, suggestions, filtered])

  return (
    <ListSelectionScreen
      data={data}
      renderItem={({ item }) => (
        <Text fontSize='large' weight='demiBold'>
          {item.label}
        </Text>
      )}
      screenTitle={messages.screenTitle}
      icon={IconGenre}
      disableSearch
      header={
        <Flex>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={messages.searchPlaceholder}
            maxLength={MAX_GENRE_LENGTH}
            styles={{ input: styles.searchInput }}
            returnKeyType='search'
            autoCapitalize='words'
            autoCorrect={false}
          />
        </Flex>
      }
      value={value}
      onChange={setValue}
    />
  )
}
