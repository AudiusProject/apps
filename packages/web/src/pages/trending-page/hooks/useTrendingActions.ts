import { useCallback } from 'react'

import { trendingPageActions } from '@audius/common/store'
import { route, Genre } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { openSignOn } from 'common/store/pages/signon/actions'
import { push as pushRoute, replace as replaceRoute } from 'utils/navigation'

import { TRENDING_ACTIONS } from '../constants'
import { TrendingActionsReturn } from '../providerTypes'
import { callLineupAction } from '../utils'

const { TRENDING_GENRES } = route

/**
 * Hook that provides all trending page actions using modern useDispatch
 */
export const useTrendingActions = (): TrendingActionsReturn => {
  const dispatch = useDispatch()

  // Basic navigation actions
  const goToSignUp = useCallback(() => {
    dispatch(openSignOn(false))
  }, [dispatch])

  const goToGenreSelection = useCallback(() => {
    dispatch(pushRoute(TRENDING_GENRES))
  }, [dispatch])

  const replaceRouteCallback = useCallback(
    (route: { search: string }) => {
      dispatch(replaceRoute(route))
    },
    [dispatch]
  )

  // Trending state actions
  const setTrendingGenre = useCallback(
    (genre: string | null) => {
      dispatch(trendingPageActions.setTrendingGenre(genre as Genre | null))
    },
    [dispatch]
  )

  const setTrendingTimeRange = useCallback(
    (timeRange: any) => {
      dispatch(trendingPageActions.setTrendingTimeRange(timeRange))
    },
    [dispatch]
  )

  // Trending lineup actions
  const refreshTrendingInView = useCallback(
    (overwrite: boolean) => {
      dispatch(TRENDING_ACTIONS.refreshInView(overwrite))
    },
    [dispatch]
  )

  const playTrendingTrack = useCallback(
    (uid: any) => {
      dispatch(TRENDING_ACTIONS.play(uid))
    },
    [dispatch]
  )

  const pauseTrendingTrack = useCallback(() => {
    dispatch(TRENDING_ACTIONS.pause())
  }, [dispatch])

  const resetTrendingLineup = useCallback(() => {
    dispatch(TRENDING_ACTIONS.reset())
  }, [dispatch])

  // Dynamic action factories for different time ranges
  const makeRefreshTrendingInView = useCallback(
    (timeRange: any) => {
      return (overwrite: boolean) => {
        dispatch(callLineupAction(timeRange, 'refreshInView', overwrite))
      }
    },
    [dispatch]
  )

  const makeLoadMore = useCallback(
    (timeRange: any) => {
      return (offset: number, limit: number, overwrite: boolean) => {
        dispatch(
          callLineupAction(
            timeRange,
            'fetchLineupMetadatas',
            offset,
            limit,
            overwrite
          )
        )
      }
    },
    [dispatch]
  )

  const makePlayTrack = useCallback(
    (timeRange: any) => {
      return (uid: any) => {
        dispatch(callLineupAction(timeRange, 'play', uid))
      }
    },
    [dispatch]
  )

  const makePauseTrack = useCallback(
    (timeRange: any) => {
      return () => {
        dispatch(callLineupAction(timeRange, 'pause'))
      }
    },
    [dispatch]
  )

  const makeSetInView = useCallback(
    (timeRange: any) => {
      return (inView: boolean) => {
        dispatch(callLineupAction(timeRange, 'setInView', inView))
      }
    },
    [dispatch]
  )

  const makeResetTrending = useCallback(
    (timeRange: any) => {
      return () => {
        dispatch(callLineupAction(timeRange, 'reset'))
      }
    },
    [dispatch]
  )

  return {
    goToSignUp,
    goToGenreSelection,
    setTrendingGenre,
    setTrendingTimeRange,
    makeRefreshTrendingInView,
    makeLoadMore,
    makePlayTrack,
    makePauseTrack,
    makeSetInView,
    makeResetTrending,
    playTrendingTrack,
    pauseTrendingTrack,
    refreshTrendingInView,
    resetTrendingLineup,
    replaceRoute: replaceRouteCallback
  }
}
