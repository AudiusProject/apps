import { createNativeStackNavigator } from '@react-navigation/native-stack'

import {
  PriceAndAudienceScreen,
  priceAndAudienceScreenName
} from 'app/components/edit/PriceAndAudienceField'
import { VisibilityScreen } from 'app/components/edit/VisibilityField'
import { SupportersInfoDrawer } from 'app/components/supporters-info-drawer'
import { useAppScreenOptions } from 'app/screens/app-screen/useAppScreenOptions'

import { messages as completeMessages } from '../upload-screen/screens/CompleteTrackScreen'

import { EditTrackForm } from './EditTrackForm'
import { ReplaceTrackConfirmationDrawer } from './components'
import { EarlyReleaseConfirmationDrawer } from './components/EarlyReleaseConfirmationDrawer'
import { EditAccessConfirmationDrawer } from './components/EditAccessConfirmationDrawer'
import { HideContentConfirmationDrawer } from './components/HideContentConfirmationDrawer'
import { PublishConfirmationDrawer } from './components/PublishConfirmationDrawer'
import {
  AdvancedScreen,
  IsrcIswcScreen,
  LicenseTypeScreen,
  RemixSettingsScreen,
  SelectGenreScreen,
  SelectMoodScreen,
  ReleaseDateScreen,
  KeyBpmScreen
} from './screens'
import { CoverAttributionScreen } from './screens/CoverAttributionScreen'
import { SelectKeyScreen } from './screens/SelectKeyScreen'
import type { EditTrackFormProps } from './types'

const Stack = createNativeStackNavigator()

const screenOptionOverrides = { headerRight: () => null }

type EditTrackNavigatorProps = EditTrackFormProps

export const EditTrackNavigator = (props: EditTrackNavigatorProps) => {
  const { doneText, initialValues, isUpload } = props
  const screenOptions = useAppScreenOptions(screenOptionOverrides)

  return (
    <>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name='CompleteTrackForm'>
          {() => <EditTrackForm {...props} />}
        </Stack.Screen>
        <Stack.Screen name='SelectGenre' component={SelectGenreScreen} />
        <Stack.Screen name='SelectMood' component={SelectMoodScreen} />
        <Stack.Screen name='SelectKey' component={SelectKeyScreen} />
        <Stack.Screen name='RemixSettings' component={RemixSettingsScreen} />
        <Stack.Screen
          name='ReleaseDate'
          component={ReleaseDateScreen}
          initialParams={{
            isInitiallyUnlisted:
              doneText === completeMessages.done
                ? true
                : initialValues.is_unlisted
          }}
        />
        <Stack.Screen name='Visibility' component={VisibilityScreen} />
        <Stack.Screen name='Advanced' component={AdvancedScreen} />
        <Stack.Screen
          name={priceAndAudienceScreenName}
          component={PriceAndAudienceScreen}
        />
        <Stack.Screen name='IsrcIswc' component={IsrcIswcScreen} />
        <Stack.Screen name='LicenseType' component={LicenseTypeScreen} />
        <Stack.Screen name='KeyBpm' component={KeyBpmScreen} />
        <Stack.Screen
          name='CoverAttribution'
          component={CoverAttributionScreen}
        />
      </Stack.Navigator>
      <SupportersInfoDrawer />
      <EditAccessConfirmationDrawer />
      <HideContentConfirmationDrawer />
      <PublishConfirmationDrawer />
      <EarlyReleaseConfirmationDrawer />
      {isUpload ? null : <ReplaceTrackConfirmationDrawer />}
    </>
  )
}
