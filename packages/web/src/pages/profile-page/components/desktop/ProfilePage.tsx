import { useCallback, memo, ReactNode, useEffect, useState } from 'react'

import {
  useCurrentUserId,
  useGetMutedUsers,
  useProfileReposts,
  useProfileTracks,
  useUserCollectibles
} from '@audius/common/api'
import { useMuteUser } from '@audius/common/context'
import { commentsMessages } from '@audius/common/messages'
import {
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
  IconQuestionCircle
} from '@audius/harmony'
import cn from 'classnames'

import CollectiblesPage from 'components/collectibles/components/CollectiblesPage'
import { ConfirmationModal } from 'components/confirmation-modal'
import CoverPhoto from 'components/cover-photo/CoverPhoto'
import Lineup from 'components/lineup/Lineup'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { LineupVariant } from 'components/lineup/types'
import Mask from 'components/mask/Mask'
import NavBanner, { EmptyNavBanner } from 'components/nav-banner/NavBanner'
import { FlushPageContainer } from 'components/page/FlushPageContainer'
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
import { getUserPageSEOFields } from 'utils/seo'
import { zIndex } from 'utils/zIndex'

import { DeactivatedProfileTombstone } from '../DeactivatedProfileTombstone'
import { EditableName } from '../EditableName'

import { AlbumsTab } from './AlbumsTab'
import { EmptyTab } from './EmptyTab'
import { PlaylistsTab } from './PlaylistsTab'
import { ProfileLeftNav } from './ProfileLeftNav'
import styles from './ProfilePage.module.css'
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
  status: Status
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

const messages = {
  emptyTab: {
    uploadedTracks: 'uploaded any tracks',
    repostedAnything: 'reposted anything'
  },
  tabs: {
    tracks: ProfilePageTabs.TRACKS,
    albums: ProfilePageTabs.ALBUMS,
    playlists: ProfilePageTabs.PLAYLISTS,
    reposts: ProfilePageTabs.REPOSTS,
    collectibles: ProfilePageTabs.COLLECTIBLES
  },
  muteUser: commentsMessages.popups.muteUser,
  unmuteUser: commentsMessages.popups.unmuteUser
}
const RepostsTab = ({ handle }: { handle: string }) => {
  const queryData = useProfileReposts({
    handle
  })

  return (
    <div className={styles.tiles}>
      <TanQueryLineup
        lineupQueryData={queryData}
        actions={feedActions}
        pageSize={queryData.pageSize}
        variant={LineupVariant.CONDENSED}
      />
    </div>
  )
}

const TracksTab = ({
  profile,
  handle,
  isOwner
}: {
  profile: User
  handle: string
  isOwner: boolean
}) => {
  const queryData = useProfileTracks({
    handle
  })

  const trackUploadChip = isOwner ? (
    <UploadChip
      key='upload-chip'
      type='track'
      variant='tile'
      source='profile'
    />
  ) : undefined

  return (
    <TanQueryLineup
      extraPrecedingElement={trackUploadChip}
      lineupQueryData={queryData}
      leadingElementId={profile.artist_pick_track_id}
      pageSize={queryData.pageSize}
      actions={tracksActions}
      variant={LineupVariant.CONDENSED}
    />
  )
}

const LeftColumnSpacer = () => (
  <Box
    w={PROFILE_LEFT_COLUMN_WIDTH_PX}
    flex={`0 0 ${PROFILE_LEFT_COLUMN_WIDTH_PX}px`}
  />
)

const ProfilePage = ({
  isOwner,
  profile,
  status,
  goToRoute,
  artistTracks,
  playArtistTrack,
  pauseArtistTrack,
  getLineupProps,
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

  const { data: collectibles } = useUserCollectibles({ userId })

  const profileHasCollectibles =
    profile?.collectibleList?.length || profile?.solanaCollectibleList?.length
  const profileNeverSetCollectiblesOrder = !collectibles
  const profileHasNonEmptyCollectiblesOrder =
    collectibles?.order?.length ?? false
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
    if (!profile) return { headers: [], elements: [] }

    const headers: TabHeader[] = [
      {
        icon: <IconNote />,
        text: messages.tabs.tracks,
        label: ProfilePageTabs.TRACKS,
        to: 'tracks'
      },
      {
        icon: <IconAlbum />,
        text: messages.tabs.albums,
        label: ProfilePageTabs.ALBUMS,
        to: 'albums'
      },
      {
        icon: <IconPlaylists />,
        text: messages.tabs.playlists,
        label: ProfilePageTabs.PLAYLISTS,
        to: 'playlists'
      },
      {
        icon: <IconReposts />,
        text: messages.tabs.reposts,
        label: ProfilePageTabs.REPOSTS,
        to: 'reposts'
      }
    ]
    const elements = [
      <Box w='100%' key={ProfilePageTabs.TRACKS}>
        {renderProfileCompletionCard()}
        {status === Status.SUCCESS ? (
          artistTracks.status === Status.SUCCESS &&
          artistTracks.entries.length === 0 ? (
            <>
              {isOwner ? (
                <UploadChip
                  key='upload-chip'
                  type='track'
                  variant='tile'
                  source='profile'
                />
              ) : null}
              <EmptyTab
                isOwner={isOwner}
                name={profile.name}
                text={messages.emptyTab.uploadedTracks}
              />
            </>
          ) : (
            <TracksTab profile={profile} handle={handle} isOwner={isOwner} />
          )
        ) : null}
      </Box>,
      <Box w='100%' key={ProfilePageTabs.ALBUMS}>
        <AlbumsTab isOwner={isOwner} profile={profile} userId={userId} />
      </Box>,
      <Box w='100%' key={ProfilePageTabs.PLAYLISTS}>
        <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
      </Box>,
      <Box w='100%' key={ProfilePageTabs.REPOSTS}>
        {status === Status.SUCCESS ? (
          (userFeed.status === Status.SUCCESS &&
            userFeed.entries.length === 0) ||
          profile.repost_count === 0 ? (
            <EmptyTab
              isOwner={isOwner}
              name={profile.name}
              text={messages.emptyTab.repostedAnything}
            />
          ) : (
            <RepostsTab handle={handle} />
          )
        ) : null}
      </Box>
    ]

    if (
      // `has_collectibles` is a shortcut that is only true iff the user has a modified collectibles state
      (profile?.has_collectibles && !didCollectiblesLoadAndWasEmpty) ||
      profileHasVisibleImageOrVideoCollectibles ||
      (profileHasCollectibles && isUserOnTheirProfile)
    ) {
      headers.push({
        icon: <IconCollectibles />,
        text: messages.tabs.collectibles,
        label: ProfilePageTabs.COLLECTIBLES,
        to: 'collectibles'
      })

      elements.push(
        <Box w='100%' key={ProfilePageTabs.COLLECTIBLES}>
          <CollectiblesPage
            userId={userId}
            name={name}
            isMobile={false}
            isUserOnTheirProfile={isUserOnTheirProfile}
            profile={profile}
            updateProfilePicture={updateProfilePicture}
            onLoad={recalculate}
            onSave={onSave}
            allowUpdates
          />
        </Box>
      )
    }

    return { headers, elements }
  }

  const toggleNotificationSubscription = () => {
    if (!userId) return
    setNotificationSubscription(userId, !isSubscribed, true)
  }

  const getUserProfileContent = () => {
    if (!profile) return { headers: [], elements: [] }

    const headers: TabHeader[] = [
      {
        icon: <IconReposts />,
        text: messages.tabs.reposts,
        label: ProfilePageTabs.REPOSTS,
        to: 'reposts'
      },
      {
        icon: <IconPlaylists />,
        text: messages.tabs.playlists,
        label: ProfilePageTabs.PLAYLISTS,
        to: 'playlists'
      }
    ]
    const elements = [
      <Box w='100%' key={ProfilePageTabs.REPOSTS}>
        {renderProfileCompletionCard()}
        {(userFeed.status === Status.SUCCESS &&
          userFeed.entries.length === 0) ||
        profile.repost_count === 0 ? (
          <EmptyTab
            isOwner={isOwner}
            name={profile.name}
            text={messages.emptyTab.repostedAnything}
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
      </Box>,
      <Box w='100%' key={ProfilePageTabs.PLAYLISTS}>
        <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
      </Box>
    ]

    if (
      (profile?.has_collectibles && !didCollectiblesLoadAndWasEmpty) ||
      profileHasVisibleImageOrVideoCollectibles ||
      (profileHasCollectibles && isUserOnTheirProfile)
    ) {
      headers.push({
        icon: <IconCollectibles />,
        text: messages.tabs.collectibles,
        label: ProfilePageTabs.COLLECTIBLES,
        to: 'collectibles'
      })

      elements.push(
        <Box w='100%' key={ProfilePageTabs.COLLECTIBLES}>
          <CollectiblesPage
            userId={userId}
            name={name}
            isMobile={false}
            isUserOnTheirProfile={isUserOnTheirProfile}
            profile={profile}
            updateProfilePicture={updateProfilePicture}
            onLoad={recalculate}
            onSave={onSave}
            allowUpdates
          />
        </Box>
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
        {messages.muteUser.body(name)}
      </Text>
      <Hint icon={IconQuestionCircle} css={{ textAlign: 'left' }}>
        {messages.muteUser.hint}
      </Hint>
    </Flex>
  ) as ReactNode

  const unMuteUserConfirmationBody = (
    <Flex gap='l' direction='column'>
      <Text color='default' textAlign='left'>
        {messages.unmuteUser.body(name)}
      </Text>
      <Hint icon={IconQuestionCircle} css={{ textAlign: 'left' }}>
        {messages.unmuteUser.hint}
      </Hint>
    </Flex>
  ) as ReactNode

  const [muteUser] = useMuteUser()
  const { data: currentUserId } = useCurrentUserId()

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
      scrollableSearch
      fromOpacity={1}
    >
      <Box w='100%' pb='2xl'>
        <CoverPhoto
          userId={userId}
          updatedCoverPhoto={updatedCoverPhoto ? updatedCoverPhoto.url : ''}
          error={updatedCoverPhoto ? updatedCoverPhoto.error : false}
          loading={status === Status.LOADING}
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
          <FlushPageContainer>
            <Flex
              alignItems='center'
              columnGap={PROFILE_COLUMN_GAP}
              h={PROFILE_LOCKUP_HEIGHT_PX}
              flex='1 1 100%'
            >
              <Flex
                css={{
                  flexShrink: 0,
                  zIndex: zIndex.PROFILE_EDITABLE_COMPONENTS
                }}
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
                  profilePictureSizes={
                    isDeactivated ? null : profilePictureSizes
                  }
                  loading={status === Status.LOADING}
                  editMode={editMode}
                  hasProfilePicture={hasProfilePicture}
                  onDrop={updateProfilePicture}
                />
              </Flex>
              <Flex
                column
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
                    <Flex alignItems='center' columnGap='s'>
                      <Text
                        shadow='emphasis'
                        variant='title'
                        color='staticWhite'
                      >
                        {handle}
                      </Text>
                      <FollowsYouBadge userId={userId} />
                    </Flex>
                  </>
                )}
              </Flex>
            </Flex>
          </FlushPageContainer>
        </Flex>

        {!profile || profile.is_deactivated ? (
          <Box>
            <EmptyStatBanner />
            <EmptyNavBanner />
            <FlushPageContainer>
              <Flex flex='1 1 100%' mh='auto' columnGap={PROFILE_COLUMN_GAP}>
                <LeftColumnSpacer />
                {status === Status.SUCCESS && <DeactivatedProfileTombstone />}
              </Flex>
            </FlushPageContainer>
          </Box>
        ) : (
          <Mask show={editMode} zIndex={zIndex.PROFILE_EDIT_MASK}>
            {/* StatBanner */}
            <FlushPageContainer
              h='unit14'
              backgroundColor='surface1'
              borderBottom='default'
            >
              <Flex flex='1 1 100%' h='100%' columnGap={PROFILE_COLUMN_GAP}>
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
            </FlushPageContainer>
            {/* NavBanner */}
            <FlushPageContainer h='unit14' backgroundColor='white'>
              <Flex
                flex='1 1 100%'
                h='unit12'
                alignSelf='flex-end'
                justifyContent='flex-start'
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
                />
              </Flex>
            </FlushPageContainer>
            {/* Left side and Tab Content */}
            <FlushPageContainer pt='2xl'>
              <Flex flex='1 1 100%' columnGap={PROFILE_COLUMN_GAP}>
                <ProfileLeftNav
                  userId={userId}
                  isDeactivated={isDeactivated}
                  loading={status === Status.LOADING}
                  isOwner={isOwner}
                  isArtist={isArtist}
                  editMode={editMode}
                  handle={handle}
                  bio={bio}
                  location={location}
                  allowAiAttribution={!!profile?.allow_ai_attribution}
                  twitterHandle={twitterHandle}
                  instagramHandle={instagramHandle}
                  tikTokHandle={tikTokHandle}
                  twitterVerified={twitterVerified}
                  instagramVerified={instagramVerified}
                  tikTokVerified={tikTokVerified}
                  website={website}
                  donation={donation}
                  created={created}
                  onUpdateBio={updateBio}
                  onUpdateLocation={updateLocation}
                  onUpdateTwitterHandle={updateTwitterHandle}
                  onUpdateInstagramHandle={updateInstagramHandle}
                  onUpdateTikTokHandle={updateTikTokHandle}
                  onUpdateWebsite={updateWebsite}
                  onUpdateDonation={updateDonation}
                />
                <Box flex='1 1 100%'>{body}</Box>
              </Flex>
            </FlushPageContainer>
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
                    header: messages.unmuteUser.title,
                    description: unMuteUserConfirmationBody,
                    confirm: messages.unmuteUser.confirm
                  }
                : {
                    header: messages.muteUser.title,
                    description: muteUserConfirmationBody,
                    confirm: messages.muteUser.confirm
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
