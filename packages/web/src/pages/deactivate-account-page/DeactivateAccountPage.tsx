import { ReactNode, useCallback, useEffect } from 'react'

import { Status } from '@audius/common/models'
import {
  deactivateAccountActions,
  deactivateAccountSelectors
} from '@audius/common/store'
import { Button, Flex } from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import LoadingSpinnerFullPage from 'components/loading-spinner-full-page/LoadingSpinnerFullPage'
import { useIsMobile } from 'hooks/useIsMobile'
import { push } from 'utils/navigation'

import styles from './DeactivateAccountPage.module.css'
import { DeactivateAccountPageDesktop } from './components/desktop/DeactivateAccountPage'
import { DeactivateAccountPageMobile } from './components/mobile/DeactivateAccountPage'

const { deactivateAccount } = deactivateAccountActions
const { getDeactivateAccountStatus } = deactivateAccountSelectors

export const messages = {
  title: 'Delete',
  description: 'Delete your account',
  header: 'Are You Sure You Want To Delete Your Account?',
  listItems: [
    "There's no going back.",
    'This will remove all of your tracks, albums and playlists.',
    'You will not be able to re-register with the same email or handle'
  ],
  confirmTitle: 'Delete Account',
  confirm: 'Are you sure? This cannot be undone.',
  buttonDeactivate: 'Delete',
  buttonSafety: 'Take me back to safety',
  buttonGoBack: 'Go Back',
  errorMessage: 'Something went wrong.',
  errorMessageTryAgain: 'Please try again.'
}

export type DeactivateAccountPageProps = {
  children: ReactNode
  isConfirmationVisible: boolean
  isLoading: boolean
  openConfirmation: () => void
  onConfirm: () => void
  closeConfirmation: () => void
  onDrawerSelection: (rowNum: number) => void
}

type DeactivateAccountPageContentsProps = {
  isError: boolean
  isLoading: boolean
  isMobile: boolean
  openConfirmation: () => void
}

const DeactivateAcccountPageContents = ({
  isError,
  isLoading,
  isMobile,
  openConfirmation
}: DeactivateAccountPageContentsProps) => {
  const dispatch = useDispatch()
  const goToSafety = useCallback(() => {
    dispatch(push('/'))
  }, [dispatch])
  return (
    <div className={cn(styles.tile, { [styles.mobile]: isMobile })}>
      <div className={styles.header}>{messages.header}</div>
      <ul className={styles.list}>
        {messages.listItems.map((message, i) => (
          <li key={i}>{message}</li>
        ))}
      </ul>
      {isLoading && isMobile && <LoadingSpinnerFullPage />}
      {isError && (
        <div className={styles.error}>
          <span className={styles.errorMessage}>{messages.errorMessage}</span>{' '}
          <span className={styles.errorMessage}>
            {messages.errorMessageTryAgain}
          </span>
        </div>
      )}
      <Flex gap='l'>
        <Button
          variant='destructive'
          isLoading={isLoading}
          onClick={openConfirmation}
          fullWidth={isMobile}
        >
          {messages.buttonDeactivate}
        </Button>
        <Button
          variant='secondary'
          isLoading={isLoading}
          onClick={goToSafety}
          fullWidth={isMobile}
        >
          {messages.buttonSafety}
        </Button>
      </Flex>
    </div>
  )
}

export const DeactivateAccountPage = () => {
  const isMobile = useIsMobile()
  const Page = isMobile
    ? DeactivateAccountPageMobile
    : DeactivateAccountPageDesktop

  const dispatch = useDispatch()

  const deactivateAccountStatus = useSelector(getDeactivateAccountStatus)
  const [isConfirmationVisible, setIsConfirmationVisible] = useModalState(
    'DeactivateAccountConfirmation'
  )
  const isDeactivating = deactivateAccountStatus === Status.LOADING

  const openConfirmation = useCallback(() => {
    setIsConfirmationVisible(true)
  }, [setIsConfirmationVisible])

  const closeConfirmation = useCallback(() => {
    if (!isDeactivating) {
      setIsConfirmationVisible(false)
    }
  }, [isDeactivating, setIsConfirmationVisible])

  const onConfirm = useCallback(() => {
    dispatch(deactivateAccount())
  }, [dispatch])

  const onDrawerSelection = useCallback(
    (rowNumber: number) => {
      if (rowNumber === 0) {
        onConfirm()
        closeConfirmation()
      } else {
        closeConfirmation()
      }
    },
    [onConfirm, closeConfirmation]
  )

  useEffect(() => {
    if (deactivateAccountStatus === Status.ERROR) {
      closeConfirmation()
    }
  }, [deactivateAccountStatus, closeConfirmation])

  return (
    <Page
      openConfirmation={openConfirmation}
      isConfirmationVisible={isConfirmationVisible}
      closeConfirmation={closeConfirmation}
      onDrawerSelection={onDrawerSelection}
      onConfirm={onConfirm}
      isLoading={isDeactivating}
    >
      <DeactivateAcccountPageContents
        isError={deactivateAccountStatus === Status.ERROR}
        isLoading={isDeactivating}
        isMobile={isMobile}
        openConfirmation={openConfirmation}
      />
    </Page>
  )
}
