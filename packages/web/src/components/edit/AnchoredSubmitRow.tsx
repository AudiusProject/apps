import { useContext, useEffect, useState } from 'react'

import { Button, Flex, IconCloudUpload, IconError, Text } from '@audius/harmony'
import { useFormikContext } from 'formik'

import { Frosted } from 'components/frosted/Frosted'
import { EditFormScrollContext } from 'pages/edit-page/EditTrackPage'

import styles from './AnchoredSubmitRow.module.css'

const messages = {
  complete: 'Complete Upload',
  fixErrors: 'Fix errors to continue your upload.'
}

export const AnchoredSubmitRow = () => {
  const scrollToTop = useContext(EditFormScrollContext)
  const { isValid } = useFormikContext()
  const [showError, setShowError] = useState(false)

  // Whenever the error stops showing, reset our error state until they break the form again AND try to submit again
  useEffect(() => {
    if (isValid) {
      setShowError(false)
    }
  }, [isValid])

  return (
    <>
      <Frosted className={styles.buttonRow} gap='m'>
        <Button
          variant='primary'
          size='default'
          iconRight={IconCloudUpload}
          onClick={() => {
            scrollToTop()
            setShowError(true)
          }}
          type='submit'
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
      <div className={styles.placeholder} />
    </>
  )
}
