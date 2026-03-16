import { useCallback, useEffect, useMemo } from 'react'

import { useSetInboxPermissions } from '@audius/common/hooks'
import { Status, statusIsNotFinalized } from '@audius/common/models'
import { InboxSettingsFormValues } from '@audius/common/store'
import { transformPermitListToMap } from '@audius/common/utils'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconMessage,
  Button,
  Text,
  Flex,
  Checkbox,
  Switch,
  LoadingSpinner
} from '@audius/harmony'
import { ChatPermission } from '@audius/sdk/services'
import { Formik, useField, useFormikContext } from 'formik'

import { useModalState } from 'common/hooks/useModalState'

const messages = {
  title: 'Inbox Settings',
  save: 'Save Changes',
  cancel: 'Cancel',
  error: 'Something went wrong. Please try again.',
  allTitle: 'Allow Messages from Everyone',
  followeeTitle: 'People You Follow',
  followersTitle: 'Your Followers',
  verifiedTitle: 'Verified Users'
}

const options = [
  {
    title: messages.followeeTitle,
    value: ChatPermission.FOLLOWEES
  },
  {
    title: messages.followersTitle,
    value: ChatPermission.FOLLOWERS
  },
  {
    title: messages.verifiedTitle,
    value: ChatPermission.VERIFIED
  }
]

const Spinner = () => (
  <Flex
    justifyContent='center'
    alignItems='center'
    m='xl'
    p='4xl'
    h='unit10'
    css={{
      opacity: 0.5
    }}
  >
    <LoadingSpinner />
  </Flex>
)

const InboxSettingsModal = () => {
  const [isVisible, setIsVisible] = useModalState('InboxSettings')
  const handleClose = useCallback(() => setIsVisible(false), [setIsVisible])

  const {
    permissions,
    doFetchPermissions,
    permissionsStatus,
    savePermissions
  } = useSetInboxPermissions()

  const handleSave = useCallback(
    (values: InboxSettingsFormValues) => {
      savePermissions(values)
      handleClose()
    },
    [handleClose, savePermissions]
  )

  // Fetch the latest permissions for the current user when the modal is made visible
  // Note that this will trigger the following effect as well, causing the permission state to update
  useEffect(() => {
    doFetchPermissions()
  }, [doFetchPermissions])

  const initialValues = useMemo(() => {
    return transformPermitListToMap(
      permissions?.permit_list ?? [ChatPermission.ALL]
    )
  }, [permissions])

  return (
    <Modal onClose={handleClose} isOpen={isVisible} size='medium'>
      <ModalHeader onClose={handleClose}>
        <ModalTitle title={messages.title} icon={<IconMessage />} />
      </ModalHeader>
      {statusIsNotFinalized(permissionsStatus) ? (
        <Spinner />
      ) : (
        <Formik<InboxSettingsFormValues>
          initialValues={initialValues}
          onSubmit={handleSave}
        >
          {({ submitForm, isSubmitting }) => (
            <>
              <ModalContent>
                <InboxSettingsModalFields
                  permissionsStatus={permissionsStatus}
                />
              </ModalContent>
              <ModalFooter>
                <Flex gap='xl' flex={1}>
                  <Button variant='secondary' fullWidth onClick={handleClose}>
                    {messages.cancel}
                  </Button>
                  <Button
                    variant='primary'
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    type='submit'
                    onClick={submitForm}
                    fullWidth
                  >
                    {messages.save}
                  </Button>
                </Flex>
              </ModalFooter>
            </>
          )}
        </Formik>
      )}
    </Modal>
  )
}

const InboxSettingsModalFields = ({
  permissionsStatus
}: {
  permissionsStatus: Status
}) => {
  const { values, setValues } = useFormikContext<InboxSettingsFormValues>()
  const [allowAllField] = useField({
    name: 'all',
    type: 'checkbox'
  })

  const handleAllChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked
      let newValues = {
        ...values,
        all: isChecked
      }
      if (isChecked) {
        newValues = options.reduce((acc, opt) => {
          acc[opt.value as keyof InboxSettingsFormValues] = true
          return acc
        }, newValues)
      }
      setValues(newValues)
    },
    [setValues, values]
  )

  return (
    <Flex column gap='xl'>
      <Flex row gap='l'>
        <Switch {...allowAllField} onChange={handleAllChange} />
        <Text variant='title' size='l'>
          {messages.allTitle}
        </Text>
      </Flex>
      <Flex
        column
        p='l'
        gap='l'
        border='default'
        borderRadius='m'
        css={{ opacity: allowAllField.checked ? 0.5 : 1 }}
      >
        {options.map((opt) => (
          <CheckboxField key={opt.title} {...opt} />
        ))}
      </Flex>
    </Flex>
  )
}

function CheckboxField(props: { title: string; value: ChatPermission }) {
  const { title, value } = props
  const [allowAllField] = useField({ name: 'all', type: 'checkbox' })

  const [field, , { setValue }] = useField({
    name: value,
    type: 'checkbox'
  })

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked
      setValue(isChecked)
    },
    [setValue]
  )

  return (
    <Flex row gap='l' key={title}>
      <Checkbox
        {...field}
        id={title}
        checked={field.checked}
        disabled={allowAllField.checked}
        onChange={handleChange}
      />
      <Text tag='label' htmlFor={title} variant='title' strength='weak'>
        {title}
      </Text>
    </Flex>
  )
}

export default InboxSettingsModal
