import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ServiceType } from 'types'

export type TimeSeriesRecord = {
  timestamp: string
  count?: number
  total_count?: number
  unique_count?: number
  summed_unique_count?: number
}

type UptimeRecord = {
  host: string
  uptime_percentage: number
  duration: string
  uptime_raw_data: { [key: string]: number }
}

export type CountRecord = {
  [key: string]: number
}

export enum Bucket {
  ALL_TIME = 'all_time', // Granularity: year
  YEAR = 'year', // Granularity: month
  MONTH = 'month', // Granularity: week
  WEEK = 'week', // Granularity: day
  DAY = 'day'
}

export enum MetricError {
  ERROR = 'error'
}

type TimeSeriesMetric = {
  [key in Bucket]?: TimeSeriesRecord[] | MetricError
}

type UptimeMetric = {
  [key in Bucket]?: UptimeRecord | MetricError
}

type CountMetric = {
  [key in Bucket]?: CountRecord | MetricError
}

export type State = {
  apiCalls: TimeSeriesMetric
  totalStaked: TimeSeriesMetric
  plays: TimeSeriesMetric
  topApps: CountMetric
  trailingTopGenres: CountMetric
  trailingApiCalls: CountMetric
  individualNodeUptime: {
    [node: string]: UptimeMetric
  }
  individualServiceApiCalls: {
    [node: string]: TimeSeriesMetric
  }
}

export const initialState: State = {
  apiCalls: {},
  totalStaked: {},
  plays: {},
  topApps: {},
  trailingTopGenres: {},
  trailingApiCalls: {},
  individualNodeUptime: {},
  individualServiceApiCalls: {}
}

type SetApiCalls = { metric: TimeSeriesRecord[] | MetricError; bucket: Bucket }
type SetTotalStaked = {
  metric: TimeSeriesRecord[] | MetricError
  bucket: Bucket
}
type SetPlays = { metric: TimeSeriesRecord[] | MetricError; bucket: Bucket }
type SetTopApps = { metric: CountRecord | MetricError; bucket: Bucket }
type SetTrailingTopGenres = {
  metric: CountRecord | MetricError
  bucket: Bucket
}
type SetTrailingApiCalls = { metric: CountRecord | MetricError; bucket: Bucket }
type SetIndividualNodeUptime = {
  nodeType: ServiceType
  node: string
  metric: UptimeRecord | MetricError
  bucket: Bucket
}
type SetIndividualServiceApiCalls = {
  node: string
  metric: TimeSeriesRecord[] | MetricError
  bucket: Bucket
}

const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setApiCalls: (state, action: PayloadAction<SetApiCalls>) => {
      const { metric, bucket } = action.payload
      state.apiCalls[bucket] = metric
    },
    setTotalStaked: (state, action: PayloadAction<SetTotalStaked>) => {
      const { metric, bucket } = action.payload
      state.totalStaked[bucket] = metric
    },
    setPlays: (state, action: PayloadAction<SetPlays>) => {
      const { metric, bucket } = action.payload
      state.plays[bucket] = metric
    },
    setTopApps: (state, action: PayloadAction<SetTopApps>) => {
      const { metric, bucket } = action.payload
      state.topApps[bucket] = metric
    },
    setTrailingTopGenres: (
      state,
      action: PayloadAction<SetTrailingTopGenres>
    ) => {
      const { metric, bucket } = action.payload
      state.trailingTopGenres[bucket] = metric
    },
    setTrailingApiCalls: (
      state,
      action: PayloadAction<SetTrailingApiCalls>
    ) => {
      const { metric, bucket } = action.payload
      state.trailingApiCalls[bucket] = metric
    },
    setIndividualNodeUptime: (
      state,
      action: PayloadAction<SetIndividualNodeUptime>
    ) => {
      const { node, metric, bucket } = action.payload
      if (!state.individualNodeUptime[node]) {
        state.individualNodeUptime[node] = {}
      }
      state.individualNodeUptime[node][bucket] = metric
    },
    setIndividualServiceApiCalls: (
      state,
      action: PayloadAction<SetIndividualServiceApiCalls>
    ) => {
      const { node, metric, bucket } = action.payload
      if (!state.individualServiceApiCalls[node]) {
        state.individualServiceApiCalls[node] = {}
      }
      state.individualServiceApiCalls[node][bucket] = metric
    }
  }
})

export const {
  setApiCalls,
  setTotalStaked,
  setPlays,
  setTopApps,
  setTrailingTopGenres,
  setTrailingApiCalls,
  setIndividualNodeUptime,
  setIndividualServiceApiCalls
} = slice.actions

export default slice.reducer
