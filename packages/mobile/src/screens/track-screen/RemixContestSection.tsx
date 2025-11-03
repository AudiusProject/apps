import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'

import { useRemixContest, useTrack, useCurrentUserId } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import { css } from '@emotion/native'
import type { FlatList } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { TabView, SceneMap, TabBar, TabBarItem } from 'react-native-tab-view'
import type { Props as TabBarItemProps } from 'react-native-tab-view/lib/typescript/src/TabBarItem'
import { usePrevious } from 'react-use'

import { Flex, Paper, Text } from '@audius/harmony-native'
import { TabBody } from 'app/components/core/TabBody'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { RemixContestDetailsTab } from './RemixContestDetailsTab'
import { RemixContestPrizesTab } from './RemixContestPrizesTab'
import { RemixContestSubmissionsTab } from './RemixContestSubmissionsTab'
import { RemixContestWinnersTab } from './RemixContestWinnersTab'
import { UploadRemixFooter } from './UploadRemixFooter'

const TAB_FOOTER_HEIGHT = 64
const TAB_HEADER_HEIGHT = 48
const HEIGHT_OFFSET = 24

const messages = {
  submissions: 'Submissions',
  details: 'Details',
  prizes: 'Prizes',
  winners: 'Winners'
}

const useStyles = makeStyles(({ palette, typography, spacing }) => ({
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
  scrollRef?: RefObject<FlatList>
}

type Route = {
  key: string
  title: string
}

const AnimatedPaper = Animated.createAnimatedComponent(Paper)

/**
 * Section displaying remix contest information for a track
 */
export const RemixContestSection = ({
  trackId,
  scrollRef
}: RemixContestSectionProps) => {
  const { data: remixContest } = useRemixContest(trackId)
  const { textIconSubdued, neutral } = useThemeColors()
  const styles = useStyles()

  const { data: track } = useTrack(trackId)
  const { data: currentUserId } = useCurrentUserId()

  const isOwner = track?.owner_id === currentUserId
  const hasPrizeInfo = !!remixContest?.eventData?.prizeInfo
  const isContestEnded = dayjs(remixContest?.endDate).isBefore(dayjs())
  const hasWinners = (remixContest?.eventData?.winners?.length ?? 0) > 0

  const [index, setIndex] = useState(hasWinners ? (hasPrizeInfo ? 2 : 1) : 0)
  const [routes, setRoutes] = useState<Route[]>([])
  const [heights, setHeights] = useState({})
  const [firstRender, setFirstRender] = useState(true)
  const animatedHeight = useSharedValue(TAB_HEADER_HEIGHT)
  const currentHeight = heights[routes[index]?.key]
  const previousHeight = usePrevious(currentHeight)
  const hasHeightChanged = currentHeight !== previousHeight

  useEffect(() => {
    if (firstRender) {
      setFirstRender(false)
    }
  }, [firstRender])

  useEffect(() => {
    setRoutes([
      { key: 'details', title: messages.details },
      ...(hasPrizeInfo ? [{ key: 'prizes', title: messages.prizes }] : []),
      ...(hasWinners
        ? [{ key: 'winners', title: messages.winners }]
        : [{ key: 'submissions', title: messages.submissions }])
    ])
  }, [hasPrizeInfo, hasWinners])

  const handleLayout = (key: string) => (e: any) => {
    const height = e.nativeEvent.layout.height
    setHeights((prev) => {
      if (prev[key] !== height) {
        return { ...prev, [key]: height }
      }
      return prev
    })
  }

  useEffect(() => {
    if (hasHeightChanged) {
      const height =
        currentHeight + HEIGHT_OFFSET + (isOwner ? 0 : TAB_FOOTER_HEIGHT)
      animatedHeight.value = withTiming(height, {
        duration: 250
      })
    }
  }, [index, hasHeightChanged, currentHeight, animatedHeight, isOwner])

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value
  }))

  const renderScene = useMemo(
    () =>
      SceneMap({
        details: () => (
          <TabBody
            onLayout={handleLayout('details')}
            isVisible={index === 0 && !firstRender}
          >
            <RemixContestDetailsTab
              key='details'
              trackId={trackId}
              scrollRef={scrollRef}
            />
          </TabBody>
        ),
        prizes: () => (
          <TabBody
            onLayout={handleLayout('prizes')}
            isVisible={index === 1 && !firstRender}
          >
            <RemixContestPrizesTab key='prizes' trackId={trackId} />
          </TabBody>
        ),
        submissions: () => (
          <TabBody
            onLayout={handleLayout('submissions')}
            isVisible={index === 2 && !firstRender}
          >
            <RemixContestSubmissionsTab key='submissions' trackId={trackId} />
          </TabBody>
        ),
        winners: () => (
          <TabBody
            onLayout={handleLayout('winners')}
            isVisible={index === 2 && !firstRender}
          >
            <RemixContestWinnersTab key='winners' trackId={trackId} />
          </TabBody>
        )
      }),
    // Don't want handleLayout to re-trigger on index changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollRef]
  )

  const renderLabel = useCallback(
    ({ route, focused }: { route: Route; focused: boolean }) => {
      if (route.title === messages.submissions) {
        return (
          // Needed for small screens - otherwise the text is cut off
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

  const renderTabBarItem = useCallback(
    // Weird type issue with TabBarItem, need to pass key prop. Otherwise we get:
    // Warning: A props object containing a "key" prop is being spread into JSX:
    ({ route, key, ...props }: TabBarItemProps<Route> & { key: string }) => (
      <TabBarItem key={key} route={route} {...props} />
    ),
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
        renderTabBarItem={renderTabBarItem}
      />
    ),
    [
      styles.tabBar,
      styles.tabIndicator,
      neutral,
      textIconSubdued,
      renderLabel,
      renderTabBarItem
    ]
  )

  if (!remixContest) return null

  return (
    <AnimatedPaper
      backgroundColor='white'
      border='default'
      style={animatedStyle}
    >
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        swipeEnabled
      />
      {!isOwner && !isContestEnded ? (
        <UploadRemixFooter trackId={trackId} />
      ) : null}
    </AnimatedPaper>
  )
}
