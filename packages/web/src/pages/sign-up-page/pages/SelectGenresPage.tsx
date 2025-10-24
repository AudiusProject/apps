import { MouseEventHandler, useCallback, useState } from 'react'

import { selectGenresPageMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { selectableGenres, selectGenresSchema } from '@audius/common/schemas'
import { Genre, route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { make } from 'common/store/analytics/actions'
import { setField } from 'common/store/pages/signon/actions'
import { getGenres } from 'common/store/pages/signon/selectors'
import { SelectablePillField } from 'components/form-fields/SelectablePillField'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { AccountHeader } from '../components/AccountHeader'
import { SkipButton } from '../components/SkipButton'
import { Heading, Page, PageFooter, ScrollView } from '../components/layout'

const { SIGN_UP_ARTISTS_PAGE } = route

type SelectGenresValue = { genres: Genre[] }

export const SelectGenresPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()

  const [currentGenres, setCurrentGenres] = useState<Genre[]>([])
  const savedGenres = useSelector(getGenres)
  const { isMobile } = useMedia()

  const initialValues: SelectGenresValue = {
    genres: (savedGenres as Genre[]) ?? []
  }
  const handleSubmit = useCallback(
    (values: SelectGenresValue) => {
      const { genres } = values
      dispatch(setField('genres', genres))
      navigate(SIGN_UP_ARTISTS_PAGE)
    },
    [dispatch, navigate]
  )

  const handleOnClick =
    (label: string): MouseEventHandler<HTMLInputElement> =>
    (e) => {
      if ((e.target as HTMLInputElement).checked) {
        // add to genres list
        const newGenres = [...currentGenres, label as Genre]
        dispatch(
          make(Name.CREATE_ACCOUNT_SELECT_GENRE, {
            genre: label,
            selectedGenres: newGenres
          })
        )
        setCurrentGenres(newGenres)
      } else {
        // remove from genres list
        const newGenres = [...currentGenres]
        const genreIndex = currentGenres.indexOf(label as Genre)
        newGenres.splice(genreIndex, 1)
        setCurrentGenres(newGenres)
      }
    }

  return (
    <ScrollView gap={isMobile ? '2xl' : '3xl'}>
      <AccountHeader mode='viewing' />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(selectGenresSchema)}
        validateOnMount
      >
        {() => (
          <Page
            as={Form}
            centered
            css={{ paddingTop: 0 }}
            transition='horizontal'
          >
            <Flex
              direction='column'
              gap='2xl'
              css={!isMobile ? { maxWidth: '641px' } : undefined}
            >
              <Heading
                heading={selectGenresPageMessages.header}
                description={selectGenresPageMessages.description}
                alignItems={!isMobile ? 'center' : undefined}
              />
              <Flex
                justifyContent={isMobile ? 'flex-start' : 'center'}
                alignItems='flex-start'
                gap='s'
                wrap='wrap'
              >
                {selectableGenres.map((genre) => {
                  const { label, value } = genre
                  return (
                    <SelectablePillField
                      key={label}
                      name='genres'
                      label={label}
                      value={value}
                      size='large'
                      type='checkbox'
                      onClick={handleOnClick(label)}
                    />
                  )
                })}
              </Flex>
            </Flex>
            <PageFooter centered sticky postfix={<SkipButton />} />
          </Page>
        )}
      </Formik>
    </ScrollView>
  )
}
