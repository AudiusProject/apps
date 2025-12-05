import { FormEvent, useState } from 'react'

import { isEmpty } from 'lodash'

import Input from 'components/data-entry/Input'

import styles from './FolderForm.module.css'
import { CreateActions, EditActions } from './FormActions'

const messages = {
  createFolderButtonText: 'Create Folder',
  deleteFolderButtonText: 'Delete Folder',
  editFolderButtonText: 'Save Changes',
  cancelButtonText: 'Cancel'
}

type FolderFormProps = {
  onSubmit: (folderName: string) => void
  isEditMode?: boolean
  onCancel?: () => void
  onDelete?: () => void
  initialFolderName?: string
}

const FolderForm = ({
  onSubmit,
  onCancel,
  onDelete,
  isEditMode = false,
  initialFolderName = ''
}: FolderFormProps) => {
  const [folderName, setFolderName] = useState(initialFolderName)
  const [inputHasError, setInputHasError] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const onChangeFolderName = (newName: string) => {
    setFolderName(newName)
  }

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isEmpty(folderName)) {
      setInputHasError(true)
    } else {
      setInputHasError(false)
      setHasSubmitted(true)
      onSubmit(folderName)
    }
  }

  return (
    <div className={styles.folderForm}>
      <form onSubmit={onFormSubmit}>
        {/* @ts-ignore */}
        <Input
          variant='elevatedPlaceholder'
          placeholder='Folder Name'
          defaultValue={folderName}
          error={inputHasError}
          onChange={onChangeFolderName}
          characterLimit={64}
        />
        <div className={styles.actionsContainer}>
          {isEditMode ? (
            <EditActions
              onDelete={onDelete}
              onCancel={onCancel}
              isForm
              deleteText={messages.deleteFolderButtonText}
              cancelText={messages.cancelButtonText}
              saveText={messages.editFolderButtonText}
              disabled={hasSubmitted}
            />
          ) : (
            <CreateActions
              disabled={hasSubmitted}
              saveText={messages.createFolderButtonText}
              isForm
            />
          )}
        </div>
      </form>
    </div>
  )
}

export default FolderForm
