import { useSelector } from 'react-redux'

import { getReferrer } from 'common/store/pages/signon/selectors'

export const useFastReferral = () => {
  const hasReferrer = useSelector(getReferrer)
  return Boolean(hasReferrer)
}
