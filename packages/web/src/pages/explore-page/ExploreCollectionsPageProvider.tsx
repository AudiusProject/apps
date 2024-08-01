import { useEffect, useState, ComponentType } from 'react'

import {
  explorePageCollectionsSelectors,
  explorePageCollectionsActions,
  ExploreCollectionsVariant
} from '@audius/common/store'
import { connect } from 'react-redux'
import { matchPath } from 'react-router'
import { useHistory } from 'react-router-dom'
import { Dispatch } from 'redux'

import { AppState } from 'store/types'
import { EXPLORE_MOOD_PLAYLISTS_PAGE, getPathname } from 'utils/route'

import {
  EXPLORE_COLLECTIONS_MAP,
  ExploreCollection,
  ExploreMoodCollection,
  EXPLORE_MOOD_COLLECTIONS_MAP
} from './collections'
import { CollectionsPageProps as DesktopCollectionsPageProps } from './components/desktop/CollectionsPage'
import { CollectionsPageProps as MobileCollectionsPageProps } from './components/mobile/CollectionsPage'

const { fetch } = explorePageCollectionsActions
const { getCollectionIds, getStatus } = explorePageCollectionsSelectors

type OwnProps = {
  variant: ExploreCollectionsVariant
  children:
    | ComponentType<MobileCollectionsPageProps>
    | ComponentType<DesktopCollectionsPageProps>
}

type ExploreCollectionsPageProviderProps = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const ExploreCollectionsPageProvider = ({
  variant,
  collectionIds,
  status,
  fetch,
  children: Children
}: ExploreCollectionsPageProviderProps) => {
  const { location } = useHistory()
  const match = matchPath<{
    mood: string
  }>(getPathname(location), {
    path: EXPLORE_MOOD_PLAYLISTS_PAGE
  })
  const [info, setInfo] = useState<
    ExploreCollection | ExploreMoodCollection | null
  >(null)

  useEffect(() => {
    if (variant === ExploreCollectionsVariant.MOOD) {
      // Mood playlist
      if (match?.params.mood) {
        const collectionInfo = EXPLORE_MOOD_COLLECTIONS_MAP[match.params.mood]
        fetch(variant, collectionInfo.moods)
        setInfo(collectionInfo)
      }
    } else if (variant === ExploreCollectionsVariant.DIRECT_LINK) {
      // no-op
    } else {
      // Other playlist/albums types (e.g. Top Playlist)
      fetch(variant)
      setInfo(EXPLORE_COLLECTIONS_MAP[variant])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, fetch])

  const title = info
    ? info.variant === ExploreCollectionsVariant.MOOD
      ? `${info.title} Playlists`
      : info.title
    : ''
  const description = info ? info.subtitle || '' : ''

  const childProps = {
    title,
    description,
    collectionIds,
    status
  }

  return <Children {...childProps} />
}

function mapStateToProps(state: AppState, props: OwnProps) {
  return {
    collectionIds: getCollectionIds(state, { variant: props.variant }),
    status: getStatus(state, { variant: props.variant })
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    fetch: (variant: ExploreCollectionsVariant, moods?: string[]) =>
      dispatch(fetch({ variant, moods }))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExploreCollectionsPageProvider)
