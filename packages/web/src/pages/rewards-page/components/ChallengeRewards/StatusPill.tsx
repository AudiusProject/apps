import { Flex, Text, TextProps, useTheme } from '@audius/harmony'

import { messages } from '../../messages'

type BasePillProps = {
  children: React.ReactNode
  color: TextProps['color']
  backgroundColor?: string
  borderColor?: string
}

const BasePill = ({
  children,
  color,
  backgroundColor,
  borderColor
}: BasePillProps) => {
  const isSimpleText = typeof children === 'string'
  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      pv='xs'
      h='xl'
      ph='s'
      borderRadius='l'
      css={{
        backgroundColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined
      }}
    >
      {isSimpleText ? (
        <Text variant='body' size='m' strength='strong' color={color}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Flex>
  )
}

type StatusPillProps = {
  shouldShowClaimPill: boolean
}

export const StatusPill = ({ shouldShowClaimPill }: StatusPillProps) => {
  const { color } = useTheme()

  if (shouldShowClaimPill) {
    return (
      <BasePill
        color='white'
        backgroundColor={color.background.primary}
        borderColor={color.primary.p400}
      >
        {messages.readyToClaim}
      </BasePill>
    )
  }

  return null
}
