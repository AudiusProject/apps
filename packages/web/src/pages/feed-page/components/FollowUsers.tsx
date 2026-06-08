import { useCallback } from 'react'

import { useTopArtists } from '@audius/common/api'
import { FollowSource } from '@audius/common/models'
import { usersSocialActions } from '@audius/common/store'
import { Button, Flex, IconUserFollow, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { useDispatch } from 'react-redux'

import { FollowArtistCard } from 'components/follow-artist-card/FollowArtistCard'
import { SelectArtistsPreviewContextProvider } from 'components/follow-artist-card/selectArtistsPreviewContext'

const messages = {
  cta: `Let’s fix that by following some of these artists!`,
  noFollowers: `Your feed is empty`
}

type FollowUsersValues = {
  selectedArtists: string[]
}

const initialValues: FollowUsersValues = {
  selectedArtists: []
}

const FollowUsers = () => {
  const dispatch = useDispatch()

  const { data: featuredArtists } = useTopArtists('Featured')

  const handleSubmit = useCallback(
    (values: FollowUsersValues) => {
      const { selectedArtists } = values
      selectedArtists.forEach((id) => {
        dispatch(
          usersSocialActions.followUser(parseInt(id), FollowSource.EMPTY_FEED)
        )
      })
    },
    [dispatch]
  )

  return (
    <SelectArtistsPreviewContextProvider>
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {({ values }) => (
          <Form>
            <Flex direction='column' alignItems='center' mb='xl'>
              <Text variant='body'>
                {messages.noFollowers}{' '}
                <i className='emoji face-screaming-in-fear' />
              </Text>
              <Text variant='body'>{messages.cta}</Text>
            </Flex>
            <Flex
              inline
              w='100%'
              justifyContent='center'
              wrap='wrap'
              gap='m'
              m='s'
            >
              {featuredArtists?.map((artist) => (
                <FollowArtistCard key={artist.user_id} user={artist} />
              ))}
            </Flex>
            <Flex justifyContent='center' p='l'>
              <Button
                variant='primary'
                type='submit'
                disabled={values.selectedArtists.length === 0}
                iconLeft={IconUserFollow}
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

export default FollowUsers
