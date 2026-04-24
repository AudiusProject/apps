import { useContext, useEffect, useState } from 'react'

import { Button, Flex, IconCloudUpload, IconError, Text } from '@audius/harmony'
import { useFormikContext } from 'formik'

import { Frosted } from 'components/frosted/Frosted'
import { usePortal } from 'hooks/usePortal'
import { useMainContentRef } from 'pages/MainContentContext'
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
  // Portal out of mainContentWrapper — its `transform` creates a containing
  // block that breaks position:fixed relative to the viewport. Target the
  // app shell (parent of mainContent) so the fixed row anchors to the
  // viewport and still inherits the --nav-width / --play-bar-height vars.
  const mainContentRef = useMainContentRef()
  const Portal = usePortal({
    container: mainContentRef.current?.parentElement ?? undefined
  })

  // Whenever the error stops showing, reset our error state until they break the form again AND try to submit again
  useEffect(() => {
    if (isValid) {
      setShowError(false)
    }
  }, [isValid])

  return (
    <>
      <Portal>
        <div className={styles.buttonRow}>
          <Frosted className={styles.frosted} alignItems='center' gap='m'>
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
        </div>
      </Portal>
      <div className={styles.placeholder} />
    </>
  )
}
