import { useEffect } from 'react'

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
  const [{ value: commentsDisabled }] = useField<boolean>('comments_disabled')
  const [{ value: feedbackRequested }, , { setValue: setFeedbackRequested }] =
    useField<boolean | undefined>('feedback_requested')
  const { isEnabled: isFeedbackEnabled } = useFeatureFlag(
    FeatureFlags.TRACK_FEEDBACK_REQUESTS
  )

  // Feedback comes in as comments, so it can't stay on without them.
  useEffect(() => {
    if (commentsDisabled && feedbackRequested) {
      setFeedbackRequested(false)
    }
  }, [commentsDisabled, feedbackRequested, setFeedbackRequested])

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
        <SwitchRowField
          name='comments_disabled'
          label={messages.disableComments.header}
          description={messages.disableComments.description}
        />
        {isFeedbackEnabled && !commentsDisabled && !isUnlisted ? (
          <SwitchRowField
            name='feedback_requested'
            label={messages.feedbackRequested.header}
            description={messages.feedbackRequested.description}
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
