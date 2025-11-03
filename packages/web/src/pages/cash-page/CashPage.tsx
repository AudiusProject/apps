import { useIsMobile } from 'hooks/useIsMobile'

import { CashPage as DesktopCashPage } from './desktop/CashPage'
import { CashPage as MobileCashPage } from './mobile/CashPage'

export const CashPage = () => {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileCashPage />
  }

  return <DesktopCashPage />
}
