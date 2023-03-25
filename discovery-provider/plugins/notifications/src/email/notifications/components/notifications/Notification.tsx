import React from 'react'

import NotificationBody from './NotificationBody'
import {
  WhiteHeavyCheckMarkIcon,
  IncomingEnvelopeIcon,
  HeadphoneIcon,
  MobilePhoneWithArrowIcon,
  MultipleMusicalNotesIcon,
  MoneyMouthFaceIcon,
  TrebleClefIcon
} from './Icons'

import {
  ChallengeId,
  Entity,
  EntityType,
  DMEntityType,
  User
} from '../../types'

const getRankSuffix = (num) => {
  if (num === 1) return 'st'
  else if (num === 2) return 'nd'
  else if (num === 3) return 'rd'
  return 'th'
}

const challengeRewardsConfig: {
  [key in ChallengeId]: { title: string; icon: React.Component }
} = {
  referred: {
    title: 'Invite your Friends',
    icon: <IncomingEnvelopeIcon />
  },
  referrals: {
    title: 'Invite your Friends',
    icon: <IncomingEnvelopeIcon />
  },
  'ref-v': {
    title: 'Invite your Fans',
    icon: <IncomingEnvelopeIcon />
  },
  'connect-verified': {
    title: 'Link Verified Accounts',
    icon: <WhiteHeavyCheckMarkIcon />
  },
  'listen-streak': {
    title: 'Listening Streak: 7 Days',
    icon: <HeadphoneIcon />
  },
  'mobile-install': {
    title: 'Get the Audius Mobile App',
    icon: <MobilePhoneWithArrowIcon />
  },
  'profile-completion': {
    title: 'Complete Your Profile',
    icon: <WhiteHeavyCheckMarkIcon />
  },
  'track-upload': {
    title: 'Upload 3 Tracks',
    icon: <MultipleMusicalNotesIcon />
  },
  'send-first-tip': {
    title: 'Send Your First Tip',
    icon: <MoneyMouthFaceIcon />
  },
  'first-playlist': {
    title: 'Create a Playlist',
    icon: <TrebleClefIcon />
  }
}

export const HighlightText = ({ text }: { text: string }) => (
  <span
    className={'avenir'}
    style={{
      color: '#7E1BCC',
      fontSize: '14px',
      fontWeight: '500'
    }}>
    {text}
  </span>
)

export const BodyText = ({
  text,
  className
}: {
  text: string
  className?: string
}) => (
  <span
    className={`avenir ${className}`}
    style={{
      color: '#858199',
      fontSize: '14px',
      fontWeight: '500'
    }}>
    {text}
  </span>
)

export const getUsers = (users: User[]) => {
  const [firstUser] = users
  if (users.length > 1) {
    const userCount = users.length - 1
    return (
      <>
        <HighlightText text={firstUser.name} />
        <BodyText
          text={` and ${userCount.toLocaleString()} other${
            users.length > 2 ? 's' : ''
          }`}
        />
      </>
    )
  }
  return <HighlightText text={firstUser.name} />
}

export const getEntity = (entity: Entity) => {
  if (entity.type === EntityType.Track) {
    return (
      <>
        {' '}
        <BodyText text={'track '} />
        <HighlightText text={entity.name} />{' '}
      </>
    )
  } else if (entity.type === EntityType.Album) {
    return (
      <>
        {' '}
        <BodyText text={'album '} />
        <HighlightText text={entity.name} />{' '}
      </>
    )
  } else if (entity.type === EntityType.Playlist) {
    return (
      <>
        {' '}
        <BodyText text={'playlist '} />
        <HighlightText text={entity.name} />{' '}
      </>
    )
  }
}

const notificationMap = {
  ['favorite'](notification) {
    const user = getUsers(notification.users)
    const entity = getEntity(notification.entity)
    return (
      <span className={'notificationText'}>
        {user}
        <BodyText text={` favorited your `} />
        {entity}
      </span>
    )
  },
  ['repost'](notification) {
    const user = getUsers(notification.users)
    const entity = getEntity(notification.entity)
    return (
      <span className={'notificationText'}>
        {user}
        <BodyText text={` reposted your `} />
        {entity}
      </span>
    )
  },
  ['repost_of_repost'](notification) {
    const user = getUsers(notification.users)
    const entity = getEntity(notification.entity)
    return (
      <span className={'notificationText'}>
        {user}
        <BodyText text={` reposted your repost of `} />
        {entity}
      </span>
    )
  },
  ['follow'](notification) {
    const user = getUsers(notification.users)
    return (
      <span className={'notificationText'}>
        {user}
        <BodyText text={` followed you`} />
      </span>
    )
  },
  ['save'](notification) {
    const user = getUsers(notification.users)
    const entity = getEntity(notification.entity)
    return (
      <span className={'notificationText'}>
        {user}
        <BodyText text={` favorited your `} />
        {entity}
      </span>
    )
  },
  ['save_of_repost'](notification) {
    const user = getUsers(notification.users)
    const entity = getEntity(notification.entity)
    return (
      <span className={'notificationText'}>
        {user}
        <BodyText text={` favorited your repost of `} />
        {entity}
      </span>
    )
  },
  ['announcement'](notification) {
    return <BodyText className={'notificationText'} text={notification.text} />
  },
  ['milestone'](notification) {
    if (notification.entity) {
      const entity = notification.entity.type.toLowerCase()
      const highlight = notification.entity.name
      const count = notification.value
      return (
        <span className={'notificationText'}>
          <BodyText text={`Your ${entity} `} />
          <HighlightText text={highlight} />
          <BodyText
            text={` has reached over ${count.toLocaleString()} ${
              notification.achievement
            }s`}
          />
        </span>
      )
    } else {
      return (
        <BodyText
          className={'notificationText'}
          text={`You have reached over ${notification.value} followers `}
        />
      )
    }
  },
  ['trending'](notification) {
    const highlight = notification.entity.title
    const rank = notification.rank
    const rankSuffix = getRankSuffix(rank)
    return (
      <span className={'notificationText'}>
        <BodyText text={`Your Track `} />
        <HighlightText text={highlight} />
        <BodyText text={` is ${rank}${rankSuffix} on Trending Right Now! 🍾`} />
      </span>
    )
  },
  ['tastemaker'](notification) {
    const entityName = notification.entity.name
    return (
      <span className={'notificationText'}>
        <HighlightText text={entityName} />
        <BodyText text={` is now trending thanks to you! Great work 🙌🏽`} />
      </span>
    )
  },
  ['create'](notification) {
    const [user] = notification.users
    if (
      notification.entity.type === EntityType.Track &&
      !isNaN(notification.entity.count) &&
      notification.entity.count > 1
    ) {
      return (
        <span className={'notificationText'}>
          <HighlightText text={user.name} />
          <BodyText
            text={` released ${notification.entity.count} new ${notification.entity.type}s`}
          />
        </span>
      )
    }
    return (
      <span className={'notificationText'}>
        <HighlightText text={user.name} />
        <BodyText
          text={` released a new ${notification.entity.type} ${notification.entity.name}`}
        />
      </span>
    )
  },
  ['remix'](notification) {
    const { remixUser, remixTrack } = notification
    return (
      <span className={'notificationText'}>
        <HighlightText text={remixTrack.title} />
        <BodyText text={` by `} />
        <HighlightText text={remixUser.name} />
      </span>
    )
  },
  ['cosign'](notification) {
    const { parentTrackUser, parentTracks } = notification
    const parentTrack = parentTracks.find(
      (t) => t.owner_id === parentTrackUser.user_id
    )
    return (
      <span className={'notificationText'}>
        <HighlightText text={parentTrackUser.name} />
        <BodyText text={` co-signed your remix of `} />
        <HighlightText text={parentTrack.title} />
      </span>
    )
  },
  ['challenge_reward'](notification) {
    const { rewardAmount } = notification
    const { title, icon } = challengeRewardsConfig[notification.challengeId]
    let bodyText
    if (notification.challengeId === 'referred') {
      bodyText = `You’ve received ${rewardAmount} $AUDIO for being referred! Invite your friends to join to earn more!`
    } else {
      bodyText = `You’ve earned ${rewardAmount} $AUDIO for completing this challenge!`
    }
    return (
      <span className={'notificationText'}>
        <table cellSpacing="0" cellPadding="0" style={{ marginBottom: '4px' }}>
          <tr>
            <td>{icon}</td>
            <td>
              <HighlightText text={title} />
            </td>
          </tr>
        </table>
        <BodyText text={bodyText} />
      </span>
    )
  },
  ['track_added_to_playlist'](notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={notification.playlistOwner.name} />
        <BodyText text={` added your track `} />
        <HighlightText text={notification.track.title} />
        <BodyText text={` to their playlist `} />
        <HighlightText text={notification.playlist.playlist_name} />
      </span>
    )
  },
  ['reaction'](notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={notification.reactingUser.name} />
        <BodyText text={` reacted to your tip of `} />
        <HighlightText text={notification.amount} />
        <BodyText text={` $AUDIO`} />
      </span>
    )
  },
  ['supporter_rank_up'](notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={notification.sendingUser.name} />
        <BodyText text={` became your `} />
        <HighlightText text={`#${notification.rank}`} />
        <BodyText text={` Top Supporter!`} />
      </span>
    )
  },
  ['supporting_rank_up'](notification) {
    return (
      <span className={'notificationText'}>
        <BodyText text={`You're now `} />
        <HighlightText text={notification.receivingUser.name} />
        <BodyText text={`'s `} />
        <HighlightText text={`#${notification.rank}`} />
        <BodyText text={` Top Supporter!`} />
      </span>
    )
  },
  ['tip_receive'](notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={notification.sendingUser.name} />
        <BodyText text={` sent you a tip of `} />
        <HighlightText text={notification.amount} />
        <BodyText text={` $AUDIO`} />
      </span>
    )
  },
  [DMEntityType.Message](notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={notification.sendingUser.name} />
        <BodyText
          text={` sent you ${
            notification.multiple ? 'new messages' : 'a new message'
          }`}
        />
      </span>
    )
  },
  [DMEntityType.Reaction](notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={notification.sendingUser.name} />
        <BodyText
          text={` reacted to your message${notification.multiple ? 's' : ''}`}
        />
      </span>
    )
  }
}

const getMessage = (notification) => {
  const getNotificationMessage = notificationMap[notification.type]
  if (!getNotificationMessage) return null
  return getNotificationMessage(notification)
}

const getTitle = (notification) => {
  switch (notification.type) {
    case 'remix': {
      const { parentTrack } = notification
      return (
        <span className={'notificationText'}>
          <BodyText text={`New remix of your track `} />
          <HighlightText text={parentTrack.title} />
        </span>
      )
    }
    default:
      return null
  }
}

const getTrackMessage = (notification) => {
  switch (notification.type) {
    case 'cosign': {
      const { remixTrack } = notification
      return (
        <span className={'notificationText'}>
          <HighlightText text={remixTrack.title} />
        </span>
      )
    }
    default:
      return null
  }
}

export const getTrackLink = (track) => {
  return `https://audius.co/${track.slug}`
}

const getTwitter = (notification) => {
  switch (notification.type) {
    case 'remix': {
      const { parentTrack, parentTrackUser, remixUser, remixTrack } =
        notification
      const twitterHandle = parentTrackUser.twitterHandle
        ? `@${parentTrackUser.twitterHandle}`
        : parentTrackUser.name
      const text = `New remix of ${parentTrack.title} by ${twitterHandle} on @AudiusProject #Audius`
      const url = getTrackLink(remixTrack)
      return {
        message: 'Share With Your Friends',
        href: `http://twitter.com/share?url=${encodeURIComponent(
          url
        )}&text=${encodeURIComponent(text)}`
      }
    }
    case 'cosign': {
      const { parentTracks, parentTrackUser, remixTrack } = notification
      const parentTrack = parentTracks.find(
        (t) => t.owner_id === parentTrackUser.user_id
      )
      const url = getTrackLink(remixTrack)
      const twitterHandle = parentTrackUser.twitterHandle
        ? `@${parentTrackUser.twitterHandle}`
        : parentTrackUser.name
      const text = `My remix of ${parentTrack.title} was Co-Signed by ${twitterHandle} on @AudiusProject #Audius`
      return {
        message: 'Share With Your Friends',
        href: `http://twitter.com/share?url=${encodeURIComponent(
          url
        )}&text=${encodeURIComponent(text)}`
      }
    }
    case 'trending_track': {
      const { rank, entity } = notification
      const url = getTrackLink(entity)
      const rankSuffix = getRankSuffix(rank)
      const text = `My track ${entity.title} is trending ${rank}${rankSuffix} on @AudiusProject! #AudiusTrending #Audius`
      return {
        message: 'Share this Milestone',
        href: `http://twitter.com/share?url=${encodeURIComponent(
          url
        )}&text=${encodeURIComponent(text)}`
      }
    }
    case 'tastemaker': {
      const { entity, trackOwnerUser } = notification
      const url = getTrackLink(entity)
      const twitterHandle = trackOwnerUser.twitterHandle
        ? `@${trackOwnerUser.twitterHandle}`
        : trackOwnerUser.name
      const text = `I was one of the first to discover ${entity.name} by ${twitterHandle} on @AudiusProject and it just made it onto trending! #Audius #AudiusTastemaker`
      return {
        message: 'Share With Your Friends',
        href: `http://twitter.com/share?url=${encodeURIComponent(
          url
        )}&text=${encodeURIComponent(text)}`
      }
    }
    case 'challenge_reward': {
      const text = `I earned $AUDIO for completing challenges on @AudiusProject #AudioRewards`
      return {
        message: 'Share this with your fans',
        href: `http://twitter.com/share?text=${encodeURIComponent(text)}`
      }
    }
    default:
      return null
  }
}

const Notification = (props) => {
  const message = getMessage(props)
  const title = getTitle(props)
  const trackMessage = getTrackMessage(props)
  const twitter = getTwitter(props)
  return (
    <NotificationBody
      {...props}
      title={title}
      message={message}
      trackMessage={trackMessage}
      twitter={twitter}
    />
  )
}

export default Notification
