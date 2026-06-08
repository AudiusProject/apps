import cn from 'classnames'

import AnimatedIconButton, {
  AnimatedIconType
} from 'components/animated-button/AnimatedIconButton'
import Toast from 'components/toast/Toast'
import { useIsMatrix } from 'utils/theme/theme'

import styles from './TableRepostButton.module.css'

const REPOST_TIMEOUT = 1000

type TableRepostButtonProps = {
  className?: string
  onClick?: (e: any) => void
  reposted?: boolean
}

export const TableRepostButton = ({
  className,
  onClick,
  reposted
}: TableRepostButtonProps) => {
  const isMatrixMode = useIsMatrix()

  return (
    <div
      onClick={onClick}
      className={cn(styles.tableRepostButton, className, {
        [styles.reposted]: reposted
      })}
    >
      <Toast
        text={'Reposted!'}
        disabled={reposted}
        delay={REPOST_TIMEOUT}
        containerClassName={styles.iconContainer}
      >
        <AnimatedIconButton
          icon={AnimatedIconType.REPOST}
          className={styles.icon}
          isActive={reposted}
          onClick={onClick ?? (() => {})}
          isMatrix={isMatrixMode}
        />
      </Toast>
    </div>
  )
}
