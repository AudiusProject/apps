import type { ReactNode } from 'react'
import { useMemo, useCallback, useEffect, useRef, useState } from 'react'

import { useUserByHandle } from '@audius/common/api'
import {
  formatCollectionName,
  formatTrackName,
  formatUserName,
  handleRegex,
  isAudiusUrl,
  restrictedHandles,
  squashNewLines
} from '@audius/common/utils'
import type { CommentMention } from '@audius/sdk'
import { HashId, ResolveApi } from '@audius/sdk'
import { css } from '@emotion/native'
import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import type { Match } from 'autolinker/dist/es2015'
import { View } from 'react-native'
import type {
  GestureResponderEvent,
  LayoutRectangle,
  Text as TextRef
} from 'react-native'
import type { AutolinkProps } from 'react-native-autolink'
import Autolink from 'react-native-autolink'
import { useAsync } from 'react-use'

import { Text } from '@audius/harmony-native'
import type { TextLinkProps, TextProps } from '@audius/harmony-native'
import { TextLink } from 'app/harmony-native/components/TextLink/TextLink'
import { useNavigation } from 'app/hooks/useNavigation'
import { audiusSdk } from 'app/services/sdk/audius-sdk'

type NavigationTarget<ParamList extends ReactNavigation.RootParamList> = {
  screen: keyof ParamList
  params?: ParamList[keyof ParamList]
}

const {
  instanceOfTrackResponse,
  instanceOfUserResponse,
  instanceOfPlaylistResponse
} = ResolveApi

type PositionedLink = {
  text: string
  match: Match
}

export type UserGeneratedTextProps = Omit<TextProps, 'children'> &
  Pick<AutolinkProps, 'matchers'> & {
    children: string | null | undefined
    source?: 'profile page' | 'track page' | 'collection page'
    // Pass touches through text elements
    allowPointerEventsToPassThrough?: boolean
    linkProps?: Partial<TextLinkProps>
    mentions?: CommentMention[]

    // If true, only linkify Audius URLs
    internalLinksOnly?: boolean

    // Suffix to append after the text. Used for "edited" text in comments
    suffix?: ReactNode

    navigation?: NavigationProp<ParamListBase>
  }

const Link = ({
  children,
  url,
  navigation: navigationProp,
  ...other
}: TextLinkProps & {
  url: string
  navigation?: NavigationProp<ParamListBase>
}) => {
  const [unfurledContent, setUnfurledContent] = useState<string>()
  const [to, setTo] = useState<NavigationTarget<any> | undefined>(undefined)
  const shouldUnfurl = isAudiusUrl(url)
  const currentNavigation = useNavigation()
  const navigation = navigationProp ?? currentNavigation

  useAsync(async () => {
    if (shouldUnfurl && !unfurledContent) {
      const sdk = await audiusSdk()
      const res = await sdk.resolve({ url })
      if (res.data) {
        if (instanceOfTrackResponse(res)) {
          setUnfurledContent(formatTrackName({ track: res.data }))
          setTo({
            screen: 'Track',
            params: { trackId: HashId.parse(res.data.id) }
          })
        } else if (instanceOfPlaylistResponse(res)) {
          setUnfurledContent(formatCollectionName({ collection: res.data[0] }))
          setTo({
            screen: 'Collection',
            params: { id: HashId.parse(res.data[0].id) }
          })
        } else if (instanceOfUserResponse(res)) {
          setUnfurledContent(formatUserName({ user: res.data }))
          setTo({
            screen: 'Profile',
            params: { id: HashId.parse(res.data.id) }
          })
        }
      }
    }
  }, [url, shouldUnfurl, unfurledContent, setUnfurledContent])

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (to) {
        if ('push' in navigation) {
          // @ts-ignore
          navigation.push(to.screen, to.params)
          // @ts-ignore
          other.onPress?.(e, to.screen.toLowerCase(), to.params.id)
        } else {
          // @ts-ignore
          navigation.navigate(to.screen, to.params)
          other.onPress?.(e, 'other')
        }
      }
    },
    [to, other, navigation]
  )

  const linkProps = {
    ...other,
    ...(to ? { onPress: handlePress } : { url })
  }

  return (
    <TextLink {...linkProps}>{unfurledContent ?? children ?? url}</TextLink>
  )
}

const HandleLink = ({
  handle,
  onPress,
  ...other
}: Omit<TextLinkProps, 'to'> & { handle: string }) => {
  const { data: userId } = useUserByHandle(handle.replace('@', ''), {
    select: (user) => user.user_id
  })

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e, 'mention', userId)
    },
    [onPress, userId]
  )

  return userId ? (
    <TextLink
      {...other}
      onPress={handlePress}
      to={{ screen: 'Profile', params: { id: userId } }}
    >
      {handle}
    </TextLink>
  ) : (
    <Text {...other} variant={other.textVariant}>
      {handle}
    </Text>
  )
}

export const UserGeneratedText = (props: UserGeneratedTextProps) => {
  const {
    allowPointerEventsToPassThrough,
    source,
    style,
    children,
    linkProps,
    mentions,
    suffix,
    matchers,
    internalLinksOnly,
    navigation,
    onTextLayout,
    numberOfLines,
    ...other
  } = props

  const linkContainerRef = useRef<View>(null)
  const [linkRefs, setLinkRefs] = useState<Record<number, TextRef>>({})
  const [links, setLinks] = useState<Record<number, PositionedLink>>({})
  const [linkLayouts, setLinkLayouts] = useState<
    Record<number, LayoutRectangle>
  >({})
  const [linkContainerLayout, setLinkContainerLayout] =
    useState<LayoutRectangle>()

  const mentionRegex = useMemo(() => {
    const nullRegex = /(?!)/
    if (!mentions) return nullRegex

    const regexString = [...mentions.map((mention) => `@${mention.handle}`)]
      .sort((a, b) => b.length - a.length)
      .join('|')
    return regexString.length ? new RegExp(regexString, 'g') : nullRegex
  }, [mentions])

  useEffect(() => {
    if (allowPointerEventsToPassThrough) {
      let layouts = {}
      const linkKeys = Object.keys(links)

      // Measure the layout of each link
      linkKeys.forEach((key) => {
        const linkRef = linkRefs[key]
        if (linkRef) {
          // Need to use `measureInWindow` instead of `onLayout` or `measure` because
          // android doesn't return the correct layout for nested text elements
          linkRef.measureInWindow((x, y, width, height) => {
            layouts = { ...layouts, [key]: { x, y, width, height } }

            // If all the links have been measured, update state
            if (linkKeys.length === Object.keys(layouts).length) {
              setLinkLayouts(layouts)
            }
          })
        }
      })

      if (linkContainerRef.current) {
        linkContainerRef.current.measureInWindow((x, y, width, height) =>
          setLinkContainerLayout({ x, y, width, height })
        )
      }
    }
  }, [allowPointerEventsToPassThrough, links, linkRefs, linkContainerRef])

  // We let Autolink lay out each link invisibly, and capture their position and data
  const renderHiddenLink = useCallback(
    (text: string, match: Match, index: number) => (
      <View
        onLayout={() => {
          setLinks((links) => ({
            ...links,
            [index]: {
              text,
              match
            }
          }))
        }}
        ref={(el) => {
          if (el) {
            setLinkRefs((linkRefs) => {
              if (linkRefs[index]) {
                return linkRefs
              }
              return { ...linkRefs, [index]: el }
            })
          }
        }}
        // Negative margin needed to handle View overflow
        style={css({ opacity: 0, marginTop: -3 })}
      >
        <Text {...other}>{text}</Text>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const renderLink = useCallback(
    (text: string, match: Match) => {
      const url = match.getAnchorHref()
      const shouldLinkify = !internalLinksOnly || isAudiusUrl(url)
      return shouldLinkify ? (
        <Link
          {...other}
          variant='visible'
          textVariant={other.variant}
          url={url}
          navigation={navigation}
          {...linkProps}
        />
      ) : (
        renderText(text)
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const renderHandleLink = useCallback((text: string) => {
    const isHandleUnrestricted = !restrictedHandles.has(text.toLowerCase())
    return isHandleUnrestricted ? (
      <HandleLink
        {...other}
        variant='visible'
        textVariant={other.variant}
        handle={text}
        {...linkProps}
      />
    ) : (
      renderText(text)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderText = useCallback(
    (text: string) => {
      return (
        <Text suppressHighlighting {...other}>
          {text}
        </Text>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    <View>
      <View
        pointerEvents={allowPointerEventsToPassThrough ? 'none' : undefined}
        ref={linkContainerRef}
      >
        <Text onTextLayout={onTextLayout} numberOfLines={numberOfLines}>
          <Autolink
            renderLink={
              allowPointerEventsToPassThrough ? renderHiddenLink : renderLink
            }
            renderText={renderText}
            email
            url={false}
            style={[{ marginBottom: 3 }, style]}
            text={squashNewLines(children, 10) as string}
            matchers={[
              // Handle matcher e.g. @handle
              ...(mentions
                ? [
                    {
                      pattern: mentionRegex,
                      renderLink: renderHandleLink
                    }
                  ]
                : [
                    {
                      pattern: handleRegex,
                      renderLink: renderHandleLink
                    }
                  ]),
              // URL match
              // Intentionally not using the default URL matcher to avoid conflict with the handle matcher. See: https://github.com/joshswan/react-native-autolink/issues/78
              {
                pattern: /(https?:\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\S]*)/g
              },
              // custom matchers provided via props
              ...(matchers ?? [])
            ]}
          />
          {suffix}
        </Text>
      </View>
      {/* We overlay copies of each link on top of the invisible links */}
      <View style={{ position: 'absolute' }}>
        {Object.entries(links).map(([index, { text, match }]) => {
          const linkLayout = linkLayouts[index]

          return linkLayout && linkContainerLayout ? (
            <View
              style={{
                position: 'absolute',
                top: linkLayout.y - linkContainerLayout.y,
                left: linkLayout.x - linkContainerLayout.x
              }}
            >
              <Link
                {...other}
                variant='visible'
                textVariant={other.variant}
                key={`${linkLayout.x} ${linkLayout.y} ${index}`}
                url={match.getAnchorHref()}
                source={source}
                {...linkProps}
              >
                {text}
              </Link>
            </View>
          ) : null
        })}
      </View>
    </View>
  )
}
