import { useEffect, useState } from 'react'

import { commonPasswordCheck } from '@audius/common/utils'
import { View } from 'react-native'

import { IconArrowRight, PasswordInput, Button } from '@audius/harmony-native'
import { StatusMessage } from 'app/components/status-message'
import { makeStyles } from 'app/styles'

type CheckState = 'error' | 'default' | 'valid'

type Requirements = {
  number: CheckState
  length: CheckState
  match: CheckState
}

const MIN_PASSWORD_LEN = 8

const getNumberRequirement = (password: string) => {
  if (password.length === 0) return 'default'
  if (!/\d/.test(password)) return 'error'
  return 'valid'
}

const getLengthRequirement = (password: string) => {
  if (password.length === 0) return 'default'
  if (password.length < MIN_PASSWORD_LEN) return 'error'
  return 'valid'
}

const getMatchRequirement = (
  password: string,
  passwordConfirmation: string
) => {
  if (password.length === 0) return 'default'
  if (password !== passwordConfirmation) return 'error'
  return 'valid'
}

const COMMON_CHECK_DEBOUNCE_MS = 300

const useCommonRequirement = (password: string): CheckState => {
  const [result, setResult] = useState<{
    password: string
    isCommon: boolean
  } | null>(null)

  useEffect(() => {
    if (password.length < MIN_PASSWORD_LEN) return
    let cancelled = false
    const timeout = setTimeout(async () => {
      const isCommon = await commonPasswordCheck(password).catch(() => false)
      if (!cancelled) setResult({ password, isCommon })
    }, COMMON_CHECK_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [password])

  if (password.length < MIN_PASSWORD_LEN || result?.password !== password) {
    return 'default'
  }
  return result.isCommon ? 'error' : 'valid'
}

const messages = {
  passwordPlaceholder: 'Password',
  confirmationPlaceholder: 'Confirm Password',
  checks: {
    number: 'Must contain numbers',
    length: 'Length must be at least 8 characters',
    match: 'Passwords match',
    common: 'Hard to guess'
  }
}

const useStyles = makeStyles(({ spacing }) => ({
  input: {
    marginTop: spacing(3)
  },
  checkContainer: {
    marginTop: spacing(3),
    marginBottom: spacing(4)
  }
}))

type EnterPasswordProps = {
  isLoading?: boolean
  onSubmit: (password: string) => void
  submitButtonText: string
}

export const EnterPassword = (props: EnterPasswordProps) => {
  const { isLoading, onSubmit, submitButtonText } = props
  const styles = useStyles()
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [checkedRequirements, setRequirements] = useState<Requirements>({
    number: 'default',
    length: 'default',
    match: 'default'
  })
  const common = useCommonRequirement(password)
  const requirements = { ...checkedRequirements, common }

  const handlePasswordChange = (password: string) => {
    const number =
      requirements.number === 'default'
        ? getNumberRequirement(password) === 'valid'
          ? 'valid'
          : 'default'
        : getNumberRequirement(password)
    const length =
      requirements.length === 'default'
        ? getLengthRequirement(password) === 'valid'
          ? 'valid'
          : 'default'
        : getLengthRequirement(password)
    setPassword(password)
    setRequirements({
      ...checkedRequirements,
      number,
      length,
      match:
        passwordConfirmation === ''
          ? 'default'
          : getMatchRequirement(password, passwordConfirmation)
    })
  }

  const handlePasswordConfirmationChange = (passwordConfirmation: string) => {
    if (requirements.match !== 'default') {
      setRequirements({
        ...checkedRequirements,
        match:
          passwordConfirmation === ''
            ? 'default'
            : getMatchRequirement(password, passwordConfirmation)
      })
    } else if (password.length <= passwordConfirmation.length) {
      setRequirements({
        ...checkedRequirements,
        match: getMatchRequirement(password, passwordConfirmation)
      })
    }
    setPasswordConfirmation(passwordConfirmation)
  }

  const handlePasswordBlur = () => {
    if (password) {
      setRequirements({
        ...checkedRequirements,
        number: getNumberRequirement(password),
        length: getLengthRequirement(password),
        match:
          passwordConfirmation === ''
            ? 'default'
            : getMatchRequirement(password, passwordConfirmation)
      })
    }
  }
  const handleConfirmationBlur = () => {
    if (passwordConfirmation) {
      setRequirements({
        ...checkedRequirements,
        match:
          password === ''
            ? 'default'
            : getMatchRequirement(password, passwordConfirmation)
      })
    }
  }

  const fulfillsRequirements = () =>
    Object.keys(requirements).every((req) => requirements[req] === 'valid')

  const handleSubmit = () => {
    if (fulfillsRequirements()) {
      onSubmit(password)
    }
  }

  const pwdChecks = [
    { status: requirements.number, label: messages.checks.number },
    { status: requirements.length, label: messages.checks.length },
    { status: requirements.common, label: messages.checks.common },
    { status: requirements.match, label: messages.checks.match }
  ]
  const isValid = Object.keys(requirements).every(
    (req) => requirements[req] === 'valid'
  )

  return (
    <View style={{ width: '100%' }}>
      <PasswordInput
        style={styles.input}
        label={messages.passwordPlaceholder}
        value={password}
        onChangeText={handlePasswordChange}
        onBlur={handlePasswordBlur}
      />
      <PasswordInput
        style={styles.input}
        label={messages.confirmationPlaceholder}
        value={passwordConfirmation}
        onChangeText={handlePasswordConfirmationChange}
        onBlur={handleConfirmationBlur}
      />
      <View style={styles.checkContainer}>
        {pwdChecks.map((check, i) => (
          <StatusMessage
            key={`Check_${i}`}
            status={check.status}
            label={check.label}
          />
        ))}
      </View>
      <Button
        isLoading={isLoading}
        fullWidth
        disabled={!isValid}
        onPress={handleSubmit}
        iconRight={IconArrowRight}
      >
        {submitButtonText}
      </Button>
    </View>
  )
}
