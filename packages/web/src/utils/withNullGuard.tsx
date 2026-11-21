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
