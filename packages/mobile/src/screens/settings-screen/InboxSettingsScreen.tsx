import { useEffect, useMemo } from 'react'

import { useSetInboxPermissions } from '@audius/common/hooks'
import { statusIsNotFinalized } from '@audius/common/models'
import type { InboxSettingsFormValues } from '@audius/common/store'
import { transformPermitListToMap } from '@audius/common/utils'
import { ChatPermission } from '@audius/sdk/services'
import { Formik } from 'formik'

import { Button, Flex, IconMessage } from '@audius/harmony-native'
import { HeaderShadow, ScreenContent, Screen } from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'

import { FormScreen } from '../form-screen'

import { InboxSettingsFields } from './InboxSettingsFields'

const messages = {
  title: 'Inbox Settings',
  save: 'Save Changes'
}

export const InboxSettingsScreen = () => {
  const {
    permissions,
    doFetchPermissions,
    savePermissions,
    permissionsStatus
  } = useSetInboxPermissions()

  const initialValues = useMemo(() => {
    return transformPermitListToMap(
      permissions?.permit_list ?? [ChatPermission.ALL]
    )
  }, [permissions])

  useEffect(() => {
    doFetchPermissions()
  }, [doFetchPermissions])

  if (statusIsNotFinalized(permissionsStatus)) {
    return (
      <Screen title={messages.title} icon={IconMessage}>
        <ScreenContent>
          <Flex flex={1} justifyContent='center' alignItems='center'>
            <LoadingSpinner style={{ width: 48, height: 48 }} />
          </Flex>
        </ScreenContent>
      </Screen>
    )
  }

  return (
    <Formik<InboxSettingsFormValues>
      initialValues={initialValues}
      onSubmit={savePermissions}
    >
      {({ submitForm, isSubmitting }) => (
        <FormScreen
          title={messages.title}
          variant='secondary'
          topbarRight={null}
          icon={IconMessage}
          bottomSection={
            <Button
              variant='primary'
              fullWidth
              onPress={submitForm}
              disabled={!!isSubmitting}
            >
              {messages.save}
            </Button>
          }
        >
          <HeaderShadow />
          <ScreenContent>
            <Flex flex={1} pv='2xl' ph='l' backgroundColor='surface1'>
              <InboxSettingsFields />
            </Flex>
          </ScreenContent>
        </FormScreen>
      )}
    </Formik>
  )
}
