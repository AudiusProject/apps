import { useEffect, useContext } from 'react'

import {
  Status,
  Collection,
  ID,
  UID,
  ProfilePictureSizes,
  CoverPhotoSizes,
  LineupState,
  User,
  Track
} from '@audius/common/models'
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
import { getUserPageSEOFields } from 'utils/seo'
import { withNullGuard } from 'utils/withNullGuard'

import { DeactivatedProfileTombstone } from '../DeactivatedProfileTombstone'

import { AlbumsTab } from './AlbumsTab'
import EditProfile from './EditProfile'
import { EmptyTab } from './EmptyTab'
import { PlaylistsTab } from './PlaylistsTab'
import ProfileHeader from './ProfileHeader'
import styles from './ProfilePage.module.css'
import { ShareUserButton } from './ShareUserButton'
const { profilePage } = route

export type ProfilePageProps = {
  // Computed
  accountUserId: ID | null
  isArtist: boolean
  isOwner: boolean
  userId: ID | null
  handle: string
  verified: boolean
  created: string
  name: string
  bio: string
  location: string
  xHandle: string
  instagramHandle: string
  tikTokHandle: string
  twitterVerified: boolean
  instagramVerified: boolean
  tikTokVerified: boolean
  website: string
  donation: string
  coverPhotoSizes: CoverPhotoSizes | null
  profilePictureSizes: ProfilePictureSizes | null
  hasProfilePicture: boolean
  followers: User[]
  followersLoading: boolean
  setFollowingUserId: (userId: ID) => void
  setFollowersUserId: (userId: ID) => void
  activeTab: ProfilePageTabs | null
  following: boolean
  isSubscribed: boolean
  mode: string
  // Whether or not the user has edited at least one thing on their profile
  hasMadeEdit: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  stats: Array<{ number: number; title: string; key: string }>
  trackIsActive: boolean

  profile: User | null
  status: Status
  collectionStatus: Status
  goToRoute: (route: string) => void
  artistTracks: LineupState<Track>
  userFeed: LineupState<Track | Collection>
  playArtistTrack: (uid: UID) => void
  pauseArtistTrack: () => void
  playUserFeedTrack: (uid: UID) => void
  pauseUserFeedTrack: () => void
  refreshProfile: () => void

  // Updates
  updatedCoverPhoto: { file: File; url: string } | null
  updatedProfilePicture: { file: File; url: string } | null

  // Methods
  changeTab: (tab: ProfilePageTabs) => void
  getLineupProps: (lineup: any) => any
  loadMoreArtistTracks: (offset: number, limit: number) => void
  loadMoreUserFeed: (offset: number, limit: number) => void
  onFollow: (id: ID) => void
  onConfirmUnfollow: (id: ID) => void
  updateName: (name: string) => void
  updateBio: (bio: string) => void
  updateLocation: (location: string) => void
  updateXHandle: (handle: string) => void
  updateInstagramHandle: (handle: string) => void
  updateTikTokHandle: (handle: string) => void
  updateWebsite: (website: string) => void
  updateDonation: (donation: string) => void
  updateProfilePicture: (
    selectedFiles: any,
    source: 'original' | 'unsplash' | 'url'
  ) => Promise<void>
  updateCoverPhoto: (
    selectedFiles: any,
    source: 'original' | 'unsplash' | 'url'
  ) => Promise<void>
  didChangeTabsFrom: (prevLabel: string, currentLabel: string) => void
  areArtistRecommendationsVisible: boolean
  onCloseArtistRecommendations: () => void
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

const g = withNullGuard((props: ProfilePageProps) => {
  const { profile } = props
  if (profile) {
    return { ...props, profile }
  }
})

const ProfilePage = g(
  ({
    accountUserId,
    userId,
    name,
    handle,
    profile,
    bio,
    location,
    status,
    collectionStatus,
    isArtist,
    isOwner,
    verified,
    coverPhotoSizes,
    profilePictureSizes,
    hasProfilePicture,
    followers,
    instagramHandle,
    tikTokHandle,
    xHandle,
    twitterVerified,
    instagramVerified,
    tikTokVerified,
    website,
    donation,
    artistTracks,
    userFeed,
    getLineupProps,
    loadMoreArtistTracks,
    loadMoreUserFeed,
    playArtistTrack,
    pauseArtistTrack,
    playUserFeedTrack,
    pauseUserFeedTrack,
    setFollowingUserId,
    setFollowersUserId,
    goToRoute,
    following,
    isSubscribed,
    onFollow,
    onConfirmUnfollow,
    mode,
    hasMadeEdit,
    onEdit,
    onSave,
    onCancel,
    updatedCoverPhoto,
    updatedProfilePicture,
    updateName,
    updateBio,
    updateLocation,
    updateXHandle,
    updateInstagramHandle,
    updateTikTokHandle,
    updateWebsite,
    updateDonation,
    updateProfilePicture,
    updateCoverPhoto,
    didChangeTabsFrom,
    activeTab,
    areArtistRecommendationsVisible,
    onCloseArtistRecommendations
  }) => {
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
          donation={donation}
          onUpdateName={updateName}
          onUpdateBio={updateBio}
          onUpdateLocation={updateLocation}
          onUpdateXHandle={updateXHandle}
          onUpdateInstagramHandle={updateInstagramHandle}
          onUpdateTikTokHandle={updateTikTokHandle}
          onUpdateWebsite={updateWebsite}
          onUpdateDonation={updateDonation}
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
                leadingElementId={profile.artist_pick_track_id}
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

    const { tabs, body } = useTabs({
      didChangeTabsFrom,
      tabs: isLoading ? [] : profileTabs || [],
      elements: isLoading ? [] : profileElements || [],
      initialTab: activeTab || undefined,
      pathname: profilePage(handle)
    })

    if (profile && profile.is_deactivated) {
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
          entityId={userId!}
          containerClassName={styles.container}
        >
          <ProfileHeader
            isDeactivated={profile?.is_deactivated}
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
            donation={donation}
            followers={followers}
            following={following}
            onFollow={onFollow}
            onUnfollow={onConfirmUnfollow}
            goToRoute={goToRoute}
            mode={mode}
            switchToEditMode={onEdit}
            updatedProfilePicture={
              updatedProfilePicture ? updatedProfilePicture.url : null
            }
            updatedCoverPhoto={updatedCoverPhoto ? updatedCoverPhoto.url : null}
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
)

export default ProfilePage
