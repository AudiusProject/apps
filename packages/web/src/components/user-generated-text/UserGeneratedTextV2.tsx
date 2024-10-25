import {
  ForwardedRef,
  forwardRef,
  ReactNode,
  useCallback,
  useMemo,
  useState,
  MouseEvent
} from 'react'

import { useGetUserByHandle, useGetUsersByIds } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { profilePage } from '@audius/common/src/utils/route'
import { accountSelectors } from '@audius/common/store'
import {
  formatTrackName,
  formatCollectionName,
  formatUserName,
  handleRegex,
  decodeHashId
} from '@audius/common/utils'
import { Text, TextProps } from '@audius/harmony'
import {
  instanceOfTrackResponse,
  instanceOfPlaylistResponse,
  instanceOfUserResponse,
  CommentMention,
  Track,
  User,
  Playlist
} from '@audius/sdk'
import { omit } from 'lodash'
import { useSelector } from 'react-redux'
import { useAsync } from 'react-use'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { LinkKind, TextLink, TextLinkProps } from 'components/link/TextLink'
import { audiusSdk } from 'services/audius-sdk'
import { restrictedHandles } from 'utils/restrictedHandles'
import { getPathFromAudiusUrl, isAudiusUrl } from 'utils/urlUtils'

const { getUserId } = accountSelectors

type Matcher = {
  pattern: RegExp
  renderLink: (
    text: string,
    match: RegExpMatchArray,
    index: number
  ) => JSX.Element | null
}

type UserGeneratedTextV2Props = {
  children: string
  matchers?: Matcher[]
  linkProps?: Partial<Omit<TextLinkProps, 'onClick'>> & {
    onClick?: (e: MouseEvent, linkKind: LinkKind, linkEntityId?: ID) => void
  }
  mentions?: CommentMention[]

  // If true, only linkify Audius URLs
  internalLinksOnly?: boolean

  // Suffix to append after the text. Used for "edited" text in comments
  suffix?: ReactNode
} & TextProps

const formatExternalLink = (href: string) => {
  const strippedHref = href.replace(/((?:https?):\/\/)|www./g, '')
  return `https://${strippedHref}`
}

const formatAudiusUrl = (href: string) => {
  return getPathFromAudiusUrl(href) as string
}

const Link = ({
  children,
  url,
  ...other
}: Omit<TextLinkProps, 'to'> & { url: string }) => {
  const [unfurledContent, setUnfurledContent] = useState<string>()
  const [unfurledContentObject, setUnfurledContentObject] = useState<{
    track?: Track
    collection?: Playlist
    user?: User
  }>()

  useAsync(async () => {
    if (isAudiusUrl(url) && !unfurledContent) {
      const sdk = await audiusSdk()
      const res = await sdk.resolve({ url })
      if (res.data) {
        if (instanceOfTrackResponse(res)) {
          const obj = { track: res.data }
          setUnfurledContent(formatTrackName(obj))
          setUnfurledContentObject(obj)
        } else if (instanceOfPlaylistResponse(res)) {
          const obj = { collection: res.data[0] }
          setUnfurledContent(formatCollectionName(obj))
        } else if (instanceOfUserResponse(res)) {
          const obj = { user: res.data }
          setUnfurledContent(formatUserName(obj))
          setUnfurledContentObject(obj)
        }
      }
    }
  }, [url, unfurledContent, setUnfurledContent])

  const isExternalLink = !isAudiusUrl(url)
  const to = isExternalLink ? formatExternalLink(url) : formatAudiusUrl(url)

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (to) {
        if (unfurledContentObject) {
          if (unfurledContentObject.track) {
            other.onClick?.(
              e,
              'track',
              decodeHashId(unfurledContentObject.track.id) ?? 0
            )
          } else if (unfurledContentObject.collection) {
            other.onClick?.(
              e,
              'collection',
              decodeHashId(unfurledContentObject.collection.id) ?? 0
            )
          } else if (unfurledContentObject.user) {
            other.onClick?.(
              e,
              'user',
              decodeHashId(unfurledContentObject.user.id) ?? 0
            )
          }
        } else {
          other.onClick?.(e, 'other')
        }
      }
    },
    [to, other, unfurledContentObject]
  )

  return (
    <TextLink
      {...other}
      to={to}
      variant={other.variant ?? 'visible'}
      isExternal={isExternalLink}
      onClick={handleClick}
    >
      {unfurledContent ?? children}
    </TextLink>
  )
}

const HandleLink = ({
  handle,
  ...other
}: Omit<TextLinkProps, 'to'> & {
  handle: string
}) => {
  const currentUserId = useSelector(getUserId)
  const { data: user } = useGetUserByHandle({
    handle: handle.replace('@', ''),
    currentUserId
  })

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      other.onClick?.(e, 'mention', user?.user_id)
    },
    [other, user]
  )

  return user ? (
    <ArtistPopover handle={user.handle} component='span'>
      <TextLink {...other} to={profilePage(user.handle)} onClick={handleClick}>
        {handle}
      </TextLink>
    </ArtistPopover>
  ) : (
    <Text
      {...(omit(other, ['textVariant']) as any)}
      variant={other.textVariant}
    >
      {handle}
    </Text>
  )
}

const MentionLink = ({
  handle,
  ...other
}: Omit<TextLinkProps, 'to'> & {
  handle: string
}) => {
  const userHandle = handle.replace('@', '')

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      other.onClick?.(e, 'mention')
    },
    [other]
  )

  return (
    <ArtistPopover handle={userHandle} component='span'>
      <TextLink {...other} to={profilePage(userHandle)} onClick={handleClick}>
        {handle}
      </TextLink>
    </ArtistPopover>
  )
}

/**
 * Hand rolled implementation of UserGeneratedText that supports custom matchers, unlike linkify-react
 */
export const UserGeneratedTextV2 = forwardRef(function (
  props: UserGeneratedTextV2Props,
  ref: ForwardedRef<HTMLElement | undefined>
) {
  const {
    children,
    matchers: matchersProp,
    linkProps,
    mentions,
    internalLinksOnly,
    suffix,
    ...other
  } = props

  // Fetch the users for artists popovers for mentions
  useGetUsersByIds({
    ids: mentions ? mentions.map((mention) => mention.userId) : []
  })

  const mentionRegex = useMemo(() => {
    const nullRegex = /(?!)/
    if (!mentions) return nullRegex

    const regexString = [...mentions.map((mention) => `@${mention.handle}`)]
      .sort((a, b) => b.length - a.length)
      .join('|')
    return regexString.length ? new RegExp(regexString, 'g') : nullRegex
  }, [mentions])

  const renderLink = useCallback(
    (text: string, _: RegExpMatchArray, index: number) => {
      const shouldLinkify = !internalLinksOnly || isAudiusUrl(text)

      return shouldLinkify ? (
        <Link
          key={index}
          {...(other as any)}
          variant='visible'
          textVariant={other.variant}
          url={text}
          {...linkProps}
        />
      ) : null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const renderMentionLink = useCallback(
    (text: string, _: RegExpMatchArray, index: number) => {
      const isHandleUnrestricted = !restrictedHandles.has(text.toLowerCase())
      return isHandleUnrestricted ? (
        <MentionLink
          key={index}
          {...(other as any)}
          variant='visible'
          textVariant={other.variant}
          handle={text}
          {...linkProps}
        />
      ) : null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const renderHandleLink = useCallback(
    (text: string, _: RegExpMatchArray, index: number) => {
      const isHandleUnrestricted = !restrictedHandles.has(text.toLowerCase())
      return isHandleUnrestricted ? (
        <HandleLink
          key={index}
          {...(other as any)}
          variant='visible'
          textVariant={other.variant}
          handle={text}
          {...linkProps}
        />
      ) : null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const matchers: Matcher[] = [
    {
      pattern:
        /https?:\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])/g,
      renderLink
    },
    // Handle matcher e.g. @handle
    ...(mentions
      ? [
          {
            pattern: mentionRegex,
            renderLink: renderMentionLink
          }
        ]
      : [
          {
            pattern: handleRegex,
            renderLink: renderHandleLink
          }
        ]),
    ...(matchersProp ?? [])
  ]

  // Function to split the text and insert rendered elements for matched tokens
  const parseText = (text: string) => {
    // Start with the entire text as a single unprocessed string
    let elements: ReactNode[] = [text]
    let key = 0

    // Process each matcher sequentially
    matchers.forEach(({ pattern, renderLink }) => {
      const newElements: ReactNode[] = []
      const regex = new RegExp(pattern)

      // Iterate through the current elements array and apply the matcher
      elements.forEach((element) => {
        if (typeof element === 'string') {
          // Iterate over the parts and alternate between text and the rendered link
          let match
          let lastIndex = 0

          while ((match = regex.exec(element)) !== null) {
            // Push the text before the match
            newElements.push(element.substring(lastIndex, match.index))

            // Push the rendered link component for the matched text
            const link = renderLink(match[0], match, key)
            if (link) {
              newElements.push(link)
            } else {
              newElements.push(match[0])
            }

            // Update the last index to the end of the current match
            lastIndex = match.index + match[0].length
            key++
          }

          // Push remaining text after the last match
          newElements.push(element.substring(lastIndex))
        } else {
          // If it's already a React element (from a previous matcher), keep it as-is
          newElements.push(element)
        }
        key++
      })

      // Replace elements with the new ones after applying the current matcher
      elements = newElements
      key++
    })

    return elements
  }

  return (
    <Text
      style={{
        whiteSpace: 'pre-wrap'
      }}
      css={{
        '&::selection': {
          backgroundColor: '#a116b7',
          color: 'var(--harmony-white)'
        }
      }}
      ref={ref as ForwardedRef<'p'>}
      {...other}
    >
      {parseText(children)}
      {suffix}
    </Text>
  )
})
