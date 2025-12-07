import { useState, Suspense, ReactNode, useEffect, useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { themeSelectors } from '@audius/common/store'
import { formatCount } from '@audius/common/utils'
import cn from 'classnames'
import { each } from 'lodash'
import moment, { Moment } from 'moment'
import { useDispatch, useSelector } from 'react-redux'

import { Header } from 'components/header/desktop/Header'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import Page from 'components/page/Page'
import lazyWithPreload from 'utils/lazyWithPreload'

import styles from './DashboardPage.module.css'
import { ArtistCard } from './components/ArtistCard'
import { ArtistContentSection } from './components/ArtistContentSection'
import { TABLE_PAGE_SIZE } from './components/constants'
import {
  getDashboardListenData,
  getDashboardStatus,
  makeGetDashboard
} from './store/selectors'
import { fetch, reset, fetchListenData } from './store/slice'

const { getTheme } = themeSelectors

const TotalPlaysChart = lazyWithPreload(
  () => import('./components/TotalPlaysChart')
)

export const messages = {
  title: 'Artist Dashboard',
  description: 'View important stats like plays, reposts, and more.',
  thisYear: 'This Year'
}

const StatTile = (props: { title: string; value: any }) => {
  return (
    <div className={styles.statTileContainer}>
      <span className={styles.statValue}>{formatCount(props.value)}</span>
      <span className={styles.statTitle}>{props.title}</span>
    </div>
  )
}

export const DashboardPage = () => {
  const dispatch = useDispatch()
  const [selectedTrack, setSelectedTrack] = useState(-1)

  const { data: accountUser } = useCurrentAccountUser()
  const { account, tracks, stats } = useSelector(makeGetDashboard(accountUser))
  const listenData = useSelector(getDashboardListenData)
  const dashboardStatus = useSelector(getDashboardStatus)
  const theme = useSelector(getTheme)

  const header = <Header primary={messages.title} />

  useEffect(() => {
    dispatch(fetch({ offset: 0, limit: TABLE_PAGE_SIZE }))
    TotalPlaysChart.preload()
    return () => {
      dispatch(reset({}))
    }
  }, [dispatch])

  const onSetYearOption = useCallback(
    (year: string) => {
      let start: Moment
      let end: Moment
      if (year === messages.thisYear) {
        const now = moment()
        start = now.clone().subtract(1, 'years')
        end = now
      } else {
        start = moment('01/01/' + year)
        end = start.clone().add(1, 'year')
      }
      dispatch(
        fetchListenData({
          trackIds: tracks.map((t) => t.track_id),
          start: start.toISOString(),
          end: end.toISOString(),
          period: 'month'
        })
      )
    },
    [dispatch, tracks]
  )

  const renderChart = useCallback(() => {
    const trackCount = account?.track_count || 0
    if (!account || !(trackCount > 0) || !listenData) return null

    const chartData =
      selectedTrack === -1 ? listenData.all : listenData[selectedTrack]

    const chartTracks = tracks.map((track: any) => ({
      id: track.track_id,
      name: track.title
    }))

    return (
      <Suspense fallback={<div className={styles.chartFallback} />}>
        <TotalPlaysChart
          data={chartData}
          theme={theme}
          // @ts-ignore
          tracks={chartTracks}
          // @ts-ignore
          selectedTrack={selectedTrack}
          onSetYearOption={onSetYearOption}
          onSetTrackOption={setSelectedTrack}
          accountCreatedAt={account.created_at}
        />
      </Suspense>
    )
  }, [account, theme, listenData, onSetYearOption, selectedTrack, tracks])

  const renderStats = useCallback(() => {
    if (!account) return null

    const statTiles: ReactNode[] = []
    each(stats, (stat, title) =>
      statTiles.push(<StatTile key={title} title={title} value={stat} />)
    )

    return <div className={styles.statsContainer}>{statTiles}</div>
  }, [account, stats])

  return (
    <Page
      title={messages.title}
      description={messages.description}
      contentClassName={styles.pageContainer}
      header={header}
    >
      {!account || !listenData || dashboardStatus === Status.LOADING ? (
        <LoadingSpinner className={styles.spinner} />
      ) : (
        <>
          <div
            className={cn(styles.sectionContainer, styles.topSection, {
              [styles.isArtist]: account.track_count > 0
            })}
          >
            <ArtistCard
              userId={account.user_id}
              handle={account.handle}
              name={account.name}
            />
          </div>
          <div className={styles.sectionContainer}>
            {renderChart()}
            {renderStats()}
            <ArtistContentSection />
          </div>
        </>
      )}
    </Page>
  )
}
