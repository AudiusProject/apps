import { lazySagas } from '~/utils/lazySagas'

import {
  cancelStripeOnramp,
  initializeStripeModal,
  stripeSessionStatusChanged
} from './slice'

export default function sagas() {
  return [
    lazySagas({
      pattern: [
        initializeStripeModal.type,
        stripeSessionStatusChanged.type,
        cancelStripeOnramp.type
      ],
      load: () => import('./sagas')
    })
  ]
}
