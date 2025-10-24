import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useSuggestedArtists, useTopArtistsInGenre } from '@audius/common/api'
import { selectArtistsPageMessages } from '@audius/common/messages'
import { UserMetadata } from '@audius/common/models'
import { selectArtistsSchema } from '@audius/common/schemas'
import { Genre, convertGenreLabelToValue, route } from '@audius/common/utils'
import { Flex, Paper, SelectablePill, Text, useTheme } from '@audius/harmony'
import { animated, useSpring } from '@react-spring/web'
import { Form, Formik, useFormikContext } from 'formik'
import { range } from 'lodash'
import { useDispatch } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { addFollowArtists, signUp } from 'common/store/pages/signon/actions'
import { getGenres } from 'common/store/pages/signon/selectors'
import {
  FollowArtistCard,
  FollowArtistTileSkeleton
} from 'components/follow-artist-card/FollowArtistCard'
import { SelectArtistsPreviewContextProvider } from 'components/follow-artist-card/selectArtistsPreviewContext'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { env } from 'services/env'
import { useSelector } from 'utils/reducer'

import { AccountHeader } from '../components/AccountHeader'
import { PreviewArtistHint } from '../components/PreviewArtistHint'
import {
  Heading,
  HiddenLegend,
  PageFooter,
  ScrollView
} from '../components/layout'

const { SIGN_UP_APP_CTA_PAGE, SIGN_UP_COMPLETED_REDIRECT } = route

const AnimatedFlex = animated(Flex)

type SelectArtistsValues = {
  selectedArtists: string[]
}

const initialValues: SelectArtistsValues = {
  selectedArtists: []
}

// This is a workaround for local dev environments that don't have any artists
// This will ensure any errors set on mount get cleared out
const DevModeClearErrors = () => {
  const { setErrors } = useFormikContext()
  useEffect(() => {
    setErrors({}) // empty all errors
  }, [setErrors])
  return null
}

const ARTISTS_PER_GENRE_LIMIT = 31

export const SelectArtistsPage = () => {
  const artistGenres = useSelector((state) => ['Featured', ...getGenres(state)])
  const [currentGenre, setCurrentGenre] = useState('Featured')
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const { color } = useTheme()
  const headerContainerRef = useRef<HTMLDivElement | null>(null)
  const { isMobile } = useMedia()

  const handleChangeGenre = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCurrentGenre(e.target.value)
  }, [])

  const handleSubmit = useCallback(
    (values: SelectArtistsValues) => {
      const { selectedArtists } = values

      // Only add artists if some were selected
      if (selectedArtists.length > 0) {
        const artistsIDArray = [...selectedArtists].map((a) => Number(a))
        dispatch(addFollowArtists(artistsIDArray))
      }

      // Always create the account (whether artists selected or not)
      dispatch(signUp())

      if (isMobile) {
        navigate(SIGN_UP_COMPLETED_REDIRECT)
      } else {
        navigate(SIGN_UP_APP_CTA_PAGE)
      }
    },
    [dispatch, isMobile, navigate]
  )

  const isFeaturedArtists = currentGenre === 'Featured'

  const { data: topArtists, isPending: isTopArtistsPending } =
    useTopArtistsInGenre(
      { genre: currentGenre, pageSize: ARTISTS_PER_GENRE_LIMIT },
      { enabled: !isFeaturedArtists }
    )

  const { data: featuredArtists, isPending: isFeaturedArtistsPending } =
    useSuggestedArtists({
      enabled: isFeaturedArtists
    })

  const artists = isFeaturedArtists ? featuredArtists : topArtists

  const isLoading = isFeaturedArtists
    ? isFeaturedArtistsPending
    : isTopArtistsPending

  // Note: this doesn't catch when running `web:prod`
  const isDevEnvironment =
    env.ENVIRONMENT === 'development' ||
    window.localStorage.getItem('FORCE_DEV') === 'true'
  // This a workaround flag for local envs that don't have any artists and get stuck at this screen
  const noArtistsSkipValidation =
    (!artists || artists.length === 0) && isDevEnvironment

  const ArtistsList = isMobile ? Flex : Paper

  const styles = useSpring({
    from: {
      opacity: 0,
      transform: 'translateX(100%)'
    },
    to: {
      opacity: 1,
      transform: 'translateX(0%)'
    }
  })
  const formikSchema = toFormikValidationSchema(selectArtistsSchema)

  const artistContent = artists?.length ? (
    artists.map((user) => (
      <FollowArtistCard key={user.user_id} user={user as UserMetadata} />
    ))
  ) : (
    <Flex pv='xl' gap='xs' alignItems='center'>
      <Text variant='body' size='l'>
        {selectArtistsPageMessages.noResults}
      </Text>
      <i className='emoji thinking-face' />
    </Flex>
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      // If using no artists + local dev workaround we just remove all validation
      validationSchema={!noArtistsSkipValidation ? formikSchema : undefined}
      validateOnMount
    >
      {({ values, isValid, isSubmitting, isValidating }) => {
        const { selectedArtists } = values
        return (
          <ScrollView as={Form} gap={isMobile ? undefined : '3xl'}>
            <AccountHeader
              mode='viewing'
              backButtonText={
                isMobile ? undefined : selectArtistsPageMessages.backToGenres
              }
            />
            {noArtistsSkipValidation && !isValid ? (
              <DevModeClearErrors />
            ) : undefined}
            <AnimatedFlex
              direction='column'
              mh={isMobile ? undefined : '5xl'}
              mb={isMobile ? undefined : 'xl'}
              style={styles}
            >
              <Flex
                direction='column'
                gap='xl'
                pt={isMobile ? '2xl' : undefined}
                pb='xl'
                shadow={isMobile ? 'mid' : undefined}
                css={{
                  ...(isMobile && {
                    zIndex: 2,
                    backgroundColor: color.background.white,
                    position: 'sticky',
                    top: headerContainerRef?.current
                      ? -(32 + headerContainerRef.current.clientHeight)
                      : undefined
                  })
                }}
              >
                <Heading
                  ref={headerContainerRef}
                  ph={isMobile ? 'l' : undefined}
                  heading={selectArtistsPageMessages.header}
                  description={selectArtistsPageMessages.description}
                  centered={!isMobile}
                />
                <ScrollView
                  orientation='horizontal'
                  w='100%'
                  gap='s'
                  ph={isMobile ? 'l' : undefined}
                  justifyContent={isMobile ? 'flex-start' : 'center'}
                  role='radiogroup'
                  onChange={handleChangeGenre}
                  aria-label={selectArtistsPageMessages.genresLabel}
                  disableScroll={!isMobile}
                >
                  {artistGenres.map((genre) => {
                    const genreValue = convertGenreLabelToValue(genre as Genre)
                    return (
                      // TODO: max of 6, kebab overflow
                      <SelectablePill
                        key={genre}
                        type='radio'
                        name='genre'
                        label={genreValue}
                        size={isMobile ? 'small' : 'large'}
                        value={genreValue}
                        isSelected={currentGenre === genreValue}
                      />
                    )
                  })}
                </ScrollView>
              </Flex>
              <SelectArtistsPreviewContextProvider>
                <ArtistsList
                  as='fieldset'
                  backgroundColor='default'
                  pv='xl'
                  ph={isMobile ? 'l' : 'xl'}
                  css={{
                    minHeight: 500,
                    minWidth: !isMobile ? 530 : undefined
                  }}
                  direction='column'
                >
                  <HiddenLegend>
                    {selectArtistsPageMessages.pickArtists(currentGenre)}
                  </HiddenLegend>

                  {isLoading || !isMobile ? null : <PreviewArtistHint />}
                  <Flex
                    gap={isMobile ? 's' : 'm'}
                    wrap='wrap'
                    justifyContent='center'
                  >
                    {isLoading
                      ? range(9).map((index) => (
                          <FollowArtistTileSkeleton key={index} />
                        ))
                      : artistContent}
                  </Flex>
                </ArtistsList>
              </SelectArtistsPreviewContextProvider>
            </AnimatedFlex>
            <PageFooter
              centered
              sticky
              buttonProps={{
                disabled: isSubmitting,
                isLoading: isSubmitting || isValidating
              }}
              prefix={
                <Flex direction='column' gap='m' alignItems='center'>
                  <Text variant='body'>
                    {selectArtistsPageMessages.selected}{' '}
                    {selectedArtists.length || 0}/3
                  </Text>
                </Flex>
              }
            />
          </ScrollView>
        )
      }}
    </Formik>
  )
}
