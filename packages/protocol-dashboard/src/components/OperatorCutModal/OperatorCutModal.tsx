import React, { useCallback, useEffect, useState } from 'react'

import { Box, Flex, Text } from '@audius/harmony'
import { ButtonType } from '@audius/stems'

import Button from 'components/Button'
import ConfirmTransactionModal, {
  StandaloneBox
} from 'components/ConfirmTransactionModal'
import { NodeServiceFeeInfoTooltip } from 'components/InfoTooltip/InfoTooltips'
import Modal from 'components/Modal'
import TextField from 'components/TextField'
import { useUpdateOperatorCut } from 'store/actions/updateOperatorCut'
import { Status } from 'types'
import { useModalControls } from 'utils/hooks'

import styles from './OperatorCutModal.module.css'

const messages = {
  title: 'Change Operator Fee',
  cutLabel: 'Operator Fee',
  currentLabel: 'Current',
  btn: 'Change Fee',
  confirmChange: 'Confirm Change Operator Fee'
}

type OwnProps = {
  cut: number
  isOpen: boolean
  onClose: () => void
}

type OperatorCutModalProps = OwnProps

const OperatorCutModal: React.FC<OperatorCutModalProps> = ({
  cut,
  isOpen,
  onClose
}: OperatorCutModalProps) => {
  const [operatorCut, setOperatorCut] = useState('')
  const [operatorCutNumber, setOperatorCutNumber] = useState(0)

  const onUpdateOperatorCut = useCallback(
    (value: string) => {
      const num = parseInt(value)
      if (!isNaN(num)) setOperatorCutNumber(num)
      if (value === '' || (!isNaN(num) && num.toString() === value))
        setOperatorCut(value)
    },
    [setOperatorCut]
  )

  const {
    isOpen: isConfirmModalOpen,
    onClick: onSubmit,
    onClose: onCloseConfirm
  } = useModalControls()
  const { status, updateOperatorCut, error } =
    useUpdateOperatorCut(!isConfirmModalOpen)

  const onConfirm = useCallback(() => {
    updateOperatorCut(operatorCutNumber)
  }, [updateOperatorCut, operatorCutNumber])

  useEffect(() => {
    if (status === Status.Success) {
      onCloseConfirm()
      onClose()
      setOperatorCut('')
      setOperatorCutNumber(0)
    }
  }, [status, onClose, onCloseConfirm])

  const topBox = (
    <StandaloneBox>{`${messages.confirmChange} to ${operatorCut}%`}</StandaloneBox>
  )

  return (
    <Modal
      title={messages.title}
      className={styles.container}
      isOpen={isOpen}
      onClose={onClose}
      isCloseable={true}
      dismissOnClickOutside={!isConfirmModalOpen}
    >
      <Flex
        gap='l'
        mt='xl'
        alignItems='flex-end'
        w='100%'
        css={{ maxWidth: 420 }}
      >
        <Box css={{ flexGrow: 1 }}>
          <TextField
            value={operatorCut}
            onChange={onUpdateOperatorCut}
            label={messages.cutLabel}
            rightLabel={'%'}
          />
        </Box>
        <Flex direction='column' alignItems='flex-end' pb='xl'>
          <Text variant='heading' size='s'>
            {`${cut}%`}
          </Text>
          <Flex inline gap='xs' alignItems='center'>
            <Text variant='body' size='m' strength='strong' color='subdued'>
              {messages.currentLabel}
            </Text>
            <NodeServiceFeeInfoTooltip color='subdued' />
          </Flex>
        </Flex>
      </Flex>
      <Button
        text={messages.btn}
        type={ButtonType.PRIMARY}
        onClick={onSubmit}
      />
      <ConfirmTransactionModal
        isOpen={isConfirmModalOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        topBox={topBox}
        withArrow={false}
        status={status}
        error={error}
      />
    </Modal>
  )
}

export default OperatorCutModal
