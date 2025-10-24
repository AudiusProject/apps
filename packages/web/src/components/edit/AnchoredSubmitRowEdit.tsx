import { useContext } from 'react'

import { route } from '@audius/common/utils'
import { Button, Flex, IconError, Text } from '@audius/harmony'
import { useFormikContext } from 'formik'

import { useHistoryContext } from 'app/HistoryProvider'
import { Frosted } from 'components/frosted/Frosted'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { EditFormScrollContext } from '../../pages/edit-page/EditTrackPage'

import styles from './AnchoredSubmitRowEdit.module.css'
const { FEED_PAGE } = route

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
  const { isValid } = useFormikContext()

  const { history } = useHistoryContext()
  const navigate = useNavigateToPage()

  return (
    <>
      <Frosted className={styles.buttonRow} gap='m'>
        <Flex gap='l'>
          <Button
            variant='secondary'
            size='default'
            disabled={isSubmitting}
            onClick={() =>
              history.length > 0 ? history.goBack() : navigate(FEED_PAGE)
            }
          >
            {messages.cancel}
          </Button>
          <Button
            variant='primary'
            size='default'
            onClick={() => {
              scrollToTop()
            }}
            type='submit'
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
      <div className={styles.placeholder} />
    </>
  )
}
