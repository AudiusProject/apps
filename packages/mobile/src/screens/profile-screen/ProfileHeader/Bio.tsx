import { useProfileUser } from '@audius/common/api'
import { View } from 'react-native'

import { Text } from '@audius/harmony-native'
import { UserGeneratedText } from 'app/components/core'

const MAX_BIO_LINES = 2

export type BioProps = {
  isExpandable?: boolean
  setIsExpandable?: (isExpansible: boolean) => void
  numberOfLines?: number
}

export const Bio = (props: BioProps) => {
  const { isExpandable, setIsExpandable, numberOfLines } = props
  const { bio } =
    useProfileUser({
      select: (user) => ({ bio: user.bio })
    }).user ?? {}

  if (!bio) return null

  if (numberOfLines)
    return (
      <View pointerEvents='none'>
        <Text
          onTextLayout={(e) => {
            if (setIsExpandable && e.nativeEvent.lines.length > MAX_BIO_LINES) {
              setIsExpandable(true)
            }
          }}
          variant='body'
          size='s'
          numberOfLines={
            isExpandable && numberOfLines ? numberOfLines : undefined
          }
        >
          {bio}
        </Text>
      </View>
    )

  return (
    <UserGeneratedText
      variant='body'
      size='s'
      source='profile page'
      allowPointerEventsToPassThrough
    >
      {bio}
    </UserGeneratedText>
  )
}
