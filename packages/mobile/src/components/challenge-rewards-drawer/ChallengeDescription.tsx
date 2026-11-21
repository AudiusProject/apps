import type { ReactNode } from 'react'

import { View } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'

import { useStyles } from './styles'
const messages = {
  cooldownDescription:
    'Note: There is a 7 day waiting period from completion until you can claim your reward.'
}

type DescriptionContent =
  | {
      description?: never
      renderDescription: () => ReactNode
      optionalDescription?: never
    }
  | {
      description: ReactNode
      renderDescription?: never
      optionalDescription?: ReactNode
    }

type ChallengeDescriptionProps = {
  isCooldownChallenge?: boolean
} & DescriptionContent

export const ChallengeDescription = ({
  description,
  renderDescription,
  optionalDescription,
  isCooldownChallenge = true
}: ChallengeDescriptionProps) => {
  const styles = useStyles()
  return (
    <View style={styles.task}>
      {renderDescription ? (
        renderDescription()
      ) : (
        <Flex gap='m' mb='l'>
          <Text variant='body' size='l'>
            {description}
            {optionalDescription}
          </Text>
          {isCooldownChallenge ? (
            <Text variant='body' color='subdued'>
              {messages.cooldownDescription}
            </Text>
          ) : null}
        </Flex>
      )}
    </View>
  )
}
