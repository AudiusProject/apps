import { ReactNode } from 'react'

import {
  IconLink,
  IconTikTok,
  IconX,
  IconInstagram,
  IconDonate,
  Text,
  Flex
} from '@audius/harmony'

import { ExternalTextLink } from 'components/link'
import Tooltip from 'components/tooltip/Tooltip'
import { UserGeneratedText } from 'components/user-generated-text'

export enum Type {
  X,
  INSTAGRAM,
  TIKTOK,
  WEBSITE,
  DONATION
}

const SITE_URL_MAP = {
  [Type.X]: 'https://x.com/',
  [Type.INSTAGRAM]: 'https://instagram.com/',
  [Type.TIKTOK]: 'https://tiktok.com/@'
}

type HandleType = keyof typeof SITE_URL_MAP

export const handleTypes = [Type.X, Type.INSTAGRAM, Type.TIKTOK]

const singleLinkTypes = [Type.X, Type.INSTAGRAM, Type.TIKTOK, Type.WEBSITE]

const socialIcons = {
  [Type.X]: IconX,
  [Type.INSTAGRAM]: IconInstagram,
  [Type.TIKTOK]: IconTikTok,
  [Type.WEBSITE]: IconLink,
  [Type.DONATION]: IconDonate
}

const isHandleType = (type: Type): type is HandleType =>
  handleTypes.includes(type)

type SocialLinkProps = {
  type: Type
  link: string
  onClick: (event?: any) => void
  iconOnly?: boolean
}

const SocialLink = (props: SocialLinkProps) => {
  const { type, link, onClick, iconOnly = false } = props
  const isSingleLink = singleLinkTypes.includes(type)

  const SocialIcon = socialIcons[type]

  let icon = <SocialIcon color='default' size={iconOnly ? 'l' : 'm'} />
  if (type === Type.DONATION) {
    icon = <Tooltip text='Donate'>{icon}</Tooltip>
  }

  let text: ReactNode
  if (isHandleType(type)) {
    text = `@${link}`
  } else {
    text = link.replace(/((?:https?):\/\/)|www./g, '')
    if (type === Type.DONATION) {
      text = <UserGeneratedText size='s'>{text}</UserGeneratedText>
    }
  }

  let href = ''

  if (isHandleType(type)) {
    href = `${SITE_URL_MAP[type]}${link}`
  } else if (isSingleLink) {
    if (!/^https?/.test(link)) {
      href = `https://${link}`
    } else {
      href = link
    }
  }

  if (href) {
    return (
      <ExternalTextLink to={href} onClick={onClick}>
        {icon} <Text ellipses>{iconOnly ? null : text}</Text>
      </ExternalTextLink>
    )
  }

  return (
    <Flex inline gap='s'>
      {icon}
      <Text ellipses>{iconOnly ? null : text}</Text>
    </Flex>
  )
}

export default SocialLink
