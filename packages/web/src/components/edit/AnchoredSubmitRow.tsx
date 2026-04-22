import { useContext, useEffect, useState } from 'react'

import { Button, Flex, IconCloudUpload, IconError, Text } from '@audius/harmony'
import { useFormikContext } from 'formik'
import { createPortal } from 'react-dom'

import { Frosted } from 'components/frosted/Frosted'
import { EditFormScrollContext } from 'pages/edit-page/EditTrackPage'

import styles from './AnchoredSubmitRow.module.css'

const messages = {
  complete: 'Complete Upload',
  fixErrors: 'Fix errors to continue your upload.'
}

export const AnchoredSubmitRow = () => {
  const scrollToTop = useContext(EditFormScrollContext)
  const { isValid, submitForm } = useFormikContext()
  const [showError, setShowError] = useState(false)

  // Whenever the error stops showing, reset our error state until they break the form again AND try to submit again
  useEffect(() => {
    if (isValid) {
      setShowError(false)
    }
  }, [isValid])

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
              <Button
                variant='primary'
                size='default'
                iconRight={IconCloudUpload}
                onClick={() => {
                  scrollToTop()
                  setShowError(true)
                  submitForm()
                }}
                type='button'
              >
                {messages.complete}
              </Button>
              {showError && !isValid ? (
                <Flex alignItems='center' gap='xs'>
                  <IconError color='danger' size='s' />
                  <Text color='danger' size='s' variant='body'>
                    {messages.fixErrors}
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
