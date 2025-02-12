import { useCallback, memo, ReactNode, useEffect, useState } from 'react'

import { useGetCurrentUserId, useGetMutedUsers } from '@audius/common/api'
import { useMuteUser } from '@audius/common/context'
import { commentsMessages } from '@audius/common/messages'
import {
  CreatePlaylistSource,
  Status,
  Collection,
  ID,
  UID,
  ProfilePictureSizes,
  CoverPhotoSizes,
  LineupState,
  Track,
  User
} from '@audius/common/models'
import {
  profilePageFeedLineupActions as feedActions,
  profilePageTracksLineupActions as tracksActions,
  ProfilePageTabs
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconAlbum,
  IconCollectible as IconCollectibles,
  IconArtistBadge as BadgeArtist,
  IconNote,
  IconPlaylists,
  IconRepost as IconReposts,
  Text,
  Hint,
  IconQuestionCircle,
  LoadingSpinner
} from '@audius/harmony'
import cn from 'classnames'

import { MAX_PAGE_WIDTH_PX } from 'common/utils/layout'
import CollectiblesPage from 'components/collectibles/components/CollectiblesPage'
import { CollectionCard } from 'components/collection'
import { ConfirmationModal } from 'components/confirmation-modal'
import CoverPhoto from 'components/cover-photo/CoverPhoto'
import CardLineup from 'components/lineup/CardLineup'
import Lineup from 'components/lineup/Lineup'
import { LineupVariant } from 'components/lineup/types'
import Mask from 'components/mask/Mask'
import NavBanner, { EmptyNavBanner } from 'components/nav-banner/NavBanner'
import Page from 'components/page/Page'
import ProfilePicture from 'components/profile-picture/ProfilePicture'
import { ProfileCompletionHeroCard } from 'components/profile-progress/components/ProfileCompletionHeroCard'
import {
  EmptyStatBanner,
  ProfileMode,
  StatBanner
} from 'components/stat-banner/StatBanner'
import { StatProps } from 'components/stats/Stats'
import UploadChip from 'components/upload/UploadChip'
import FollowsYouBadge from 'components/user-badges/FollowsYouBadge'
import useTabs, { TabHeader, useTabRecalculator } from 'hooks/useTabs/useTabs'
import { BlockUserConfirmationModal } from 'pages/chat-page/components/BlockUserConfirmationModal'
import { UnblockUserConfirmationModal } from 'pages/chat-page/components/UnblockUserConfirmationModal'
import EmptyTab from 'pages/profile-page/components/EmptyTab'
import { getUserPageSEOFields } from 'utils/seo'

import { DeactivatedProfileTombstone } from '../DeactivatedProfileTombstone'
import { EditableName } from '../EditableName'

import styles from './ProfilePage.module.css'
import ProfileWrapping from './ProfileWrapping'
import {
  COVER_PHOTO_HEIGHT_PX,
  PROFILE_LEFT_COLUMN_WIDTH_PX,
  PROFILE_LOCKUP_HEIGHT_PX,
  PROFILE_COLUMN_GAP
} from './constants'

const { profilePage } = route

export type ProfilePageProps = {
  // State
  editMode: boolean
  shouldMaskContent: boolean
  areArtistRecommendationsVisible: boolean

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
  twitterHandle: string
  instagramHandle: string
  tikTokHandle: string
  twitterVerified: boolean
  instagramVerified: boolean
  tikTokVerified: boolean
  website: string
  donation: string
  coverPhotoSizes: CoverPhotoSizes | null
  updatedCoverPhoto: { error: boolean; url: string }
  profilePictureSizes: ProfilePictureSizes | null
  updatedProfilePicture: { error: boolean; url: string }
  hasProfilePicture: boolean
  activeTab: ProfilePageTabs | null
  dropdownDisabled: boolean
  following: boolean
  isSubscribed: boolean
  mode: ProfileMode
  stats: StatProps[]
  isBlocked: boolean
  canCreateChat: boolean
  showBlockUserConfirmationModal: boolean
  showUnblockUserConfirmationModal: boolean
  showMuteUserConfirmationModal: boolean
  showUnmuteUserConfirmationModal: boolean

  profile: User | null
  albums: Collection[] | null
  playlists: Collection[] | null
  status: Status
  collectionStatus: Status
  goToRoute: (route: string) => void
  artistTracks: LineupState<Track>
  playArtistTrack: (uid: UID) => void
  pauseArtistTrack: () => void
  // Feed
  userFeed: LineupState<Track | Collection>
  playUserFeedTrack: (uid: UID) => void
  pauseUserFeedTrack: () => void

  // Methods
  onFollow: () => void
  onUnfollow: () => void
  updateName: (name: string) => void
  updateBio: (bio: string) => void
  updateLocation: (location: string) => void
  updateTwitterHandle: (handle: string) => void
  updateInstagramHandle: (handle: string) => void
  updateTikTokHandle: (handle: string) => void
  updateWebsite: (website: string) => void
  updateDonation: (donation: string) => void
  changeTab: (tab: ProfilePageTabs) => void
  getLineupProps: (lineup: any) => any
  onEdit: () => void
  onSave: () => void
  onShare: () => void
  onCancel: () => void
  onSortByRecent: () => void
  onSortByPopular: () => void
  loadMoreArtistTracks: (offset: number, limit: number) => void
  loadMoreUserFeed: (offset: number, limit: number) => void
  formatCardSecondaryText: (
    saves: number,
    tracks: number,
    isPrivate?: boolean
  ) => string
  updateProfile: (metadata: any) => void
  updateProfilePicture: (
    selectedFiles: any,
    source: 'original' | 'unsplash' | 'url'
  ) => Promise<void>
  updateCoverPhoto: (
    selectedFiles: any,
    source: 'original' | 'unsplash' | 'url'
  ) => Promise<void>
  setNotificationSubscription: (
    userId: ID,
    isSubscribed: boolean,
    update: boolean
  ) => void
  didChangeTabsFrom: (prevLabel: string, currentLabel: string) => void
  onCloseArtistRecommendations: () => void
  onMessage: () => void
  onBlock: () => void
  onUnblock: () => void
  onMute: () => void
  onCloseBlockUserConfirmationModal: () => void
  onCloseUnblockUserConfirmationModal: () => void
  onCloseMuteUserConfirmationModal: () => void
  onCloseUnmuteUserConfirmationModal: () => void
}

const LeftColumnSpacer = () => (
  <Box w={PROFILE_LEFT_COLUMN_WIDTH_PX} css={{ flexShrink: 0 }} />
)

const ProfilePage = ({
  isOwner,
  profile,
  albums,
  playlists,
  status,
  goToRoute,
  // Tracks
  artistTracks,
  playArtistTrack,
  pauseArtistTrack,
  getLineupProps,
  // Feed
  userFeed,
  playUserFeedTrack,
  pauseUserFeedTrack,
  formatCardSecondaryText,
  loadMoreUserFeed,
  loadMoreArtistTracks,
  updateProfile,

  onFollow,
  onUnfollow,
  updateName,
  updateBio,
  updateLocation,
  updateTwitterHandle,
  updateInstagramHandle,
  updateTikTokHandle,
  updateWebsite,
  updateDonation,
  updateProfilePicture,
  updateCoverPhoto,
  changeTab,
  mode,
  stats,
  onEdit,
  onSave,
  onShare,
  onCancel,
  onSortByRecent,
  onSortByPopular,
  isArtist,
  status: profileLoadingStatus,
  collectionStatus,
  activeTab,
  shouldMaskContent,
  editMode,
  areArtistRecommendationsVisible,
  onCloseArtistRecommendations,
  canCreateChat,
  onMessage,
  onBlock,
  onUnblock,
  onMute,
  isBlocked,
  // Chat modals
  showBlockUserConfirmationModal,
  onCloseBlockUserConfirmationModal,
  showUnblockUserConfirmationModal,
  onCloseUnblockUserConfirmationModal,
  showMuteUserConfirmationModal,
  showUnmuteUserConfirmationModal,
  onCloseMuteUserConfirmationModal,
  onCloseUnmuteUserConfirmationModal,
  accountUserId,
  userId,
  handle,
  verified,
  created,
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
  donation,
  coverPhotoSizes,
  updatedCoverPhoto,
  profilePictureSizes,
  updatedProfilePicture,
  hasProfilePicture,
  dropdownDisabled,
  following,
  isSubscribed,
  setNotificationSubscription,
  didChangeTabsFrom
}: ProfilePageProps) => {
  const renderProfileCompletionCard = () => {
    return isOwner ? <ProfileCompletionHeroCard /> : null
  }

  const profileHasCollectibles =
    profile?.collectibleList?.length || profile?.solanaCollectibleList?.length
  const profileNeverSetCollectiblesOrder = !profile?.collectibles
  const profileHasNonEmptyCollectiblesOrder =
    profile?.collectibles?.order?.length ?? false
  const profileHasVisibleImageOrVideoCollectibles =
    profileHasCollectibles &&
    (profileNeverSetCollectiblesOrder || profileHasNonEmptyCollectiblesOrder)
  const didCollectiblesLoadAndWasEmpty =
    profileHasCollectibles && !profileHasNonEmptyCollectiblesOrder

  const isDeactivated = !!profile?.is_deactivated

  const isUserOnTheirProfile = accountUserId === userId

  const tabRecalculator = useTabRecalculator()
  const recalculate = useCallback(() => {
    tabRecalculator.recalculate()
  }, [tabRecalculator])

  const getArtistProfileContent = () => {
    if (!profile || !albums || !playlists) return { headers: [], elements: [] }
    const albumCards = albums.map((album) => (
      <CollectionCard key={album.playlist_id} id={album.playlist_id} size='m' />
    ))
    if (isOwner) {
      albumCards.unshift(
        <UploadChip
          key='upload-chip'
          type='album'
          variant='card'
          isFirst={albumCards.length === 0}
          source={CreatePlaylistSource.PROFILE_PAGE}
        />
      )
    }

    const playlistCards = playlists.map((playlist) => (
      <CollectionCard
        key={playlist.playlist_id}
        id={playlist.playlist_id}
        size='m'
      />
    ))
    if (isOwner) {
      playlistCards.unshift(
        <UploadChip
          key='upload-chip'
          type='playlist'
          variant='card'
          isFirst={playlistCards.length === 0}
          source={CreatePlaylistSource.PROFILE_PAGE}
        />
      )
    }

    const trackUploadChip = isOwner ? (
      <UploadChip
        key='upload-chip'
        type='track'
        variant='tile'
        source='profile'
      />
    ) : null

    const headers: TabHeader[] = [
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
        icon: <IconReposts />,
        text: ProfilePageTabs.REPOSTS,
        label: ProfilePageTabs.REPOSTS,
        to: 'reposts'
      }
    ]
    const elements = [
      <div key={ProfilePageTabs.TRACKS} className={styles.tiles}>
        {renderProfileCompletionCard()}
        {status === Status.SUCCESS ? (
          artistTracks.status === Status.SUCCESS &&
          artistTracks.entries.length === 0 ? (
            <EmptyTab
              isOwner={isOwner}
              name={profile.name}
              text={'uploaded any tracks'}
            />
          ) : (
            <Lineup
              {...getLineupProps(artistTracks)}
              extraPrecedingElement={trackUploadChip}
              animateLeadingElement
              leadingElementId={profile.artist_pick_track_id}
              loadMore={loadMoreArtistTracks}
              playTrack={playArtistTrack}
              pauseTrack={pauseArtistTrack}
              actions={tracksActions}
              variant={LineupVariant.GRID}
            />
          )
        ) : null}
      </div>,
      <div key={ProfilePageTabs.ALBUMS} className={styles.cards}>
        {collectionStatus !== Status.SUCCESS &&
        collectionStatus !== Status.ERROR ? (
          <Flex justifyContent='center' mt='2xl'>
            <Box w={24}>
              <LoadingSpinner />
            </Box>
          </Flex>
        ) : albums.length === 0 && !isOwner ? (
          <EmptyTab
            isOwner={isOwner}
            name={profile.name}
            text={'created any albums'}
          />
        ) : (
          <CardLineup cardsClassName={styles.cardLineup} cards={albumCards} />
        )}
      </div>,
      <div key={ProfilePageTabs.PLAYLISTS} className={styles.cards}>
        {collectionStatus !== Status.SUCCESS &&
        collectionStatus !== Status.ERROR ? (
          <Flex justifyContent='center' mt='2xl'>
            <Box w={24}>
              <LoadingSpinner />
            </Box>
          </Flex>
        ) : playlists.length === 0 && !isOwner ? (
          <EmptyTab
            isOwner={isOwner}
            name={profile.name}
            text={'created any playlists'}
          />
        ) : (
          <CardLineup
            cardsClassName={styles.cardLineup}
            cards={playlistCards}
          />
        )}
      </div>,
      <div key={ProfilePageTabs.REPOSTS} className={styles.tiles}>
        {status === Status.SUCCESS ? (
          (userFeed.status === Status.SUCCESS &&
            userFeed.entries.length === 0) ||
          profile.repost_count === 0 ? (
            <EmptyTab
              isOwner={isOwner}
              name={profile.name}
              text={'reposted anything'}
            />
          ) : (
            <Lineup
              {...getLineupProps(userFeed)}
              loadMore={loadMoreUserFeed}
              playTrack={playUserFeedTrack}
              pauseTrack={pauseUserFeedTrack}
              actions={feedActions}
            />
          )
        ) : null}
      </div>
    ]

    if (
      // `has_collectibles` is a shortcut that is only true iff the user has a modified collectibles state
      (profile?.has_collectibles && !didCollectiblesLoadAndWasEmpty) ||
      profileHasVisibleImageOrVideoCollectibles ||
      (profileHasCollectibles && isUserOnTheirProfile)
    ) {
      headers.push({
        icon: <IconCollectibles />,
        text: ProfilePageTabs.COLLECTIBLES,
        label: ProfilePageTabs.COLLECTIBLES,
        to: 'collectibles'
      })

      elements.push(
        <div key={ProfilePageTabs.COLLECTIBLES} className={styles.tiles}>
          <CollectiblesPage
            userId={userId}
            name={name}
            isMobile={false}
            isUserOnTheirProfile={isUserOnTheirProfile}
            profile={profile}
            updateProfile={updateProfile}
            updateProfilePicture={updateProfilePicture}
            onLoad={recalculate}
            onSave={onSave}
          />
        </div>
      )
    }

    return { headers, elements }
  }

  const toggleNotificationSubscription = () => {
    if (!userId) return
    setNotificationSubscription(userId, !isSubscribed, true)
  }

  const getUserProfileContent = () => {
    if (!profile || !playlists) return { headers: [], elements: [] }
    const playlistCards = playlists.map((playlist) => (
      <CollectionCard
        key={playlist.playlist_id}
        id={playlist.playlist_id}
        size='m'
      />
    ))
    playlistCards.unshift(
      <UploadChip
        type='playlist'
        variant='card'
        source={CreatePlaylistSource.PROFILE_PAGE}
        isFirst={playlistCards.length === 0}
      />
    )

    const headers: TabHeader[] = [
      {
        icon: <IconReposts />,
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
    const elements = [
      <div key={ProfilePageTabs.REPOSTS} className={styles.tiles}>
        {renderProfileCompletionCard()}
        {(userFeed.status === Status.SUCCESS &&
          userFeed.entries.length === 0) ||
        profile.repost_count === 0 ? (
          <EmptyTab
            isOwner={isOwner}
            name={profile.name}
            text={'reposted anything'}
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
      <div key={ProfilePageTabs.PLAYLISTS} className={styles.cards}>
        {playlists.length === 0 && !isOwner ? (
          <EmptyTab
            isOwner={isOwner}
            name={profile.name}
            text={'created any playlists'}
          />
        ) : (
          <CardLineup
            cardsClassName={styles.cardLineup}
            cards={playlistCards}
          />
        )}
      </div>
    ]

    if (
      (profile?.has_collectibles && !didCollectiblesLoadAndWasEmpty) ||
      profileHasVisibleImageOrVideoCollectibles ||
      (profileHasCollectibles && isUserOnTheirProfile)
    ) {
      headers.push({
        icon: <IconCollectibles />,
        text: ProfilePageTabs.COLLECTIBLES,
        label: ProfilePageTabs.COLLECTIBLES,
        to: 'collectibles'
      })

      elements.push(
        <div key={ProfilePageTabs.COLLECTIBLES} className={styles.tiles}>
          <CollectiblesPage
            userId={userId}
            name={name}
            isMobile={false}
            isUserOnTheirProfile={isUserOnTheirProfile}
            profile={profile}
            updateProfile={updateProfile}
            updateProfilePicture={updateProfilePicture}
            onLoad={recalculate}
            onSave={onSave}
          />
        </div>
      )
    }

    return { headers, elements }
  }

  const { headers, elements } = profile
    ? isArtist
      ? getArtistProfileContent()
      : getUserProfileContent()
    : { headers: [], elements: [] }

  const { tabs, body } = useTabs({
    didChangeTabsFrom,
    isMobile: false,
    tabs: headers,
    tabRecalculator,
    bodyClassName: styles.tabBody,
    initialTab: activeTab || undefined,
    elements,
    pathname: profilePage(handle)
  })

  const {
    title = '',
    description = '',
    canonicalUrl = '',
    structuredData
  } = getUserPageSEOFields({ handle, userName: name, bio })

  const muteUserConfirmationBody = (
    <Flex gap='l' direction='column'>
      <Text color='default' textAlign='left'>
        {commentsMessages.popups.muteUser.body(name)}
      </Text>
      <Hint icon={IconQuestionCircle} css={{ textAlign: 'left' }}>
        {commentsMessages.popups.muteUser.hint}
      </Hint>
    </Flex>
  ) as ReactNode

  const unMuteUserConfirmationBody = (
    <Flex gap='l' direction='column'>
      <Text color='default' textAlign='left'>
        {commentsMessages.popups.unmuteUser.body(name)}
      </Text>
      <Hint icon={IconQuestionCircle} css={{ textAlign: 'left' }}>
        {commentsMessages.popups.unmuteUser.hint}
      </Hint>
    </Flex>
  ) as ReactNode

  const [muteUser] = useMuteUser()
  const { data: currentUserId } = useGetCurrentUserId({})

  const { data: mutedUsers } = useGetMutedUsers({
    userId: currentUserId
  })

  const isMutedFromRequest =
    mutedUsers?.some((user) => user.user_id === userId) ?? false

  const [isMutedState, setIsMuted] = useState(isMutedFromRequest)

  useEffect(() => {
    setIsMuted(isMutedFromRequest)
  }, [isMutedFromRequest])

  return (
    <Page
      title={title}
      description={description}
      canonicalUrl={canonicalUrl}
      structuredData={structuredData}
      variant='flush'
      contentClassName={styles.profilePageWrapper}
      scrollableSearch
      fromOpacity={1}
    >
      <Box w='100%'>
        {/* <ProfileWrapping
          userId={userId}
          isDeactivated={!!profile?.is_deactivated}
          allowAiAttribution={!!profile?.allow_ai_attribution}
          loading={status === Status.LOADING}
          verified={verified}
          profilePictureSizes={profilePictureSizes}
          updatedProfilePicture={updatedProfilePicture}
          hasProfilePicture={hasProfilePicture}
          isOwner={isOwner}
          isArtist={isArtist}
          editMode={editMode}
          name={name}
          handle={handle}
          bio={bio}
          location={location}
          twitterHandle={twitterHandle}
          instagramHandle={instagramHandle}
          tikTokHandle={tikTokHandle}
          twitterVerified={!!twitterVerified}
          instagramVerified={!!instagramVerified}
          tikTokVerified={!!tikTokVerified}
          website={website}
          donation={donation}
          created={created}
          onUpdateName={updateName}
          onUpdateProfilePicture={updateProfilePicture}
          onUpdateBio={updateBio}
          onUpdateLocation={updateLocation}
          onUpdateTwitterHandle={updateTwitterHandle}
          onUpdateInstagramHandle={updateInstagramHandle}
          onUpdateTikTokHandle={updateTikTokHandle}
          onUpdateWebsite={updateWebsite}
          onUpdateDonation={updateDonation}
        /> */}
        <CoverPhoto
          userId={userId}
          updatedCoverPhoto={updatedCoverPhoto ? updatedCoverPhoto.url : ''}
          error={updatedCoverPhoto ? updatedCoverPhoto.error : false}
          loading={profileLoadingStatus === Status.LOADING}
          onDrop={updateCoverPhoto}
          edit={editMode}
          darken={editMode}
        />
        {/* Profile Photo and Name */}
        <Flex
          h={COVER_PHOTO_HEIGHT_PX}
          justifyContent='center'
          alignItems='flex-end'
          w='100%'
          css={{ position: 'absolute', top: 0 }}
        >
          <Flex
            alignItems='center'
            columnGap={PROFILE_COLUMN_GAP}
            h={PROFILE_LOCKUP_HEIGHT_PX}
            css={{ maxWidth: MAX_PAGE_WIDTH_PX }}
            flex='1 1 100%'
          >
            <Flex
              css={{ flexShrink: 0, zIndex: 10 }}
              w={PROFILE_LEFT_COLUMN_WIDTH_PX}
              justifyContent='center'
            >
              <ProfilePicture
                userId={userId}
                updatedProfilePicture={
                  updatedProfilePicture ? updatedProfilePicture.url : ''
                }
                error={
                  updatedProfilePicture ? updatedProfilePicture.error : false
                }
                profilePictureSizes={isDeactivated ? null : profilePictureSizes}
                loading={status === Status.LOADING}
                editMode={editMode}
                hasProfilePicture={hasProfilePicture}
                onDrop={updateProfilePicture}
              />
            </Flex>
            <Box
              flex='1 1 100%'
              css={{
                position: 'relative',
                textAlign: 'left',
                userSelect: 'none'
              }}
              className={styles.nameWrapper}
            >
              <BadgeArtist
                className={cn(styles.badgeArtist, {
                  [styles.hide]:
                    !isArtist || status === Status.LOADING || isDeactivated
                })}
              />
              {!isDeactivated && userId && (
                <>
                  <EditableName
                    className={editMode ? styles.editableName : styles.name}
                    name={name}
                    editable={editMode}
                    verified={verified}
                    onChange={updateName}
                    userId={userId}
                  />
                  <div className={styles.handleWrapper}>
                    <h2 className={styles.handle}>{handle}</h2>
                    <FollowsYouBadge userId={userId} />
                  </div>
                </>
              )}
            </Box>
          </Flex>
        </Flex>

        {!profile || profile.is_deactivated ? (
          <Box>
            <EmptyStatBanner />
            <EmptyNavBanner />
            <Flex
              w='100%'
              mh='auto'
              css={{ maxWidth: MAX_PAGE_WIDTH_PX }}
              columnGap={PROFILE_COLUMN_GAP}
            >
              <LeftColumnSpacer />
              <DeactivatedProfileTombstone />
            </Flex>
          </Box>
        ) : (
          <Mask show={editMode} zIndex={2}>
            {/* StatBanner */}
            <Flex
              h='unit14'
              justifyContent='center'
              w='100%'
              backgroundColor='surface1'
              borderBottom='default'
            >
              <Flex
                flex='1 1 100%'
                h='100%'
                css={{ maxWidth: MAX_PAGE_WIDTH_PX }}
                columnGap={PROFILE_COLUMN_GAP}
              >
                <LeftColumnSpacer />
                <StatBanner
                  mode={mode}
                  stats={stats}
                  profileId={profile?.user_id}
                  areArtistRecommendationsVisible={
                    areArtistRecommendationsVisible
                  }
                  onCloseArtistRecommendations={onCloseArtistRecommendations}
                  onEdit={onEdit}
                  onSave={onSave}
                  onShare={onShare}
                  onCancel={onCancel}
                  following={following}
                  isSubscribed={isSubscribed}
                  onToggleSubscribe={toggleNotificationSubscription}
                  onFollow={onFollow}
                  onUnfollow={onUnfollow}
                  canCreateChat={canCreateChat}
                  onMessage={onMessage}
                  isBlocked={isBlocked}
                  isMuted={isMutedState}
                  accountUserId={accountUserId}
                  onBlock={onBlock}
                  onUnblock={onUnblock}
                  onMute={onMute}
                />
              </Flex>
            </Flex>
            <Flex direction='column'>
              {/* NavBanner */}
              <Flex
                h='unit12'
                justifyContent='center'
                w='100%'
                backgroundColor='white'
              >
                <Flex
                  flex='1 1 100%'
                  h='100%'
                  css={{ maxWidth: MAX_PAGE_WIDTH_PX }}
                  columnGap={PROFILE_COLUMN_GAP}
                >
                  <LeftColumnSpacer />
                  <NavBanner
                    tabs={tabs}
                    dropdownDisabled={dropdownDisabled}
                    onChange={changeTab}
                    activeTab={activeTab}
                    isArtist={isArtist}
                    onSortByRecent={onSortByRecent}
                    onSortByPopular={onSortByPopular}
                    shouldMaskContent={shouldMaskContent}
                  />
                </Flex>
              </Flex>

              <div className={styles.content}>{body}</div>
            </Flex>
          </Mask>
        )}
      </Box>

      {profile ? (
        <>
          <BlockUserConfirmationModal
            user={profile}
            isVisible={showBlockUserConfirmationModal}
            onClose={onCloseBlockUserConfirmationModal}
          />
          <UnblockUserConfirmationModal
            user={profile}
            isVisible={showUnblockUserConfirmationModal}
            onClose={onCloseUnblockUserConfirmationModal}
          />
          <ConfirmationModal
            onClose={onCloseMuteUserConfirmationModal}
            isOpen={showMuteUserConfirmationModal}
            messages={
              isMutedState
                ? {
                    header: commentsMessages.popups.unmuteUser.title,
                    description: unMuteUserConfirmationBody,
                    confirm: commentsMessages.popups.unmuteUser.confirm
                  }
                : {
                    header: commentsMessages.popups.muteUser.title,
                    description: muteUserConfirmationBody,
                    confirm: commentsMessages.popups.muteUser.confirm
                  }
            }
            onConfirm={() => {
              if (userId) {
                muteUser({
                  mutedUserId: userId,
                  isMuted: isMutedState
                })
                setIsMuted(!isMutedState)
              }
            }}
          ></ConfirmationModal>
        </>
      ) : null}
    </Page>
  )
}

export default memo(ProfilePage)
