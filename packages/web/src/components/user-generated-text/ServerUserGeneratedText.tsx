import { Ref, forwardRef } from 'react'

import { Text, TextProps } from '@audius/harmony/src/components/text'
import { TextLink } from '@audius/harmony/src/components/text-link'
import Linkify from 'linkify-react'
import { IntermediateRepresentation } from 'linkifyjs'

type LinkifyTextProps = TextProps<any>

const LinkifyText = forwardRef(
  (props: LinkifyTextProps, ref: Ref<HTMLSpanElement>) => {
    const { ...other } = props
    return <Text ref={ref} {...other} />
  }
)

const renderLink = ({ attributes, content }: IntermediateRepresentation) => {
  const { href, ...props } = attributes

  return (
    <TextLink href={href} {...props} variant='visible'>
      {content}
    </TextLink>
  )
}

// Simple squashNewLines implementation to avoid importing formatUtil which pulls in dayjs
const squashNewLines = (
  str: string | null | undefined,
  newlineMax: number = 2
) => {
  return str
    ? str
        .replace(
          new RegExp(
            `\\n\\s*(\\n\\s*){${Math.max(newlineMax - 2, 1)}}\\n`,
            'g'
          ),
          '\n'.repeat(newlineMax)
        )
        .trim()
    : str
}

type ServerUserGeneratedTextProps = TextProps

export const ServerUserGeneratedText = (
  props: ServerUserGeneratedTextProps
) => {
  const { children: childrenProp, ...other } = props

  const children =
    typeof childrenProp === 'string'
      ? squashNewLines(childrenProp)
      : childrenProp

  if (!children) return null

  return (
    <Linkify
      options={{ render: renderLink }}
      as={LinkifyText}
      css={{ whiteSpace: 'pre-line' }}
      {...other}
    >
      {children}
    </Linkify>
  )
}
