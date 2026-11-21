import { CommonState } from '@audius/common/store'
import {
  useSelector as untypedUseSelector,
  TypedUseSelectorHook
} from 'react-redux'

export interface UseSelectorHook<TState> extends TypedUseSelectorHook<TState> {
  <TSelected>(
    selector: (state: TState, ...args: any[]) => TSelected,
    equalityFn?: (left: TSelected, right: TSelected) => boolean
  ): TSelected
}

export const useSelector: UseSelectorHook<CommonState> = untypedUseSelector
