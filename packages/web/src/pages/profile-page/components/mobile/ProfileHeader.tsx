import { useState, useRef, useCallback, useEffect, MouseEvent } from 'react'

import {
  imageCoverPhotoBlank,
  imageProfilePicEmpty
} from '@audius/common/assets'
import {
  Name,
  SquareSizes,
  WidthSizes,
  ID,
  ProfilePictureSizes,
  CoverPhotoSizes
} from '@audius/common/models'
import { ProfileUser } from '@audius/common/store'
import { formatCount } from '@audius/common/utils'
import {
  IconArtistBadge as BadgeArtist,
  IconInstagram,
  IconDonate,
  IconLink,
  IconTikTok,
  IconTwitter as IconTwitterBird,
  Flex,
  Button,
  IconPencil,
  FollowButton
} from '@audius/harmony'
import cn from 'classnames'

import { make, useRecord } from 'common/store/analytics/actions'
import { ArtistRecommendationsDropdown } from 'components/artist-recommendations/ArtistRecommendationsDropdown'
import { ClientOnly } from 'components/client-only/ClientOnly'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import Skeleton from 'components/skeleton/Skeleton'
import { StaticImage } from 'components/static-image/StaticImage'
import SubscribeButton from 'components/subscribe-button/SubscribeButton'
import FollowsYouBadge from 'components/user-badges/FollowsYouBadge'
import ProfilePageBadge from 'components/user-badges/ProfilePageBadge'
import UserBadges from 'components/user-badges/UserBadges'
import { UserGeneratedText } from 'components/user-generated-text'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useUserProfilePicture } from 'hooks/useUserProfilePicture'
import { useSsrContext } from 'ssr/SsrContext'
import { FOLLOWING_USERS_ROUTE, FOLLOWERS_USERS_ROUTE } from 'utils/route'

import GrowingCoverPhoto from './GrowingCoverPhoto'
import styles from './ProfileHeader.module.css'
import { SocialLink } from './SocialLink'
import UploadButton from './UploadButton'
import UploadStub from './UploadStub'

const messages = {
  tracks: 'Tracks',
  followers: 'Followers',
  following: 'Following',
  playlists: 'Playlists',
  showMore: 'Show More',
  showLess: 'Show Less',
  editProfile: 'Edit Profile'
}

const LoadingProfileHeader = () => {
  return (
    <div className={styles.headerContainer}>
      <div className={cn(styles.coverPhoto, styles.loading)}>
        <Skeleton
          className={cn(styles.loadingSkeleton, styles.loadingSkeletonAvatar)}
        />
      </div>
      <div className={cn(styles.artistInfo, styles.loadingInfo)}>
        <div className={styles.loadingNameContainer}>
          <Skeleton
            className={cn(styles.loadingSkeleton, styles.loadingShortName)}
          />
        </div>
        <Skeleton className={cn(styles.loadingSkeleton)} />
        <Skeleton
          className={cn(styles.loadingSkeleton, styles.loadingShortDesc)}
        />
      </div>
    </div>
  )
}

type ProfileHeaderProps = {
  isDeactivated: boolean
  profile: ProfileUser
  name: string
  handle: string
  isArtist: boolean
  bio: string
  verified: boolean
  userId: ID
  loading: boolean
  coverPhotoSizes: CoverPhotoSizes | null
  profilePictureSizes: ProfilePictureSizes | null
  hasProfilePicture: boolean
  playlistCount: number
  trackCount: number
  followerCount: number
  setFollowersUserId: (id: ID) => void
  followingCount: number
  setFollowingUserId: (id: ID) => void
  twitterHandle: string
  instagramHandle: string
  tikTokHandle: string
  website: string
  donation: string
  followers: any
  goToRoute: (route: string) => void
  following: boolean
  isSubscribed: boolean
  mode: string
  onFollow: (id: ID) => void
  onUnfollow: (id: ID) => void
  switchToEditMode: () => void
  updatedCoverPhoto: string | null
  updatedProfilePicture: string | null
  onUpdateProfilePicture: (
    files: any,
    source: 'original' | 'unsplash' | 'url'
  ) => void
  onUpdateCoverPhoto: (
    files: any,
    source: 'original' | 'unsplash' | 'url'
  ) => void
  setNotificationSubscription: (userId: ID, isSubscribed: boolean) => void
  areArtistRecommendationsVisible: boolean
  onCloseArtistRecommendations: () => void
}

function isEllipsisActive(e: HTMLElement) {
  return e.offsetHeight < e.scrollHeight
}

const ProfileHeader = ({
  isDeactivated,
  profile,
  name,
  handle,
  isArtist,
  bio,
  userId,
  loading,
  coverPhotoSizes,
  profilePictureSizes,
  playlistCount,
  trackCount,
  followerCount,
  followingCount,
  twitterHandle,
  instagramHandle,
  tikTokHandle,
  website,
  donation,
  setFollowersUserId,
  setFollowingUserId,
  goToRoute,
  following,
  isSubscribed,
  mode,
  onFollow,
  onUnfollow,
  switchToEditMode,
  updatedCoverPhoto,
  updatedProfilePicture,
  onUpdateCoverPhoto,
  onUpdateProfilePicture,
  setNotificationSubscription,
  areArtistRecommendationsVisible,
  onCloseArtistRecommendations
}: ProfileHeaderProps) => {
  const [hasEllipsis, setHasEllipsis] = useState(false)
  const [isDescriptionMinimized, setIsDescriptionMinimized] = useState(true)
  const { isSsrEnabled } = useSsrContext()
  const bioRef = useRef<HTMLElement | null>(null)
  const isEditing = mode === 'editing'

  const bioRefCb = useCallback((node: HTMLParagraphElement) => {
    if (node !== null) {
      const ellipsisActive = isEllipsisActive(node)
      if (ellipsisActive) {
        bioRef.current = node
        setHasEllipsis(true)
        node.style.height = '40px'
      }
    }
  }, [])

  useEffect(() => {
    const bioEl = bioRef.current
    if (bioEl && hasEllipsis) {
      if (isDescriptionMinimized) {
        bioEl.style.height = '40px'
      } else {
        bioEl.style.height = `${bioEl.scrollHeight}px`
      }
    }
  }, [hasEllipsis, isDescriptionMinimized])

  useEffect(() => {
    if ((website || donation) && !hasEllipsis) {
      setHasEllipsis(true)
    }
  }, [website, donation, hasEllipsis, setHasEllipsis])

  let { source: coverPhoto } = useCoverPhoto(userId, WidthSizes.SIZE_2000)
  coverPhoto = isDeactivated ? imageProfilePicEmpty : coverPhoto
  let coverPhotoStyle = {}
  if (coverPhoto === imageCoverPhotoBlank) {
    coverPhotoStyle = {
      backgroundRepeat: 'repeat',
      backgroundSize: '300px 300px'
    }
  }
  const profilePicture = useUserProfilePicture(
    userId,
    isDeactivated ? null : profilePictureSizes,
    SquareSizes.SIZE_150_BY_150
  )
  const record = useRecord()

  const onGoToInstagram = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_INSTAGRAM, {
        handle: handle.replace('@', ''),
        instagramHandle
      })
    )
  }, [record, instagramHandle, handle])

  const onGoToTwitter = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_TWITTER, {
        handle: handle.replace('@', ''),
        twitterHandle
      })
    )
  }, [record, twitterHandle, handle])

  const onGoToTikTok = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_TIKTOK, {
        handle: handle.replace('@', ''),
        tikTokHandle
      })
    )
  }, [record, tikTokHandle, handle])

  const onGoToFollowersPage = () => {
    setFollowersUserId(userId)
    goToRoute(FOLLOWERS_USERS_ROUTE)
  }

  const onGoToFollowingPage = () => {
    setFollowingUserId(userId)
    goToRoute(FOLLOWING_USERS_ROUTE)
  }

  const onGoToWebsite = () => {
    let link = website
    if (!/^https?/.test(link)) {
      link = `https://${link}`
    }
    const win = window.open(link, '_blank')
    if (win) win.focus()
    record(
      make(Name.PROFILE_PAGE_CLICK_WEBSITE, {
        handle,
        website
      })
    )
  }

  const handleClickDonationLink = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      record(
        make(Name.PROFILE_PAGE_CLICK_DONATION, {
          handle,
          // @ts-expect-error
          donation: event.target.href
        })
      )
    },
    [record, handle]
  )

  const toggleNotificationSubscription = () => {
    setNotificationSubscription(userId, !isSubscribed)
  }

  // If we're not loading, we know that
  // nullable fields such as userId are valid.
  if (loading && !isSsrEnabled) {
    return <LoadingProfileHeader />
  }

  const ImageElement = isSsrEnabled ? StaticImage : DynamicImage

  const isUserMissingImage =
    !profile?.cover_photo_sizes && !profile?.profile_picture_sizes

  return (
    <div className={styles.headerContainer}>
      <GrowingCoverPhoto
        cid={
          profile?.cover_photo_sizes ?? profile?.profile_picture_sizes ?? null
        }
        imageUrl={
          updatedCoverPhoto ??
          (isUserMissingImage || isDeactivated
            ? imageCoverPhotoBlank
            : undefined)
        }
        image={updatedCoverPhoto || coverPhoto}
        imageStyle={coverPhotoStyle}
        wrapperClassName={cn(styles.coverPhoto, {
          [styles.isEditing]: isEditing
        })}
        useBlur={Boolean(
          !profile?.cover_photo_sizes && profile?.profile_picture_sizes
        )}
      >
        {isArtist && !isEditing && !isDeactivated ? (
          <BadgeArtist className={styles.badgeArtist} />
        ) : null}
        {isEditing && <UploadStub onChange={onUpdateCoverPhoto} />}
      </GrowingCoverPhoto>
      <ImageElement
        image={updatedProfilePicture || profilePicture}
        cid={profile?.profile_picture_sizes}
        size={SquareSizes.SIZE_150_BY_150}
        imageUrl={
          updatedProfilePicture ||
          (isUserMissingImage || isDeactivated
            ? imageProfilePicEmpty
            : undefined)
        }
        className={styles.profilePicture}
        wrapperClassName={cn(styles.profilePictureWrapper, {
          [styles.isEditing]: isEditing
        })}
      >
        {isEditing && <UploadStub onChange={onUpdateProfilePicture} />}
      </ImageElement>
      {!isEditing && !isDeactivated && (
        <div className={styles.artistInfo}>
          <div className={styles.titleContainer}>
            <div className={styles.left}>
              <div className={styles.artistName}>
                <h1>
                  {`${name} `}
                  <span className={styles.badgesSpan}>
                    <UserBadges
                      userId={userId}
                      className={styles.iconVerified}
                      badgeSize={12}
                    />
                  </span>
                </h1>
              </div>
              <div className={styles.artistHandleWrapper}>
                <div className={styles.artistHandle}>{handle}</div>
                <FollowsYouBadge userId={userId} />
              </div>
            </div>
            <ClientOnly>
              <Flex gap='s' justifyContent='flex-end' flex={1}>
                {following ? (
                  <SubscribeButton
                    isSubscribed={isSubscribed}
                    isFollowing={following}
                    onToggleSubscribe={toggleNotificationSubscription}
                  />
                ) : null}
                {mode === 'owner' ? (
                  <Button
                    variant='secondary'
                    size='small'
                    onClick={switchToEditMode}
                    iconLeft={IconPencil}
                  >
                    {messages.editProfile}
                  </Button>
                ) : (
                  <FollowButton
                    isFollowing={following}
                    onFollow={() => onFollow(userId)}
                    onUnfollow={() => onUnfollow(userId)}
                    fullWidth={false}
                  />
                )}
              </Flex>
            </ClientOnly>
          </div>
          <div className={styles.artistMetrics}>
            <div className={styles.artistMetric}>
              <div className={styles.artistMetricValue}>
                {formatCount(isArtist ? trackCount : playlistCount)}
              </div>
              <div className={styles.artistMetricLabel}>
                {isArtist ? messages.tracks : messages.playlists}
              </div>
            </div>
            <div
              className={styles.artistMetric}
              onClick={followerCount! > 0 ? onGoToFollowersPage : () => {}}
            >
              <div className={styles.artistMetricValue}>
                {formatCount(followerCount)}
              </div>
              <div className={styles.artistMetricLabel}>
                {messages.followers}
              </div>
            </div>
            <div
              className={styles.artistMetric}
              onClick={followingCount! > 0 ? onGoToFollowingPage : () => {}}
            >
              <div className={styles.artistMetricValue}>
                {formatCount(followingCount)}
              </div>
              <div className={styles.artistMetricLabel}>
                {messages.following}
              </div>
            </div>
          </div>
          <Flex alignItems='center' gap='m'>
            <ProfilePageBadge userId={userId} isCompact />
            <Flex gap='xl' justifyContent='center' flex={1}>
              {twitterHandle ? (
                <SocialLink
                  to={`https://twitter.com/${twitterHandle}`}
                  onClick={onGoToTwitter}
                  icon={<IconTwitterBird size='xl' />}
                />
              ) : null}
              {instagramHandle ? (
                <SocialLink
                  to={`https://instagram.com/${instagramHandle}`}
                  onClick={onGoToInstagram}
                  icon={<IconInstagram size='xl' />}
                />
              ) : null}
              {tikTokHandle ? (
                <SocialLink
                  to={`https://tiktok.com/@${tikTokHandle}`}
                  onClick={onGoToTikTok}
                  icon={<IconTikTok />}
                />
              ) : null}
            </Flex>
          </Flex>

          {bio ? (
            <UserGeneratedText
              ref={bioRefCb}
              color='subdued'
              size='s'
              linkSource='profile page'
              className={cn(styles.bio, {
                [styles.bioExpanded]: hasEllipsis && !isDescriptionMinimized
              })}
            >
              {bio}
            </UserGeneratedText>
          ) : null}
          {hasEllipsis && !isDescriptionMinimized && (website || donation) && (
            <div className={styles.sites}>
              {website && (
                <div className={styles.website} onClick={onGoToWebsite}>
                  <IconLink size='m' color='default' />
                  <span>{website}</span>
                </div>
              )}
              {donation && (
                <div className={styles.donation}>
                  <IconDonate size='m' color='default' />
                  <UserGeneratedText
                    size='s'
                    onClickLink={handleClickDonationLink}
                  >
                    {donation}
                  </UserGeneratedText>
                </div>
              )}
            </div>
          )}
          {hasEllipsis ? (
            <div
              className={styles.expandDescription}
              onClick={() => setIsDescriptionMinimized(!isDescriptionMinimized)}
            >
              {isDescriptionMinimized ? messages.showMore : messages.showLess}
            </div>
          ) : null}
          <ArtistRecommendationsDropdown
            isVisible={areArtistRecommendationsVisible}
            renderHeader={() => (
              <p>Here are some accounts that vibe well with {name}</p>
            )}
            artistId={userId}
            onClose={onCloseArtistRecommendations}
          />
        </div>
      )}
      {mode === 'owner' && !isEditing && <UploadButton />}
    </div>
  )
}

export default ProfileHeader
