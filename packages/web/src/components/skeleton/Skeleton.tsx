import cn from 'classnames'

import styles from './Skeleton.module.css'

type CssLength = string | number

const toCssSize = (value: CssLength | undefined) => {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

export type SkeletonProps = {
  // Width (css string) of the skeleton to display. Default 100%.
  width?: string
  // Height (css string) of the skeleton to display. Default 100%.
  height?: string
  /** Shorthand for `width`; ignored when `width` is set. Numbers become px. */
  w?: CssLength
  /** Shorthand for `height`; ignored when `height` is set. Numbers become px. */
  h?: CssLength
  /** Maps to CSS `border-radius`. Use `'circle'` for a round avatar (50%). */
  borderRadius?: string
  // Optional class name to pass in and override styles with
  className?: string
  // Whether to disable the shimmer animation
  noShimmer?: boolean
}

const Skeleton = ({
  width,
  height,
  w,
  h,
  borderRadius,
  className,
  noShimmer
}: SkeletonProps) => {
  const resolvedWidth = width ?? toCssSize(w)
  const resolvedHeight = height ?? toCssSize(h)
  const resolvedBorderRadius = borderRadius === 'circle' ? '50%' : borderRadius

  return (
    <div
      className={cn(styles.skeleton, className, {
        [styles.noShimmer]: noShimmer
      })}
      aria-busy
      style={{
        width: resolvedWidth,
        height: resolvedHeight,
        ...(resolvedBorderRadius ? { borderRadius: resolvedBorderRadius } : {})
      }}
    />
  )
}

export default Skeleton
