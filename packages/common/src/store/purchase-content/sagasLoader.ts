import { lazySagas } from '~/utils/lazySagas'

import { eagerCreateUserBank, startPurchaseContentFlow } from './slice'

export default function sagas() {
  return [
    lazySagas({
      pattern: [startPurchaseContentFlow.type, eagerCreateUserBank.type],
      load: () => import('./sagas')
    })
  ]
}
