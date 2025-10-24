import { useCallback, useRef, useState } from 'react'

import { useAccountStatus } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { Box, Divider, Flex, Scrollbar } from '@audius/harmony'
import { ResizeObserver } from '@juggle/resize-observer'
import useMeasure from 'react-use-measure'

import { DragAutoscroller } from 'components/drag-autoscroller/DragAutoscroller'
import { ProfileCompletionPanel } from 'components/profile-progress/ProfileCompletionPanel'

import { AccountDetails } from './AccountDetails'
import { LeftNavCTA } from './LeftNavCTA'
import { NavHeader } from './NavHeader'
import { NowPlayingArtworkTile } from './NowPlayingArtworkTile'
import { RouteNav } from './RouteNav'
import {
  FeedNavItem,
  TrendingNavItem,
  ExploreNavItem,
  LibraryNavItem,
  MessagesNavItem,
  WalletNavItem,
  RewardsNavItem,
  UploadNavItem,
  DevToolsNavItem,
  PlaylistsNavItem,
  ArtistCoinsNavItem
} from './nav-items'

export const LEFT_NAV_WIDTH = 240

type OwnProps = {
  isElectron: boolean
}

export const LeftNav = (props: OwnProps) => {
  const { isElectron } = props
  const { data: accountStatus } = useAccountStatus()
  const [navBodyContainerMeasureRef, navBodyContainerBoundaries] = useMeasure({
    polyfill: ResizeObserver
  })
  const scrollbarRef = useRef<HTMLElement | null>(null)
  const [dragScrollingDirection, setDragScrollingDirection] = useState<
    'up' | 'down' | undefined
  >(undefined)

  const handleChangeDragScrollingDirection = useCallback(
    (newDirection: 'up' | 'down' | undefined) => {
      setDragScrollingDirection(newDirection)
    },
    []
  )

  const updateScrollTopPosition = useCallback((difference: number) => {
    if (scrollbarRef != null && scrollbarRef.current !== null) {
      scrollbarRef.current.scrollTop =
        scrollbarRef.current.scrollTop + difference
    }
  }, [])

  const navLoaded =
    accountStatus === Status.SUCCESS || accountStatus === Status.ERROR

  return (
    <Flex
      backgroundColor='surface1'
      borderRight='default'
      as='nav'
      id='leftNav'
      direction='column'
      h='100%'
      w='100%'
      css={{
        userSelect: 'none',
        overflow: 'visible'
      }}
    >
      {isElectron ? <RouteNav /> : null}
      <NavHeader />

      <Flex
        direction='column'
        w='100%'
        flex={1}
        ref={navBodyContainerMeasureRef}
        css={{
          boxShadow:
            dragScrollingDirection === 'up'
              ? 'inset 0px 8px 5px -5px var(--tile-shadow-3)'
              : dragScrollingDirection === 'down'
                ? 'inset 0px -8px 5px -5px var(--tile-shadow-3)'
                : undefined,
          overflow: 'hidden',
          opacity: navLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out, box-shadow 0.2s ease'
        }}
      >
        <Scrollbar
          containerRef={(el: HTMLElement) => {
            scrollbarRef.current = el
          }}
        >
          <DragAutoscroller
            containerBoundaries={navBodyContainerBoundaries}
            updateScrollTopPosition={updateScrollTopPosition}
            onChangeDragScrollingDirection={handleChangeDragScrollingDirection}
          >
            <AccountDetails />
            <Flex
              direction='column'
              flex='1 1 auto'
              css={{ overflow: 'hidden' }}
            >
              <FeedNavItem />
              <TrendingNavItem />
              <ExploreNavItem />
              <LibraryNavItem />
              <MessagesNavItem />
              <WalletNavItem />
              <ArtistCoinsNavItem />
              <RewardsNavItem />
              <UploadNavItem />
              <DevToolsNavItem />
              <Box mv='s'>
                <Divider />
              </Box>
              <PlaylistsNavItem />
            </Flex>
          </DragAutoscroller>
        </Scrollbar>
      </Flex>
      {navLoaded ? (
        <Flex direction='column' alignItems='center'>
          <ProfileCompletionPanel />
          <LeftNavCTA />
          <NowPlayingArtworkTile />
        </Flex>
      ) : null}
    </Flex>
  )
}
