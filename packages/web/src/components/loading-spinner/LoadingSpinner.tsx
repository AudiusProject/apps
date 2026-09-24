import cn from 'classnames'

import styles from './LoadingSpinner.module.css'

type LoadingSpinnerProps = { className?: string }

/**
 * CSS spinner. Keep the svg > g > path structure: stylesheets recolour it via
 * `g path` selectors.
 */
const LoadingSpinner = (props: LoadingSpinnerProps) => {
  const { className } = props

  return (
    <div className={cn(styles.container, className)} role='progressbar'>
      <svg className={styles.spinner} viewBox='0 0 48 48'>
        <g>
          <path
            className={styles.arc}
            d='M24 8a16 16 0 1 0 0 32a16 16 0 1 0 0-32'
            fill='none'
            strokeWidth={6}
            strokeLinecap='round'
          />
        </g>
      </svg>
    </div>
  )
}

export default LoadingSpinner
