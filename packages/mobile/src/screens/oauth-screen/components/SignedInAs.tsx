import type { UserMetadata } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { Image } from 'react-native'

import { Flex, Paper, Text } from '@audius/harmony-native'
import { useProfilePicture } from 'app/components/image/UserImage'

import { messages } from '../messages'

type SignedInAsProps = {
  account: UserMetadata
}

export const SignedInAs = ({ account }: SignedInAsProps) => {
  const { source: profilePicSource } = useProfilePicture({
    userId: account.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  return (
    <Flex direction='column' gap='s'>
      <Text variant='body' size='m' color='subdued'>
        {messages.signedInAs}
      </Text>
      <Paper shadow='flat' backgroundColor='white' borderRadius='s'>
        <Flex p='l' direction='row' gap='l' alignItems='center'>
          <Image
            source={profilePicSource}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
          <Flex direction='column' gap='xs' flex={1}>
            <Text variant='body' size='m' color='default'>
              @{account.handle}
            </Text>
            {account.name ? (
              <Text variant='body' size='s' color='subdued'>
                {account.name}
              </Text>
            ) : null}
          </Flex>
        </Flex>
      </Paper>
    </Flex>
  )
}
