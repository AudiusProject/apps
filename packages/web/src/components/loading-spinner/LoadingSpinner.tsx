import cn from 'classnames'

import styles from './LoadingSpinner.module.css'

type LoadingSpinnerProps = { className?: string }

/**
 * Previously rendered a Lottie animation. `lottie-web` is a ~613 KB animation
 * runtime, and a spinner is the one component that cannot be lazily loaded —
 * it is what renders *while* things load — so it pinned the runtime into the
 * entry chunk for every visitor.
 *
 * The `svg > g > path` structure is deliberate: ~10 stylesheets recolour the
 * spinner with `.someClass g path { stroke: ... }` selectors written against
 * the Lottie output. Keeping the shape keeps those working.
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
