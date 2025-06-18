import { useEffect } from 'react'

import { Status } from '@audius/common/models'
import {
  explorePageCollectionsSelectors,
  explorePageCollectionsActions,
  ExploreCollectionsVariant
} from '@audius/common/store'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { CollectionList } from 'app/components/collection-list'
import { Screen, ScreenContent, ScreenHeader } from 'app/components/core'
import { WithLoader } from 'app/components/with-loader/WithLoader'
import { spacing } from 'app/styles/spacing'

import { LET_THEM_DJ } from '../../collections'
const { getCollectionIds, getStatus } = explorePageCollectionsSelectors
const { fetch } = explorePageCollectionsActions

export const LetThemDJScreen = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetch({ variant: ExploreCollectionsVariant.LET_THEM_DJ }))
  }, [dispatch])

  const status = useSelector((state) =>
    getStatus(state, { variant: ExploreCollectionsVariant.LET_THEM_DJ })
  )

  const collectionIds = useSelector((state) =>
    getCollectionIds(state, { variant: ExploreCollectionsVariant.LET_THEM_DJ })
  )

  return (
    <Screen>
      <ScreenHeader text={LET_THEM_DJ.title} />
      <ScreenContent>
        <View style={{ flex: 1 }}>
          <WithLoader loading={status === Status.LOADING}>
            <CollectionList
              style={{ paddingTop: spacing(3) }}
              collectionIds={collectionIds}
            />
          </WithLoader>
        </View>
      </ScreenContent>
    </Screen>
  )
}
