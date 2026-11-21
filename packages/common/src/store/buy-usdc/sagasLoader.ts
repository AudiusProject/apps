import { lazySagas } from '~/utils/lazySagas'

import { onrampOpened, startRecoveryIfNecessary } from './slice'

export default function sagas() {
  return [
    lazySagas({
      pattern: [onrampOpened.type, startRecoveryIfNecessary.type],
      load: () => import('./sagas')
    })
  ]
}
