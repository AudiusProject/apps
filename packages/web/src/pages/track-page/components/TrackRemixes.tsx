import { useMemo } from 'react'

import { useTrack } from '@audius/common/api'
import type { ID, Track } from '@audius/common/models'
import {
  Button,
  Flex,
  IconRemix,
  IconArrowRight,
  Text,
  Box
} from '@audius/harmony'
import { Link } from 'react-router'

import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import { trackRemixesPage } from 'utils/route'

import { useTrackPageSize } from './useTrackPageSize'

const messages = {
  viewAllRemixes: 'View All Remixes',
  remixes: 'Remixes Of This Track'
}

const MAX_REMIXES_TO_DISPLAY = 6

type TrackRemixesProrps = {
  trackId: ID
}

export const TrackRemixes = (props: TrackRemixesProrps) => {
  const { trackId } = props
  const { isDesktop, isMobile } = useTrackPageSize()
  const { data: track } = useTrack(trackId)

  const remixTrackIds = useMemo<ID[]>(() => {
    if (!track) return []
    const { _remixes: remixes } = track as unknown as Track
    return remixes?.map(({ track_id }) => track_id) ?? []
  }, [track])

  if (!track) {
    return null
  }

  const {
    _remixes_count: remixesCount,
    permalink,
    comments_disabled
  } = track as unknown as Track
  const isCommentingEnabled = !comments_disabled

  const lineupVariant =
    (isCommentingEnabled && isDesktop) || isMobile
      ? LineupVariant.SECTION
      : LineupVariant.CONDENSED

  if (!remixTrackIds.length) {
    return null
  }

  const visibleTrackIds = remixTrackIds.slice(0, MAX_REMIXES_TO_DISPLAY)

  return (
    <Flex
      direction='column'
      gap='s'
      w={!isDesktop || isCommentingEnabled ? '100%' : 720}
    >
      <Flex
        row
        alignItems='center'
        gap='s'
        justifyContent={!isCommentingEnabled ? 'center' : 'left'}
      >
        <IconRemix color='default' />
        <Text variant='title' size='l'>
          {messages.remixes}
        </Text>
      </Flex>
      <TrackLineup
        trackIds={visibleTrackIds}
        source='TRACK_PAGE_REMIXES'
        variant={lineupVariant}
        hasNextPage={false}
      />
      {remixesCount && remixesCount > MAX_REMIXES_TO_DISPLAY ? (
        <Box alignSelf='flex-start'>
          <Button iconRight={IconArrowRight} size='xs' asChild>
            <Link to={trackRemixesPage(permalink)}>
              {messages.viewAllRemixes}
            </Link>
          </Button>
        </Box>
      ) : null}
    </Flex>
  )
}
