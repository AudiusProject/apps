import { useMemo } from 'react'

import cn from 'classnames'
// eslint-disable-next-line
import { ClassValue } from 'classnames/types'

import { useIsMobile } from 'hooks/useIsMobile'

export const useWithMobileStyle = (mobileClassName: string) => {
  const isMobile = useIsMobile()

  const withMobile = useMemo(() => {
    const mobileStyle = { [mobileClassName]: isMobile }
    return (...classnames: ClassValue[]) => cn(...classnames, mobileStyle)
  }, [isMobile, mobileClassName])

  return withMobile
}
