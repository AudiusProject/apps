import {
  useState,
  Suspense,
  ReactNode,
  useEffect,
  useCallback,
  useMemo
} from 'react'

import {
  useCurrentAccountUser,
  useUserTrackDownloadCountTotal
} from '@audius/common/api'
import { Status } from '@audius/common/models'
import { themeSelectors } from '@audius/common/store'
import { dayjs, Dayjs, formatCount } from '@audius/common/utils'
import { encodeHashId } from '@audius/sdk'
import cn from 'classnames'
import { each } from 'lodash'
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

const statLabels: Record<string, string> = {
  tracks: 'Tracks',
  albums: 'Albums',
  plays: 'Plays',
  downloads: 'Downloads',
  reposts: 'Reposts',
  followers: 'Followers',
  playlists: 'Playlists',
  following: 'Following'
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
  const accountUserIdHash =
    accountUser?.user_id != null ? encodeHashId(accountUser.user_id) : null
  const { data: totalDownloads = 0 } = useUserTrackDownloadCountTotal(
    accountUserIdHash,
    { enabled: (account?.track_count ?? 0) > 0 }
  )
  const statsWithDownloads = useMemo(
    () =>
      account?.track_count != null
        ? { ...stats, downloads: totalDownloads }
        : stats,
    [account?.track_count, stats, totalDownloads]
  )
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
      let start: Dayjs
      let end: Dayjs
      if (year === messages.thisYear) {
        const now = dayjs()
        start = now.subtract(1, 'year')
        end = now
      } else {
        start = dayjs('01/01/' + year)
        end = start.add(1, 'year')
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
    each(statsWithDownloads, (stat, title) =>
      statTiles.push(
        <StatTile key={title} title={statLabels[title] ?? title} value={stat} />
      )
    )

    return <div className={styles.statsContainer}>{statTiles}</div>
  }, [account, statsWithDownloads])

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
