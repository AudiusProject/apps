import { useCallback, useEffect, useState } from 'react'

import {
  Modal,
  ModalContentPages,
  ModalHeader,
  ModalTitle,
  ModalProps,
  IconTrash,
  IconShieldCheck
} from '@audius/harmony'
import { AuthorizedApp } from '@audius/sdk/services'

import { AppDetailsPage } from './AppDetailsPage'
import styles from './AuthorizedAppsSettingsModal.module.css'
import { RemoveAppConfirmationPage } from './RemoveAppConfirmationPage'
import { YourAppsPage } from './YourAppsPage'
import { AuthorizedAppsPages } from './types'

const messages = {
  title: 'Authorized Apps',
  removeApp: 'Remove App'
}

type AuthorizedAppsSettingsModalProps = Omit<ModalProps, 'children'>

const getCurrentPage = (currentPage: AuthorizedAppsPages) => {
  switch (currentPage) {
    case AuthorizedAppsPages.YOUR_APPS:
      return 0
    case AuthorizedAppsPages.APP_DETAILS:
      return 1
    case AuthorizedAppsPages.REMOVE_APP:
      return 2
  }
}

const getTitle = (currentPage: AuthorizedAppsPages) => {
  switch (currentPage) {
    case AuthorizedAppsPages.REMOVE_APP:
      return messages.removeApp
    default:
      return messages.title
  }
}

const getTitleIcon = (currentPage: AuthorizedAppsPages) => {
  switch (currentPage) {
    case AuthorizedAppsPages.REMOVE_APP:
      return <IconTrash className={styles.titleIcon} />
    default:
      return <IconShieldCheck className={styles.titleIcon} />
  }
}

export const AuthorizedAppsSettingsModal = (
  props: AuthorizedAppsSettingsModalProps
) => {
  const { isOpen } = props
  const [currentPage, setCurrentPage] = useState(
    AuthorizedAppsPages.APP_DETAILS
  )

  const [currentPageParams, setCurrentPageParams] = useState<AuthorizedApp>()

  const handleSetPage = useCallback(
    (page: AuthorizedAppsPages, params?: AuthorizedApp) => {
      setCurrentPage(page)
      if (params) {
        setCurrentPageParams(params)
      }
    },
    []
  )

  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(AuthorizedAppsPages.YOUR_APPS)
    }
  }, [isOpen])

  return (
    <>
      <Modal {...props} size='small'>
        <ModalHeader>
          <ModalTitle
            title={getTitle(currentPage)}
            icon={getTitleIcon(currentPage)}
          />
        </ModalHeader>
        <ModalContentPages currentPage={getCurrentPage(currentPage)}>
          <YourAppsPage setPage={handleSetPage} />
          <AppDetailsPage setPage={handleSetPage} params={currentPageParams} />
          <RemoveAppConfirmationPage
            setPage={handleSetPage}
            params={currentPageParams}
          />
        </ModalContentPages>
      </Modal>
    </>
  )
}
