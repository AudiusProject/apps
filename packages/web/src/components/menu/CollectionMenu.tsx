import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlayableType,
  ID
} from '@audius/common/models'
import {
  cacheUsersSelectors,
  collectionsSocialActions as socialActions
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { PopupMenuItem } from '@audius/harmony'
import { push as pushRoute } from 'connected-react-router'
import { connect } from 'react-redux'
import { useNavigate } from 'react-router-dom-v5-compat'
import { Dispatch } from 'redux'

import * as embedModalActions from 'components/embed-modal/store/actions'
import { AppState } from 'store/types'
import { collectionPage } from 'utils/route'
const { getUser } = cacheUsersSelectors
const { profilePage } = route

type PlaylistId = number

export type OwnProps = {
  children: (items: PopupMenuItem[]) => JSX.Element
  extraMenuItems?: PopupMenuItem[]
  handle: string
  includeEdit?: boolean
  includeEmbed?: boolean
  includeFavorite?: boolean
  includeRepost?: boolean
  includeShare?: boolean
  includeVisitPage?: boolean
  includeVisitArtistPage?: boolean
  isFavorited?: boolean
  isOwner?: boolean
  isPublic?: boolean
  isReposted?: boolean
  onClose?: () => void
  onRepost?: () => void
  onShare?: () => void
  playlistId: PlaylistId
  playlistName: string
  ddexApp?: string | null
  type: 'album' | 'playlist'
  permalink: string
}

export type CollectionMenuProps = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const messages = {
  embed: 'Embed'
}

const CollectionMenu = (props: CollectionMenuProps) => {
  const {
    type,
    handle,
    playlistName,
    ddexApp,
    playlistId,
    isOwner,
    isFavorited,
    isReposted,
    includeEdit,
    includeShare,
    includeRepost,
    includeFavorite,
    includeEmbed,
    includeVisitPage,
    includeVisitArtistPage = true,
    isPublic,
    isArtist,
    onShare,
    goToRoute,
    openEmbedModal,
    permalink,
    shareCollection,
    saveCollection,
    unsaveCollection,
    repostCollection,
    undoRepostCollection,
    onRepost,
    extraMenuItems
  } = props

  const navigate = useNavigate()

  const getMenu = () => {
    const routePage = collectionPage
    const shareMenuItem = {
      text: 'Share',
      onClick: () => {
        shareCollection(playlistId)
        if (onShare) onShare()
      }
    }

    const typeName = type === 'album' ? 'Album' : 'Playlist'
    const favoriteMenuItem = {
      text: isFavorited ? `Unfavorite ${typeName}` : `Favorite ${typeName}`,
      onClick: () =>
        isFavorited ? unsaveCollection(playlistId) : saveCollection(playlistId)
    }

    const repostMenuItem = {
      text: isReposted ? 'Undo Repost' : 'Repost',
      onClick: () => {
        if (isReposted) {
          undoRepostCollection(playlistId)
        } else {
          repostCollection(playlistId)
          if (onRepost) onRepost()
        }
      }
    }

    const artistPageMenuItem = {
      text: `Visit ${isArtist ? 'Artist' : 'User'} Page`,
      onClick: () => goToRoute(profilePage(handle))
    }

    const playlistPageMenuItem = {
      text: `Visit ${typeName} Page`,
      onClick: () =>
        goToRoute(
          routePage(
            handle,
            playlistName,
            playlistId,
            permalink,
            type === 'album'
          )
        )
    }

    const editCollectionMenuItem = {
      text: `Edit ${typeName}`,
      onClick: () => navigate(`${permalink}/edit`)
    }

    const embedMenuItem = {
      text: messages.embed,
      onClick: () =>
        openEmbedModal(
          playlistId,
          type === 'album' ? PlayableType.ALBUM : PlayableType.PLAYLIST
        )
    }

    const menu: { items: PopupMenuItem[] } = { items: [] }

    if (menu) {
      if (includeShare) menu.items.push(shareMenuItem)
    }
    if (!isOwner) {
      if (includeRepost) menu.items.push(repostMenuItem)
      if (includeFavorite) menu.items.push(favoriteMenuItem)
    }
    if (includeVisitPage) {
      menu.items.push(playlistPageMenuItem)
    }
    if (includeVisitArtistPage) {
      menu.items.push(artistPageMenuItem)
    }
    if (extraMenuItems && extraMenuItems.length > 0) {
      menu.items = menu.items.concat(extraMenuItems)
    }
    if (includeEmbed && isPublic) {
      menu.items.push(embedMenuItem)
    }
    if (includeEdit && isOwner && !ddexApp) {
      menu.items.push(editCollectionMenuItem)
    }

    return menu
  }

  const menu = getMenu()

  return props.children(menu.items)
}

function mapStateToProps(state: AppState, props: OwnProps) {
  const user = getUser(state, {
    handle: props.handle ? props.handle.toLowerCase() : null
  })
  return {
    isArtist: user ? user.track_count > 0 : false
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    goToRoute: (route: string) => dispatch(pushRoute(route)),
    shareCollection: (playlistId: PlaylistId) =>
      dispatch(socialActions.shareCollection(playlistId, ShareSource.OVERFLOW)),
    saveCollection: (playlistId: PlaylistId) =>
      dispatch(
        socialActions.saveCollection(playlistId, FavoriteSource.OVERFLOW)
      ),
    unsaveCollection: (playlistId: PlaylistId) =>
      dispatch(
        socialActions.unsaveCollection(playlistId, FavoriteSource.OVERFLOW)
      ),
    repostCollection: (playlistId: PlaylistId) =>
      dispatch(
        socialActions.repostCollection(playlistId, RepostSource.OVERFLOW)
      ),
    undoRepostCollection: (playlistId: PlaylistId) =>
      dispatch(
        socialActions.undoRepostCollection(playlistId, RepostSource.OVERFLOW)
      ),
    openEmbedModal: (playlistId: ID, kind: PlayableType) =>
      dispatch(embedModalActions.open(playlistId, kind))
  }
}

CollectionMenu.defaultProps = {
  handle: '',
  mount: 'page',
  isFavorited: false,
  isReposted: false,
  includeFavorite: true,
  isArtist: false,
  includeVisitPage: true,
  includeEmbed: true,
  extraMenuItems: []
}

export default connect(mapStateToProps, mapDispatchToProps)(CollectionMenu)
