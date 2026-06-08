import {
  useEffect,
  useState,
  Suspense,
  ReactNode,
  useCallback,
  useMemo
} from 'react'

import {
  useArtistDashboardListenData,
  useCurrentAccountUser,
  useUserTrackDownloadCountTotal
} from '@audius/common/api'
import { themeSelectors } from '@audius/common/store'
import { dayjs, Dayjs, formatCount } from '@audius/common/utils'
import { encodeHashId } from '@audius/sdk'
import cn from 'classnames'
import { each } from 'lodash'
import { useSelector } from 'react-redux'

import { Header } from 'components/header/desktop/Header'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import Page from 'components/page/Page'
import lazyWithPreload from 'utils/lazyWithPreload'

import styles from './DashboardPage.module.css'
import { ArtistCard } from './components/ArtistCard'
import { ArtistContentSection } from './components/ArtistContentSection'
import { useFormattedTrackData } from './components/hooks'

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
  const [selectedTrack, setSelectedTrack] = useState(-1)

  const { data: accountUser } = useCurrentAccountUser()
  const account = accountUser
  const tracks = useFormattedTrackData()

  // Default the listen-data window to the last year. The chart calls
  // `onSetYearOption` to swap the window; we keep it as local state and the
  // tan-query hook below refetches automatically when start/end change.
  const [listenWindow, setListenWindow] = useState(() => {
    const now = dayjs()
    return {
      start: now.subtract(1, 'year').toISOString(),
      end: now.toISOString()
    }
  })

  // Preload the chart bundle once on mount.
  useEffect(() => {
    TotalPlaysChart.preload()
  }, [])

  const stats = useMemo(() => {
    if (!account) return undefined
    if (account.track_count) {
      return {
        tracks: account.track_count,
        albums: account.album_count,
        plays: tracks.reduce(
          (totalPlays, track) => totalPlays + (track.play_count || 0),
          0
        ),
        // downloads: merged in from useUserTrackDownloadCountTotal below
        reposts: account.repost_count,
        followers: account.follower_count
      } as Record<string, number>
    }
    return {
      playlists: account.playlist_count,
      following: account.followee_count,
      followers: account.follower_count
    } as Record<string, number>
  }, [account, tracks])

  const accountUserIdHash =
    accountUser?.user_id != null ? encodeHashId(accountUser.user_id) : null
  const { data: totalDownloads = 0 } = useUserTrackDownloadCountTotal(
    accountUserIdHash,
    { enabled: (account?.track_count ?? 0) > 0 }
  )
  const statsWithDownloads = useMemo(
    () =>
      account?.track_count != null && stats
        ? { ...stats, downloads: totalDownloads }
        : stats,
    [account?.track_count, stats, totalDownloads]
  )
  const { data: listenData, isPending: listenDataPending } =
    useArtistDashboardListenData(listenWindow)
  const theme = useSelector(getTheme)

  const header = <Header primary={messages.title} />

  const onSetYearOption = useCallback((year: string) => {
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
    setListenWindow({ start: start.toISOString(), end: end.toISOString() })
  }, [])

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
      {!account || !listenData || listenDataPending ? (
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
