import { useCallback, useMemo } from 'react'

import { UserMetadata } from '@audius/common/models'
import { Flex, IconUserGroup, Text } from '@audius/harmony'

import { ContextualMenu } from 'components/data-entry/ContextualMenu'
import { useTrackField } from 'components/edit-track/hooks'

import { CollaboratorsMenuFields } from './CollaboratorsMenuFields'

const messages = {
  label: 'Collaborators',
  description: 'Tag other artists as collaborators'
}

type CollaboratorsFormValues = { collaborators: UserMetadata[] }

/**
 * Settings box (like Visibility / Remix Settings) for tagging collaborator
 * artists. Opens the "Add Collaborator" modal; the upload adapter maps the
 * selected users to numeric ids for the on-chain metadata.
 */
export const CollaboratorsField = () => {
  const [{ value }, , { setValue }] =
    useTrackField<UserMetadata[]>('collaborators')
  const collaborators = useMemo(() => value ?? [], [value])

  const initialValues = useMemo(() => ({ collaborators }), [collaborators])

  const onSubmit = useCallback(
    (values: CollaboratorsFormValues) => {
      setValue(values.collaborators)
    },
    [setValue]
  )

  const renderValue = useCallback(() => {
    if (collaborators.length === 0) return null
    return (
      <Flex gap='s' wrap='wrap' pt='m'>
        {collaborators.map((collaborator) => (
          <Flex
            key={collaborator.user_id}
            alignItems='center'
            border='strong'
            borderRadius='m'
            ph='s'
            pv='2xs'
          >
            <Text variant='body' size='s'>
              {collaborator.name}
            </Text>
          </Flex>
        ))}
      </Flex>
    )
  }, [collaborators])

  return (
    <ContextualMenu
      label={messages.label}
      description={messages.description}
      icon={<IconUserGroup />}
      initialValues={initialValues}
      onSubmit={onSubmit}
      renderValue={renderValue}
      menuFields={<CollaboratorsMenuFields />}
    />
  )
}
