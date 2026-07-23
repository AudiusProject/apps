import { useEffect, useContext, RefObject, useMemo } from 'react'

import {
  useProfileTracks,
  useProfileReposts,
  useUserHasRemixContest,
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
  IconRepost as IconReposts,
  IconTrophy
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
import { Tab, TabList } from 'components/tabs'
import TierExplainerDrawer from 'components/user-badges/TierExplainerDrawer'
import { useProfilePage } from 'pages/profile-page/useProfilePage'
import { getUserPageContext } from 'ssr/metaTags'

import { DeactivatedProfileTombstone } from '../DeactivatedProfileTombstone'

import { AlbumsTab } from './AlbumsTab'
import { ContestsTab } from './ContestsTab'
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
  } = useProfilePage()

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

  const tracksArgs = useMemo(
    () => ({ handle: handleLower ?? '', sort: tracksLineupOrder }),
    [handleLower, tracksLineupOrder]
  )
  const artistTracksQuery = useProfileTracks(tracksArgs, {
    enabled: !!handleLower
  })
  const tracksQuerySource = useMemo(
    () => ({
      queryKey: [...getProfileTracksQueryKey(tracksArgs)] as unknown[]
    }),
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
    () => ({
      queryKey: [...getProfileRepostsQueryKey(repostsArgs)] as unknown[]
    }),
    [repostsArgs]
  )

  const profileBasePath = profilePage(handle)
  const { hasContest: profileHasContest } = useUserHasRemixContest(
    isArtist ? userId : null
  )
  const showContestsTab = profileHasContest

  const defaultTab = isArtist ? ProfilePageTabs.TRACKS : ProfilePageTabs.REPOSTS
  // Fall back to the default tab when the URL points at /contests but the
  // tab itself is hidden (this host runs no contests). Keeps the body in
  // sync with the (now conditional) tab list.
  const rawTab = activeTab ?? defaultTab
  const currentTab =
    rawTab === ProfilePageTabs.CONTESTS && !showContestsTab
      ? defaultTab
      : rawTab

  const profileTabs =
    !profile || isLoading || isEditing ? null : isArtist ? (
      <TabList
        variant='mobile'
        onTabClick={(key) => didChangeTabsFrom('', key)}
      >
        <Tab to={`${profileBasePath}/tracks`} icon={<IconNote />}>
          {ProfilePageTabs.TRACKS}
        </Tab>
        <Tab to={`${profileBasePath}/albums`} icon={<IconAlbum />}>
          {ProfilePageTabs.ALBUMS}
        </Tab>
        <Tab to={`${profileBasePath}/playlists`} icon={<IconPlaylists />}>
          {ProfilePageTabs.PLAYLISTS}
        </Tab>
        <Tab
          to={`${profileBasePath}/reposts`}
          icon={<IconReposts className={styles.iconReposts} />}
        >
          {ProfilePageTabs.REPOSTS}
        </Tab>
        {showContestsTab ? (
          <Tab to={`${profileBasePath}/contests`} icon={<IconTrophy />}>
            {ProfilePageTabs.CONTESTS}
          </Tab>
        ) : null}
      </TabList>
    ) : (
      <TabList
        variant='mobile'
        onTabClick={(key) => didChangeTabsFrom('', key)}
      >
        <Tab
          to={`${profileBasePath}/reposts`}
          icon={<IconReposts className={styles.iconReposts} />}
        >
          {ProfilePageTabs.REPOSTS}
        </Tab>
        <Tab to={`${profileBasePath}/playlists`} icon={<IconPlaylists />}>
          {ProfilePageTabs.PLAYLISTS}
        </Tab>
      </TabList>
    )

  const profileBody = (() => {
    if (!profile || isLoading || isEditing) return null
    const tabMessages = getMessages({ name, isOwner })

    if (isArtist) {
      if (currentTab === ProfilePageTabs.ALBUMS) {
        return (
          <div className={styles.cardLineupContainer}>
            <AlbumsTab isOwner={isOwner} profile={profile} userId={userId} />
          </div>
        )
      }
      if (currentTab === ProfilePageTabs.PLAYLISTS) {
        return (
          <div className={styles.cardLineupContainer}>
            <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
          </div>
        )
      }
      if (currentTab === ProfilePageTabs.CONTESTS) {
        return (
          <div className={styles.cardLineupContainer}>
            <ContestsTab isOwner={isOwner} profile={profile} />
          </div>
        )
      }
      if (currentTab === ProfilePageTabs.REPOSTS) {
        return (
          <div className={styles.tracksLineupContainer}>
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
                lineupItems={userRepostsQuery.data}
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
        )
      }
      // Default: Tracks
      return (
        <div className={styles.tracksLineupContainer}>
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
        </div>
      )
    }

    // Non-artist user
    if (currentTab === ProfilePageTabs.PLAYLISTS) {
      return (
        <div className={styles.cardLineupContainer}>
          <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
        </div>
      )
    }
    // Default: Reposts
    return (
      <div className={styles.tracksLineupContainer}>
        {profile.repost_count === 0 ? (
          <EmptyTab
            message={
              <>
                {tabMessages.emptyReposts}
                <i className={cn('emoji', 'face-with-monocle', styles.emoji)} />
              </>
            }
          />
        ) : (
          <TrackLineup
            trackIds={userRepostsQuery.trackIds}
            lineupItems={userRepostsQuery.data}
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
    )
  })()

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
    // Rendered as a direct child of the page container (a flex column) so the
    // tombstone's `flex: 1` can claim the space left below the header.
    content = <DeactivatedProfileTombstone isMobile />
  } else if (!isLoading && !isEditing) {
    content = (
      <div className={styles.contentContainer}>
        <div className={styles.tabs}>{profileTabs}</div>
        {profileBody}
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
        containerClassName={cn(styles.container, {
          [styles.deactivatedContainer]: profile.is_deactivated
        })}
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
