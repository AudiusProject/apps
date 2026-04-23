import {
  ChallengeRewardID,
  OptimisticUserChallenge
} from '@audius/common/models'
import { Box, Flex, Paper, Text } from '@audius/harmony'

export type RewardPanelProps = {
  title: string
  description: (amount?: OptimisticUserChallenge) => string
  onClickButton: () => void
  id: ChallengeRewardID
}

export const RewardPanel = ({
  title,
  description,
  onClickButton
}: RewardPanelProps) => {
  const MIN_PANEL_WIDTH_PX = 272

  return (
    <Paper
      onClick={onClickButton}
      ph='s'
      flex={`1 1 ${MIN_PANEL_WIDTH_PX}px`}
      direction='column'
      shadow='flat'
      border='strong'
      css={{
        minWidth: `${MIN_PANEL_WIDTH_PX}px`
      }}
      pv='unit10'
    >
      <Flex direction='column' justifyContent='center' h='100%' gap='xl'>
        <Flex
          direction='column'
          alignItems='flex-start'
          justifyContent='space-between'
          w='100%'
          gap='s'
          pl='l'
        >
          <Box>
            <Text variant='heading'>{title}</Text>
          </Box>
          <Box css={{ textAlign: 'left' }}>
            <Text variant='body' size='l' strength='default'>
              {description()}
            </Text>
          </Box>
        </Flex>
      </Flex>
    </Paper>
  )
}
