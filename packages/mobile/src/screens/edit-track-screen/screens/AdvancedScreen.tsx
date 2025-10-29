import { useFeatureFlag } from '@audius/common/hooks'
import { advancedTrackMessages as messages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import { useField } from 'formik'

import { IconIndent } from '@audius/harmony-native'
import { SwitchRowField } from 'app/components/fields'
import { FormScreen } from 'app/screens/form-screen'

import {
  IsrcField,
  LicenseTypeField,
  ReleaseDateField,
  SubmenuList
} from '../fields'
import { CoverAttributionField } from '../fields/CoverAttributionField'
import { KeyBpmField } from '../fields/KeyBpmField'

export const AdvancedScreen = () => {
  const [{ value: isUpload }] = useField('isUpload')
  const [{ value: isUnlisted }] = useField('is_unlisted')
  const { isEnabled: isCommentsEnabled } = useFeatureFlag(
    FeatureFlags.COMMENTS_ENABLED
  )

  return (
    <FormScreen
      title={messages.title}
      icon={IconIndent}
      bottomSection={null}
      variant='white'
    >
      <SubmenuList>
        {isUnlisted ? <></> : <ReleaseDateField />}
        {isUpload ? <></> : <KeyBpmField />}
        {isCommentsEnabled ? (
          <SwitchRowField
            name='comments_disabled'
            label={messages.disableComments.header}
            description={messages.disableComments.description}
          />
        ) : (
          <></>
        )}
        <LicenseTypeField />
        <IsrcField />
        <CoverAttributionField />
      </SubmenuList>
    </FormScreen>
  )
}
