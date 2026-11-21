import { useContext } from 'react'

import { Button, Flex, IconError, Text } from '@audius/harmony'
import { useFormikContext } from 'formik'
import { useNavigate } from 'react-router'

import { Frosted } from 'components/frosted/Frosted'
import { usePortal } from 'hooks/usePortal'
import { useMainContentRef } from 'pages/MainContentContext'

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
  isSubmitting: isSubmittingProp
}: AnchoredSubmitRowEditProps = {}) => {
  const scrollToTop = useContext(EditFormScrollContext)
  const {
    isValid,
    submitForm,
    isSubmitting: isFormikSubmitting
  } = useFormikContext()
  const isSubmitting = isSubmittingProp ?? isFormikSubmitting

  const navigate = useNavigate()

  const mainContentRef = useMainContentRef()
  const Portal = usePortal({
    container: mainContentRef.current?.parentElement ?? undefined
  })

  return (
    <>
      <Portal>
        <div className={styles.buttonRow}>
          <Frosted className={styles.frosted} alignItems='center' gap='m'>
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
        </div>
      </Portal>
      <div className={styles.placeholder} />
    </>
  )
}
