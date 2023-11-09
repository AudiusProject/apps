import type { ReactNode } from 'react'

import { Unstyled } from '@storybook/blocks'
import { useTheme } from '@storybook/theming'

import { Flex, Link, Paper, Text } from 'components'

type InformationBoxProps = {
  className?: string
  component: ReactNode
  title: string
  description: string
  href?: string
}

export const InformationBox = (props: InformationBoxProps) => {
  const { component = null, title, description, href, className } = props
  const theme = useTheme()
  const titleCss = { fontSize: '24px !important' }

  return (
    <Paper as='section' direction='column' flex={1} gap='m'>
      <Flex
        h={144}
        ph='xl'
        alignItems='center'
        justifyContent='center'
        className={className}
        css={(theme) => ({
          backgroundColor: theme.color.background.default,
          flexGrow: 0,
          WebkitFlexGrow: 0
        })}
      >
        <Unstyled>{component}</Unstyled>
      </Flex>
      <Flex direction='column' pv='xl' ph='l' gap='s'>
        {href ? (
          <Link href={href} css={titleCss}>
            {title}
          </Link>
        ) : (
          <Text
            css={[titleCss, { color: `${theme.color.primary} !important` }]}
          >
            {title}
          </Text>
        )}
        <Text>{description}</Text>
      </Flex>
    </Paper>
  )
}
