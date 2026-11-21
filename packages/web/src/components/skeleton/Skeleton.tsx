import cn from 'classnames'

import styles from './Skeleton.module.css'

type CssLength = string | number

const toCssSize = (value: CssLength | undefined) => {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

export type SkeletonProps = {
  width?: string
  height?: string
  w?: CssLength
  h?: CssLength
  borderRadius?: string
  className?: string
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
