import { useEffect, useContext, useMemo } from 'react'

import {
  getTrackHistoryQueryKey,
  useCurrentUserId,
  useTrackHistory
} from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Button } from '@audius/harmony'
import { Link } from 'react-router'

import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'

import styles from './HistoryPage.module.css'

const { TRENDING_PAGE } = route

const messages = {
  header: 'LISTENING HISTORY',
  empty: {
    primary: 'You haven’t listened to any tracks yet.',
    secondary: 'Once you have, this is where you’ll find them!',
    cta: 'Start Listening'
  }
}

export type HistoryPageProps = {
  title: string
  description: string
}

const HISTORY_PAGE_SIZE = 50

export const HistoryPage = ({ title, description }: HistoryPageProps) => {
  const { data: currentUserId } = useCurrentUserId()

  const queryArgs = useMemo(() => ({ pageSize: HISTORY_PAGE_SIZE }), [])

  const {
    trackIds,
    isPending,
    isFetching,
    hasNextPage,
    loadNextPage,
    isInitialLoading,
    pageSize
  } = useTrackHistory(queryArgs)

  const querySource = useMemo(
    () => ({
      queryKey: [
        ...getTrackHistoryQueryKey(currentUserId, queryArgs)
      ] as unknown[]
    }),
    [currentUserId, queryArgs]
  )

  // Set Header Nav
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setCenter(messages.header)
    setRight(null)
  }, [setLeft, setCenter, setRight])

  const isEmpty =
    !isInitialLoading && !isPending && !isFetching && trackIds.length === 0

  return (
    <MobilePageContainer title={title} description={description}>
      {isEmpty ? (
        <div className={styles.emptyContainer}>
          <div className={styles.primary}>
            {messages.empty.primary}
            <i className='emoji face-with-monocle' />
          </div>
          <div className={styles.secondary}>{messages.empty.secondary}</div>
          <Button variant='primary'>
            <Link to={TRENDING_PAGE}>{messages.empty.cta}</Link>
          </Button>
        </div>
      ) : (
        <div className={styles.trackListContainer}>
          <TrackLineup
            trackIds={trackIds}
            source='HISTORY_TRACKS'
            querySource={querySource}
            isPending={isPending}
            isFetching={isFetching}
            hasNextPage={hasNextPage}
            loadNextPage={loadNextPage}
            pageSize={pageSize}
            variant={LineupVariant.MAIN}
          />
        </div>
      )}
    </MobilePageContainer>
  )
}
