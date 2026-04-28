import { useCallback, useMemo, useRef } from 'react'

import {
  useCurrentUserId,
  useFavoriteTrack,
  useUnfavoriteTrack
} from '@audius/common/api'
import { Kind, Status, FavoriteSource, Track } from '@audius/common/models'
import {
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  LibraryPageTrack,
  CommonState
} from '@audius/common/store'
import {
  IconAlbum,
  IconNote,
  IconPlaylists,
  IconPause,
  IconPlay,
  Button,
  IconLibrary,
  useTheme
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import FilterInput from 'components/filter-input/FilterInput'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { dateSorter } from 'components/table'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { TracksTable, TracksTableColumn } from 'components/tracks-table'
import EmptyTable from 'components/tracks-table/EmptyTable'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import useTabs from 'hooks/useTabs/useTabs'
import { useMainContentRef } from 'pages/MainContentContext'
import { useLibraryPage } from 'pages/library-page/hooks/useLibraryPage'

import { emptyStateMessages } from '../emptyStateMessages'

import { AlbumsTabPage } from './AlbumsTabPage'
import { LibraryCategorySelectionMenu } from './LibraryCategorySelectionMenu'
import styles from './LibraryPage.module.css'
import { PlaylistsTabPage } from './PlaylistsTabPage'

const {
  getInitialFetchStatus,
  getCategory,
  getTrackSaves,
  getSelectedCategoryLocalTrackAdds
} = libraryPageSelectors

const INITIAL_TRACK_SKELETON_ROWS = 10

const messages = {
  libraryHeader: 'Library',
  filterPlaceholder: 'Filter...',
  emptyTracksBody: "Once you have, this is where you'll find them!",
  goToTrending: 'Go to Trending',
  title: 'Library',
  description: "View tracks that you've favorited"
}

const tableColumns: TracksTableColumn[] = [
  'trackName',
  'releaseDate',
  'savedDate',
  'length',
  'plays',
  'reposts',
  'overflowActions'
]

const LibraryPage = () => {
  const titleRowRef = useRef<HTMLDivElement>(null)
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const isCondensedHeader = useIsContainerNarrow(titleRowRef, 720)
  const shouldHideTabText = useIsContainerNarrow(tabContainerRef, 352)
  const { spacing } = useTheme()
  const {
    title,
    description,
    tracks: { status, entries },
    goToRoute,
    playing,
    currentTab,
    isQueued,
    fetchMoreTracks,
    getFilteredData,
    onPlay,
    onFilterChange,
    onSortChange,
    allTracksFetched,
    hasReachedEnd,
    filterText,
    onChangeTab,
    onClickRow,
    onClickRepost,
    onSortTracks
  } = useLibraryPage()
  const mainContentRef = useMainContentRef()
  const initFetch = useSelector(getInitialFetchStatus)
  const trackSaveIds = useSelector(getTrackSaves)
  const localTrackAdds = useSelector(getSelectedCategoryLocalTrackAdds)
  const expectedTrackCount = useMemo(
    () => trackSaveIds.length + Object.keys(localTrackAdds).length,
    [trackSaveIds, localTrackAdds]
  )
  const { data: currentUserId } = useCurrentUserId()

  const { mutate: favoriteTrack } = useFavoriteTrack()
  const { mutate: unfavoriteTrack } = useUnfavoriteTrack()
  const toggleSaveTrack = useCallback(
    (track: Track) => {
      if (track.has_current_user_saved) {
        unfavoriteTrack({
          trackId: track.track_id,
          source: FavoriteSource.LIBRARY_PAGE
        })
      } else {
        favoriteTrack({
          trackId: track.track_id,
          source: FavoriteSource.LIBRARY_PAGE
        })
      }
    },
    [favoriteTrack, unfavoriteTrack]
  )

  const emptyTracksHeader = useSelector((state: CommonState) => {
    const selectedCategory = getCategory(state, {
      currentTab: LibraryPageTabs.TRACKS
    })
    if (selectedCategory === LibraryCategory.All) {
      return emptyStateMessages.emptyTrackAllHeader
    } else if (selectedCategory === LibraryCategory.Favorite) {
      return emptyStateMessages.emptyTrackFavoritesHeader
    } else if (selectedCategory === LibraryCategory.Repost) {
      return emptyStateMessages.emptyTrackRepostsHeader
    } else {
      return emptyStateMessages.emptyTrackPurchasedHeader
    }
  })

  const getTracksTableData = (): [LibraryPageTrack[], number] => {
    let [data, activeIndex] = getFilteredData(entries)
    if (!hasReachedEnd) {
      data = data.concat(new Array(5).fill({ kind: Kind.EMPTY }))
    }
    return [data, activeIndex]
  }

  const isEmpty =
    entries.length === 0 ||
    !entries.some((entry: LibraryPageTrack) => Boolean(entry.track_id))
  const hasResolvedTrackRows = entries.some((entry: LibraryPageTrack) =>
    Boolean(entry.track_id)
  )
  const tracksLoading = status === Status.LOADING && isEmpty
  const showTrackTableSkeletons =
    (tracksLoading || initFetch) && !hasResolvedTrackRows
  const tracksTableShowsSpinner =
    (tracksLoading || initFetch) && !showTrackTableSkeletons
  const trackSkeletonRowCount =
    expectedTrackCount > 0
      ? Math.min(expectedTrackCount, INITIAL_TRACK_SKELETON_ROWS)
      : INITIAL_TRACK_SKELETON_ROWS
  const [dataSource, activeIndex]: [LibraryPageTrack[], number] =
    showTrackTableSkeletons
      ? [
          Array.from(
            {
              length: trackSkeletonRowCount
            },
            () => ({ kind: Kind.EMPTY })
          ) as unknown as LibraryPageTrack[],
          -1
        ]
      : status === Status.SUCCESS || entries.length
        ? getTracksTableData()
        : [[], -1]

  const queuedAndPlaying = playing && isQueued

  // Setup play button
  const playButtonActive =
    currentTab === LibraryPageTabs.TRACKS && !tracksLoading && !initFetch
  const playAllButton = (
    <div
      className={styles.playButtonContainer}
      style={{
        opacity: playButtonActive ? 1 : 0,
        pointerEvents: playButtonActive ? 'auto' : 'none'
      }}
    >
      <Button
        variant='primary'
        size='small'
        css={{ marginLeft: spacing.xl }}
        iconLeft={queuedAndPlaying ? IconPause : IconPlay}
        onClick={onPlay}
      >
        {queuedAndPlaying ? 'Pause' : 'Play'}
      </Button>
    </div>
  )

  const trackTableHeaderFilter = (
    <div className={styles.tableHeaderFilterContainer}>
      <FilterInput
        placeholder={messages.filterPlaceholder}
        onChange={onFilterChange}
        value={filterText}
      />
    </div>
  )

  const { tabs, body } = useTabs({
    isMobile: false,
    selectedTabLabel: currentTab,
    didChangeTabsFrom: (_, to) => {
      onChangeTab(to as LibraryPageTabs)
    },
    bodyClassName: styles.tabBody,
    elementClassName: styles.tabElement,
    pathname: '/library',
    routed: true,
    tabs: [
      {
        icon: <IconNote />,
        text: LibraryPageTabs.TRACKS,
        label: LibraryPageTabs.TRACKS,
        hideText: shouldHideTabText,
        to: 'tracks'
      },
      {
        icon: <IconAlbum />,
        text: LibraryPageTabs.ALBUMS,
        label: LibraryPageTabs.ALBUMS,
        hideText: shouldHideTabText,
        to: 'albums'
      },
      {
        icon: <IconPlaylists />,
        text: LibraryPageTabs.PLAYLISTS,
        label: LibraryPageTabs.PLAYLISTS,
        hideText: shouldHideTabText,
        to: 'playlists'
      }
    ],
    elements: [
      isEmpty && !tracksLoading ? (
        <EmptyTable
          primaryText={emptyTracksHeader}
          secondaryText={messages.emptyTracksBody}
          buttonLabel={messages.goToTrending}
          onClick={() => goToRoute('/trending')}
        />
      ) : (
        <TracksTable
          columns={tableColumns}
          data={dataSource}
          wrapperClassName={styles.libraryTrackTableWrapper}
          trackActionsHeader={trackTableHeaderFilter}
          defaultSorter={dateSorter('dateSaved')}
          fetchMore={fetchMoreTracks}
          isVirtualized
          key='favorites'
          loading={tracksTableShowsSpinner}
          onClickFavorite={toggleSaveTrack}
          onClickRepost={onClickRepost}
          onClickRow={onClickRow}
          onSort={allTracksFetched ? onSortTracks : onSortChange}
          playing={queuedAndPlaying}
          activeIndex={activeIndex}
          showArtistInTrackNameColumn
          responsiveColumns={RESPONSIVE_TABLE_POLICIES.libraryTracks}
          scrollRef={mainContentRef}
          useLocalSort={allTracksFetched}
          fetchBatchSize={50}
          userId={currentUserId}
        />
      ),
      <AlbumsTabPage key='albums' />,
      <PlaylistsTabPage key='playlists' />
    ]
  })

  const headerBottomBar = (
    <div ref={tabContainerRef} className={styles.headerBottomBarContainer}>
      {tabs}
    </div>
  )

  const header = (
    <Header
      titleRowRef={titleRowRef}
      icon={IconLibrary}
      primary={messages.libraryHeader}
      secondary={isEmpty ? null : playAllButton}
      rightDecorator={
        <LibraryCategorySelectionMenu
          currentTab={currentTab}
          mode={isCondensedHeader ? 'dropdown' : 'pills'}
        />
      }
      containerStyles={styles.libraryPageHeader}
      bottomBar={headerBottomBar}
    />
  )

  return (
    <Page
      title={title}
      description={description}
      contentClassName={styles.libraryPageWrapper}
      header={header}
    >
      <div className={styles.bodyWrapper}>{body}</div>
    </Page>
  )
}

export default LibraryPage
