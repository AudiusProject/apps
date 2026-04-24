import { useEffect, useContext, RefObject, useMemo } from 'react'

import {
  useProfileTracks,
  useProfileReposts,
  getProfileTracksQueryKey,
  getProfileRepostsQueryKey
} from '@audius/common/api'
import { Status, User } from '@audius/common/models'
import { ProfilePageTabs } from '@audius/common/store'
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
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  CenterPreset
} from 'components/nav/mobile/NavContext'
import TextElement, { Type } from 'components/nav/mobile/TextElement'
import TierExplainerDrawer from 'components/user-badges/TierExplainerDrawer'
import useTabs, { TabHeader } from 'hooks/useTabs/useTabs'
import { useProfilePage } from 'pages/profile-page/useProfilePage'
import { getUserPageContext } from 'ssr/metaTags'

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

    // Lineups (legacy redux lineups — no longer read here; tanquery below)
    handleLower,
    tracksLineupOrder,

    // State
    hasMadeEdit,
    areArtistRecommendationsVisible,

    // Handlers
    goToRoute,
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

  const isLoading = status === Status.LOADING
  const isEditing = mode === 'editing'

  // --- Tanquery lineups replace legacy redux lineups --------------------------
  // Reposts may include collections (playlist reposts); TrackLineup only renders
  // tracks today, so collections are dropped on the hook side (trackIds filter).
  const tracksArgs = useMemo(
    () => ({ handle: handleLower ?? '', sort: tracksLineupOrder }),
    [handleLower, tracksLineupOrder]
  )
  const artistTracksQuery = useProfileTracks(tracksArgs, {
    enabled: !!handleLower
  })
  const tracksQuerySource = useMemo(
    () => ({ queryKey: [...getProfileTracksQueryKey(tracksArgs)] as unknown[] }),
    [tracksArgs]
  )

  const repostsArgs = useMemo(
    () => ({ handle: handleLower ?? '' }),
    [handleLower]
  )
  const userRepostsQuery = useProfileReposts(repostsArgs, {
    enabled: !!handleLower
  })
  const repostsQuerySource = useMemo(
    () =>
      ({ queryKey: [...getProfileRepostsQueryKey(repostsArgs)] as unknown[] }),
    [repostsArgs]
  )

  // Compute tabs and elements before calling useTabs
  const { profileTabs, profileElements } = useMemo(() => {
    if (!profile || isLoading || isEditing) {
      return { profileTabs: [], profileElements: [] }
    }

    const tabMessages = getMessages({ name, isOwner })

    if (isArtist) {
      const tabs = artistTabs
      const elements = [
        <div className={styles.tracksLineupContainer} key='artistTracks'>
          {profile.track_count === 0 ? (
            <EmptyTab
              message={
                <>
                  {tabMessages.emptyTracks}
                  <i
                    className={cn('emoji', 'face-with-monocle', styles.emoji)}
                  />
                </>
              }
            />
          ) : (
            <TrackLineup
              trackIds={artistTracksQuery.trackIds}
              source='PROFILE_TRACKS'
              querySource={tracksQuerySource}
              isPending={artistTracksQuery.isPending}
              isFetching={artistTracksQuery.isFetching}
              isError={artistTracksQuery.isError}
              hasNextPage={artistTracksQuery.hasNextPage}
              loadNextPage={artistTracksQuery.loadNextPage}
              variant={LineupVariant.MAIN}
              leadingElementId={profile.artist_pick_track_id ?? undefined}
              showArtistPick
              maxEntries={profile.track_count}
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
                  {tabMessages.emptyReposts}
                  <i
                    className={cn('emoji', 'face-with-monocle', styles.emoji)}
                  />
                </>
              }
            />
          ) : (
            <TrackLineup
              trackIds={userRepostsQuery.trackIds}
              source='PROFILE_FEED'
              querySource={repostsQuerySource}
              isPending={userRepostsQuery.isPending}
              isFetching={userRepostsQuery.isFetching}
              isError={userRepostsQuery.isError}
              hasNextPage={userRepostsQuery.hasNextPage}
              loadNextPage={userRepostsQuery.loadNextPage}
              variant={LineupVariant.MAIN}
              maxEntries={profile.repost_count}
            />
          )}
        </div>
      ]
      return { profileTabs: tabs, profileElements: elements }
    } else {
      const tabs = userTabs
      const elements = [
        <div className={styles.tracksLineupContainer} key='tracks'>
          {profile.repost_count === 0 ? (
            <EmptyTab
              message={
                <>
                  {tabMessages.emptyReposts}
                  <i
                    className={cn('emoji', 'face-with-monocle', styles.emoji)}
                  />
                </>
              }
            />
          ) : (
            <TrackLineup
              trackIds={userRepostsQuery.trackIds}
              source='PROFILE_FEED'
              querySource={repostsQuerySource}
              isPending={userRepostsQuery.isPending}
              isFetching={userRepostsQuery.isFetching}
              isError={userRepostsQuery.isError}
              hasNextPage={userRepostsQuery.hasNextPage}
              loadNextPage={userRepostsQuery.loadNextPage}
              variant={LineupVariant.MAIN}
              maxEntries={profile.repost_count}
            />
          )}
        </div>,
        <div className={styles.cardLineupContainer} key='playlists'>
          <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
        </div>
      ]
      return { profileTabs: tabs, profileElements: elements }
    }
  }, [
    profile,
    isLoading,
    isEditing,
    isArtist,
    isOwner,
    userId,
    name,
    artistTracksQuery.trackIds,
    artistTracksQuery.isPending,
    artistTracksQuery.isFetching,
    artistTracksQuery.isError,
    artistTracksQuery.hasNextPage,
    artistTracksQuery.loadNextPage,
    tracksQuerySource,
    userRepostsQuery.trackIds,
    userRepostsQuery.isPending,
    userRepostsQuery.isFetching,
    userRepostsQuery.isError,
    userRepostsQuery.hasNextPage,
    userRepostsQuery.loadNextPage,
    repostsQuerySource
  ])

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
    tabs: profileTabs,
    elements: profileElements,
    initialTab: activeTab || undefined,
    pathname: profilePage(handle)
  })

  if (!profile) {
    return null
  }

  const coverPhotoSizes = profile.cover_photo ?? null

  let content
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
  } = getUserPageContext({ handle, userName: name, bio })

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
