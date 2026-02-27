import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'

import { useRemixContest, useTrack, useCurrentUserId } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import { css } from '@emotion/native'
import type { FlatList } from 'react-native'
import { ScrollView, useWindowDimensions } from 'react-native'
import {
  TabView,
  TabBar,
  type Route,
  type SceneRendererProps
} from 'react-native-tab-view'

import { Flex, Paper, Text } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { RemixContestDetailsTab } from './RemixContestDetailsTab'
import { RemixContestPrizesTab } from './RemixContestPrizesTab'
import { RemixContestSubmissionsTab } from './RemixContestSubmissionsTab'
import { RemixContestWinnersTab } from './RemixContestWinnersTab'
import { UploadRemixFooter } from './UploadRemixFooter'

const TAB_FOOTER_HEIGHT = 64
const CONTENT_HEIGHT = 300

const messages = {
  submissions: 'Submissions',
  details: 'Details',
  prizes: 'Prizes',
  winners: 'Winners'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  tabBar: {
    backgroundColor: 'transparent',
    height: spacing(10),
    marginHorizontal: spacing(4)
  },
  tabIndicator: {
    backgroundColor: palette.secondary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: 3,
    bottom: -3
  }
}))

export type RemixContestTabParamList = {
  Details: { trackId: ID }
  Prizes: { trackId: ID }
  Submissions: { trackId: ID }
}

type RemixContestSectionProps = {
  trackId: ID
  scrollRef?: RefObject<FlatList | null>
}

/**
 * Section displaying remix contest information for a track
 */
export const RemixContestSection = ({
  trackId,
  scrollRef
}: RemixContestSectionProps) => {
  const layout = useWindowDimensions()
  const { data: remixContest } = useRemixContest(trackId)
  const { textIconSubdued, neutral } = useThemeColors()
  const styles = useStyles()

  const { data: track } = useTrack(trackId)
  const { data: currentUserId } = useCurrentUserId()

  const isOwner = track?.owner_id === currentUserId
  const hasPrizeInfo = !!remixContest?.eventData?.prizeInfo
  const isContestEnded = dayjs(remixContest?.endDate).isBefore(dayjs())
  const hasWinners = (remixContest?.eventData?.winners?.length ?? 0) > 0

  const routes = useMemo<Route[]>(
    () => [
      { key: 'details', title: messages.details },
      ...(hasPrizeInfo ? [{ key: 'prizes', title: messages.prizes }] : []),
      ...(hasWinners
        ? [{ key: 'winners', title: messages.winners }]
        : [{ key: 'submissions', title: messages.submissions }])
    ],
    [hasPrizeInfo, hasWinners]
  )

  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (index >= routes.length && routes.length > 0) {
      setIndex(routes.length - 1)
    }
  }, [index, routes.length])

  const renderScene = useCallback(
    ({ route }: SceneRendererProps & { route: Route }) => {
      let content: React.ReactNode
      switch (route.key) {
        case 'details':
          content = (
            <RemixContestDetailsTab trackId={trackId} scrollRef={scrollRef} />
          )
          break
        case 'prizes':
          content = <RemixContestPrizesTab trackId={trackId} />
          break
        case 'submissions':
          content = <RemixContestSubmissionsTab trackId={trackId} />
          break
        case 'winners':
          content = <RemixContestWinnersTab trackId={trackId} />
          break
        default:
          content = null
      }
      return content ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {content}
        </ScrollView>
      ) : null
    },
    [trackId, scrollRef]
  )

  const renderLabel = useCallback(
    ({ route, focused }: { route: Route; focused: boolean }) => {
      if (route.title === messages.submissions) {
        return (
          <Flex style={css({ minWidth: 100 })}>
            <Text
              variant='body'
              strength='strong'
              color={focused ? 'default' : 'subdued'}
            >
              {route.title}
            </Text>
          </Flex>
        )
      }
      return (
        <Text
          variant='body'
          strength='strong'
          color={focused ? 'default' : 'subdued'}
        >
          {route.title}
        </Text>
      )
    },
    []
  )

  const renderTabBar = useCallback(
    (props: any) => (
      <TabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.tabIndicator}
        activeColor={neutral}
        inactiveColor={textIconSubdued}
        pressColor='transparent'
        pressOpacity={0.7}
        renderLabel={renderLabel}
      />
    ),
    [styles.tabBar, styles.tabIndicator, neutral, textIconSubdued, renderLabel]
  )

  if (!remixContest) return null

  const footerHeight = !isOwner && !isContestEnded ? TAB_FOOTER_HEIGHT : 0

  return (
    <Paper
      backgroundColor='white'
      border='default'
      style={{ height: CONTENT_HEIGHT + footerHeight }}
    >
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        swipeEnabled
      />
      {!isOwner && !isContestEnded ? (
        <UploadRemixFooter trackId={trackId} />
      ) : null}
    </Paper>
  )
}
