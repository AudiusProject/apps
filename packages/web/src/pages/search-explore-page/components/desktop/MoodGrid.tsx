import { useCallback } from 'react'

import { exploreMessages as messages } from '@audius/common/messages'
import { Flex, Paper, Text, useTheme } from '@audius/harmony'
import { Mood } from '@audius/sdk'

import { useIsMobile } from 'hooks/useIsMobile'
import { useSearchCategory } from 'pages/search-page/hooks'
import { labelByCategoryView } from 'pages/search-page/types'
import { MOODS } from 'utils/Moods'

export const MoodGrid = () => {
  const [category, setCategory] = useSearchCategory()
  const { color } = useTheme()

  const isMobile = useIsMobile()

  const handleMoodPress = useCallback(
    (mood: Mood) => {
      if (category === 'all') {
        setCategory('tracks', { mood })
      } else {
        setCategory(category, { mood })
      }
    },
    [category, setCategory]
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
        {messages.exploreByMood(
          category === 'all' ? undefined : labelByCategoryView[category]
        )}
      </Text>
      <Flex
        gap={isMobile ? 'm' : 's'}
        justifyContent='space-between'
        alignItems='stretch'
        wrap='wrap'
        css={{
          width: '100%',
          minWidth: 0
        }}
      >
        {Object.entries(MOODS)
          .sort()
          .map(([mood, moodInfo]) => (
            <Paper
              key={mood}
              flex={isMobile ? '1 1 132px' : '1 1 156px'}
              pv='l'
              ph='xl'
              gap='s'
              borderRadius='m'
              border='default'
              backgroundColor='white'
              onClick={() => handleMoodPress(moodInfo.value)}
              css={{
                minWidth: isMobile ? 132 : 156,
                justifyContent: 'center',
                alignItems: 'center',
                ':hover': {
                  background: color.neutral.n25,
                  border: `1px solid ${color.neutral.n150}`
                }
              }}
            >
              {moodInfo.icon}
              <Text variant='title' size='s'>
                {moodInfo.label}
              </Text>
            </Paper>
          ))}
      </Flex>
    </Flex>
  )
}
