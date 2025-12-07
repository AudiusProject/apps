/**
 * `withNullGuard` wraps a component that takes a 'wide' set of props (W) with nullable
 *  values, and returns a component that accepts a 'narrow' set of props (N) that renders
 *  null if one of the required props is null.
 *
 *  This is useful when you have a component that should never see a certain value as null
 *  (e.g. null Track in Track Page), but you can't enforce that at constraint at compile time.
 *
 *  Usage:
 *  - Define the wide version of the props, W.
 *
 * ```
 *  type TrackPageProps = { track?: Track }
 * ```
 *
 *  - Call withNullGuard, passing in a mapper that only a narrowed version of props, or undefined.
 *    The narrow props, N, is defined implicitly from the return type of `propMapper`.
 *
 * ```
 *  const g = withNullGuard((props: TrackPageProps) => {
 *     if (props.track) { return props }
 *  })`
 * ```
 *
 * - Define your component inline the returned from withNullGuard.
 *   This defined component can be safely connected to the store/mapStateToProps that returns the widened type, W.
 *
 * ```
 *  const TrackPage = g(({ track }) => <div> {track.id} </div>)
 * ```
 */
export function withNullGuard<W, N>(
  propMapper: (wide: W) => N | undefined | null | false
) {
  return (Component: (narrow: N) => JSX.Element | null) => (wideProps: W) => {
    const narrowProps = propMapper(wideProps)
    if (!narrowProps) return null
    // @ts-ignore
    return <Component {...narrowProps} />
  }
}
