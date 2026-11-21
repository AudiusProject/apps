import { useEffect, useState } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { useSelector, useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { AppState } from 'store/types'
import { ServiceType } from 'types'
import { apiFetch, fetchWithTimeout } from 'utils/fetch'
import { weiAudToAud } from 'utils/numeric'

import { useAverageBlockTime, useEthBlockNumber } from '../protocol/hooks'

import { ELECTRONIC_SUB_GENRES } from './genres'
import {
  setApiCalls,
  setTotalStaked,
  setPlays,
  setTrailingApiCalls,
  Bucket,
  TimeSeriesRecord,
  CountRecord,
  setTopApps,
  setTrailingTopGenres,
  MetricError,
  setIndividualNodeUptime,
  setIndividualServiceApiCalls
} from './slice'

dayjs.extend(duration)

const MONTH_IN_MS = dayjs.duration({ months: 1 }).asMilliseconds()
const YEAR_IN_MS = dayjs.duration({ months: 12 }).asMilliseconds()
const WEEK_IN_MS = dayjs.duration({ weeks: 1 }).asMilliseconds()
const DAY_IN_MS = dayjs.duration({ days: 1 }).asMilliseconds()

const BUCKET_GRANULARITY_MAP = {
  [Bucket.ALL_TIME]: 'month',
  [Bucket.YEAR]: 'month',
  [Bucket.MONTH]: 'day',
  [Bucket.WEEK]: 'day',
  [Bucket.DAY]: 'hour'
}

const BUCKET_TO_BLOCK_COUNT_MAP = {
  [Bucket.ALL_TIME]: 12,
  [Bucket.YEAR]: 12,
  [Bucket.MONTH]: 30,
  [Bucket.WEEK]: 7,
  [Bucket.DAY]: 24
}

const BUCKET_TO_TEXT_FORMAT = {
  [Bucket.ALL_TIME]: 'All Time',
  [Bucket.YEAR]: 'This Year',
  [Bucket.MONTH]: 'This Month',
  [Bucket.WEEK]: 'This Week',
  [Bucket.DAY]: 'Today'
}

export const formatBucketText = (bucket: string) =>
  BUCKET_TO_TEXT_FORMAT[bucket as Bucket]

const getStartTime = (bucket: Bucket, clampDays: boolean = false) => {
  switch (bucket) {
    case Bucket.ALL_TIME:
      return dayjs('2020-07-01').startOf('hour').unix()
    case Bucket.YEAR:
      return dayjs().subtract(1, 'year').startOf('hour').unix()
    case Bucket.MONTH:
      return dayjs()
        .subtract(1, 'month')
        .startOf(clampDays ? 'day' : 'hour')
        .unix()
    case Bucket.WEEK:
      return dayjs()
        .subtract(1, 'week')
        .startOf(clampDays ? 'day' : 'hour')
        .unix()
    case Bucket.DAY:
      return dayjs().subtract(1, 'day').startOf('hour').unix()
  }
}

export const getApiCalls = (state: AppState, { bucket }: { bucket: Bucket }) =>
  state.cache.analytics.apiCalls ? state.cache.analytics.apiCalls[bucket] : null
export const getTotalStaked = (
  state: AppState,
  { bucket }: { bucket: Bucket }
) =>
  state.cache.analytics.totalStaked
    ? state.cache.analytics.totalStaked[bucket]
    : null
export const getPlays = (state: AppState, { bucket }: { bucket: Bucket }) =>
  state.cache.analytics.plays ? state.cache.analytics.plays[bucket] : null
export const getTrailingApiCalls = (
  state: AppState,
  { bucket }: { bucket: Bucket }
) =>
  state.cache.analytics.trailingApiCalls
    ? state.cache.analytics.trailingApiCalls[bucket]
    : null
export const getTrailingTopGenres = (
  state: AppState,
  { bucket }: { bucket: Bucket }
) =>
  state.cache.analytics.trailingTopGenres
    ? state.cache.analytics.trailingTopGenres[bucket]
    : null
export const getTopApps = (state: AppState, { bucket }: { bucket: Bucket }) =>
  state.cache.analytics.topApps ? state.cache.analytics.topApps[bucket] : null
export const getIndividualNodeUptime = (
  state: AppState,
  { node, bucket }: { node: string; bucket: Bucket }
) => state.cache.analytics.individualNodeUptime?.[node]?.[bucket] ?? null
export const getIndividualServiceApiCalls = (
  state: AppState,
  { node, bucket }: { node: string; bucket: Bucket }
) => state.cache.analytics.individualServiceApiCalls?.[node]?.[bucket] ?? null

async function fetchRoutesTimeSeries(bucket: Bucket) {
  let error = false
  let metric: TimeSeriesRecord[] = []
  try {
    const bucketSize = BUCKET_GRANULARITY_MAP[bucket]
    const { data } = await apiFetch(`v1/metrics/aggregates/routes/${bucket}`, {
      queryParams: { bucket_size: bucketSize }
    })
    metric = data
  } catch (e) {
    console.error(e)
    error = true
  }
  if (error) {
    return MetricError.ERROR
  }

  return metric
}

export function fetchApiCalls(
  bucket: Bucket
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, _, aud) => {
    const metric = await fetchRoutesTimeSeries(bucket)
    dispatch(setApiCalls({ metric, bucket }))
  }
}

async function fetchTimeSeries(
  route: string,
  bucket: Bucket,
  clampDays: boolean = true,
  node?: string
) {
  const startTime = getStartTime(bucket, clampDays)
  let error = false
  let metric: TimeSeriesRecord[] = []
  try {
    const bucketSize = BUCKET_GRANULARITY_MAP[bucket]
    let data
    let endpoint = `${node}/v1/metrics/${route}?bucket_size=${bucketSize}&start_time=${startTime}`
    if (route === 'routes') {
      endpoint = `${node}/v1/metrics/routes/${bucket}?bucket_size=${bucketSize}`
    }
    if (node) {
      data = (await fetchWithTimeout(endpoint)).data.slice(1)
      metric = data
    } else {
      const { data } = await apiFetch(`v1/metrics/${route}`, {
        queryParams: { bucket_size: bucketSize, start_time: startTime }
      })
      metric = data.reverse()
    }
  } catch (e) {
    console.error(e)
    error = true
  }
  if (error) {
    return MetricError.ERROR
  }

  return metric
}

async function fetchUptime(
  nodeType: ServiceType,
  node: string,
  bucket: Bucket
) {
  if (bucket !== Bucket.DAY) {
    return MetricError.ERROR
  }

  const endpoints =
    nodeType === ServiceType.DiscoveryProvider
      ? [
          `https://discoveryprovider.audius.co`,
          `https://discoveryprovider2.audius.co`,
          `https://discoveryprovider3.audius.co`
        ]
      : [
          `https://creatornode.audius.co`,
          `https://creatornode2.audius.co`,
          `https://creatornode3.audius.co`
        ]

  let highestUptimeRecord = { uptime_percentage: 0 }
  let error = false

  for (const endpoint of endpoints) {
    try {
      const metric = await fetchWithTimeout(
        `${endpoint}/d_api/uptime?host=${node}`
      )
      if (metric.uptime_percentage === 100) {
        return metric
      }
      if (metric.uptime_percentage >= highestUptimeRecord.uptime_percentage) {
        highestUptimeRecord = metric
      }
    } catch (e) {
      console.error(e)
      error = true
    }
  }

  if (error && highestUptimeRecord.uptime_percentage === 0) {
    return MetricError.ERROR
  }

  return highestUptimeRecord
}

export function fetchPlays(
  bucket: Bucket
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, _, aud) => {
    let metric = await fetchTimeSeries('plays', bucket, true)
    if (metric !== MetricError.ERROR) {
      metric = metric.filter(
        (m) => m.timestamp !== '1620345600' && m.timestamp !== '1620259200'
      )
    }
    dispatch(setPlays({ metric, bucket }))
  }
}

export function fetchIndividualNodeUptime(
  nodeType: ServiceType,
  node: string,
  bucket: Bucket
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch) => {
    const metric = await fetchUptime(nodeType, node, bucket)
    dispatch(setIndividualNodeUptime({ nodeType, node, metric, bucket }))
  }
}

export function fetchIndividualServiceRouteMetrics(
  node: string,
  bucket: Bucket
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch) => {
    const metric = await fetchTimeSeries('routes', bucket, true, node)
    dispatch(setIndividualServiceApiCalls({ node, metric, bucket }))
  }
}

export function fetchTotalStaked(
  bucket: Bucket,
  averageBlockTime: number,
  currentBlockNumber: number
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, _, aud) => {
    await aud.awaitSetup()
    let timeSliceMs: number
    switch (bucket) {
      case Bucket.ALL_TIME:
        timeSliceMs = YEAR_IN_MS
        break
      case Bucket.YEAR:
        timeSliceMs = YEAR_IN_MS
        break
      case Bucket.MONTH:
        timeSliceMs = MONTH_IN_MS
        break
      case Bucket.WEEK:
        timeSliceMs = WEEK_IN_MS
        break
      case Bucket.DAY:
        timeSliceMs = DAY_IN_MS
        break
    }

    const points = BUCKET_TO_BLOCK_COUNT_MAP[bucket]
    const ts = new Date().getTime()
    const timestamps: number[] = [ts]
    for (let i = 1; i < points; ++i) {
      const time = ts - i * (timeSliceMs / points)
      if (time > 1658573677000 && time < 1658884462050) {
        continue
      }
      timestamps.push(time)
    }

    const blocks = await Promise.all(
      timestamps.map(async (ts) =>
        aud.getBlockNearTimestamp(averageBlockTime, currentBlockNumber, ts)
      )
    )

    const staked = await Promise.all(
      blocks.map(async (block) => aud.Staking.totalStakedAt(block.number))
    )

    const metric = staked
      .map((stake, i) => ({
        count: weiAudToAud(stake),
        timestamp: Math.round(timestamps[i] / 1000).toString()
      }))
      .reverse()

    dispatch(setTotalStaked({ metric, bucket }))
  }
}

const getTrailingAPI = async (timeRange: 'year' | 'month' | 'week') => {
  const { data } = await apiFetch(
    `v1/metrics/aggregates/routes/trailing/${timeRange}`
  )
  return {
    total_count: data?.total_count ?? 0,
    unique_count: data?.unique_count ?? 0,
    summed_unique_count: data?.summed_unique_count ?? 0
  } as CountRecord
}

export function fetchTrailingApiCalls(
  bucket: Bucket.MONTH | Bucket.WEEK | Bucket.YEAR
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, _, aud) => {
    let error = false
    let metric = {}
    try {
      metric = await getTrailingAPI(bucket)
    } catch (e) {
      console.error(e)
      error = true
    }
    if (error) {
      dispatch(setTrailingApiCalls({ metric: MetricError.ERROR, bucket }))
      return
    }
    dispatch(setTrailingApiCalls({ metric, bucket }))
  }
}

const getTrailingTopApps = async (bucket: Bucket, limit: number) => {
  const { data } = await apiFetch(`v1/metrics/aggregates/apps/${bucket}`, {
    queryParams: { limit }
  })
  return data as { name: string; count: number }[]
}

export function fetchTopApps(
  bucket: Bucket,
  limit: number = 500
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch) => {
    let error = false
    let metric: CountRecord = {}
    try {
      const res = await getTrailingTopApps(bucket, limit)
      if (res) {
        const apps: CountRecord = {}
        res.forEach((app: { name: string; count: number }) => {
          const name =
            app.name === 'unknown' ? 'Audius Apps + Unknown' : app.name
          if (app.count > 0) {
            apps[name] = app.count
          }
        })
        metric = apps
      }
    } catch (e) {
      console.error(e)
      error = true
    }

    if (error) {
      dispatch(setTopApps({ metric: MetricError.ERROR, bucket }))
      return
    }

    const keys = Object.keys(metric)
    keys.sort((a, b) => {
      return metric[b] - metric[a]
    })
    const m = keys.slice(0, limit).reduce((acc, cur) => {
      acc[cur] = metric[cur]
      return acc
    }, {} as CountRecord)

    dispatch(setTopApps({ metric: m, bucket }))
  }
}

export function fetchTrailingTopGenres(
  bucket: Bucket
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch) => {
    try {
      const startTime = getStartTime(bucket)
      const { data } = await apiFetch('v1/metrics/genres', {
        queryParams: { start_time: startTime }
      })

      const agg: CountRecord = {
        Electronic: 0
      }
      data.forEach((genre: { name: string; count: number }) => {
        const name = genre.name
        if (ELECTRONIC_SUB_GENRES.has(name)) {
          agg.Electronic += genre.count
        } else {
          agg[name] = genre.count
        }
      })
      const metric: CountRecord = {}
      Object.keys(agg)
        .map((m) => [m, agg[m]])
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .forEach((m) => {
          metric[m[0] as string] = m[1] as number
        })

      dispatch(setTrailingTopGenres({ metric, bucket }))
    } catch (e) {
      dispatch(setTrailingTopGenres({ metric: MetricError.ERROR, bucket }))
      console.error(e)
    }
  }
}

export const useApiCalls = (bucket: Bucket) => {
  const [doOnce, setDoOnce] = useState<Bucket | null>(null)
  const apiCalls = useSelector((state) =>
    getApiCalls(state as AppState, { bucket })
  )
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (doOnce !== bucket && (apiCalls === null || apiCalls === undefined)) {
      setDoOnce(bucket)
      dispatch(fetchApiCalls(bucket))
    }
  }, [dispatch, apiCalls, bucket, doOnce])

  useEffect(() => {
    if (apiCalls) {
      setDoOnce(null)
    }
  }, [apiCalls, setDoOnce])

  return { apiCalls }
}

export const useIndividualNodeUptime = (
  nodeType: ServiceType,
  node: string,
  bucket: Bucket
) => {
  const [doOnce, setDoOnce] = useState<Bucket | null>(null)
  const uptime = useSelector((state) =>
    getIndividualNodeUptime(state as AppState, { node, bucket })
  )
  const dispatch = useDispatch()
  useEffect(() => {
    if (doOnce !== bucket && (uptime === null || uptime === undefined)) {
      setDoOnce(bucket)
      dispatch(fetchIndividualNodeUptime(nodeType, node, bucket))
    }
  }, [dispatch, uptime, bucket, node, doOnce, nodeType])

  useEffect(() => {
    if (uptime) {
      setDoOnce(null)
    }
  }, [uptime, setDoOnce])

  return { uptime }
}

export const useIndividualServiceApiCalls = (node: string, bucket: Bucket) => {
  const [doOnce, setDoOnce] = useState<Bucket | null>(null)
  const apiCalls = useSelector((state) =>
    getIndividualServiceApiCalls(state as AppState, { node, bucket })
  )
  const dispatch = useDispatch()
  useEffect(() => {
    if (doOnce !== bucket && (apiCalls === null || apiCalls === undefined)) {
      setDoOnce(bucket)
      dispatch(fetchIndividualServiceRouteMetrics(node, bucket))
    }
  }, [dispatch, apiCalls, bucket, node, doOnce])

  useEffect(() => {
    if (apiCalls) {
      setDoOnce(null)
    }
  }, [apiCalls, setDoOnce])

  return { apiCalls }
}

export const useTotalStaked = (bucket: Bucket) => {
  const [doOnce, setDoOnce] = useState<Bucket | null>(null)
  const totalStaked = useSelector((state) =>
    getTotalStaked(state as AppState, { bucket })
  )
  const averageBlockTime = useAverageBlockTime()
  const currentBlockNumber = useEthBlockNumber()
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (
      doOnce !== bucket &&
      averageBlockTime !== undefined &&
      currentBlockNumber !== undefined &&
      (totalStaked === null || totalStaked === undefined)
    ) {
      setDoOnce(bucket)
      dispatch(fetchTotalStaked(bucket, averageBlockTime, currentBlockNumber))
    }
  }, [
    dispatch,
    totalStaked,
    bucket,
    doOnce,
    averageBlockTime,
    currentBlockNumber
  ])

  useEffect(() => {
    if (totalStaked) {
      setDoOnce(null)
    }
  }, [totalStaked, setDoOnce])

  return { totalStaked }
}

export const usePlays = (bucket: Bucket) => {
  const [doOnce, setDoOnce] = useState<Bucket | null>(null)
  const plays = useSelector((state) => getPlays(state as AppState, { bucket }))
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (doOnce !== bucket && (plays === null || plays === undefined)) {
      setDoOnce(bucket)
      dispatch(fetchPlays(bucket))
    }
  }, [dispatch, plays, bucket, doOnce])

  useEffect(() => {
    if (plays) {
      setDoOnce(null)
    }
  }, [plays, setDoOnce])

  return { plays }
}

export const useTrailingApiCalls = (
  bucket: Bucket.MONTH | Bucket.WEEK | Bucket.YEAR
) => {
  const [doOnce, setDoOnce] = useState<Bucket | null>(null)
  const apiCalls = useSelector((state) =>
    getTrailingApiCalls(state as AppState, { bucket })
  )
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (doOnce !== bucket && (apiCalls === null || apiCalls === undefined)) {
      setDoOnce(bucket)
      dispatch(fetchTrailingApiCalls(bucket))
    }
  }, [dispatch, apiCalls, bucket, doOnce])

  useEffect(() => {
    if (apiCalls) {
      setDoOnce(null)
    }
  }, [apiCalls, setDoOnce])

  return { apiCalls }
}

export const useTrailingTopGenres = (bucket: Bucket) => {
  const [doOnce, setDoOnce] = useState<Bucket | null>(null)
  const topGenres = useSelector((state) =>
    getTrailingTopGenres(state as AppState, { bucket })
  )
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (doOnce !== bucket && (topGenres === null || topGenres === undefined)) {
      setDoOnce(bucket)
      dispatch(fetchTrailingTopGenres(bucket))
    }
  }, [dispatch, topGenres, bucket, doOnce])

  useEffect(() => {
    if (topGenres) {
      setDoOnce(null)
    }
  }, [topGenres, setDoOnce])

  return { topGenres }
}

const getTopLimit = (nameCount: { [name: string]: number }, limit: number) => {
  const flattenedNameCounts = Object.keys(nameCount).reduce(
    (acc: { name: string; count: number }[], name) => {
      acc.push({ name, count: nameCount[name] })
      return acc
    },
    []
  )
  flattenedNameCounts.sort((a, b) => b.count - a.count)
  return flattenedNameCounts
    .slice(0, limit)
    .reduce((nc: { [name: string]: number }, { name, count }) => {
      nc[name] = count
      return nc
    }, {})
}

const filterTopApps = (
  topApps: { [name: string]: number },
  filter: (name: string, count: number) => boolean
) => {
  return Object.keys(topApps).reduce(
    (acc: { [name: string]: number }, name) => {
      if (filter(name, topApps[name])) acc[name] = topApps[name]
      return acc
    },
    {}
  )
}

export const useTopApps = (
  bucket: Bucket,
  limit?: number,
  filter?: (name: string, count: number) => boolean
) => {
  const [hasFetched, setHasFetched] = useState<boolean>(false)
  let topApps = useSelector((state) =>
    getTopApps(state as AppState, { bucket })
  )
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (
      !hasFetched &&
      (topApps === null ||
        topApps === undefined ||
        limit === undefined ||
        Object.keys(topApps).length < limit)
    ) {
      dispatch(fetchTopApps(bucket, limit))
    }
  }, [dispatch, topApps, bucket, hasFetched, limit])

  useEffect(() => {
    setHasFetched(!!topApps)
  }, [topApps, setHasFetched])

  if (filter && topApps && topApps !== MetricError.ERROR) {
    topApps = filterTopApps(topApps, filter)
  }
  if (
    limit &&
    topApps &&
    topApps !== MetricError.ERROR &&
    limit < Object.keys(topApps).length
  ) {
    return {
      topApps: getTopLimit(topApps, limit)
    }
  }
  return { topApps }
}
