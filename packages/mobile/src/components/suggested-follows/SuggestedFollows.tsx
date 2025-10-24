import { useCallback } from 'react'

import { feedPageActions, feedPageLineupActions } from '@audius/common/store'
import * as signOnActions from 'common/store/pages/signon/actions'
import { getFollowIds } from 'common/store/pages/signon/selectors'
import { Dimensions, FlatList, ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Text } from 'app/components/core'
import { makeStyles } from 'app/styles'

import { ContinueButton } from './ContinueButton'
import { SuggestedArtistsList } from './SuggestedArtistsList'

const { height } = Dimensions.get('window')

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: {
    flex: 1,
    height: height - 220
  },
  header: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(6),
    borderBottomWidth: 1,
    borderColor: palette.neutralLight6,
    backgroundColor: palette.white
  },
  title: {
    textAlign: 'center'
  },
  instruction: {
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: spacing(4),
    paddingHorizontal: spacing(4)
  }
}))

const messages = {
  title: `Follow users to personalize your feed`,
  instruction: `Let's fix that by following some of these artists!`
}

export const SuggestedFollows = () => {
  const styles = useStyles()
  const dispatch = useDispatch()

  const selectedUserIds = useSelector(getFollowIds)

  const handleArtistsSelected = useCallback(() => {
    // Set eager users and refetch lineup
    dispatch(signOnActions.followArtists())
    dispatch(feedPageLineupActions.fetchLineupMetadatas())
    // Async go follow users
    dispatch(feedPageActions.followUsers(selectedUserIds))
  }, [dispatch, selectedUserIds])

  const headerElement = (
    <>
      <View style={styles.header}>
        <Text variant='h1' color='secondary' style={styles.title}>
          {messages.title}
        </Text>
        <Text variant='body1' style={styles.instruction}>
          {messages.instruction}
        </Text>
      </View>
    </>
  )

  return (
    <View style={styles.root}>
      <ScrollView>
        <SuggestedArtistsList
          FlatListComponent={FlatList}
          ListHeaderComponent={headerElement}
        />
      </ScrollView>
      <ContinueButton onPress={handleArtistsSelected} />
    </View>
  )
}
