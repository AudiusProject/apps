import { memo, ReactNode, useEffect, useState, RefObject } from 'react'

import { useMutedUsers } from '@audius/common/api'
import { useMuteUser } from '@audius/common/context'
import { commentsMessages } from '@audius/common/messages'
import { Status } from '@audius/common/models'
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
  IconArtistBadge as BadgeArtist,
  IconLabelBadge as BadgeLabel,
  IconNote,
  IconPlaylists,
  IconRepost as IconReposts,
  Text,
  Hint,
  IconQuestionCircle
} from '@audius/harmony'
import { Id } from '@audius/sdk'
import cn from 'classnames'

import { ConfirmationModal } from 'components/confirmation-modal'
import CoverPhoto from 'components/cover-photo/CoverPhoto'
import Lineup from 'components/lineup/Lineup'
import { LineupVariant } from 'components/lineup/types'
import Mask from 'components/mask/Mask'
import NavBanner, { EmptyNavBanner } from 'components/nav-banner/NavBanner'
import { FlushPageContainer } from 'components/page/FlushPageContainer'
import Page from 'components/page/Page'
import ProfilePicture from 'components/profile-picture/ProfilePicture'
import { ProfileCompletionHeroCard } from 'components/profile-progress/components/ProfileCompletionHeroCard'
import { EmptyStatBanner, StatBanner } from 'components/stat-banner/StatBanner'
import UploadChip from 'components/upload/UploadChip'
import FollowsYouBadge from 'components/user-badges/FollowsYouBadge'
import useTabs, { TabHeader, useTabRecalculator } from 'hooks/useTabs/useTabs'
import { BlockUserConfirmationModal } from 'pages/chat-page/components/BlockUserConfirmationModal'
import { UnblockUserConfirmationModal } from 'pages/chat-page/components/UnblockUserConfirmationModal'
import { useProfilePage } from 'pages/profile-page/useProfilePage'
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

type ProfilePageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const LeftColumnSpacer = () => (
  <Box
    w={PROFILE_LEFT_COLUMN_WIDTH_PX}
    flex={`0 0 ${PROFILE_LEFT_COLUMN_WIDTH_PX}px`}
  />
)

const ProfilePage = ({ containerRef }: ProfilePageProps) => {
  const {
    // Profile data
    profile,
    status,
    accountUserId,
    isArtist,
    isOwner,
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
    artistCoinBadge,
    hasProfilePicture,
    mode,
    stats,
    activeTab,
    dropdownDisabled,
    profilePictureSizes,
    updatedCoverPhoto,
    updatedProfilePicture,

    // Lineups
    artistTracks,
    userFeed,

    // State
    editMode,
    areArtistRecommendationsVisible,
    showBlockUserConfirmationModal,
    showUnblockUserConfirmationModal,
    showMuteUserConfirmationModal,
    isBlocked,
    canCreateChat,

    // Handlers
    changeTab,
    getLineupProps,
    onSortByRecent,
    onSortByPopular,
    loadMoreArtistTracks,
    loadMoreUserFeed,
    playArtistTrack,
    pauseArtistTrack,
    playUserFeedTrack,
    pauseUserFeedTrack,
    onFollow,
    onUnfollow,
    onShare,
    onEdit,
    onSave,
    onCancel,
    updateProfilePicture,
    updateName,
    updateBio,
    updateLocation,
    updateTwitterHandle,
    updateInstagramHandle,
    updateTikTokHandle,
    updateWebsite,
    updateArtistCoinBadge,
    updateCoverPhoto,
    didChangeTabsFrom,
    onCloseArtistRecommendations,
    onMessage,
    onBlock,
    onUnblock,
    onMute,
    onCloseBlockUserConfirmationModal,
    onCloseUnblockUserConfirmationModal,
    onCloseMuteUserConfirmationModal
  } = useProfilePage(containerRef)
  const renderProfileCompletionCard = () => {
    return isOwner ? <ProfileCompletionHeroCard /> : null
  }

  const isDeactivated = !!profile?.is_deactivated

  const getArtistProfileContent = () => {
    if (!profile) return { headers: [], elements: [] }

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
                text={'uploaded any tracks'}
              />
            </>
          ) : (
            <Lineup
              {...getLineupProps(artistTracks)}
              extraPrecedingElement={trackUploadChip ?? undefined}
              animateLeadingElement
              leadingElementId={profile.artist_pick_track_id ?? undefined}
              showArtistPick={true}
              loadMore={loadMoreArtistTracks}
              playTrack={playArtistTrack}
              pauseTrack={pauseArtistTrack}
              actions={tracksActions}
              variant={LineupVariant.GRID}
            />
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
      </Box>
    ]

    return { headers, elements }
  }

  const getUserProfileContent = () => {
    if (!profile) return { headers: [], elements: [] }

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
      <Box w='100%' key={ProfilePageTabs.REPOSTS}>
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
      </Box>,
      <Box w='100%' key={ProfilePageTabs.PLAYLISTS}>
        <PlaylistsTab isOwner={isOwner} profile={profile} userId={userId} />
      </Box>
    ]

    return { headers, elements }
  }

  const { headers, elements } = profile
    ? isArtist
      ? getArtistProfileContent()
      : getUserProfileContent()
    : { headers: [], elements: [] }

  const tabRecalculator = useTabRecalculator()

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

  const { data: mutedUsers } = useMutedUsers()

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
      entityType='user'
      hashId={profile?.user_id ? Id.parse(profile.user_id) : undefined}
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
                {/* @ts-ignore */}
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
                {profile?.profile_type === 'label' ? (
                  <BadgeLabel className={styles.badge} />
                ) : (
                  <BadgeArtist
                    className={cn(styles.badge, {
                      [styles.hide]:
                        !isArtist || status === Status.LOADING || isDeactivated
                    })}
                  />
                )}
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
                  twitterHandle={twitterHandle}
                  instagramHandle={instagramHandle}
                  tikTokHandle={tikTokHandle}
                  twitterVerified={twitterVerified}
                  instagramVerified={instagramVerified}
                  tikTokVerified={tikTokVerified}
                  website={website}
                  artistCoinBadge={artistCoinBadge}
                  created={created}
                  onUpdateBio={updateBio}
                  onUpdateLocation={updateLocation}
                  onUpdateTwitterHandle={updateTwitterHandle}
                  onUpdateInstagramHandle={updateInstagramHandle}
                  onUpdateTikTokHandle={updateTikTokHandle}
                  onUpdateWebsite={updateWebsite}
                  onUpdateArtistCoinBadge={updateArtistCoinBadge}
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
