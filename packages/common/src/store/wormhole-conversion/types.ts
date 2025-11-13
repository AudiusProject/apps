import { Nullable } from '../../utils/typeUtils'

export type WormholeConversionStatus =
  | 'IDLE'
  | 'CONVERTING'
  | 'SUCCESS'
  | 'ERROR'

export type WormholeConversionState = {
  status: WormholeConversionStatus
  error: Nullable<string>
}
