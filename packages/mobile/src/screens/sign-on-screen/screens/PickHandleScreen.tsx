import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { pickHandlePageMessages } from '@audius/common/messages'
import { pickHandleSchema } from '@audius/common/schemas'
import { useQueryClient } from '@tanstack/react-query'
import { setValueField } from 'common/store/pages/signon/actions'
import { Formik } from 'formik'
import { useDispatch } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Flex } from '@audius/harmony-native'
import { ScrollView } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

import { HandleField } from '../components/HandleField'
import { Heading, Page, PageFooter } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'
import type { SignOnScreenParamList } from '../types'
import { restrictedHandles } from '../utils/restrictedHandles'
import { useTrackScreen } from '../utils/useTrackScreen'

type PickHandleValues = {
  handle: string
}

const initialValues = {
  handle: ''
}

export const PickHandleScreen = () => {
  const navigation = useNavigation<SignOnScreenParamList>()
  const dispatch = useDispatch()
  const isFastReferral = useFastReferral()
  useTrackScreen('PickHandle')

  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const validationSchema = useMemo(
    () =>
      toFormikValidationSchema(
        pickHandleSchema({ queryContext, queryClient, restrictedHandles })
      ),
    [queryContext, queryClient]
  )

  const handleSubmit = useCallback(
    (values: PickHandleValues) => {
      const { handle } = values
      dispatch(setValueField('handle', handle))
      if (isFastReferral) {
        dispatch(setValueField('name', handle))
      }
      navigation.navigate('FinishProfile')
    },
    [dispatch, isFastReferral, navigation]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      validateOnChange={false}
    >
      <Page>
        <ScrollView>
          <Flex direction='column' gap='l'>
            <Heading
              heading={pickHandlePageMessages.title}
              description={pickHandlePageMessages.description}
            />
            <HandleField />
          </Flex>
        </ScrollView>
        <PageFooter />
      </Page>
    </Formik>
  )
}
