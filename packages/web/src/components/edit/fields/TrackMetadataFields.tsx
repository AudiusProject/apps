import { Flex } from '@audius/harmony'
import { MAX_DESCRIPTION_LENGTH } from '@audius/sdk'
import { useField } from 'formik'

import { getTrackFieldName } from 'components/edit-track/hooks'
import { ArtworkField, TagField, TextAreaField } from 'components/form-fields'

import { SelectGenreField } from './SelectGenreField'
import { SelectMoodField } from './SelectMoodField'
import { TrackNameField } from './TrackNameField'
const messages = {
  description: 'Description'
}

export const TrackMetadataFields = () => {
  const [{ value: index }] = useField('trackMetadatasIndex')

  return (
    <Flex direction='column' gap='l'>
      <Flex gap='l'>
        <ArtworkField name={getTrackFieldName(index, 'artwork')} size='large' />
        <Flex direction='column' gap='l' w='100%'>
          <TrackNameField name={getTrackFieldName(index, 'title')} />
          <SelectGenreField name={getTrackFieldName(index, 'genre')} />
          <SelectMoodField name={getTrackFieldName(index, 'mood')} />
          <TagField name={getTrackFieldName(index, 'tags')} />
        </Flex>
      </Flex>
      <TextAreaField
        name={getTrackFieldName(index, 'description')}
        aria-label='description'
        placeholder={messages.description}
        maxLength={MAX_DESCRIPTION_LENGTH}
        css={{ minHeight: 96, maxHeight: 300 }}
        showMaxLength
        grows
      />
    </Flex>
  )
}
