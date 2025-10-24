import { useState } from 'react'

import {
  Box,
  Button,
  Flex,
  IconArrowLeft,
  IconError,
  Text,
  useTheme
} from '@audius/harmony'
import { useFormikContext } from 'formik'

import { Frosted } from 'components/frosted/Frosted'
import zIndex from 'utils/zIndex'

const defaultMessages = {
  continue: 'Continue',
  cancel: 'Cancel',
  fixErrors: 'Please complete all required fields to continue.'
}

type ArtistCoinsSubmitRowProps = {
  onContinue: () => void
  onBack: () => void
  isValid?: boolean
  isLoading?: boolean
  continueText?: string
  cancelText?: string
  backIcon?: boolean
  submit?: boolean
  errorText?: string
}

export const ArtistCoinsSubmitRow = ({
  onContinue,
  onBack,
  isLoading = false,
  continueText = defaultMessages.continue,
  cancelText = defaultMessages.cancel,
  backIcon = false,
  submit = false,
  isValid: isValidProp,
  errorText
}: ArtistCoinsSubmitRowProps) => {
  const { color, spacing } = useTheme()
  const { isValid: isEntireFormValid } = useFormikContext()
  const isFormValid = isValidProp ?? isEntireFormValid
  const [showError, setShowError] = useState(false)

  const handleCTAClick = () => {
    if (!isFormValid) {
      setShowError(true)
      return
    }
    setShowError(false)
    onContinue()
  }

  const handleBack = () => {
    setShowError(false)
    onBack()
  }

  return (
    <>
      <Frosted
        css={{
          position: 'fixed',
          bottom: 'var(--play-bar-height)',
          left: 'var(--nav-width)',
          width: 'calc(100% - var(--nav-width))',
          padding: spacing.unit3,
          borderTop: `1px solid ${color.border.strong}`,
          zIndex: zIndex.NAVIGATOR_POPUP
        }}
        direction='column'
        alignItems='center'
        gap='m'
      >
        <Flex gap='s' alignItems='center'>
          <Button
            variant='secondary'
            size='default'
            onClick={handleBack}
            disabled={isLoading}
            iconLeft={backIcon ? IconArrowLeft : undefined}
          >
            {cancelText}
          </Button>
          <Button
            variant='primary'
            size='default'
            onClick={handleCTAClick}
            disabled={isLoading}
            type={submit ? 'submit' : 'button'}
          >
            {continueText}
          </Button>
        </Flex>
        {errorText || (showError && !isFormValid) ? (
          <Flex alignItems='center' gap='xs'>
            <IconError color='danger' size='s' />
            <Text color='danger' size='s' variant='body'>
              {errorText ?? defaultMessages.fixErrors}
            </Text>
          </Flex>
        ) : null}
      </Frosted>
      <Box
        css={{
          height: 'var(--play-bar-height)'
        }}
      />
    </>
  )
}
