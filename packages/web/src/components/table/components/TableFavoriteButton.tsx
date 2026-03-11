import cn from 'classnames'

import AnimatedIconButton, {
  AnimatedIconType
} from 'components/animated-button/AnimatedIconButton'
import { useIsMatrix } from 'utils/theme/theme'

import styles from './TableFavoriteButton.module.css'

type TableFavoriteButtonProps = {
  className?: string
  favorited?: boolean
  onClick?: (e: any) => void
}

export const TableFavoriteButton = ({
  className,
  favorited,
  onClick
}: TableFavoriteButtonProps) => {
  const isMatrixMode = useIsMatrix()

  return (
    <div
      onClick={onClick}
      className={cn(styles.tableFavoriteButton, className, {
        [styles.favorited]: favorited
      })}
    >
      <AnimatedIconButton
        icon={AnimatedIconType.FAVORITE}
        isActive={favorited}
        className={styles.icon}
        onClick={onClick ?? (() => {})}
        isMatrix={isMatrixMode}
      />
    </div>
  )
}
