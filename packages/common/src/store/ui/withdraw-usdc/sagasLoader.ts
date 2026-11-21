import { lazySagas } from '~/utils/lazySagas'

import { beginWithdrawUSDC } from './slice'

export default function sagas() {
  return [
    lazySagas({
      pattern: [beginWithdrawUSDC.type],
      load: () => import('./sagas')
    })
  ]
}
