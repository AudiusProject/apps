import { ComponentProps, lazy, Suspense } from 'react'

import type LottieComponent from 'lottie-react'

/**
 * `lottie-react` / `lottie-web` is a ~613 KB animation runtime. Importing it
 * statically anywhere in the eager graph pins it into the entry chunk for every
 * visitor, and it was reachable from a dozen surfaces (play bar, search bar,
 * notification reactions, animated buttons).
 *
 * None of those animations are needed before first paint, so the runtime loads
 * on demand instead. Use this in place of a direct `lottie-react` import.
 *
 * Note on `lottieRef`: lottie-react takes it as an ordinary prop rather than a
 * React ref, so it forwards through this boundary unchanged. It is populated
 * once the chunk resolves, so callers that drive playback imperatively must
 * keep their existing `if (lottieRef.current)` guards.
 */
const Lottie = lazy(() => import('lottie-react'))

type LottieProps = ComponentProps<typeof LottieComponent>

export const LazyLottie = (props: LottieProps) => (
  <Suspense fallback={null}>
    <Lottie {...props} />
  </Suspense>
)

export default LazyLottie
