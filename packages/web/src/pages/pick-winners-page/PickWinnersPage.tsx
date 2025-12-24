import { useState, useCallback, useEffect, useMemo } from 'react'

import {
  useCurrentUserId,
  useRemixContest,
  useRemixesLineup,
  useTrackByPermalink,
  useUpdateEvent
} from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { ID, Kind, Name } from '@audius/common/models'
import { toast } from '@audius/common/src/store/ui/toast/slice'
import {
  pickWinnersPageLineupActions,
  playerSelectors,
  queueActions,
  queueSelectors,
  QueueSource,
  useFinalizeWinnersConfirmationModal
} from '@audius/common/store'
import {
  Button,
  FilterButton,
  Flex,
  IconMinus,
  IconPlus,
  IconCheck,
  Paper,
  Text,
  useTheme,
  spacing,
  LoadingSpinner,
  Box
} from '@audius/harmony'
import { ClassNames } from '@emotion/react'
import { isEqual } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router'

import { Droppable } from 'components/dragndrop'
import { Header } from 'components/header/desktop/Header'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { Page } from 'components/page/Page'
import { TrackTile } from 'components/track/desktop/TrackTile'
import { TrackTileSize } from 'components/track/types'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { track, make } from 'services/analytics'
import { selectDragnDropState } from 'store/dragndrop/slice'
import { trackRemixesPage } from 'utils/route'

import { usePickWinnersPageParams } from './hooks'

const {
  clear,
  add,
  remove,
  reorder,
  play: playAction,
  pause: pauseAction
} = queueActions
const { getUid } = queueSelectors
const { getPlaying } = playerSelectors

const TRACK_TILE_HEIGHT = 144
const PICK_WINNERS_PAGE_SIZE = 10
const MAX_WINNERS = 5

export const PickWinnersPage = () => {
  const { data: currentUserId } = useCurrentUserId()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { color, cornerRadius, motion } = useTheme()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()
  const { data: originalTrack } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const { data: remixContest } = useRemixContest(originalTrack?.track_id)
  const { mutate: updateEvent } = useUpdateEvent()
  const playingUid = useSelector(getUid)
  const isPlayerPlaying = useSelector(getPlaying)
  const { dragging: isDragging, id: draggingId } =
    useSelector(selectDragnDropState)

  const updateSortParam = useUpdateSearchParams('sortMethod')
  const updateIsCosignParam = useUpdateSearchParams('isCosign')
  const { onOpen: openFinalizeWinnersConfirmationModal } =
    useFinalizeWinnersConfirmationModal()

  const { sortMethod, isCosign } = usePickWinnersPageParams()
  const {
    data,
    count,
    isFetching,
    isPending,
    isError,
    hasNextPage,
    play,
    pause,
    loadNextPage,
    isPlaying,
    lineup
  } = useRemixesLineup({
    trackId: originalTrack?.track_id,
    sortMethod,
    isCosign,
    isContestEntry: true
  })

  const [winners, setWinners] = useState<ID[]>([])
  const [initialWinners, setInitialWinners] = useState<ID[]>([])
  const canFinalize = useMemo(() => winners.length > 0, [winners])

  useEffect(() => {
    if (remixContest) {
      setWinners(remixContest.eventData.winners ?? [])
      setInitialWinners(remixContest.eventData.winners ?? [])
    }
  }, [remixContest])

  const handleFinalize = useCallback(() => {
    if (canFinalize && currentUserId && remixContest) {
      // Edit the remix contest with the new winners
      if (!isEqual(winners, remixContest.eventData.winners)) {
        updateEvent({
          eventId: remixContest.eventId,
          eventData: {
            ...remixContest.eventData,
            winners
          },
          userId: currentUserId,
          entityId: originalTrack?.track_id
        })

        if (originalTrack?.track_id) {
          track(
            make({
              eventName: Name.REMIX_CONTEST_PICK_WINNERS_FINALIZE,
              remixContestId: remixContest.eventId,
              trackId: originalTrack?.track_id
            })
          )
        }
      }

      // Navigate back to the track remixes page for the original track
      const pathname = trackRemixesPage(originalTrack?.permalink ?? '')
      const search = new URLSearchParams({ isContestEntry: 'true' }).toString()
      navigate(`${pathname}?${search}`)
    }
  }, [
    canFinalize,
    currentUserId,
    navigate,
    originalTrack?.permalink,
    originalTrack?.track_id,
    remixContest,
    updateEvent,
    winners
  ])

  const openConfirmationModal = useCallback(() => {
    openFinalizeWinnersConfirmationModal({
      isInitialSave: initialWinners.length === 0,
      confirmCallback: handleFinalize,
      cancelCallback: () => {}
    })
  }, [
    handleFinalize,
    initialWinners.length,
    openFinalizeWinnersConfirmationModal
  ])

  const handleBack = useCallback(() => {
    const pathname = trackRemixesPage(originalTrack?.permalink ?? '')
    const search = new URLSearchParams({ isContestEntry: 'true' }).toString()
    navigate(`${pathname}?${search}`)
  }, [navigate, originalTrack?.permalink])

  const pageHeader = (
    <Header
      primary={messages.pickWinnersTitle}
      onClickBack={handleBack}
      showBackButton
      rightDecorator={
        <Button
          size='small'
          disabled={!canFinalize}
          onClick={openConfirmationModal}
        >
          {messages.finalizeWinners}
        </Button>
      }
    />
  )

  const winnerTileUid = useCallback(
    (tileId: ID) =>
      `kind:${Kind.TRACKS}-id:${tileId}-source:${QueueSource.PICK_WINNERS_TRACKS}:${originalTrack?.track_id ?? 0}`,
    [originalTrack?.track_id]
  )

  const addIdToWinners = useCallback(
    (id: ID) => {
      if (winners.includes(id)) return
      if (winners.length >= MAX_WINNERS) {
        dispatch(toast({ content: messages.maxWinnersReached }))
        return
      }

      const uid = winnerTileUid(id)
      const isPlayingWinnersQueue = playingUid?.includes(
        QueueSource.PICK_WINNERS_TRACKS
      )

      if (isPlayingWinnersQueue) {
        dispatch(
          add({
            entries: [{ id, uid, source: QueueSource.PICK_WINNERS_TRACKS }],
            index: winners.length
          })
        )
      }

      setWinners([...winners, id])
    },
    [winners, winnerTileUid, playingUid, dispatch]
  )

  const removeIdFromWinners = useCallback(
    (id: ID) => {
      if (!winners.includes(id)) return
      setWinners(winners.filter((winnerId) => winnerId !== id))

      const uid = winnerTileUid(id)
      const isPlayingWinnersQueue = playingUid?.includes(
        QueueSource.PICK_WINNERS_TRACKS
      )

      if (isPlayingWinnersQueue) dispatch(remove({ uid }))
    },
    [winners, winnerTileUid, playingUid, dispatch]
  )

  const submissionHeading = useCallback((count: number | undefined) => {
    return `${messages.remixesTitle}${count !== undefined ? ` (${count})` : ''}`
  }, [])

  const TileButton = useCallback(
    ({ elementId, isAdd = true }: { elementId: ID; isAdd?: boolean }) => {
      const Icon = isAdd
        ? winners.includes(elementId)
          ? IconCheck
          : IconPlus
        : IconMinus

      const handleClick = () => {
        if (isAdd) {
          addIdToWinners(elementId)
        } else {
          removeIdFromWinners(elementId)
        }
      }

      return (
        <Paper
          p='xs'
          shadow='flat'
          borderRadius='circle'
          css={{
            position: 'absolute',
            top: '50%',
            left: 0,
            backgroundColor: color.background.white,
            transform: 'translate(-50%, -50%)',
            transition: motion.hover,
            '&:hover': {
              backgroundColor: color.neutral.n100,
              transform: 'translate(-50%, -50%) scale(1.1)'
            },
            '&:active': {
              backgroundColor: color.neutral.n150,
              transform: 'translate(-50%, -50%) scale(0.98)'
            }
          }}
          onClick={handleClick}
          aria-label='Add Winner'
        >
          <Icon fill={color.icon.default} />
        </Paper>
      )
    },
    [
      addIdToWinners,
      color.background.white,
      color.icon.default,
      color.neutral.n100,
      color.neutral.n150,
      motion.hover,
      removeIdFromWinners,
      winners
    ]
  )

  const tileAdornment = (elementId: ID, index: number) => {
    return <TileButton elementId={elementId} />
  }

  const handlePlay = useCallback(
    (winnerId: ID) => {
      const newEntries = winners.map((id) => ({
        id,
        uid: winnerTileUid(id),
        source: QueueSource.PICK_WINNERS_TRACKS
      }))

      const isPlayingWinnersQueue = playingUid?.includes(
        QueueSource.PICK_WINNERS_TRACKS
      )

      if (!isPlayingWinnersQueue) {
        dispatch(clear({}))
        dispatch(add({ entries: newEntries, index: 0 }))
      }
      dispatch(playAction({ uid: winnerTileUid(winnerId) }))
    },
    [dispatch, playingUid, winnerTileUid, winners]
  )

  const handlePause = useCallback(() => {
    dispatch(pauseAction({}))
  }, [dispatch])

  const renderWinnerTile = useCallback(
    (winnerId: ID, index: number) => {
      const uid = winnerTileUid(winnerId)
      const isTilePlaying = playingUid === uid && isPlayerPlaying

      const togglePlay = () => {
        if (isTilePlaying) {
          handlePause()
        } else {
          handlePlay(winnerId)
        }
      }

      const handleDrop = (trackId: ID) => {
        const originIdx = winners.indexOf(trackId)
        const placeIdx = winners.indexOf(winnerId)

        if (trackId === winnerId || originIdx === placeIdx + 1) return

        const offset = originIdx > placeIdx ? 1 : 0
        const winnersCopy = [...winners]
        const item = winnersCopy.splice(originIdx, 1)[0]
        winnersCopy.splice(placeIdx + offset, 0, item)
        setWinners(winnersCopy)
        dispatch(
          reorder({ orderedUids: winnersCopy.map((id) => winnerTileUid(id)) })
        )
      }

      return (
        <Box key={winnerId}>
          <ClassNames>
            {({ css }) => (
              <Droppable
                onDrop={handleDrop}
                acceptedKinds={['winner-tile']}
                hoverClassName='winnerTileHover'
                inactiveClassName='winnerTileInactive'
                className={css({
                  width: '100%',
                  position: 'relative',
                  // Drop Indicator
                  '::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 7,
                    left: 0,
                    right: 0,
                    height: 2,
                    borderRadius: cornerRadius.xs,
                    backgroundColor: color.background.accent,
                    transition: `opacity ${motion.expressive}`,
                    opacity: 0
                  },
                  '&.winnerTileInactive > *': {
                    opacity: 0.6,
                    cursor: 'not-allowed'
                  },
                  ...(isDragging && draggingId === winnerId
                    ? // Fade out tile when dragging
                      { '& > *': { opacity: 0.6 } }
                    : // Display drop indicator when hovering over tile
                      { '&.winnerTileHover::after': { opacity: 1 } })
                })}
              >
                <>
                  <TrackTile
                    key={winnerId}
                    dragKind='winner-tile'
                    uid={uid}
                    id={winnerId}
                    index={index}
                    order={index + 1}
                    ordered={false}
                    size={TrackTileSize.LARGE}
                    isLoading={false}
                    statSize='small'
                    isTrending={false}
                    isFeed={false}
                    togglePlay={togglePlay}
                    hasLoaded={() => {}}
                    onClick={() => {}}
                  />
                  <TileButton elementId={winnerId} isAdd={false} />
                </>
              </Droppable>
            )}
          </ClassNames>
        </Box>
      )
    },
    [
      winnerTileUid,
      playingUid,
      isPlayerPlaying,
      handlePause,
      handlePlay,
      winners,
      dispatch,
      cornerRadius.xs,
      color.background.accent,
      motion.expressive,
      isDragging,
      draggingId,
      TileButton
    ]
  )

  return (
    <Page title={messages.pickWinnersTitle} header={pageHeader}>
      {!remixContest ? (
        // TODO: Add loading skeletons here
        <Flex justifyContent='center' alignItems='center' p='2xl'>
          <LoadingSpinner css={{ width: 48, height: 48 }} />
        </Flex>
      ) : (
        <Flex column gap='3xl'>
          <Flex column gap='xl'>
            <Flex column gap='s'>
              <Text variant='heading'>{messages.winners}</Text>
              <Text variant='body'>{messages.winnersDescription}</Text>
            </Flex>
            {winners.length > 0 ? (
              <Flex column>
                {winners.map((winnerId, index) =>
                  renderWinnerTile(winnerId, index)
                )}
              </Flex>
            ) : (
              <Paper
                h={TRACK_TILE_HEIGHT}
                p='3xl'
                pv={spacing.unit14}
                mb='l'
                border='default'
                justifyContent='center'
                alignItems='center'
              >
                <Text variant='body' textAlign='center' css={{ maxWidth: 400 }}>
                  {messages.winnerPlaceholder}
                </Text>
              </Paper>
            )}
          </Flex>
          <Flex column gap='xl'>
            <Flex column gap='s'>
              <Flex justifyContent='space-between'>
                <Text variant='heading'>{submissionHeading(count)}</Text>
                <Flex gap='s' mb='xl'>
                  <FilterButton
                    label={messages.coSigned}
                    value={isCosign ? 'true' : null}
                    onClick={() => updateIsCosignParam(isCosign ? '' : 'true')}
                  />
                  <FilterButton
                    value={sortMethod ?? 'recent'}
                    variant='replaceLabel'
                    onChange={updateSortParam}
                    options={[
                      { label: 'Most Recent', value: 'recent' },
                      { label: 'Most Plays', value: 'plays' },
                      { label: 'Most Favorites', value: 'likes' }
                    ]}
                  />
                </Flex>
              </Flex>
              <TanQueryLineup
                data={data}
                isFetching={isFetching}
                isPending={isPending}
                isError={isError}
                hasNextPage={hasNextPage}
                play={play}
                pause={pause}
                loadNextPage={loadNextPage}
                isPlaying={isPlaying}
                lineup={lineup}
                pageSize={PICK_WINNERS_PAGE_SIZE}
                actions={pickWinnersPageLineupActions}
                elementAdornment={tileAdornment}
              />
            </Flex>
          </Flex>
        </Flex>
      )}
    </Page>
  )
}
