import { useCallback } from 'react'

import { useTopArtists } from '@audius/common/api'
import { feedPageActions } from '@audius/common/store'
import {
  Box,
  Button,
  Flex,
  IconUserFollow,
  Text,
  useTheme
} from '@audius/harmony'
import { Form, Formik } from 'formik'
import { useDispatch } from 'react-redux'

import { FollowArtistCard } from 'components/follow-artist-card/FollowArtistCard'
import { SelectArtistsPreviewContextProvider } from 'components/follow-artist-card/selectArtistsPreviewContext'

const messages = {
  title: 'Follow users to personalize your feed',
  instruction: "Let's fix that by following some of these artists!"
}

type FollowUsersValues = {
  selectedArtists: string[]
}

const initialValues: FollowUsersValues = {
  selectedArtists: []
}

const MobileWebEmptyFeed = () => {
  const { spacing } = useTheme()
  const dispatch = useDispatch()

  const { data: featuredArtists } = useTopArtists('Featured')

  const handleSubmit = useCallback(
    (values: FollowUsersValues) => {
      const { selectedArtists } = values
      const followUsers = selectedArtists.map((id) => parseInt(id))
      dispatch(feedPageActions.followUsers(followUsers))
    },
    [dispatch]
  )

  return (
    <SelectArtistsPreviewContextProvider>
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {({ values }) => (
          <Form>
            <Flex
              direction='column'
              alignItems='center'
              ph='l'
              pv='xl'
              gap='xl'
            >
              <Flex direction='column' alignItems='center' gap='l'>
                <Text variant='heading' size='m' textAlign='center'>
                  {messages.title}
                </Text>
                <Text variant='body' textAlign='center' color='subdued'>
                  {messages.instruction}
                </Text>
              </Flex>

              {featuredArtists && featuredArtists.length > 0 && (
                <Box
                  w='100%'
                  css={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: spacing.s
                  }}
                >
                  {featuredArtists.slice(0, 6).map((artist) => (
                    <Box key={artist.user_id} w='100%'>
                      <FollowArtistCard user={artist} mobileWidth='100%' />
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                variant='primary'
                size='large'
                type='submit'
                disabled={values.selectedArtists.length === 0}
                iconLeft={IconUserFollow}
                fullWidth
              >
                Follow Selected Artists
              </Button>
            </Flex>
          </Form>
        )}
      </Formik>
    </SelectArtistsPreviewContextProvider>
  )
}

export default MobileWebEmptyFeed
