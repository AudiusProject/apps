import { usePopularGenres } from '@audius/common/api'
import { TimeRange } from '@audius/common/models'
import {
  trendingPageActions,
  trendingPageSelectors
} from '@audius/common/store'
import {
  Genre,
  getTrendingGenreSuggestions,
  toTrendingGenreValue,
  route
} from '@audius/common/utils'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import { AppState } from 'store/types'
import { push } from 'utils/navigation'

import TrendingGenreSelectionPage from './components/TrendingGenreSelectionPage'

const { TRENDING_PAGE } = route
const { getTrendingGenre, getTrendingTimeRange } = trendingPageSelectors

type ConnectedTrendingGenreSelectionPageProps = {} & ReturnType<
  typeof mapStateToProps
> &
  ReturnType<typeof mapDispatchToProps>

// Mobile page for selecting a genre by which to filter trending.
// Genre change triggers a fresh tanquery fetch (query key includes the
// genre), so no explicit lineup reset is needed.
const ConnectedTrendingGenreSelectionPage = ({
  setTrendingGenre,
  genre,
  timeRange,
  setTrendingTimeRange,
  goToTrending
}: ConnectedTrendingGenreSelectionPageProps) => {
  const { data: genreSuggestions = [] } = usePopularGenres()

  const setTrimmedGenre = (genre: string | null) => {
    setTrendingGenre(toTrendingGenreValue(genre))
    setTrendingTimeRange(timeRange)
    goToTrending()
  }

  const allGenres = genreSuggestions.map((g) => g.label)
  const topGenres = getTrendingGenreSuggestions(genreSuggestions).map(
    (g) => g.label
  )

  return (
    <TrendingGenreSelectionPage
      genres={allGenres}
      topGenres={topGenres}
      didSelectGenre={setTrimmedGenre}
      selectedGenre={genre}
    />
  )
}

function mapStateToProps(state: AppState) {
  return {
    genre: getTrendingGenre(state),
    timeRange: getTrendingTimeRange(state)
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    setTrendingGenre: (genre: Genre | null) =>
      dispatch(trendingPageActions.setTrendingGenre(genre)),
    setTrendingTimeRange: (timeRange: TimeRange) =>
      dispatch(trendingPageActions.setTrendingTimeRange(timeRange)),
    goToTrending: () => dispatch(push(TRENDING_PAGE))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ConnectedTrendingGenreSelectionPage)
