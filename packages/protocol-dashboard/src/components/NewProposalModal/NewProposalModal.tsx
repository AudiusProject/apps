import React, { useState, useCallback, useEffect } from 'react'

import Button, { ButtonType } from 'components/Button'
import ConfirmTransactionModal from 'components/ConfirmTransactionModal'
import { StandaloneBox } from 'components/ConfirmTransactionModal/ConfirmTransactionModal'
import Modal from 'components/Modal'
import TextField from 'components/TextField'
import { Format } from 'components/TextField/TextField'
import { useCreateProposal } from 'store/actions/createProposal'
import { Status } from 'types'

import styles from './NewProposalModal.module.css'

const messages = {
  createProposal: 'Create Proposal',
  targetContract: 'Target Contract',
  signature: 'Signature',
  callData: 'Call Data',
  name: 'Name',
  description: 'Description',
  onCreateProposal: 'Create New Proposal',

  placeholderTargetContract: 'DelegateManager',
  placeholderSignature: 'slash(uint256,address)',
  placeholderCallData: `10,0xFE7F25ebc5464F6DA493Eb53FF8F0CE1C906d3D5`,
  placeholderName: 'A name for the Proposal',
  placeholderDescription: 'A simple description of what the Proposal does',

  createProposalConfirmation: 'New Proposal'
}

type OwnProps = {
  isOpen: boolean
  onClose: () => void
}

type NewProposalModalProps = OwnProps

const NewProposalModal: React.FC<NewProposalModalProps> = ({
  isOpen,
  onClose
}) => {
  const [targetContract, setTargetContract] = useState('')
  const [signature, setSignature] = useState('')
  const [callData, setCallData] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const onCloseConfirm = useCallback(() => setIsConfirmModalOpen(false), [])
  const { status, error, createProposal } =
    useCreateProposal(!isConfirmModalOpen)

  useEffect(() => {
    if (status === Status.Success) {
      if (isConfirmModalOpen) {
        setIsConfirmModalOpen(false)
      }
      setTargetContract('')
      setSignature('')
      setCallData('')
      setDescription('')
      setName('')
      onClose()
    }
  }, [
    status,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    onClose,
    setTargetContract,
    setSignature,
    setCallData,
    setDescription,
    setName
  ])

  const onCreate = useCallback(() => {
    setIsConfirmModalOpen(true)
  }, [setIsConfirmModalOpen])

  const onConfirm = useCallback(() => {
    createProposal(
      targetContract,
      signature,
      callData.split(','),
      name,
      description
    )
  }, [createProposal, targetContract, signature, callData, name, description])

  const createProposalBox = (
    <StandaloneBox className={styles.confirmation}>
      <div className={styles.title}>{messages.createProposalConfirmation}</div>
      <div>{targetContract}</div>
      <div>{signature}</div>
      <div>{callData}</div>
      <div>{name}</div>
      <div>{description}</div>
    </StandaloneBox>
  )

  return (
    <Modal
      title={messages.createProposal}
      className={styles.container}
      headerClassName={styles.header}
      isOpen={isOpen}
      onClose={onClose}
      isCloseable={status !== Status.Loading}
      dismissOnClickOutside={false}
      allowScroll
    >
      <TextField
        value={name}
        label={messages.name}
        onChange={setName}
        placeholder={messages.placeholderName}
        className={styles.input}
      />
      <TextField
        value={targetContract}
        label={messages.targetContract}
        onChange={setTargetContract}
        placeholder={messages.placeholderTargetContract}
        className={styles.input}
      />
      <TextField
        value={signature}
        label={messages.signature}
        onChange={setSignature}
        placeholder={messages.placeholderSignature}
        className={styles.input}
      />
      <TextField
        value={callData}
        label={messages.callData}
        onChange={setCallData}
        placeholder={messages.placeholderCallData}
        className={styles.input}
      />
      <TextField
        format={Format.TEXTAREA}
        value={description}
        label={messages.description}
        onChange={setDescription}
        placeholder={messages.placeholderDescription}
        className={styles.textarea}
      />
      <Button
        text={messages.onCreateProposal}
        type={ButtonType.PRIMARY}
        onClick={onCreate}
      />
      <ConfirmTransactionModal
        withArrow={false}
        isOpen={isConfirmModalOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        topBox={createProposalBox}
        error={error}
        status={status}
      />
    </Modal>
  )
}

export default NewProposalModal
