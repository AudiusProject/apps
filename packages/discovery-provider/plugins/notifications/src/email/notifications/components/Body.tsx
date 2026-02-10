import React from 'react'

import { DMEntityType, EntityType } from '../types'
import Footer from './Footer'
import Notification from './notifications/Notification'

const AudiusImage = () => {
  return (
    <img
      src="https://gallery.mailchimp.com/f351897a27ff0a641b8acd9ab/images/b1070e55-9487-4acb-abce-e755484cce46.png"
      style={{ maxWidth: '240px', margin: '27px auto' }}
      alt="Audius Logo"
    />
  )
}

const WhatYouMissed = () => {
  return (
    <img
      src="https://download.audius.co/static-resources/email/whatYouMissed.png"
      style={{
        maxWidth: '490px',
        margin: '0px auto 7px'
      }}
      alt="What You Missed"
    />
  )
}

const UnreadNotifications = ({ message }) => (
  <p
    className={'avenir'}
    style={{
      color: 'rgba(133,129,153,0.5)',
      fontSize: '16px',
      fontWeight: 500,
      letterSpacing: '0.02px',
      textAlign: 'center',
      margin: '0px auto 24px'
    }}>
    {message}
  </p>
)

const snippetMap = {
  ['favorite'](notification) {
    const [user] = notification.users
    return `${
      user.name
    } favorited your ${notification.entity.type.toLowerCase()} ${
      notification.entity.name
    }`
  },
  ['repost'](notification) {
    const [user] = notification.users
    return `${
      user.name
    } reposted your ${notification.entity.type.toLowerCase()} ${
      notification.entity.name
    }`
  },
  ['repost_of_repost'](notification) {
    const [user] = notification.users
    return `${user.name} reposted your repost of ${notification.entity.name}`
  },
  ['follow'](notification) {
    const [user] = notification.users
    return `${user.name} followed you`
  },
  ['save'](notification) {
    const [user] = notification.users
    return `${
      user.name
    } favorited your ${notification.entity.type.toLowerCase()} ${
      notification.entity.name
    }`
  },
  ['save_of_repost'](notification) {
    const [user] = notification.users
    return `${user.name} favorited your repost of ${notification.entity.name}`
  },
  ['announcement'](notification) {
    return notification.title
  },
  ['milestone'](notification) {
    if (notification.entity) {
      const entity = notification.entity.type.toLowerCase()
      return `Your ${entity} ${notification.entity.name} has reached over ${notification.value} ${notification.achievement}s`
    } else {
      return `You have reached over ${notification.value} Followers`
    }
  },
  ['trending'](notification) {
    const { entity, rank } = notification
    return `${entity.title} is #${rank} on Trending right now!`
  },
  ['trending_underground'](notification) {
    const { entity, rank } = notification
    return `${entity.title} is #${rank} on Underground Trending right now!`
  },
  ['tastemaker'](notification) {
    const entityName = notification.entity.name
    return `${entityName} is now trending thanks to you! Great work 🙌`
  },
  ['usdc_purchase_seller'](notification) {
    const { entity, users, amount } = notification
    const userName = users[0].name
    return `Congrats, ${
      userName || 'someone'
    } just bought your ${entity.type.toLowerCase()} ${
      entity.name
    } for $${amount}!`
  },
  ['usdc_purchase_buyer'](notification) {
    const { entity, users } = notification
    return `You just purchased ${entity.name} from ${users[0].name}!`
  },
  ['request_manager'](notification) {
    const { users } = notification
    return `${users[0].name} has invited you to manage their account.`
  },
  ['approve_manager_request'](notification) {
    const { users } = notification
    return `${users[0].name} has been added as a manager on your account.`
  },
  ['create'](notification) {
    const [user] = notification.users
    if (
      notification.entity.type === EntityType.Track &&
      !isNaN(notification.entity.count) &&
      notification.entity.count > 1
    ) {
      return `${user.name} released ${notification.entity.count} new ${notification.entity.type}`
    }
    return `${
      user.name
    } released a new ${notification.entity.type.toLowerCase()} ${
      notification.entity.name
    }`
  },
  ['remix'](notification) {
    const { parentTrack } = notification
    return `New remix of your track ${parentTrack.title}`
  },
  ['cosign'](notification) {
    const { parentTrackUser, parentTracks } = notification
    const parentTrack = parentTracks.find(
      (t) => t.ownerId === parentTrackUser.userId
    )
    return `${parentTrackUser.name} Co-signed your Remix of ${parentTrack.title}`
  },
  ['challenge_reward'](notification) {
    return `You've earned $AUDIO for completing challenges`
  },
  ['add_track_to_playlist'](notification) {
    return `${notification.playlistOwner.name} added ${notification.track.title} to ${notification.playlist.playlist_name}`
  },
  ['tip_receive'](notification) {
    return `${notification.sendingUser.name} sent you a tip of ${notification.amount} $AUDIO`
  },
  ['reaction'](notification) {
    return `${notification.reactingUser.name} reacted to your tip of ${notification.amount} $AUDIO`
  },
  ['supporter_rank_up'](notification) {
    return `${notification.sendingUser.name} became your #${notification.rank} top supporter`
  },
  ['supporting_rank_up'](notification) {
    return `You're now ${notification.receivingUser.name}'s #${notification.rank} top supporter`
  },
  ['track_added_to_playlist'](notification) {
    return `${notification.playlistOwner.name} added your track ${notification.track.title} to their playlist ${notification.playlist.playlist_name}`
  },
  [DMEntityType.Message](notification) {
    return `${notification.sendingUser.name} sent you ${
      notification.multiple ? 'new messages' : 'a new message'
    }`
  },
  [DMEntityType.Reaction](notification) {
    return `${notification.sendingUser.name} reacted to your message${
      notification.multiple ? 's' : ''
    }`
  },
  ['comment'](notification) {
    const [user] = notification.users
    return `${
      user.name
    } commented on your ${notification.entity.type.toLowerCase()} ${
      notification.entity.name
    }`
  },
  ['comment_thread'](notification) {
    const [user] = notification.users
    return `${user.name} replied to your comment on ${
      notification.entityUser.user_id === notification.receiverUserId
        ? 'your'
        : notification.entityUser.user_id === user.user_id
        ? 'their'
        : `${notification.entityUser.name}'s`
    } ${notification.entity.type.toLowerCase()} ${notification.entity.name}`
  },
  ['comment_mention'](notification) {
    const [user] = notification.users
    return `${user.name} tagged you in a comment on ${
      notification.entityUser.user_id === notification.receiverUserId
        ? 'your'
        : notification.entityUser.user_id === user.user_id
        ? 'their'
        : `${notification.entityUser.name}'s`
    } ${notification.entity.type.toLowerCase()} ${notification.entity.name}`
  },
  ['comment_reaction'](notification) {
    const [user] = notification.users
    return `${user.name} liked your comment on ${
      notification.entityUser.user_id === notification.receiverUserId
        ? 'your'
        : notification.entityUser.user_id === user.user_id
        ? 'their'
        : `${notification.entityUser.name}'s`
    } ${notification.entity.type.toLowerCase()} ${notification.entity.name}`
  }
}

const mapNotification = (notification) => {
  switch (notification.type) {
    case 'remix': {
      notification.users = [notification.remixUser]
      return notification
    }
    case 'cosign': {
      notification.track = notification.remixTrack
      return notification
    }
    default: {
      return notification
    }
  }
}

// Generate snippet for email composed of the first three notification texts,
// but limited to 90 characters w/ an ellipsis
const SNIPPET_ELLIPSIS_LENGTH = 90
const getSnippet = (notifications) => {
  const snippet = notifications
    .slice(0, 3)
    .map((notification) => {
      return snippetMap[notification.type](notification)
    })
    .join(', ')
  if (snippet.length <= SNIPPET_ELLIPSIS_LENGTH) return snippet
  const indexOfEllipsis =
    snippet.substring(SNIPPET_ELLIPSIS_LENGTH).indexOf(' ') +
    SNIPPET_ELLIPSIS_LENGTH
  return `${snippet.substring(0, indexOfEllipsis)} ...`
}

const Body = (props) => {
  return (
    <body bgcolor="#FFFFFF" style={{ backgroundColor: '#FFFFFF' }}>
      <p
        style={{
          display: 'none',
          fontSize: '1px',
          color: '#333333',
          lineHeight: '1px',
          maxHeight: '0px',
          maxWidth: '0px',
          opacity: 0,
          overflow: 'hidden'
        }}
        dangerouslySetInnerHTML={{
          __html: `${getSnippet(props.notifications)}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        <wbr>
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        <wbr>
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        <wbr>
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        <wbr>
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        <wbr>
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        `
        }}
      />
      <center>
        <table
          align="center"
          border="0"
          cellPadding="0"
          cellSpacing="0"
          width="100%"
          id="bodyTable"
          bgcolor="#FFFFFF"
          style={{ backgroundColor: '#FFFFFF' }}>
          <tr>
            <td align="center" valign="top" id="bodyCell">
              <AudiusImage />
            </td>
          </tr>
          <tr>
            <td align="center" valign="top" id="bodyCell">
              <WhatYouMissed />
            </td>
          </tr>
          <tr>
            <td align="center" valign="top" id="bodyCell">
              <UnreadNotifications message={props.subject} />
            </td>
          </tr>
          <tr>
            <td
              align="center"
              valign="top"
              id="bodyCell"
              style={{
                borderRadius: '4px',
                maxWidth: '396px',
                marginBottom: '32px'
              }}>
              {props.notifications.map((notification, ind) => (
                <Notification key={ind} {...mapNotification(notification)} />
              ))}
            </td>
          </tr>
          <tr>
            <td
              align="center"
              valign="top"
              id="bodyCell"
              style={{ padding: '24px 0px 32px', width: '100%' }}>
              <table
                cellSpacing="0"
                cellPadding="0"
                style={{ margin: '0px auto' }}>
                <tr>
                  <td
                    style={{ borderRadius: '17px', margin: '0px auto' }}
                    bgcolor="#7E1BCC">
                    <a
                      href="https://audius.co/feed?openNotifications=true"
                      target="_blank"
                      style={{
                        padding: '8px 24px',
                        fontSize: '14px',
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'inline-block'
                      }}>
                      See more on Audius
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style={{ paddingBottom: '25px' }}>
              <Footer copyrightYear={props.copyrightYear} />
            </td>
          </tr>
        </table>
      </center>
    </body>
  )
}

export default Body
