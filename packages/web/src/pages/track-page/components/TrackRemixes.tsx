import { useCallback, useEffect } from 'react'

import { useTrack } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import type { ID, Track } from '@audius/common/models'
import {
  lineupSelectors,
  playerSelectors,
  queueSelectors,
  remixesPageLineupActions,
  remixesPageSelectors,
  trackPageLineupActions
} from '@audius/common/store'
import {
  Button,
  Flex,
  IconRemix,
  IconArrowRight,
  Text,
  Box
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'

import Lineup from 'components/lineup/Lineup'
import { LineupVariant } from 'components/lineup/types'
import { trackRemixesPage } from 'utils/route'

import { useTrackPageSize } from './useTrackPageSize'

const { makeGetCurrent } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors

const { tracksActions } = trackPageLineupActions
const { getLineup: getRemixesLineup } = remixesPageSelectors
const { makeGetLineupMetadatas } = lineupSelectors
const getRemixesTracksLineup = makeGetLineupMetadatas(getRemixesLineup)
const getCurrentQueueItem = makeGetCurrent()

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
  const dispatch = useDispatch()
  const remixesLineup = useSelector(getRemixesTracksLineup)
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const currentTrack = useCurrentTrack()
  const isPlaying = useSelector(getPlaying)
  const isBuffering = useSelector(getBuffering)
  const { data: track } = useTrack(trackId)
  const handlePlay = useCallback(
    (uid?: string) => {
      dispatch(tracksActions.play(uid))
    },
    [dispatch]
  )

  const handlePause = () => dispatch(tracksActions.pause())

  useEffect(() => {
    if (track) {
      dispatch(
        remixesPageLineupActions.fetchLineupMetadatas(0, 10, false, {
          trackId: track.track_id
        })
      )
    }

    return function cleanup() {
      dispatch(remixesPageLineupActions.reset())
    }
  }, [dispatch, track])

  if (!track) {
    return null
  }

  const {
    _remixes: remixes,
    _remixes_count: remixesCount,
    permalink,
    comments_disabled
  } = track as unknown as Track
  const isCommentingEnabled = !comments_disabled
  const remixTrackIds = remixes?.map(({ track_id }) => track_id) ?? null

  const lineupVariant =
    (isCommentingEnabled && isDesktop) || isMobile
      ? LineupVariant.SECTION
      : LineupVariant.CONDENSED

  if (!remixTrackIds || !remixTrackIds.length) {
    return null
  }

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
      <Lineup
        lineup={remixesLineup}
        actions={remixesPageLineupActions}
        count={Math.min(MAX_REMIXES_TO_DISPLAY, remixTrackIds.length)}
        variant={lineupVariant}
        selfLoad
        playingUid={currentQueueItem.uid}
        playingSource={currentQueueItem.source}
        playingTrackId={currentTrack?.track_id ?? null}
        playing={isPlaying}
        buffering={isBuffering}
        playTrack={handlePlay}
        pauseTrack={handlePause}
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
