import { useMemo } from 'react'

import { useSearchParams as useParams } from 'react-router-dom'

export type PickWinnersSortMethod = 'likes' | 'plays' | 'recent'

export const usePickWinnersPageParams = () => {
  const [urlPageParams] = useParams()

  const sortMethod =
    (urlPageParams.get('sortMethod') as PickWinnersSortMethod) ?? 'recent'
  const isCosign = urlPageParams.get('isCosign') === 'true'

  const pickWinnersPageParams = useMemo(
    () => ({
      sortMethod,
      isCosign
    }),
    [sortMethod, isCosign]
  )
  return pickWinnersPageParams
}
