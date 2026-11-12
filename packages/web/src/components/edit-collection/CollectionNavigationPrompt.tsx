import { useFormikContext } from 'formik'

import { NavigationPrompt } from 'components/navigation-prompt/NavigationPrompt'

const messages = {
  uploadNavigationPrompt: {
    title: 'Leave upload?',
    body: 'Your upload is saved as a draft on this device. Come back to the upload page to pick up where you left off.',
    cancel: 'Stay',
    proceed: 'Leave'
  },
  editNavigationPrompt: {
    title: 'Discard Edit?',
    body: "Are you sure you want to leave this page?\nAny changes you've made will be lost.",
    cancel: 'Cancel',
    proceed: 'Discard'
  }
}

type CollectionNavigationPromptProps = {
  isUpload?: boolean
  disabled?: boolean
}

export const CollectionNavigationPrompt = (
  props: CollectionNavigationPromptProps
) => {
  const { isUpload, disabled } = props
  const { dirty, isSubmitting } = useFormikContext()
  return (
    <NavigationPrompt
      when={dirty && !isSubmitting && !disabled}
      blockInAppNavigation={isUpload}
      messages={
        isUpload
          ? messages.uploadNavigationPrompt
          : messages.editNavigationPrompt
      }
    />
  )
}
