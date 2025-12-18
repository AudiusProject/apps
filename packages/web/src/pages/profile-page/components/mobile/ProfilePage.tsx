import { useEffect, useContext, RefObject } from 'react'

import { Status, User } from '@audius/common/models'
import {
  profilePageFeedLineupActions as feedActions,
  profilePageTracksLineupActions as tracksActions,
  ProfilePageTabs
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  IconAlbum,
  IconNote,
  IconPlaylists,
  IconRepost as IconReposts
} from '@audius/harmony'
import { Id } from '@audius/sdk'
import cn from 'classnames'

import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import Lineup from 'components/lineup/Lineup'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  CenterPreset
} from 'components/nav/mobile/NavContext'
import TextElement, { Type } from 'components/nav/mobile/TextElement'
import TierExplainerDrawer from 'components/user-badges/TierExplainerDrawer'
import useTabs, { TabHeader } from 'hooks/useTabs/useTabs'
import { useProfilePage } from 'pages/profile-page/useProfilePage'
import { getUserPageSEOFields } from 'utils/seo'

import { DeactivatedProfileTombstone } from '../DeactivatedProfileTombstone'

import { AlbumsTab } from './AlbumsTab'
import EditProfile from './EditProfile'
import { EmptyTab } from './EmptyTab'
import { PlaylistsTab } from './PlaylistsTab'
import ProfileHeader from './ProfileHeader'
import styles from './ProfilePage.module.css'
import { ShareUserButton } from './ShareUserButton'
const { profilePage } = route

type ProfilePageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const artistTabs: TabHeader[] = [
  {
    icon: <IconNote />,
    text: ProfilePageTabs.TRACKS,
    label: ProfilePageTabs.TRACKS,
    to: 'tracks'
  },
  {
    icon: <IconAlbum />,
    text: ProfilePageTabs.ALBUMS,
    label: ProfilePageTabs.ALBUMS,
    to: 'albums'
  },
  {
    icon: <IconPlaylists />,
    text: ProfilePageTabs.PLAYLISTS,
    label: ProfilePageTabs.PLAYLISTS,
    to: 'playlists'
  },
  {
    icon: <IconReposts className={styles.iconReposts} />,
    text: ProfilePageTabs.REPOSTS,
    label: ProfilePageTabs.REPOSTS,
    to: 'reposts'
  }
]

const userTabs: TabHeader[] = [
  {
    icon: <IconReposts className={styles.iconReposts} />,
    text: ProfilePageTabs.REPOSTS,
    label: ProfilePageTabs.REPOSTS,
    to: 'reposts'
  },
  {
    icon: <IconPlaylists />,
    text: ProfilePageTabs.PLAYLISTS,
    label: ProfilePageTabs.PLAYLISTS,
    to: 'playlists'
  }
]

const getMessages = ({
  name,
  isOwner
}: {
  name: string
  isOwner: boolean
}) => ({
  emptyTracks: isOwner
    ? "You haven't created any tracks yet"
    : `${name} hasn't created any tracks yet`,
  emptyAlbums: isOwner
    ? "You haven't created any albums yet"
    : `${name} hasn't created any albums yet`,
  emptyPlaylists: isOwner
    ? "You haven't created any playlists yet"
    : `${name} hasn't created any playlists yet`,
  emptyReposts: isOwner
    ? "You haven't reposted anything yet"
    : `${name} hasn't reposted anything yet`
})

const ProfilePage = ({ containerRef }: ProfilePageProps) => {
  const {
    // Profile data
    profile,
    status,
    isArtist,
    isOwner,
    userId,
    handle,
    verified,
    name,
    bio,
    location,
    twitterHandle,
    instagramHandle,
    tikTokHandle,
    twitterVerified,
    instagramVerified,
    tikTokVerified,
    website,
    hasProfilePicture,
    following,
    mode,
    activeTab,
    profilePictureSizes,
    updatedCoverPhoto,
    updatedProfilePicture,

    // Lineups
    artistTracks,
    userFeed,

    // State
    hasMadeEdit,
    areArtistRecommendationsVisible,

    // Handlers
    goToRoute,
    getLineupProps,
    loadMoreArtistTracks,
    loadMoreUserFeed,
    playArtistTrack,
    pauseArtistTrack,
    playUserFeedTrack,
    pauseUserFeedTrack,
    setFollowingUserId,
    setFollowersUserId,
    onFollow,
    onConfirmUnfollow,
    onEdit,
    onSave,
    onCancel,
    updateName,
    updateBio,
    updateLocation,
    updateTwitterHandle,
    updateInstagramHandle,
    updateTikTokHandle,
    updateWebsite,
    updateProfilePicture,
    updateCoverPhoto,
    didChangeTabsFrom,
    onCloseArtistRecommendations
  } = useProfilePage(containerRef)

  // Map twitterHandle to xHandle for mobile
  const xHandle = twitterHandle
  const updateXHandle = updateTwitterHandle
  const followers: User[] = [] // TODO: Add followers fetching if needed

  const { setHeader } = useContext(HeaderContext)
  useEffect(() => {
    setHeader(null)
  }, [setHeader])

  const messages = getMessages({ name, isOwner })
  let content
  let profileTabs
  let profileElements
  const isLoading = status === Status.LOADING
  const isEditing = mode === 'editing'

  // Set Nav-Bar Menu
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    let leftNav
    let rightNav
    if (isEditing) {
      leftNav = (
        <TextElement text='Cancel' type={Type.SECONDARY} onClick={onCancel} />
      )
      rightNav = (
        <TextElement
          text='Save'
          type={Type.PRIMARY}
          isEnabled={hasMadeEdit}
          onClick={onSave}
        />
      )
    } else {
      leftNav = isOwner ? LeftPreset.SETTINGS : LeftPreset.BACK
      rightNav = <ShareUserButton userId={userId} />
    }
    if (userId) {
      setLeft(leftNav)
      setRight(rightNav)
      setCenter(CenterPreset.LOGO)
    }
  }, [
    setLeft,
    setCenter,
    setRight,
    userId,
    isOwner,
    isEditing,
    onCancel,
    onSave,
    hasMadeEdit
  ])

  const { tabs, body } = useTabs({
    didChangeTabsFrom,
    tabs: isLoading ? [] : profileTabs || [],
    elements: isLoading ? [] : profileElements || [],
    initialTab: activeTab || undefined,
    pathname: profilePage(handle)
  })

  if (!profile) {
    return null
  }

  const coverPhotoSizes = profile.cover_photo ?? null

  if (isLoading) {
    content = null
  } else if (isEditing) {
    content = (
      <EditProfile
        name={name}
        bio={bio}
        location={location}
        xHandle={xHandle}
        instagramHandle={instagramHandle}
        tikTokHandle={tikTokHandle}
        twitterVerified={twitterVerified}
        instagramVerified={instagramVerified}
        tikTokVerified={tikTokVerified}
        website={website}
        onUpdateName={updateName}
        onUpdateBio={updateBio}
        onUpdateLocation={updateLocation}
        onUpdateXHandle={updateXHandle}
        onUpdateInstagramHandle={updateInstagramHandle}
        onUpdateTikTokHandle={updateTikTokHandle}
        onUpdateWebsite={updateWebsite}
      />
    )
  } else {
    if (isArtist) {
      profileTabs = artistTabs
      profileElements = [
        <div className={styles.tracksLineupContainer} key='artistTracks'>
          {profile.track_count === 0 ? (
            <EmptyTab
              message={
                <>
                  {messages.emptyTracks}
                  <i
                    className={cn('emoji', 'face-with-monocle', styles.emoji)}
                  />
                </>
              }
            />
          ) : (
            <Lineup
              {...getLineupProps(artistTracks)}
              leadingElementId={profile.artist_pick_track_id ?? undefined}
              showArtistPick={true}
              limit={profile.track_count}
              loadMore={loadMoreArtistTracks}
              playTrack={playArtistTrack}
              pauseTrack={pauseArtistTrack}
              actions={tracksActions}
            />
          )}
        </div>,
        <div className={styles.cardLineupContainer} key='artistAlbums'>
          <AlbumsTab isOwner={isOwner} profile={profile} userId={userId} />
        </div>,
        <div className={styles.cardLineupContainer} key='artistPlaylists'>
          <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
        </div>,
        <div className={styles.tracksLineupContainer} key='artistUsers'>
          {profile.repost_count === 0 ? (
            <EmptyTab
              message={
                <>
                  {messages.emptyReposts}
                  <i
                    className={cn('emoji', 'face-with-monocle', styles.emoji)}
                  />
                </>
              }
            />
          ) : (
            <Lineup
              {...getLineupProps(userFeed)}
              count={profile.repost_count}
              loadMore={loadMoreUserFeed}
              playTrack={playUserFeedTrack}
              pauseTrack={pauseUserFeedTrack}
              actions={feedActions}
            />
          )}
        </div>
      ]
    } else {
      profileTabs = userTabs
      profileElements = [
        <div className={styles.tracksLineupContainer} key='tracks'>
          {profile.repost_count === 0 ? (
            <EmptyTab
              message={
                <>
                  {messages.emptyReposts}
                  <i
                    className={cn('emoji', 'face-with-monocle', styles.emoji)}
                  />
                </>
              }
            />
          ) : (
            <Lineup
              {...getLineupProps(userFeed)}
              count={profile.repost_count}
              loadMore={loadMoreUserFeed}
              playTrack={playUserFeedTrack}
              pauseTrack={pauseUserFeedTrack}
              actions={feedActions}
            />
          )}
        </div>,
        <div className={styles.cardLineupContainer} key='playlists'>
          <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
        </div>
      ]
    }
  }

  if (profile.is_deactivated) {
    content = (
      <div className={styles.contentContainer}>
        <DeactivatedProfileTombstone isMobile />
      </div>
    )
  } else if (!isLoading && !isEditing) {
    content = (
      <div className={styles.contentContainer}>
        <div className={styles.tabs}>{tabs}</div>
        {body}
      </div>
    )
  }

  const {
    title = '',
    description = '',
    canonicalUrl = '',
    structuredData
  } = getUserPageSEOFields({ handle, userName: name, bio })

  return (
    <>
      <MobilePageContainer
        title={title}
        description={description}
        canonicalUrl={canonicalUrl}
        structuredData={structuredData}
        entityType='user'
        hashId={profile?.user_id ? Id.parse(profile.user_id) : undefined}
        containerClassName={styles.container}
      >
        <ProfileHeader
          isDeactivated={profile.is_deactivated ?? false}
          profile={profile}
          name={name}
          handle={handle}
          isArtist={isArtist}
          bio={bio}
          verified={verified}
          userId={profile.user_id}
          loading={status === Status.LOADING}
          coverPhotoSizes={coverPhotoSizes}
          profilePictureSizes={profilePictureSizes}
          hasProfilePicture={hasProfilePicture}
          playlistCount={profile.playlist_count}
          trackCount={profile.track_count}
          followerCount={profile.follower_count}
          followingCount={profile.followee_count}
          setFollowingUserId={setFollowingUserId}
          setFollowersUserId={setFollowersUserId}
          xHandle={xHandle}
          instagramHandle={instagramHandle}
          tikTokHandle={tikTokHandle}
          website={website}
          followers={followers}
          following={following}
          onFollow={onFollow}
          onUnfollow={onConfirmUnfollow}
          goToRoute={goToRoute}
          mode={mode}
          switchToEditMode={onEdit}
          updatedProfilePicture={updatedProfilePicture?.url ?? null}
          updatedCoverPhoto={updatedCoverPhoto?.url ?? null}
          onUpdateProfilePicture={updateProfilePicture}
          onUpdateCoverPhoto={updateCoverPhoto}
          areArtistRecommendationsVisible={areArtistRecommendationsVisible}
          onCloseArtistRecommendations={onCloseArtistRecommendations}
        />
        {content}
      </MobilePageContainer>

      <TierExplainerDrawer />
    </>
  )
}

export default ProfilePage
