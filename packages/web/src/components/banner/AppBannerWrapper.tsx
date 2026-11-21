import cn from 'classnames'

import { useIsMobile } from 'hooks/useIsMobile'

import styles from './AppBannerWrapper.module.css'

export const AppBannerWrapper = ({
  children
}: {
  children: React.ReactNode
}) => {
  const isMobile = useIsMobile()
  return (
    <div className={cn(styles.root, { [styles.isMobile]: isMobile })}>
      {children}
    </div>
  )
}
