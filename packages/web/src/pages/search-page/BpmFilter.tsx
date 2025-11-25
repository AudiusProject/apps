import { useEffect, useMemo, useState } from 'react'

import { useStateDebounced } from '@audius/common/hooks'
import { isBpmValid } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  FilterButtonOption,
  FilterButton,
  Flex,
  IconCaretDown,
  SegmentedControl,
  TextInput,
  useTheme
} from '@audius/harmony'
import { css } from '@emotion/css'
import { useSearchParams } from 'react-router-dom'

import { useBpmMaskedInput } from 'hooks/useBpmMaskedInput'

import { useUpdateSearchParams } from './hooks'

const MIN_BPM = 1
const MAX_BPM = 999

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
const bpmOptions = [
  {
    label: 'Very Slow',
    value: `${MIN_BPM}-60`,
    helperText: '<60 BPM'
  },
  {
    label: 'Slow',
    value: '60-90',
    helperText: '60-90 BPM'
  },
  {
    label: 'Medium',
    value: '90-110',
    helperText: '90-110 BPM'
  },
  {
    label: 'Upbeat',
    value: '110-140',
    helperText: '110-140 BPM'
  },
  {
    label: 'Fast',
    value: '140-160',
    helperText: '140-160 BPM'
  },
  {
    label: 'Very Fast',
    value: `160-${MAX_BPM}`,
    helperText: '160+ BPM'
  }
]

const messages = {
  bpm: 'BPM',
  minBpm: 'Min',
  maxBpm: 'Max',
  tooLowError: `BPM less than ${MIN_BPM}`,
  tooHighError: `BPM greater than ${MAX_BPM}`,
  invalidMinMaxError: 'Invalid range'
}

type ViewProps = {
  value: string | null
  handleChange: (value: string, label: string) => void
  setIsOpen: (isOpen: boolean) => void
}

const BpmRangeView = ({ value, handleChange, setIsOpen }: ViewProps) => {
  const minMaxValue = value?.includes('-') ? value.split('-') : null
  const isValueRangeOption = Boolean(
    bpmOptions.find((opt) => opt.value === value)
  )

  const initialMinValue = isValueRangeOption ? '' : (minMaxValue?.[0] ?? '')
  const initialMaxValue = isValueRangeOption ? '' : (minMaxValue?.[1] ?? '')

  const [minBpm, setMinBpm] = useStateDebounced(initialMinValue)
  const [maxBpm, setMaxBpm] = useStateDebounced(initialMaxValue)
  const [minError, setMinError] = useState<string | null>(null)
  const [maxError, setMaxError] = useState<string | null>(null)
  const [hasChanged, setHasChanged] = useState(false)
  // NOTE: Memo to avoid the constantly changing function instance from triggering the effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useMemo(() => handleChange, [])

  const minBpmMaskedInputProps = useBpmMaskedInput({
    onChange: (e) => {
      setHasChanged(true)
      setMinBpm(e.target.value)
    }
  })

  const maxBpmMaskedInputProps = useBpmMaskedInput({
    onChange: (e) => {
      setHasChanged(true)
      setMaxBpm(e.target.value)
    }
  })

  useEffect(() => {
    if (!hasChanged) return

    // Validation
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

    // Value Update
    let value = ''

    if (minBpm || maxBpm) {
      value = `${minBpm || MIN_BPM}-${maxBpm || MAX_BPM}`
    }

    onChange(value, `${value} ${messages.bpm}`)
  }, [maxBpm, minBpm, minError, maxError, onChange, hasChanged])

  return (
    <>
      <Flex direction='column' w='100%' ph='s'>
        {bpmOptions.map((option) => (
          <FilterButtonOption
            key={option.value}
            option={option}
            activeValue={
              isValueRangeOption && !(minBpm || maxBpm) ? value : undefined
            }
            onChange={() => {
              handleChange(option.value, option.helperText ?? option.value)
              setIsOpen(false)
            }}
          />
        ))}
      </Flex>
      <Flex
        ph='s'
        gap='xs'
        w={240}
        alignItems='flex-start'
        // NOTE: Adds a little flexibility so the user doesn't close the popup by accident
        onClick={(e) => e.stopPropagation()}
      >
        <TextInput
          defaultValue={initialMinValue}
          label={messages.minBpm}
          type='number'
          maxLength={3}
          error={!!minError}
          helperText={minError}
          aria-errormessage={minError ?? undefined}
          placeholder={messages.minBpm}
          hideLabel
          inputRootClassName={css({ height: '48px !important' })}
          {...minBpmMaskedInputProps}
        />
        <Box pv='l'>-</Box>
        <TextInput
          defaultValue={initialMaxValue}
          label={messages.maxBpm}
          type='number'
          maxLength={3}
          error={!!maxError}
          helperText={maxError}
          aria-errormessage={maxError ?? undefined}
          placeholder={messages.maxBpm}
          hideLabel
          inputRootClassName={css({ height: '48px !important' })}
          {...maxBpmMaskedInputProps}
        />
      </Flex>
    </>
  )
}

const BpmTargetView = ({ value, handleChange }: ViewProps) => {
  const minMaxValue = value?.includes('-') ? value.split('-') : null
  const minMaxDiff = minMaxValue
    ? Number(minMaxValue[1]) - Number(minMaxValue[0])
    : null
  const isValidDiff = minMaxDiff === 20 || minMaxDiff === 10

  const initialTargetValue =
    minMaxValue && isValidDiff
      ? String(Number(minMaxValue[0]) + minMaxDiff / 2)
      : minMaxValue // If range is not valid for target view
        ? ''
        : value

  const { color } = useTheme()
  const [bpmTarget, setBpmTarget] = useStateDebounced(initialTargetValue)
  const [bpmTargetType, setBpmTargetType] = useState<BpmTargetType>(
    minMaxDiff === 20 ? 'range10' : minMaxDiff === 10 ? 'range5' : 'exact'
  )
  const [hasChanged, setHasChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // NOTE: Memo to avoid the constantly changing function instance from triggering the effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useMemo(() => handleChange, [])

  const bpmMaskedInputProps = useBpmMaskedInput({
    onChange: (e) => {
      setHasChanged(true)
      setBpmTarget(e.target.value)
    }
  })

  useEffect(() => {
    if (!hasChanged) return

    // Validation
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

    // Value Update
    let value = ''

    if (bpmTarget) {
      if (bpmTargetType === 'exact') {
        value = bpmTarget
      } else {
        const mod = bpmTargetType === 'range5' ? 5 : 10
        value = `${Math.max(Number(bpmTarget) - mod, MIN_BPM)}-${Math.min(
          Number(bpmTarget) + mod,
          MAX_BPM
        )}`
      }
    }

    onChange(value, `${value} ${messages.bpm}`)
  }, [bpmTarget, bpmTargetType, error, hasChanged, onChange])

  return (
    <Flex direction='column' w='100%' ph='s' gap='s'>
      <TextInput
        defaultValue={initialTargetValue ?? ''}
        label={messages.bpm}
        type='number'
        error={!!error}
        helperText={error}
        aria-errormessage={error ?? undefined}
        placeholder={messages.bpm}
        hideLabel
        inputRootClassName={css({ height: '48px !important' })}
        {...bpmMaskedInputProps}
      />
      <Flex justifyContent='center' alignItems='center' gap='xs'>
        {targetOptions.map((option) => (
          <Button
            key={`targetOption_${option.value}`}
            size='small'
            variant={bpmTargetType === option.value ? 'primary' : 'tertiary'}
            // @ts-ignore
            hexColor={
              bpmTargetType === option.value
                ? color.secondary.secondary
                : undefined
            }
            fullWidth
            onClick={() => {
              if (bpmTarget) setHasChanged(true)
              setBpmTargetType(option.value)
            }}
          >
            {option.label}
          </Button>
        ))}
      </Flex>
    </Flex>
  )
}

export const BpmFilter = () => {
  const [urlSearchParams] = useSearchParams()
  const bpm = urlSearchParams.get('bpm')
  const validatedBpm = isBpmValid(bpm ?? '') ? bpm : null
  const updateSearchParams = useUpdateSearchParams('bpm')
  const [bpmFilterType, setBpmFilterType] = useState<'range' | 'target'>(
    'range'
  )

  const label = bpm ? `${bpm} ${messages.bpm}` : `${messages.bpm}`
  const InputView = bpmFilterType === 'range' ? BpmRangeView : BpmTargetView

  return (
    <FilterButton
      value={bpm}
      label={label}
      onChange={updateSearchParams}
      iconRight={IconCaretDown}
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' }
      }}
    >
      {({ onChange, setIsOpen }) => (
        <Flex
          w='100%'
          pv='s'
          gap='s'
          direction='column'
          alignItems='flex-start'
        >
          <Flex
            direction='column'
            w='100%'
            ph='s'
            // NOTE: Adds a little flexibility so the user doesn't close the popup by accident
            onClick={(e) => e.stopPropagation()}
          >
            <SegmentedControl
              options={[
                { key: 'range', text: 'Range' },
                { key: 'target', text: 'Target' }
              ]}
              selected={bpmFilterType}
              onSelectOption={setBpmFilterType}
            />
          </Flex>
          <Divider css={{ width: '100%' }} />
          <InputView
            value={validatedBpm}
            handleChange={onChange}
            setIsOpen={setIsOpen}
          />
        </Flex>
      )}
    </FilterButton>
  )
}
