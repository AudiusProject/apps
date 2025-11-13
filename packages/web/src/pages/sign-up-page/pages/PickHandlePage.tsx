import { useCallback, useMemo, useRef } from 'react'

import { useQueryContext } from '@audius/common/api'
import { pickHandlePageMessages } from '@audius/common/messages'
import { pickHandleSchema } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { setValueField } from 'common/store/pages/signon/actions'
import { getHandleField } from 'common/store/pages/signon/selectors'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { restrictedHandles } from 'utils/restrictedHandles'

import { HandleField } from '../components/HandleField'
import { OutOfText } from '../components/OutOfText'
import { Heading, Page, PageFooter } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'

const { SIGN_UP_FINISH_PROFILE_PAGE } = route

type PickHandleValues = {
  handle: string
}

export const PickHandlePage = () => {
  const { isMobile } = useMedia()
  const dispatch = useDispatch()
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const navigate = useNavigateToPage()

  const handleInputRef = useRef<HTMLInputElement>(null)

  const { value: handle } = useSelector(getHandleField)
  const isFastReferral = useFastReferral()

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
      navigate(SIGN_UP_FINISH_PROFILE_PAGE)
    },
    [dispatch, isFastReferral, navigate]
  )

  const initialValues = {
    handle
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      validateOnChange={false}
    >
      <Page
        as={Form}
        centered
        transitionBack='vertical'
        autoFocusInputRef={handleInputRef}
      >
        <Heading
          prefix={isMobile ? null : <OutOfText numerator={1} denominator={2} />}
          heading={pickHandlePageMessages.title}
          description={pickHandlePageMessages.description}
          centered={!isMobile}
        />
        <Flex direction='column' gap={isMobile ? 'l' : 'xl'}>
          <HandleField ref={handleInputRef} />
        </Flex>
        <PageFooter centered sticky />
      </Page>
    </Formik>
  )
}
