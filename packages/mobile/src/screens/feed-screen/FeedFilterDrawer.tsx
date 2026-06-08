import { useCallback } from 'react'

import { useFeedFilter } from '@audius/common/api'
import { FeedFilter } from '@audius/common/models'
import { Pressable, View } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'
import { RadioButton, Text as CoreText } from 'app/components/core'
import { AppDrawer, useDrawerState } from 'app/components/drawer'
import { makeStyles } from 'app/styles'

export const FEED_FILTER_MODAL = 'FeedFilter' as const

const filterLabels: Record<FeedFilter, string> = {
  [FeedFilter.ALL]: 'All Posts',
  [FeedFilter.ORIGINAL]: 'Original Posts',
  [FeedFilter.REPOST]: 'Reposts'
}

const filterOptions: FeedFilter[] = [
  FeedFilter.ALL,
  FeedFilter.ORIGINAL,
  FeedFilter.REPOST
]

const messages = {
  title: 'Filter Feed',
  sectionTitle: 'Post Type',
  selected: 'Selected'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.neutralLight6
  },
  grabBarContainer: {
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
    alignItems: 'center'
  },
  content: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(6)
  },
  sectionTitle: {
    marginBottom: spacing(2)
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8
  }
}))

export const FeedFilterDrawer = () => {
  const styles = useStyles()
  const [currentFilter, setFeedFilter] = useFeedFilter()

  useDrawerState(FEED_FILTER_MODAL)

  const handleSelectFilter = useCallback(
    (filter: FeedFilter) => {
      setFeedFilter(filter)
    },
    [setFeedFilter]
  )

  const drawerHeader = useCallback(
    (_props: { onClose: () => void }) => (
      <Flex>
        <View style={[styles.grabBarContainer]}>
          <View style={[styles.grabBar]} />
        </View>
        <Flex ph='l' pb='l' pt='xs' justifyContent='center' alignItems='center'>
          <Text variant='title' size='l' textAlign='center'>
            {messages.title}
          </Text>
        </Flex>
      </Flex>
    ),
    [styles]
  )

  return (
    <AppDrawer
      modalName={FEED_FILTER_MODAL}
      drawerHeader={drawerHeader}
      isGestureSupported
    >
      <View style={styles.content}>
        <View style={styles.sectionTitle}>
          <CoreText fontSize='large' weight='demiBold'>
            {messages.sectionTitle}
          </CoreText>
        </View>
        {filterOptions.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => handleSelectFilter(filter)}
            style={styles.optionRow}
          >
            <Flex direction='row' alignItems='center' gap='m'>
              <RadioButton checked={currentFilter === filter} />
              <Text
                variant='body'
                size='l'
                color={currentFilter === filter ? 'accent' : 'default'}
              >
                {filterLabels[filter]}
              </Text>
            </Flex>
            {currentFilter === filter ? (
              <Text variant='body' size='s' color='accent'>
                {messages.selected}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </AppDrawer>
  )
}
