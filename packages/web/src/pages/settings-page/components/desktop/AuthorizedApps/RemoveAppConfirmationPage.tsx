import { useCallback, useEffect } from 'react'

import { useCurrentUserId, useRemoveAuthorizedApp } from '@audius/common/api'
import { Button, ModalFooter } from '@audius/harmony'

import styles from './RemoveAppConfirmationPage.module.css'
import { AuthorizedAppPageProps, AuthorizedAppsPages } from './types'

const messages = {
  confirmation: 'Are you sure you want to remove this app?',
  cancel: 'Cancel',
  removeApp: 'Remove',
  removingApp: 'Removing'
}

type AuthorizedAppConfirmationPageProps = AuthorizedAppPageProps

export const RemoveAppConfirmationPage = (
  props: AuthorizedAppConfirmationPageProps
) => {
  const { params, setPage } = props
  const {
    mutate: removeAuthorizedApp,
    isPending,
    isSuccess,
    isError
  } = useRemoveAuthorizedApp()
  const { data: userId } = useCurrentUserId()
  const address = params?.address
  const name = params?.name

  const handleCancel = useCallback(() => {
    setPage(AuthorizedAppsPages.YOUR_APPS)
  }, [setPage])

  const handleRemove = useCallback(() => {
    if (!userId || !address) return
    removeAuthorizedApp(address)
  }, [userId, address, removeAuthorizedApp])

  useEffect(() => {
    if (isSuccess) {
      setPage(AuthorizedAppsPages.YOUR_APPS)
    }
  }, [isSuccess, setPage])

  useEffect(() => {
    if (isError) {
      setPage(AuthorizedAppsPages.YOUR_APPS)
    }
  }, [isError, setPage])

  if (!params) return null

  return (
    <div>
      <h4 className={styles.header}>{name}</h4>
      <p className={styles.confirmation}>{messages.confirmation}</p>
      <ModalFooter css={{ paddingBottom: `0 !important` }}>
        <Button
          variant='secondary'
          onClick={handleCancel}
          disabled={isPending}
          fullWidth
        >
          {messages.cancel}
        </Button>
        <Button
          variant='destructive'
          fullWidth
          onClick={handleRemove}
          isLoading={isPending}
        >
          {isPending ? messages.removingApp : messages.removeApp}
        </Button>
      </ModalFooter>
    </div>
  )
}
