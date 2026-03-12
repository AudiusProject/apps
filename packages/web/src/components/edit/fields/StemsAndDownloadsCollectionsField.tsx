import { Flex, Switch, Text, useTheme } from '@audius/harmony'
import { useField } from 'formik'

import { Tile } from 'components/tile'

const messages = {
  title: 'Full Track Download',
  description: 'Allow your fans to download a lossless copy of each track.'
}

export const StemsAndDownloadsCollectionField = () => {
  const { spacing } = useTheme()
  const [field, , { setValue }] = useField('is_downloadable')
  return (
    <Tile
      elevation='flat'
      onClick={() => {
        setValue(!field.value)
      }}
      css={{
        width: '100%',
        padding: `${spacing.l}px ${spacing.unit6}px`,
        cursor: 'pointer'
      }}
    >
      <Flex justifyContent='space-between' w='100%'>
        <Flex gap='s' direction='column' alignItems='flex-start'>
          <Text variant='title' size='l'>
            {messages.title}
          </Text>
          <Text variant='body' textAlign='left' color='subdued'>
            {messages.description}
          </Text>
        </Flex>
        <Switch {...field} checked={field.value} aria-label={messages.title} />
      </Flex>
    </Tile>
  )
}
