import { useMemo, useState, useEffect } from 'react'

import type { Genre } from '@audius/common/utils'
import {
  convertGenreLabelToValue,
  GENRES,
  MUSICAL_KEYS
} from '@audius/common/utils'
import { Image } from 'react-native'

import { FilterButton } from '@audius/harmony-native'
import { SegmentedControl } from 'app/components/core'
import { moodMap } from 'app/utils/moods'

import { ListSelectionScreen } from '../list-selection-screen'

import { useSearchFilter } from './searchState'

const messages = {
  genre: 'Genre',
  genreFilterLabel: 'Search Genre',
  mood: 'Mood',
  moodFilterLabel: 'Search Mood',
  key: 'Key',
  isPremium: 'Premium',
  isVerified: 'Verified',
  hasDownloads: 'Downloads Available',
  major: 'Major',
  minor: 'Minor'
}

const genreOptions = GENRES.map((genre) => ({
  label: genre,
  value: convertGenreLabelToValue(genre)
}))

export const GenreFilter = () => {
  const [genre, setGenre] = useSearchFilter('genre')
  const [, setKey] = useSearchFilter('key')
  const [, setBpm] = useSearchFilter('bpm')

  const handleGenreChange = (value: Genre | undefined) => {
    if (value === 'Podcasts') {
      setKey(undefined)
      setBpm(undefined)
    }
    setGenre(value)
  }

  const options = useMemo(() => {
    if (genre && !genreOptions.some((option) => option.value === genre)) {
      return [{ label: genre, value: genre }, ...genreOptions]
    }

    return genreOptions
  }, [genre])

  return (
    <FilterButton
      label={messages.genre}
      value={genre}
      onChange={handleGenreChange}
      options={options}
      size='small'
    />
  )
}

const moodOptions = Object.keys(moodMap)
  .sort()
  .map((mood) => ({
    label: mood,
    value: mood,
    leadingElement: (
      <Image source={moodMap[mood]} style={{ height: 16, width: 16 }} />
    )
  }))

export const MoodFilter = () => {
  const [mood, setMood] = useSearchFilter('mood')

  return (
    <FilterButton
      label={messages.mood}
      value={mood}
      onChange={setMood}
      options={moodOptions}
      size='small'
    />
  )
}

const keyOptions = MUSICAL_KEYS.map((k) => ({
  label: k,
  value: k
}))

const FilterKeyScreen = (props) => {
  const { value, onChange, ...other } = props

  const [scale, setScale] = useState(value?.split(' ')[1] ?? 'Major')
  const [selectedKey, setSelectedKey] = useState(value?.split(' ')[0] ?? '')

  useEffect(() => {
    if (value) {
      const [keyPart, scalePart] = value.split(' ')
      setSelectedKey(keyPart)
      setScale(scalePart || 'Major')
    }
  }, [value])

  const handleScaleChange = (newScale: string) => {
    setScale(newScale)
    if (selectedKey) {
      const newValue = `${selectedKey} ${newScale}`
      onChange?.(newValue)
    }
  }

  const handleKeyChange = (newKey: string) => {
    const [keyPart] = newKey.split(' ')
    setSelectedKey(keyPart)
    const newValue = `${keyPart} ${scale}`
    onChange?.(newValue)
  }

  const keyOptions = MUSICAL_KEYS.map((k) => ({
    label: k,
    value: k
  }))

  return (
    <ListSelectionScreen
      {...other}
      header={
        <SegmentedControl
          options={[
            { key: 'Major', text: messages.major },
            { key: 'Minor', text: messages.minor }
          ]}
          selected={scale}
          onSelectOption={handleScaleChange}
          fullWidth
          equalWidth
        />
      }
      disableSearch
      data={keyOptions}
      value={selectedKey}
      onChange={handleKeyChange}
      clearable={Boolean(selectedKey && scale)}
    />
  )
}

export const KeyFilter = () => {
  const [key, setKey] = useSearchFilter('key')

  const getLabel = () => {
    if (!key) return messages.key
    return key
  }

  return (
    <FilterButton
      label={getLabel()}
      value={key}
      onChange={setKey}
      options={keyOptions}
      size='small'
      screen={FilterKeyScreen}
    />
  )
}

export const IsPremiumFilter = () => {
  const [isPremium, setIsPremium] = useSearchFilter('isPremium')

  return (
    <FilterButton
      label={messages.isPremium}
      value={isPremium?.toString()}
      onPress={() => setIsPremium(isPremium ? undefined : true)}
      size='small'
    />
  )
}

export const IsVerifiedFilter = () => {
  const [isVerified, setIsVerified] = useSearchFilter('isVerified')

  return (
    <FilterButton
      label={messages.isVerified}
      value={isVerified?.toString()}
      onPress={() => {
        setIsVerified(isVerified ? undefined : true)
      }}
      size='small'
    />
  )
}

export const HasDownloadsFilter = () => {
  const [hasDownloads, setHasDownloads] = useSearchFilter('hasDownloads')

  return (
    <FilterButton
      label={messages.hasDownloads}
      value={hasDownloads?.toString()}
      onPress={() => {
        setHasDownloads(hasDownloads ? undefined : true)
      }}
      size='small'
    />
  )
}
