import { useMemo } from 'react'

import { useSearchParams as useParams } from 'react-router-dom'

export type RemixSortMethod = 'likes' | 'plays' | 'recent'

export const useRemixPageParams = () => {
  const [urlRemixPageParams] = useParams()

  const sortMethod =
    (urlRemixPageParams.get('sortMethod') as RemixSortMethod) ?? 'recent'
  const isCosign = urlRemixPageParams.get('isCosign') === 'true'
  const isContestEntry = urlRemixPageParams.get('isContestEntry') === 'true'

  const remixPageParams = useMemo(
    () => ({
      sortMethod,
      isCosign,
      isContestEntry
    }),
    [sortMethod, isCosign, isContestEntry]
  )
  return remixPageParams
}
