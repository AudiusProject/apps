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
      mh='l'
      gap={isMobile ? 'l' : 'xl'}
      alignItems='center'
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
        justifyContent='center'
        alignItems='flex-start'
        wrap='wrap'
      >
        {Object.entries(MOODS)
          .sort()
          .map(([mood, moodInfo]) => (
            <Paper
              key={mood}
              pv='l'
              ph='xl'
              gap='s'
              borderRadius='m'
              border='default'
              backgroundColor='white'
              onClick={() => handleMoodPress(moodInfo.value)}
              css={{
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
