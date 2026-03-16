import { useFirstAvailableBlastAudience } from '@audius/common/hooks'
import { chatActions } from '@audius/common/store'
import { ChatBlastAudience } from '@audius/sdk/services'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Formik } from 'formik'
import { useDispatch } from 'react-redux'

import { useAppScreenOptions } from 'app/screens/app-screen/useAppScreenOptions'

import { ChatBlastSelectAudienceScreen } from './ChatBlastSelectAudienceScreen'
import { ChatBlastSelectContentScreen } from './ChatBlastSelectContentScreen'

const { createChatBlast } = chatActions

const Stack = createNativeStackNavigator()

const screenOptionOverrides = { headerRight: () => null }

type PurchasableContentOption = {
  contentId: number
  contentType: 'track' | 'album'
}
type ChatBlastFormValues = {
  target_audience: ChatBlastAudience | null
  purchased_content_metadata?: PurchasableContentOption
  remixed_track_id?: number
}

export const CreateChatBlastNavigator = () => {
  const dispatch = useDispatch()
  const screenOptions = useAppScreenOptions(screenOptionOverrides)
  const defaultAudience = useFirstAvailableBlastAudience()
  const initialValues: ChatBlastFormValues = {
    target_audience: defaultAudience,
    purchased_content_metadata: undefined,
    remixed_track_id: undefined
  }

  const handleSubmit = (values: ChatBlastFormValues) => {
    const audienceContentId =
      values.target_audience === ChatBlastAudience.CUSTOMERS
        ? values.purchased_content_metadata?.contentId
        : values.remixed_track_id
    const audienceContentType =
      values.target_audience === ChatBlastAudience.REMIXERS
        ? 'track'
        : values.purchased_content_metadata?.contentType
    dispatch(
      createChatBlast({
        audience: values.target_audience ?? ChatBlastAudience.FOLLOWERS,
        audienceContentId,
        audienceContentType
      })
    )
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Group screenOptions={screenOptions}>
          <Stack.Screen
            name='ChatBlastSelectAudience'
            component={ChatBlastSelectAudienceScreen}
          />
          <Stack.Screen
            name='ChatBlastSelectContent'
            component={ChatBlastSelectContentScreen}
          />
        </Stack.Group>
      </Stack.Navigator>
    </Formik>
  )
}
