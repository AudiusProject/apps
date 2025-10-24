import type { Action } from '@reduxjs/toolkit'

import { TipSource } from '../../models/Analytics'
import { UserTip } from '../../models/Tipping'
import { User } from '../../models/User'
import { StringAudio } from '../../models/Wallet'
import { Nullable } from '../../utils/typeUtils'

export type TippingSendStatus =
  | 'SEND'
  | 'CONFIRM'
  | 'SENDING'
  | 'CONVERTING'
  | 'SUCCESS'
  | 'ERROR'

export type TippingState = {
  send: {
    status: Nullable<TippingSendStatus>
    user: Nullable<User>
    amount: StringAudio
    error: Nullable<string>
    source: TipSource
    trackId: Nullable<number> // in case the user is sending a tip from a gated track page / modal
    /**
     * Actions to fire when the tip sends successfully
     */
    onSuccessActions?: Action[]
    /**
     * Actions to fire when the tip is confirmed to be indexed by API
     */
    onSuccessConfirmedActions?: Action[]
  }
  tipToDisplay: Nullable<UserTip>
  showTip: boolean
}
