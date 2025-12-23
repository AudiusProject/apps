import { useEffect, useCallback, useRef } from 'react'

import {
  useUser,
  useTrack,
  useTrackByPermalink,
  useRemixContest,
  useRemixersCount,
  useRemixesLineup
} from '@audius/common/api'
import { remixMessages } from '@audius/common/messages'
import { Track, User, ID } from '@audius/common/models'
import {
  remixesPageLineupActions,
  remixesPageActions,
  remixesPageSelectors,
  queueSelectors
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { pluralize } from '@audius/common/utils'
import { IconRemix, Text } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import { Header } from 'components/header/desktop/Header'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { TrackLink } from 'components/link/TrackLink'
import { UserLink } from 'components/link/UserLink'
import Page from 'components/page/Page'
import { push as pushRoute } from 'utils/navigation'
import { fullTrackRemixesPage } from 'utils/route'
import { withNullGuard } from 'utils/withNullGuard'

import styles from './RemixesPage.module.css'

const { profilePage } = route
const { getTrackId } = remixesPageSelectors
const { fetchTrackSucceeded, reset } = remixesPageActions

const messages = {
  remixes: 'Remix',
  by: 'by',
  of: 'of',
  getDescription: (trackName: string, artistName: string) =>
    `${messages.remixes} ${messages.of} ${trackName} ${messages.by} ${artistName}`
}

type RemixesPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const RemixesPage = ({ containerRef }: RemixesPageProps) => {
  const dispatch = useDispatch()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()
  const originalTrackId = useSelector(getTrackId)
  const { data: originalTrack } = useTrack(originalTrackId)
  const { data: remixContest } = useRemixContest(originalTrackId)
  const { data: count = null } = useRemixersCount({ trackId: originalTrackId })

  const { data: originalTrackByPermalink } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const track = originalTrackByPermalink ?? originalTrack
  const { data: user } = useUser(track?.owner_id)
  const trackId = track?.track_id

  useEffect(() => {
    if (trackId) {
      dispatch(fetchTrackSucceeded({ trackId }))
    }
  }, [dispatch, trackId])

  useEffect(() => {
    return function cleanup() {
      dispatch(reset())
      dispatch(remixesPageLineupActions.reset())
    }
  }, [dispatch])

  const goToTrackPage = useCallback(() => {
    if (user && track) {
      dispatch(pushRoute(track.permalink))
    }
  }, [dispatch, track, user])

  const goToArtistPage = useCallback(() => {
    if (user) {
      dispatch(pushRoute(profilePage(user?.handle)))
    }
  }, [dispatch, user])

  if (!track || !user) {
    return null
  }

  const isRemixContest = !!remixContest
  const title = isRemixContest
    ? remixMessages.submissionsTitle
    : remixMessages.remixesTitle

  const {
    data,
    isFetching,
    isPending,
    isError,
    hasNextPage,
    play,
    pause,
    loadNextPage,
    isPlaying,
    lineup,
    pageSize
  } = useRemixesLineup({
    trackId: track.track_id
  })

  const renderHeader = () => (
    <Header
      icon={IconRemix}
      primary={title}
      secondary={
        <Text variant='title' size='l' strength='weak'>
          {count} {pluralize(messages.remixes, count, 'es', !count)}{' '}
          {messages.of}{' '}
          <TrackLink trackId={track.track_id} variant='secondary' />{' '}
          {messages.by} <UserLink userId={user.user_id} variant='secondary' />
        </Text>
      }
      containerStyles={styles.header}
    />
  )

  return (
    <Page
      title={title}
      description={messages.getDescription(track.title, user.name)}
      canonicalUrl={fullTrackRemixesPage(track.permalink)}
      header={renderHeader()}
    >
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
        actions={remixesPageLineupActions}
        pageSize={pageSize}
      />
    </Page>
  )
}

export default RemixesPage
