import { memo, useCallback, useEffect, useState } from 'react'

import { selectGenresPageMessages } from '@audius/common/messages'
import { selectableGenres, selectGenresSchema } from '@audius/common/schemas'
import type { GENRES } from '@audius/common/utils'
import type { Genre as SDKGenre } from '@audius/sdk'
import { setField, setFinishedPhase1 } from 'common/store/pages/signon/actions'
import { Formik, useField } from 'formik'
import { ScrollView, View } from 'react-native'
import { useDispatch } from 'react-redux'
import { useEffectOnce } from 'react-use'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Box, Flex, Paper, SelectablePill } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { make, track } from 'app/services/analytics'
import { EventNames } from 'app/types/analytics'

import { ReadOnlyAccountHeader } from '../components/AccountHeader'
import { SkipButton } from '../components/SkipButton'
import { Heading, PageFooter, gutterSize } from '../components/layout'
import type { SignOnScreenParamList } from '../types'
import { useTrackScreen } from '../utils/useTrackScreen'

type Genre = (typeof GENRES)[number]
type SelectGenresValue = { genres: typeof GENRES }

const initialValues: SelectGenresValue = { genres: [] }

/* Memoized SelectablePill to fix a performance issue.
 * The code below is arranged so that the pills don't need to re-render,
 * And the memoization here is just forcing it to never re-render. */
const MemoSelectablePill = memo(
  SelectablePill,
  (prevProps, nextProps) => prevProps.isSelected === nextProps.isSelected
)

const SelectGenresFieldArray = () => {
  // Storing values as state alongside Formik purely because setState provides access to the previous values
  const [formValues, setFormValues] = useState<SelectGenresValue['genres']>(
    initialValues.genres
  )
  const [, , { setValue }] = useField('genres')

  useTrackScreen('SelectGenre')

  // Update formik state to match our React state
  useEffect(() => {
    setValue(formValues)
  }, [formValues, setValue])

  // memoized handle press just handles the React state change
  const handlePress = (genreValue: Genre) => {
    setFormValues((prevValues) => {
      const newValues = [...prevValues]
      track(
        make({
          eventName: EventNames.CREATE_ACCOUNT_SELECT_GENRE,
          genre: genreValue as SDKGenre,
          selectedGenres: newValues as SDKGenre[]
        })
      )
      const valueIndex = newValues.indexOf(genreValue)
      if (valueIndex > -1) {
        newValues.splice(valueIndex, 1)
      } else {
        newValues.push(genreValue)
      }
      return newValues
    })
  }

  return (
    <View>
      <Flex gap='s' direction='row' wrap='wrap'>
        {selectableGenres.map((genre) => (
          <MemoSelectablePill
            type='checkbox'
            label={genre.label}
            onPress={() => {
              handlePress(genre.value)
            }}
            isSelected={formValues.includes(genre.value)}
            key={genre.value}
          />
        ))}
      </Flex>
      {/* TODO improved sticky footer and header */}
      <Box h={80} />
    </View>
  )
}

export const SelectGenresScreen = () => {
  const dispatch = useDispatch()
  const navigation = useNavigation<SignOnScreenParamList>()

  useEffectOnce(() => {
    dispatch(setFinishedPhase1(true))
  })

  const handleSubmit = useCallback(
    (values: SelectGenresValue) => {
      const genres = values.genres
      dispatch(setField('genres', genres))
      navigation.navigate('SelectArtists')
    },
    [dispatch, navigation]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validateOnBlur
      validateOnChange
      validationSchema={toFormikValidationSchema(selectGenresSchema)}
    >
      <View>
        <ScrollView testID='genreScrollView'>
          <Paper flex={1} gap='2xl' pb='2xl'>
            <ReadOnlyAccountHeader />
            <Flex ph={gutterSize} gap='2xl' flex={1}>
              <Heading
                heading={selectGenresPageMessages.header}
                description={selectGenresPageMessages.description}
              />
              <SelectGenresFieldArray />
            </Flex>
          </Paper>
        </ScrollView>
        <PageFooter
          buttonProps={{ disabled: false }}
          postfix={<SkipButton />}
        />
      </View>
    </Formik>
  )
}
