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

const Lottie = lazy(() => import('lottie-react'))

type LottieProps = ComponentProps<typeof LottieComponent> & {
  onLottieReady?: () => void
}

export const LazyLottie = (props: LottieProps) => {
  const { lottieRef, onLottieReady, ...rest } = props
  const onReadyRef = useRef(onLottieReady)
  onReadyRef.current = onLottieReady

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
    <Suspense fallback={<div className={rest.className} style={rest.style} />}>
      <Lottie {...rest} lottieRef={forwardingRef} />
    </Suspense>
  )
}

export default LazyLottie
