import { useCallback, useState } from 'react'

import { selectArtistsPageMessages } from '@audius/common/messages'
import {
  addFollowArtists,
  signUp,
  completeFollowArtists
} from '@audius/web/src/common/store/pages/signon/actions'
import { getFollowIds, getGenres } from 'common/store/pages/signon/selectors'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, Text } from '@audius/harmony-native'
import { createCollapsibleTabNavigator } from 'app/components/top-tab-bar/createCollapsibleTabNavigator'
import { useNavigation } from 'app/hooks/useNavigation'

import { ReadOnlyAccountHeader } from '../../components/AccountHeader'
import { Heading, PageFooter } from '../../components/layout'
import type { SignOnScreenParamList } from '../../types'
import { useTrackScreen } from '../../utils/useTrackScreen'

import { SelectedGenresTabBar } from './SelectedGenresTabBar'
import { TopArtistsCardList } from './TopArtistsCardList'
import { SelectArtistsPreviewContextProvider } from './selectArtistPreviewContext'

const Tab = createCollapsibleTabNavigator()

// Note for this screen we are not using Formik due to performance issues, and using redux instead.
export const SelectArtistsScreen = () => {
  const genres = useSelector((state: any) => [
    'Featured',
    ...(getGenres(state) ?? [])
  ])

  const selectedArtists = useSelector(getFollowIds)
  const dispatch = useDispatch()
  const navigation = useNavigation<SignOnScreenParamList>()
  useTrackScreen('SelectArtists')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const renderHeader = useCallback(
    () => (
      <Flex pointerEvents='none' backgroundColor='white'>
        <ReadOnlyAccountHeader />
        <Heading
          heading={selectArtistsPageMessages.header}
          description={selectArtistsPageMessages.description}
          gap='s'
          ph='l'
          pv='unit10'
          pb='s'
        />
      </Flex>
    ),
    []
  )

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true)

    // Only add artists if some were selected
    if (selectedArtists.length > 0) {
      dispatch(addFollowArtists(selectedArtists))
      dispatch(completeFollowArtists())
    }

    // Always create the account (whether artists selected or not)
    dispatch(signUp())
    navigation.navigate('AccountLoading')
  }, [dispatch, navigation, selectedArtists])

  return (
    <SelectArtistsPreviewContextProvider>
      <Flex flex={1} pb='l'>
        <Tab.Navigator
          renderTabBar={(props) => <SelectedGenresTabBar {...props} />}
          renderHeader={renderHeader}
          headerHeight={244}
          snapThreshold={null}
        >
          {genres.map((genre) => (
            <Tab.Screen
              key={genre}
              name={genre}
              component={TopArtistsCardList}
            />
          ))}
        </Tab.Navigator>
        <PageFooter
          buttonProps={{
            disabled: isSubmitting,
            isLoading: isSubmitting,
            onPress: handleSubmit
          }}
          prefix={
            <Flex direction='column' gap='m' alignItems='center'>
              <Text variant='body'>
                {selectArtistsPageMessages.selected}{' '}
                {selectedArtists.length || 0}
                /3
              </Text>
            </Flex>
          }
        />
      </Flex>
    </SelectArtistsPreviewContextProvider>
  )
}
