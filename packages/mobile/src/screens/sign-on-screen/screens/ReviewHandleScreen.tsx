import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { reviewHandlePageMessages } from '@audius/common/messages'
import { pickHandleSchema } from '@audius/common/schemas'
import { setValueField } from '@audius/web/src/common/store/pages/signon/actions'
import {
  getCoverPhotoField,
  getHandleField,
  getProfileImageField
} from '@audius/web/src/common/store/pages/signon/selectors'
import { useQueryClient } from '@tanstack/react-query'
import { Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Paper } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import { ReadOnlyAccountHeader } from '../components/AccountHeader'
import { HandleField } from '../components/HandleField'
import { Heading, Page, PageFooter } from '../components/layout'
import type { SignOnScreenParamList } from '../types'
import { restrictedHandles } from '../utils/restrictedHandles'
import { useTrackScreen } from '../utils/useTrackScreen'

type ReviewHandleValues = {
  handle: string
}

// Users land here if their handle doesn't work with our validation for some reason
export const ReviewHandleScreen = () => {
  const dispatch = useDispatch()
  const { value: handle } = useSelector(getHandleField)
  const coverPhoto = useSelector(getCoverPhotoField)
  const profileImage = useSelector(getProfileImageField)
  const hasImages = coverPhoto || profileImage
  const initialValues = {
    handle
  }
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const navigation = useNavigation<SignOnScreenParamList>()

  const validationSchema = useMemo(() => {
    return toFormikValidationSchema(
      pickHandleSchema({ queryContext, queryClient, restrictedHandles })
    )
  }, [queryContext, queryClient])

  useTrackScreen('ReviewHandle')

  const handleSubmit = useCallback(
    (values: ReviewHandleValues) => {
      const { handle } = values
      dispatch(setValueField('handle', handle))
      navigation.navigate('FinishProfile')
    },
    [dispatch, navigation]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      validateOnMount
      validateOnChange={false}
      initialTouched={{ handle: true }}
    >
      {({ isValid }) => (
        <Page>
          <Heading
            heading={reviewHandlePageMessages.heading}
            description={reviewHandlePageMessages.description}
          />
          {hasImages ? (
            <Paper gap='xl' direction='column'>
              <ReadOnlyAccountHeader />
              <HandleField />
            </Paper>
          ) : (
            <HandleField />
          )}
          <PageFooter buttonProps={{ disabled: !isValid }} />
        </Page>
      )}
    </Formik>
  )
}
