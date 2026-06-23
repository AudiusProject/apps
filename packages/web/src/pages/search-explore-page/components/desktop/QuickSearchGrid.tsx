import React, { useCallback, useMemo, useRef } from 'react'

import { exploreMessages as messages } from '@audius/common/messages'
import { QUICK_SEARCH_PRESETS, QuickSearchPreset } from '@audius/common/utils'
import { Flex, Paper, Text, useTheme } from '@audius/harmony'

import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import { useIsMobile } from 'hooks/useIsMobile'
import { useSearchCategory } from 'pages/search-page/hooks'
import { MOODS } from 'utils/Moods'

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
        <Text variant='title' size='s' css={{ whiteSpace: 'nowrap' }}>
          {preset.genre}
        </Text>
      )
    }
    if (preset.mood) {
      parts.push(
        <Flex
          direction='row'
          gap='xs'
          alignItems='center'
          css={{ whiteSpace: 'nowrap' }}
        >
          {MOODS[preset.mood].icon}
          <Text variant='title' size='s' css={{ whiteSpace: 'nowrap' }}>
            {preset.mood}
          </Text>
        </Flex>
      )
    }
    if (preset.key) {
      parts.push(
        <Text variant='title' size='s' css={{ whiteSpace: 'nowrap' }}>
          {preset.key}
        </Text>
      )
    }
    if (preset.isVerified) {
      parts.push(
        <Text variant='title' size='s' css={{ whiteSpace: 'nowrap' }}>
          {messages.verified}
        </Text>
      )
    }
    if (preset.bpm) {
      parts.push(
        <Text variant='title' size='s' css={{ whiteSpace: 'nowrap' }}>
          {preset.bpm.description}
        </Text>
      )
    }
    return parts
  }, [preset])

  return (
    <Paper
      pv='l'
      ph='l'
      borderRadius='m'
      gap='s'
      border='default'
      backgroundColor='white'
      onClick={onClick}
      css={{
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        ':hover': {
          background: color.neutral.n25,
          border: `1px solid ${color.neutral.n150}`
        }
      }}
    >
      <Flex
        wrap='wrap'
        gap='s'
        alignItems='center'
        justifyContent='center'
        css={{ minWidth: 0 }}
      >
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            <Flex css={{ flexShrink: 0 }}>{part}</Flex>
            {idx < parts.length - 1 ? (
              <Text variant='title' size='s' css={{ whiteSpace: 'nowrap' }}>
                {'+'}
              </Text>
            ) : null}
          </React.Fragment>
        ))}
      </Flex>
    </Paper>
  )
}

export const QuickSearchGrid = () => {
  const isMobile = useIsMobile()
  const [, setCategory] = useSearchCategory()
  const gridRef = useRef<HTMLDivElement>(null)
  const useCompactGrid = useIsContainerNarrow(gridRef, 1240)
  const useSingleColumn = useIsContainerNarrow(gridRef, 700)
  const columnCount = useSingleColumn ? 1 : useCompactGrid ? 2 : 4

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
      ph='l'
      gap={isMobile ? 'l' : 'xl'}
      alignItems='center'
      w='100%'
      css={{ minWidth: 0, boxSizing: 'border-box' }}
    >
      <Text
        variant={isMobile ? 'title' : 'heading'}
        size={isMobile ? 'l' : 'm'}
      >
        {messages.quickSearch}
      </Text>
      <Flex
        ref={gridRef}
        gap={isMobile ? 'm' : 's'}
        alignItems='stretch'
        css={{
          width: '100%',
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`
        }}
      >
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
