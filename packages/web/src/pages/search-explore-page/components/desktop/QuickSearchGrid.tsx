import React, { useCallback, useMemo } from 'react'

import { exploreMessages as messages } from '@audius/common/messages'
import {
  QUICK_SEARCH_PRESETS,
  QuickSearchPreset,
  getCanonicalName
} from '@audius/common/utils'
import { Flex, Paper, Text, useTheme } from '@audius/harmony'

import { useIsMobile } from 'hooks/useIsMobile'
import { useSearchCategory } from 'pages/search-page/hooks'
import { MOODS } from 'pages/search-page/moods'

const QuickSearchPresetButton = ({
  preset,
  onClick
}: {
  preset: QuickSearchPreset
  onClick: () => void
}) => {
  const { color } = useTheme()

  const parts = useMemo(() => {
    const parts: React.ReactNode[] = []
    if (preset.genre) {
      parts.push(
        <Text variant='title' size='s'>
          {getCanonicalName(preset.genre)}
        </Text>
      )
    }
    if (preset.mood) {
      parts.push(
        <Flex direction='row' gap='xs' h='100%'>
          {MOODS[preset.mood].icon}
          <Text variant='title' size='s'>
            {preset.mood}
          </Text>
        </Flex>
      )
    }
    if (preset.key) {
      parts.push(
        <Text variant='title' size='s'>
          {preset.key}
        </Text>
      )
    }
    if (preset.isVerified) {
      parts.push(
        <Text variant='title' size='s'>
          {messages.verified}
        </Text>
      )
    }
    if (preset.bpm) {
      parts.push(
        <Text variant='title' size='s'>
          {preset.bpm.description}
        </Text>
      )
    }
    return parts
  }, [preset])

  return (
    <Paper
      pv='l'
      ph='xl'
      borderRadius='m'
      gap='s'
      border='default'
      backgroundColor='white'
      onClick={onClick}
      css={{
        ':hover': {
          background: color.neutral.n25,
          border: `1px solid ${color.neutral.n150}`
        }
      }}
    >
      {parts.map((part, idx) => (
        <Flex
          gap='s'
          h='unit5'
          alignItems='center'
          justifyContent='center'
          key={idx}
        >
          {part}
          {idx < parts.length - 1 ? (
            <Text variant='title' size='s'>
              {'+'}
            </Text>
          ) : null}
        </Flex>
      ))}
    </Paper>
  )
}

export const QuickSearchGrid = () => {
  const isMobile = useIsMobile()
  const [, setCategory] = useSearchCategory()

  const handleClickPreset = useCallback(
    (preset: QuickSearchPreset) => {
      setCategory('tracks', {
        mood: preset.mood,
        genre: preset.genre,
        bpm: preset.bpm?.value,
        isVerified: preset.isVerified ? true : undefined,
        key: preset.key
      })
    },
    [setCategory]
  )

  return (
    <Flex
      direction='column'
      gap={isMobile ? 'l' : 'xl'}
      alignItems='center'
      mh='l'
    >
      <Text
        variant={isMobile ? 'title' : 'heading'}
        size={isMobile ? 'l' : 'm'}
      >
        {messages.quickSearch}
      </Text>
      <Flex gap='s' justifyContent='center' alignItems='flex-start' wrap='wrap'>
        {QUICK_SEARCH_PRESETS.map((preset, idx) => (
          <QuickSearchPresetButton
            key={idx}
            onClick={() => handleClickPreset(preset)}
            preset={preset}
          />
        ))}
      </Flex>
    </Flex>
  )
}
