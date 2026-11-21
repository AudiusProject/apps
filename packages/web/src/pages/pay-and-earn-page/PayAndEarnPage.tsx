import { useEffect } from 'react'

import { buyUSDCActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { useIsMobile } from 'hooks/useIsMobile'

import { PayAndEarnPage as DesktopPayAndEarn } from './desktop/PayAndEarnPage'
import { PayAndEarnPage as MobilePayAndEarn } from './mobile/PayAndEarnPage'
import { PayAndEarnPageProps } from './types'

export const PayAndEarnPage = (props: PayAndEarnPageProps) => {
  const isMobile = useIsMobile()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(buyUSDCActions.startRecoveryIfNecessary())
  }, [dispatch])

  const Content = isMobile ? MobilePayAndEarn : DesktopPayAndEarn

  return <Content {...props} />
}
