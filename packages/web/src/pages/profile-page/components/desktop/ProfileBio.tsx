import { useCallback, useEffect, useState } from 'react'

import { ID, Name } from '@audius/common/models'
import {
  Flex,
  IconCaretDown,
  IconCaretUp,
  PlainButton,
  Text
} from '@audius/harmony'
import { ResizeObserver } from '@juggle/resize-observer'
import useMeasure from 'react-use-measure'

import { make, useRecord } from 'common/store/analytics/actions'
import ProfilePageBadge from 'components/user-badges/ProfilePageBadge'
import { UserGeneratedText } from 'components/user-generated-text'

import SocialLink, { Type } from '../SocialLink'

const messages = {
  seeMore: 'See More',
  seeLess: 'See Less'
}

type ProfileBioProps = {
  userId: ID
  handle: string
  bio: string
  location: string
  website: string
  created: string
  twitterHandle: string
  instagramHandle: string
  tikTokHandle: string
}

// Line height is 16px, 4 lines
const MAX_BIO_SIZE = 16 * 4

export const ProfileBio = ({
  userId,
  handle,
  bio,
  location,
  website,
  created,
  twitterHandle,
  instagramHandle,
  tikTokHandle
}: ProfileBioProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCollapsible, setIsCollapsible] = useState(false)
  const [bioRef, { height: bioSize }] = useMeasure({
    polyfill: ResizeObserver
  })

  const linkCount = [
    website,
    twitterHandle,
    instagramHandle,
    tikTokHandle
  ].filter(Boolean).length
  const hasSocial = twitterHandle || instagramHandle || tikTokHandle

  /**
   * Collapse the component by default if:
   * - The bio is more than four lines OR
   * - There's more than one link
   */
  useEffect(() => {
    if (
      !isCollapsed &&
      !isCollapsible &&
      (bioSize > MAX_BIO_SIZE || linkCount > 1)
    ) {
      setIsCollapsed(true)
      setIsCollapsible(true)
    }
  }, [
    linkCount,
    bioSize,
    isCollapsed,
    isCollapsible,
    setIsCollapsed,
    setIsCollapsible
  ])

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed, setIsCollapsed])

  const record = useRecord()

  const onClickTwitter = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_TWITTER, {
        handle: handle.replace('@', ''),
        twitterHandle
      })
    )
  }, [record, handle, twitterHandle])
  const onClickInstagram = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_INSTAGRAM, {
        handle: handle.replace('@', ''),
        instagramHandle
      })
    )
  }, [record, handle, instagramHandle])
  const onClickTikTok = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_TIKTOK, {
        handle: handle.replace('@', ''),
        tikTokHandle
      })
    )
  }, [record, handle, tikTokHandle])
  const onClickWebsite = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_WEBSITE, {
        handle: handle.replace('@', ''),
        website
      })
    )
  }, [record, handle, website])

  const renderCollapsedContent = () =>
    hasSocial ? (
      <Flex gap='m'>
        {twitterHandle && (
          <SocialLink
            type={Type.X}
            link={twitterHandle}
            onClick={onClickTwitter}
            iconOnly
          />
        )}
        {instagramHandle && (
          <SocialLink
            type={Type.INSTAGRAM}
            link={instagramHandle}
            onClick={onClickInstagram}
            iconOnly
          />
        )}
        {tikTokHandle && (
          <SocialLink
            type={Type.TIKTOK}
            link={tikTokHandle}
            onClick={onClickTikTok}
            iconOnly
          />
        )}
        {website && (
          <SocialLink
            type={Type.WEBSITE}
            link={website}
            onClick={onClickWebsite}
            iconOnly
          />
        )}
      </Flex>
    ) : (
      <></>
    )

  const renderExpandedContent = () => (
    <Flex column gap='m'>
      {twitterHandle && (
        <SocialLink
          type={Type.X}
          link={twitterHandle}
          onClick={onClickTwitter}
        />
      )}
      {instagramHandle && (
        <SocialLink
          type={Type.INSTAGRAM}
          link={instagramHandle}
          onClick={onClickInstagram}
        />
      )}
      {tikTokHandle && (
        <SocialLink
          type={Type.TIKTOK}
          link={tikTokHandle}
          onClick={onClickTikTok}
        />
      )}
      {website && (
        <SocialLink
          type={Type.WEBSITE}
          link={website}
          onClick={onClickWebsite}
        />
      )}
      <Text size='xs'>{location}</Text>
      <Text size='xs'> Joined {created}</Text>
    </Flex>
  )

  return (
    <Flex column gap='l'>
      <ProfilePageBadge userId={userId} />
      {bio ? (
        <UserGeneratedText
          size='s'
          ref={bioRef}
          ellipses
          maxLines={isCollapsed ? 4 : undefined}
          linkSource='profile page'
        >
          {bio}
        </UserGeneratedText>
      ) : null}
      {isCollapsed ? renderCollapsedContent() : renderExpandedContent()}
      {isCollapsible ? (
        <PlainButton
          iconRight={isCollapsed ? IconCaretDown : IconCaretUp}
          onClick={handleToggleCollapse}
          css={{ alignSelf: 'flex-start' }}
        >
          {isCollapsed ? messages.seeMore : messages.seeLess}
        </PlainButton>
      ) : null}
    </Flex>
  )
}
