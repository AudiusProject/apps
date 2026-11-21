import { useEffect, useMemo, useState } from 'react'

import { isBpmValid } from '@audius/common/utils'

import {
  Button,
  FilterButton,
  Flex,
  Text,
  TextInput,
  useTheme
} from '@audius/harmony-native'
import { KeyboardAvoidingView, SegmentedControl } from 'app/components/core'
import { FormScreen } from 'app/screens/form-screen'
import { SelectionItemList } from 'app/screens/list-selection-screen/SelectionItemList'

import { useSearchFilter } from './searchState'

const MIN_BPM = 1
const MAX_BPM = 999

const messages = {
  title: 'BPM',
  bpm: 'BPM',
  range: 'Range',
  target: 'Target',
  minBpm: 'Min',
  maxBpm: 'Max',
  tooLowError: `BPM less than ${MIN_BPM}`,
  tooHighError: `BPM greater than ${MAX_BPM}`,
  invalidMinMaxError: 'Invalid range'
}

type ViewProps = {
  value: string | undefined
  setValue: (value: string) => void
}

type BpmTargetType = 'exact' | 'range5' | 'range10'
const targetOptions: { label: string; value: BpmTargetType }[] = [
  {
    label: 'Exact',
    value: 'exact'
  },
  {
    label: '± 5',
    value: 'range5'
  },
  {
    label: '± 10',
    value: 'range10'
  }
]

const rangeOptions = [
  {
    label: 'Very Slow (<60 BPM)',
    value: `${MIN_BPM}-60`
  },
  {
    label: 'Slow (60-90 BPM)',
    value: '60-90'
  },
  {
    label: 'Medium (90-110 BPM)',
    value: '90-110'
  },
  {
    label: 'Upbeat (110-140 BPM)',
    value: '110-140'
  },
  {
    label: 'Fast (140-160 BPM)',
    value: '140-160'
  },
  {
    label: 'Very Fast (160+ BPM)',
    value: `160-${MAX_BPM}`
  },
  {
    label: 'Custom',
    value: 'custom'
  }
]

const BpmRangeView = ({ value, setValue }: ViewProps) => {
  const minMaxValue = value?.includes('-') ? value.split('-') : null
  const isValueRangeOption = Boolean(
    rangeOptions.find((opt) => opt.value === value)
  )

  const [bpmRange, setBpmRange] = useState(
    minMaxValue && !isValueRangeOption ? 'custom' : value
  )
  const [minBpm, setMinBpm] = useState(minMaxValue?.[0] ?? '')
  const [maxBpm, setMaxBpm] = useState(minMaxValue?.[1] ?? '')
  const [minError, setMinError] = useState<string | null>(null)
  const [maxError, setMaxError] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useMemo(() => setValue, [])

  useEffect(() => {
    if (bpmRange && bpmRange !== 'custom') {
      onChange(bpmRange)
    }
  }, [bpmRange, onChange])

  useEffect(() => {
    if (!value && (bpmRange || minBpm || maxBpm)) {
      if (bpmRange !== 'custom') setBpmRange('')
      setMinBpm('')
      setMaxBpm('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, setBpmRange, setMinBpm, setMaxBpm])

  useEffect(() => {
    const minVal = Number(minBpm)
    const maxVal = Number(maxBpm)
    let hasError = false

    if (minBpm) {
      if (minVal < MIN_BPM) {
        setMinError(messages.tooLowError)
        hasError = true
      } else if (minVal > MAX_BPM) {
        setMinError(messages.tooHighError)
        hasError = true
      } else if (maxBpm && minVal > maxVal) {
        setMinError(messages.invalidMinMaxError)
        hasError = true
      } else if (minError) {
        setMinError(null)
      }
    } else if (minError) {
      setMinError(null)
    }

    if (maxBpm) {
      if (maxVal < MIN_BPM) {
        setMaxError(messages.tooLowError)
        hasError = true
      } else if (maxVal > MAX_BPM) {
        setMaxError(messages.tooHighError)
        hasError = true
      } else if (maxError) {
        setMaxError(null)
      }
    } else if (maxError) {
      setMaxError(null)
    }

    if (hasError) return

    let value = ''

    if (minBpm || maxBpm) {
      value = `${Number(minBpm || MIN_BPM)}-${Number(maxBpm || MAX_BPM)}`
    }

    onChange(value)
  }, [maxBpm, minBpm, minError, maxError, onChange])

  const customInputFooter = (
    <Flex direction='row' p='l' gap='xs' w='100%' alignItems='flex-start'>
      <TextInput
        style={{ flex: 1, alignSelf: 'flex-start' }}
        value={minBpm}
        label={messages.minBpm}
        keyboardType='numeric'
        error={!!minError}
        helperText={minError}
        aria-errormessage={minError ?? undefined}
        placeholder={messages.minBpm}
        onChangeText={(value) => {
          if (value === '' || isBpmValid(value)) {
            setMinBpm(value)
          }
        }}
      />
      <Text style={{ alignSelf: 'flex-start', paddingVertical: 20 }}>-</Text>
      <TextInput
        style={{ flex: 1, alignSelf: 'flex-start' }}
        value={maxBpm}
        label={messages.maxBpm}
        keyboardType='numeric'
        error={!!maxError}
        helperText={maxError}
        aria-errormessage={maxError ?? undefined}
        placeholder={messages.maxBpm}
        onChangeText={(value) => {
          if (value === '' || isBpmValid(value)) {
            setMaxBpm(value)
          }
        }}
      />
    </Flex>
  )

  return (
    <Flex flex={1}>
      <SelectionItemList
        data={rangeOptions}
        value={bpmRange}
        onChange={setBpmRange}
        footerComponent={bpmRange === 'custom' ? customInputFooter : undefined}
      />
    </Flex>
  )
}

const BpmTargetView = ({ value, setValue }: ViewProps) => {
  const minMaxValue = value?.includes('-') ? value.split('-') : null
  const minMaxDiff = minMaxValue
    ? Number(minMaxValue[1]) - Number(minMaxValue[0])
    : null
  const isValidDiff = minMaxDiff === 20 || minMaxDiff === 10
  const { color } = useTheme()
  const [bpmTarget, setBpmTarget] = useState(
    isValidDiff && minMaxValue
      ? String(Number(minMaxValue[0]) + minMaxDiff / 2)
      : minMaxValue
        ? ''
        : value
  )
  const [bpmTargetType, setBpmTargetType] = useState<BpmTargetType>(
    minMaxDiff === 20 ? 'range10' : minMaxDiff === 10 ? 'range5' : 'exact'
  )
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useMemo(() => setValue, [])

  useEffect(() => {
    const val = Number(bpmTarget)
    let hasError = false

    if (bpmTarget) {
      if (val < MIN_BPM) {
        setError(messages.tooLowError)
        hasError = true
      } else if (val > MAX_BPM) {
        setError(messages.tooHighError)
        hasError = true
      } else if (error) {
        setError(null)
      }
    } else if (error) {
      setError(null)
    }

    if (hasError) return

    let value = ''

    if (bpmTarget) {
      if (bpmTargetType === 'exact') {
        value = Number(bpmTarget).toString()
      } else {
        const mod = bpmTargetType === 'range5' ? 5 : 10
        value = `${Math.max(Number(bpmTarget) - mod, MIN_BPM)}-${Math.min(
          Number(bpmTarget) + mod,
          MAX_BPM
        )}`
      }
    }

    if (value) {
      onChange(value)
    }
  }, [bpmTarget, bpmTargetType, error, isValidDiff, minMaxValue, onChange])

  return (
    <Flex flex={1} ph='l' gap='l'>
      <TextInput
        label={messages.bpm}
        keyboardType='numeric'
        error={!!error}
        helperText={error}
        aria-errormessage={error ?? undefined}
        placeholder={messages.bpm}
        value={bpmTarget}
        onChangeText={(text) => {
          if (text === '' || isBpmValid(text)) {
            setBpmTarget(text)
          }
        }}
      />
      <Flex direction='row' gap='s'>
        {targetOptions.map((option) => (
          <Button
            key={`targetOption_${option.value}`}
            size='small'
            style={{ flex: 1 }}
            onPress={() => setBpmTargetType(option.value)}
            // @ts-ignore
            hexColor={color.secondary.secondary}
            variant={bpmTargetType === option.value ? 'primary' : 'tertiary'}
          >
            {option.label}
          </Button>
        ))}
      </Flex>
    </Flex>
  )
}

const getBpmType = (bpm: string | undefined) => {
  if (!bpm) return 'range'
  if (!bpm.includes('-')) return 'target'

  if (rangeOptions.some((range) => range.value === bpm)) {
    return 'range'
  }
  const [min, max] = bpm.split('-').map((bpm) => parseInt(bpm, 10))

  if (max - min === 10 || max - min === 20) return 'target'

  return 'range'
}

export const FilterBpmScreen = (props) => {
  const { value: bpm, onChange, onSubmit, ...other } = props
  const [bpmType, setBpmType] = useState(getBpmType(bpm))

  const InputView = bpmType === 'range' ? BpmRangeView : BpmTargetView

  return (
    <FormScreen
      title={messages.title}
      onSubmit={onSubmit}
      variant='white'
      clearable={Boolean(bpm)}
      {...other}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        keyboardShowingOffset={bpmType === 'range' ? 160 : 337}
      >
        <Flex p='l'>
          <SegmentedControl
            options={[
              { key: 'range', text: messages.range },
              { key: 'target', text: messages.target }
            ]}
            selected={bpmType}
            onSelectOption={setBpmType}
            fullWidth
            equalWidth
          />
        </Flex>
        <InputView value={bpm} setValue={onChange} />
      </KeyboardAvoidingView>
    </FormScreen>
  )
}

export const BpmFilter = () => {
  const [bpm, setBpm] = useSearchFilter('bpm')

  const getLabel = () => {
    if (!bpm) return messages.title
    return `${bpm} BPM`
  }

  return (
    <FilterButton
      label={getLabel()}
      value={bpm}
      onChange={setBpm}
      screen={FilterBpmScreen}
      size='small'
    />
  )
}
