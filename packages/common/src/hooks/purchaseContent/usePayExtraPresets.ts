import { useMemo } from 'react'

import { StringKeys } from '~/services/remote-config'
import { parseIntList } from '~/utils/stringUtils'

import { useRemoteVar } from '../useRemoteVar'

import { PayExtraAmountPresetValues, PayExtraPreset } from './types'

export const usePayExtraPresets = () => {
  const configValue = useRemoteVar(StringKeys.PAY_EXTRA_PRESET_CENT_AMOUNTS)
  return useMemo<PayExtraAmountPresetValues>(() => {
    const [low, medium, high] = parseIntList(configValue)
    return {
      [PayExtraPreset.LOW]: low,
      [PayExtraPreset.MEDIUM]: medium,
      [PayExtraPreset.HIGH]: high
    }
  }, [configValue])
}
