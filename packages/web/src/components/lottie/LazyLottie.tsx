import {
  ComponentProps,
  MutableRefObject,
  lazy,
  Suspense,
  useMemo,
  useRef
} from 'react'

import type LottieComponent from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'

/**
 * Lazy-loaded lottie-react; use instead of importing lottie-react directly so
 * the runtime stays out of the entry chunk. lottieRef is null until the chunk
 * loads, so callers that drive playback from an effect should re-run it when
 * onLottieReady fires.
 */
const Lottie = lazy(() => import('lottie-react'))

type LottieProps = ComponentProps<typeof LottieComponent> & {
  /** Called once lottieRef.current has been populated. */
  onLottieReady?: () => void
}

export const LazyLottie = (props: LottieProps) => {
  const { lottieRef, onLottieReady, ...rest } = props
  const onReadyRef = useRef(onLottieReady)
  onReadyRef.current = onLottieReady

  // lottie-react assigns lottieRef.current in an effect once the animation is
  // set up. Forward the assignment and notify the caller.
  const forwardingRef = useMemo(() => {
    if (!lottieRef) return undefined
    const target = lottieRef as MutableRefObject<LottieRefCurrentProps | null>
    return {
      get current() {
        return target.current
      },
      set current(value: LottieRefCurrentProps | null) {
        target.current = value
        if (value) onReadyRef.current?.()
      }
    }
  }, [lottieRef])

  return (
    <Suspense
      fallback={<div className={rest.className} style={rest.style} />}
    >
      <Lottie {...rest} lottieRef={forwardingRef} />
    </Suspense>
  )
}

export default LazyLottie
