import { useEffect, useContext, useCallback } from 'react'

import {
  useUser,
  useTrack,
  useTrackByPermalink,
  useRemixContest,
  useRemixersCount,
  useRemixesLineup
} from '@audius/common/api'
import { remixMessages } from '@audius/common/messages'
import {
  remixesPageLineupActions,
  remixesPageActions,
  remixesPageSelectors
} from '@audius/common/store'
import { route, pluralize } from '@audius/common/utils'
import { IconRemix as IconRemixes } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router'

import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useSubPageHeader } from 'components/nav/mobile/NavContext'
import UserBadges from 'components/user-badges/UserBadges'
import { push as pushRoute } from 'utils/navigation'
import { fullTrackRemixesPage } from 'utils/route'

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

  // All hooks must be called before any early returns
  useSubPageHeader()
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
    trackId: track?.track_id
  })
  const { setHeader } = useContext(HeaderContext)

  const isRemixContest = !!remixContest
  const title = isRemixContest
    ? remixMessages.submissionsTitle
    : remixMessages.remixesTitle

  useEffect(() => {
    if (track && user) {
      setHeader(
        <>
          <Header
            className={styles.header}
            title={
              <>
                <IconRemixes className={styles.iconRemix} color='heading' />
                <span>{title}</span>
              </>
            }
          />
        </>
      )
    }
  }, [setHeader, title, track, user, goToArtistPage, goToTrackPage])

  if (!track || !user) {
    return null
  }

  return (
    <MobilePageContainer
      title={title}
      description={messages.getDescription(track.title, user.name)}
      canonicalUrl={fullTrackRemixesPage(track.permalink)}
      containerClassName={styles.container}
    >
      <div className={styles.tracksContainer}>
        <div className={styles.subHeader}>
          {`${count || ''} ${pluralize(
            messages.remixes,
            count,
            'es',
            !count
          )} ${messages.of}`}
          <div className={styles.track}>
            <div className={styles.link} onClick={goToTrackPage}>
              {track.title}
            </div>
            {messages.by}
            <div className={styles.link} onClick={goToArtistPage}>
              {user.name}
              <UserBadges
                userId={user.user_id}
                size='3xs'
                className={styles.iconVerified}
              />
            </div>
          </div>
        </div>
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
      </div>
    </MobilePageContainer>
  )
}

export default RemixesPage
