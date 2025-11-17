import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { pickHandleSchema } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import { Paper, useTheme } from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Formik, Form } from 'formik'
import { useDispatch } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { setValueField } from 'common/store/pages/signon/actions'
import {
  getCoverPhotoField,
  getHandleField,
  getProfileImageField
} from 'common/store/pages/signon/selectors'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useSelector } from 'utils/reducer'
import { restrictedHandles } from 'utils/restrictedHandles'

import { AccountHeader } from '../components/AccountHeader'
import { HandleField } from '../components/HandleField'
import { Heading, Page, PageFooter } from '../components/layout'

const { SIGN_UP_FINISH_PROFILE_PAGE } = route

const messages = {
  heading: 'Review Your Handle',
  description:
    "We've connected your social account but need your help with an issue we encountered. "
}

type ReviewHandleValues = {
  handle: string
}

export const ReviewHandlePage = () => {
  const navigate = useNavigateToPage()
  const dispatch = useDispatch()
  const { spacing } = useTheme()

  const { value: handle } = useSelector(getHandleField)

  const coverPhoto = useSelector(getCoverPhotoField)
  const profileImage = useSelector(getProfileImageField)
  const hasImages = coverPhoto || profileImage

  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const validationSchema = useMemo(() => {
    return toFormikValidationSchema(
      pickHandleSchema({ queryContext, queryClient, restrictedHandles })
    )
  }, [queryContext, queryClient])

  const handleSubmit = useCallback(
    (values: ReviewHandleValues) => {
      const { handle } = values
      dispatch(setValueField('handle', handle))
      navigate(SIGN_UP_FINISH_PROFILE_PAGE)
    },
    [dispatch, navigate]
  )

  const initialValues = {
    handle
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      validateOnMount
    >
      {({ isValid }) => (
        <Page as={Form} transition='horizontal' centered>
          <Heading
            heading={messages.heading}
            description={messages.description}
          />
          {hasImages ? (
            <Paper gap='xl' direction='column'>
              <AccountHeader mode='viewing' size='small' isPaperHeader />
              <HandleField autoFocus css={{ padding: spacing.l }} />
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
