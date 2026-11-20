import { getReferrer } from 'common/store/pages/signon/selectors'
import { useSelector } from 'react-redux'

export const useFastReferral = () => {
  const hasReferrer = useSelector(getReferrer)
  return Boolean(hasReferrer)
}
