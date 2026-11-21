import { BPM_REGEX } from '@audius/common/utils'

import {
  UseRegexMaskedInputParams,
  useRegexMaskedInput
} from './useRegexMaskedInput'

type UseBpmMaskedInputParams = Omit<UseRegexMaskedInputParams, 'regex'>

export const useBpmMaskedInput = (params?: UseBpmMaskedInputParams) =>
  useRegexMaskedInput({ regex: BPM_REGEX, onChange: params?.onChange })
