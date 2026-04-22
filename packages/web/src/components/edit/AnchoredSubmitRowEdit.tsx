import { useContext } from 'react'

import { Button, Flex, IconError, Text } from '@audius/harmony'
import { useFormikContext } from 'formik'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'

import { Frosted } from 'components/frosted/Frosted'

import { EditFormScrollContext } from '../../pages/edit-page/EditTrackPage'

import styles from './AnchoredSubmitRowEdit.module.css'

const messages = {
  save: 'Save Changes',
  cancel: 'Cancel',
  fixErrors: 'Fix errors to continue your update.'
}

type AnchoredSubmitRowEditProps = {
  isSubmitting?: boolean
  errorText?: string
}

export const AnchoredSubmitRowEdit = ({
  errorText,
  isSubmitting = false
}: AnchoredSubmitRowEditProps = {}) => {
  const scrollToTop = useContext(EditFormScrollContext)
  const { isValid, submitForm } = useFormikContext()

  const navigate = useNavigate()

  // Portal out of mainContentWrapper — its `transform` creates a containing
  // block that breaks position:fixed relative to the viewport. Target
  // #webPlayer (the .app element) since it defines the CSS vars we rely on
  // (--nav-width, --play-bar-height) and has no transform.
  const portalTarget =
    typeof document !== 'undefined' ? document.getElementById('webPlayer') : null
  const buttonRow = portalTarget
    ? createPortal(
          <div className={styles.buttonRow}>
            <Frosted alignItems='center' gap='m'>
              <Flex gap='l'>
                <Button
                  variant='secondary'
                  size='default'
                  disabled={isSubmitting}
                  onClick={() => navigate(-1)}
                >
                  {messages.cancel}
                </Button>
                <Button
                  variant='primary'
                  size='default'
                  onClick={() => {
                    scrollToTop()
                    submitForm()
                  }}
                  type='button'
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                >
                  {messages.save}
                </Button>
              </Flex>
              {errorText || !isValid ? (
                <Flex alignItems='center' gap='xs'>
                  <IconError color='danger' size='s' />
                  <Text color='danger' size='s' variant='body'>
                    {errorText ?? messages.fixErrors}
                  </Text>
                </Flex>
              ) : null}
            </Frosted>
          </div>,
          portalTarget
        )
      : null

  return (
    <>
      {buttonRow}
      <div className={styles.placeholder} />
    </>
  )
}
