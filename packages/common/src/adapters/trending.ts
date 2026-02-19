import { HashId, type TrendingTimesIds } from '@audius/sdk'

import { removeNullable } from '~/utils'

const makeIdList = (input: { id: string }[]) => {
  return input.map(({ id }) => HashId.parse(id)).filter(removeNullable)
}

export const trendingIdsFromSDK = (input: TrendingTimesIds) => {
  return {
    week: makeIdList(input.week ?? []),
    month: makeIdList(input.month ?? []),
    year: makeIdList(input.year ?? [])
  }
}
