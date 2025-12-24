import { ReactElement, useCallback, useState } from 'react'

import {
  GENRES,
  MUSICAL_KEYS,
  convertGenreLabelToValue
} from '@audius/common/utils'
import {
  Flex,
  SegmentedControl,
  Divider,
  Box,
  FilterButton
} from '@audius/harmony'
import { Mood } from '@audius/sdk'
import { useSearchParams } from 'react-router'

import { MOODS } from 'utils/Moods'

import { BpmFilter } from './BpmFilter'
import { useUpdateSearchParams } from './hooks'
import { Filter } from './types'

const messages = {
  genre: 'Genre',
  genreFilterLabel: 'Search Genre',
  mood: 'Mood',
  moodFilterLabel: 'Search Mood',
  key: 'Key',
  isPremium: 'Premium',
  isVerified: 'Verified',
  hasDownloads: 'Downloads Available'
}

const GenreFilter = () => {
  const [urlSearchParams] = useSearchParams()
  const genre = urlSearchParams.get('genre')
  const updateSearchParams = useUpdateSearchParams('genre')

  return (
    <FilterButton
      label={messages.genre}
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        maxHeight: 400
      }}
      value={genre}
      onChange={updateSearchParams}
      options={GENRES.map((genre) => ({
        label: genre,
        value: convertGenreLabelToValue(genre)
      }))}
      showFilterInput
      filterInputProps={{ label: messages.genreFilterLabel }}
    />
  )
}

const MoodFilter = () => {
  const [urlSearchParams] = useSearchParams()
  const mood = urlSearchParams.get('mood')
  const updateSearchParams = useUpdateSearchParams('mood')
  const sortedKeys = Object.keys(MOODS).sort() as Mood[]

  const moodCss = {
    '& .emoji': {
      marginBottom: 0
    }
  }
  const moodLabelCss = {
    '& .emoji': {
      marginBottom: 0,
      height: 16,
      width: 16
    }
  }

  const moodOptions = sortedKeys.map((mood) => ({
    label: MOODS[mood].label,
    value: MOODS[mood].value,
    leadingElement: <Box css={moodCss}>{MOODS[mood].icon}</Box>,
    labelLeadingElement: <Flex css={moodLabelCss}>{MOODS[mood].icon}</Flex>
  }))

  return (
    <FilterButton
      label={messages.mood}
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        maxHeight: 400
      }}
      value={mood}
      onChange={updateSearchParams}
      options={moodOptions}
      showFilterInput
      filterInputProps={{ label: messages.moodFilterLabel }}
    />
  )
}

const getValueFromKey = (key: string) =>
  // If the key is an enharmonic equivalent (e.g. C# and Db), use the flat as the value
  key.includes('/') ? key.split('/')[1] : key

const KeyFilter = () => {
  const [urlSearchParams] = useSearchParams()
  const key = urlSearchParams.get('key')
  const updateSearchParams = useUpdateSearchParams('key')
  const [scale, setScale] = useState(key?.split(' ')[1] ?? 'Major')
  const keyOptions = MUSICAL_KEYS.map((k) => ({
    label: k,
    value: `${getValueFromKey(k)} ${scale}`
  }))

  const renderLabel = useCallback(
    (label: string) => (label ? `${label} ${scale}` : messages.key),
    [scale]
  )

  return (
    <FilterButton
      value={key}
      renderLabel={renderLabel}
      label={messages.key}
      onChange={updateSearchParams}
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        width: 200
      }}
      options={keyOptions}
    >
      {({ options }) => (
        <Flex
          w='100%'
          gap='s'
          pv='s'
          direction='column'
          alignItems='flex-start'
          role='listbox'
        >
          <Box w='100%' ph='s'>
            <SegmentedControl
              fullWidth
              options={[
                { key: 'Major', text: 'Major' },
                { key: 'Minor', text: 'Minor' }
              ]}
              selected={scale}
              onSelectOption={setScale}
            />
          </Box>
          <Divider css={{ width: '100%' }} />
          <Flex direction='column' w='100%' ph='s'>
            {options}
          </Flex>
        </Flex>
      )}
    </FilterButton>
  )
}

const IsPremiumFilter = () => {
  const [urlSearchParams] = useSearchParams()
  const isPremium = urlSearchParams.get('isPremium') === 'true'
  const updateSearchParams = useUpdateSearchParams('isPremium')

  return (
    <FilterButton
      label={messages.isPremium}
      value={isPremium ? 'true' : null}
      onClick={() => updateSearchParams(isPremium ? '' : 'true')}
    />
  )
}

const HasDownloadsFilter = () => {
  const [urlSearchParams] = useSearchParams()
  const hasDownloads = urlSearchParams.get('hasDownloads') === 'true'
  const updateSearchParams = useUpdateSearchParams('hasDownloads')

  return (
    <FilterButton
      label={messages.hasDownloads}
      value={hasDownloads ? 'true' : null}
      onClick={() => {
        updateSearchParams(hasDownloads ? '' : 'true')
      }}
    />
  )
}

const IsVerifiedFilter = () => {
  const [urlSearchParams] = useSearchParams()
  const isVerified = urlSearchParams.get('isVerified') === 'true'
  const updateSearchParams = useUpdateSearchParams('isVerified')

  return (
    <FilterButton
      label={messages.isVerified}
      value={isVerified ? 'true' : null}
      onClick={() => {
        updateSearchParams(isVerified ? '' : 'true')
      }}
    />
  )
}

export const filters: Record<Filter, () => ReactElement> = {
  genre: GenreFilter,
  mood: MoodFilter,
  key: KeyFilter,
  bpm: BpmFilter,
  isPremium: IsPremiumFilter,
  hasDownloads: HasDownloadsFilter,
  isVerified: IsVerifiedFilter
}
