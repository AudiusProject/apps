import {
  forwardRef,
  useMemo,
  MouseEvent,
  Ref,
  ForwardedRef,
  ElementType,
  useState
} from 'react'

import {
  formatCollectionName,
  formatTrackName,
  formatUserName,
  squashNewLines
} from '@audius/common/utils'
import { Text, TextLinkProps, TextProps } from '@audius/harmony'
import { ResolveApi } from '@audius/sdk'
import Linkify from 'linkify-react'
import { IntermediateRepresentation, Opts } from 'linkifyjs'
import { useAsync } from 'react-use'

import { ExternalTextLink } from 'components/link/ExternalTextLink'
import { TextLink } from 'components/link/TextLink'
import { audiusSdk } from 'services/audius-sdk'
import { getPathFromAudiusUrl, isAudiusUrl } from 'utils/urlUtils'

const {
  instanceOfTrackResponse,
  instanceOfUserResponse,
  instanceOfPlaylistResponse
} = ResolveApi

type LinkifyTextProps = TextProps<any> & {
  innerRef?: Ref<any>
}

const LinkifyText = forwardRef((props: LinkifyTextProps, ref) => {
  const { innerRef, ...other } = props
  return <Text ref={innerRef ?? ref} {...other} />
})

type UserGeneratedTextProps<T extends ElementType> = TextProps<T> & {
  linkProps?: Partial<TextLinkProps>
  linkSource?: 'profile page' | 'track page' | 'collection page'
  onClickLink?: (event: MouseEvent<HTMLAnchorElement>) => void
}

const formatExternalLink = (href: string) => {
  const strippedHref = href.replace(/((?:https?):\/\/)|www./g, '')
  return `https://${strippedHref}`
}

const formatAudiusUrl = (href: string) => {
  return getPathFromAudiusUrl(href) as string
}

const RenderLink = ({ attributes, content }: IntermediateRepresentation) => {
  const { href, ...props } = attributes
  const [unfurledContent, setUnfurledContent] = useState<string>()

  useAsync(async () => {
    if (isAudiusUrl(href) && !unfurledContent) {
      const sdk = await audiusSdk()
      const res = await sdk.resolve({ url: href })
      if (res.data) {
        if (instanceOfTrackResponse(res)) {
          setUnfurledContent(formatTrackName({ track: res.data }))
        } else if (instanceOfPlaylistResponse(res)) {
          setUnfurledContent(formatCollectionName({ collection: res.data[0] }))
        } else if (instanceOfUserResponse(res)) {
          setUnfurledContent(formatUserName({ user: res.data }))
        }
      }
    }
  }, [href, unfurledContent, setUnfurledContent])

  const isExternalLink = !isAudiusUrl(href)
  const to = isExternalLink ? formatExternalLink(href) : formatAudiusUrl(href)

  const LinkComponent = isExternalLink ? ExternalTextLink : TextLink

  return (
    <LinkComponent to={to} variant='visible' {...props}>
      {unfurledContent ?? content}
    </LinkComponent>
  )
}

export const UserGeneratedText = forwardRef(function <T extends ElementType>(
  props: UserGeneratedTextProps<T>,
  ref: ForwardedRef<HTMLElement>
) {
  const {
    children: childrenProp,
    variant,
    color,
    size,
    strength,
    lineHeight,
    tag = 'p',
    linkSource,
    onClickLink,
    linkProps: textLinkProps,
    ...other
  } = props

  const options: Opts = useMemo(
    () => ({
      render: (linkProps) => <RenderLink {...linkProps} />,
      attributes: {
        source: linkSource,
        onClick: onClickLink,
        textVariant: variant,
        size,
        strength,
        lineHeight,
        ...textLinkProps
      }
    }),
    [
      linkSource,
      onClickLink,
      variant,
      size,
      strength,
      lineHeight,
      textLinkProps
    ]
  )

  const children =
    typeof childrenProp === 'string'
      ? squashNewLines(childrenProp)
      : childrenProp

  return (
    // @ts-ignore
    <Linkify
      options={options}
      as={LinkifyText}
      innerRef={ref}
      tag={tag}
      color={color}
      size={size}
      strength={strength}
      lineHeight={lineHeight}
      css={{ whiteSpace: 'pre-line' }}
      {...other}
    >
      {children}
    </Linkify>
  )
})
