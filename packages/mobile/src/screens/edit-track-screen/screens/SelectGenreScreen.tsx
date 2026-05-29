import { useMemo, useState } from 'react'

import { GENRES, convertGenreLabelToValue } from '@audius/common/utils'
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

const knownGenres = GENRES.map((genre) => ({
  value: convertGenreLabelToValue(genre),
  label: genre
}))

const useStyles = makeStyles(({ spacing, typography }) => ({
  searchInput: {
    paddingVertical: spacing(3),
    fontSize: typography.fontSize.large
  }
}))

export const SelectGenreScreen = () => {
  const [{ value }, , { setValue }] = useField<string>('genre')
  const [input, setInput] = useState('')
  const styles = useStyles()

  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()

  const filtered = useMemo(() => {
    if (trimmed === '') return knownGenres
    return knownGenres.filter(
      (g) =>
        g.label.toLowerCase().includes(lower) ||
        g.value.toLowerCase().includes(lower)
    )
  }, [trimmed, lower])

  const data = useMemo(() => {
    if (trimmed === '') return knownGenres
    const matchesKnownExactly = knownGenres.some(
      (g) =>
        g.label.toLowerCase() === lower || g.value.toLowerCase() === lower
    )
    if (matchesKnownExactly || trimmed.length > MAX_GENRE_LENGTH) {
      return filtered
    }
    return [
      { value: trimmed, label: messages.useCustom(trimmed) },
      ...filtered
    ]
  }, [trimmed, lower, filtered])

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
