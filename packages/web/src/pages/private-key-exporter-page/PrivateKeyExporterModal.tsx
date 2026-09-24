import { useCallback } from 'react'

import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Text,
  Button,
  Divider,
  Flex,
  TextLink,
  useTheme,
  IconTriangleExclamation
} from '@audius/harmony'

import { useModalState } from 'common/hooks/useModalState'
import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { useIsMobile } from 'hooks/useIsMobile'

import { AdvancedWalletDetails } from './AdvancedWalletDetails'
import styles from './PrivateKeyExporterPage.module.css'

const messages = {
  privateKey: 'PRIVATE KEY',
  secure: 'Keep This Information Secure',
  yourPrivateKey:
    'Your private key should be kept confidential and stored securely.',
  audiusWillNever: 'Audius will NEVER request your private key. ',
  phishing:
    'Avoid phishing attempts and never enter your private key on suspicious websites.',
  additionalResources: 'Additional Resources',
  check: 'Check Your Solana Airdrop eligibility',
  here: 'here.',
  needMoreHelp: 'Need more help?',
  guide: 'Read this guide',
  learnHow: 'to learn how to Import and Manage Multiple Wallets with Phantom.',
  close: 'Close'
}

const PHANTOM_IMPORT_URL =
  'https://phantom.app/learn/blog/import-and-manage-multiple-wallets-with-phantom'
const SOLANA_AIRDROP_CHECKER_URL = 'https://solana-airdrop-checker.solworks.dev'

const KeepThisInformationSecure = () => {
  const { color } = useTheme()
  const bulletPoints = [
    messages.yourPrivateKey,
    messages.audiusWillNever,
    messages.phishing
  ]
  return (
    <Flex
      direction='column'
      alignItems='flex-start'
      pv='l'
      ph='2xl'
      gap='l'
      borderRadius='m'
      border='strong'
      css={{
        background: 'rgba(208, 2, 27, 0.05)',
        borderColor: color.special.darkRed
      }}
    >
      <Flex alignItems='center' gap='s'>
        <IconTriangleExclamation size='m' fill={color.special.darkRed} />
        <Text variant='title' color='danger' css={{ fontSize: 24 }}>
          {messages.secure}
        </Text>
      </Flex>
      {bulletPoints.map((bulletPoint, i) => (
        <Text
          key={`bullet-point${i}`}
          variant='body'
          size='l'
          textAlign='left'
          color='danger'
          css={{
            marginLeft: 24,
            display: 'list-item',
            listStyleType: 'disc',
            listStylePosition: 'outside'
          }}
        >
          {bulletPoint}
        </Text>
      ))}
    </Flex>
  )
}

const AdditionalResources = () => {
  const { color } = useTheme()
  return (
    <Flex direction='column' gap='s'>
      <Text variant='heading' size='s'>
        {messages.additionalResources}
      </Text>
      <Text
        variant='body'
        size='l'
        css={{
          marginLeft: 24,
          display: 'list-item',
          listStyleType: 'disc',
          listStylePosition: 'outside'
        }}
      >
        {messages.check}&nbsp;
        <TextLink
          href={SOLANA_AIRDROP_CHECKER_URL}
          target='_blank'
          isExternal
          css={{
            lineHeight: '24px',
            color: color.primary.p500,
            fontWeight: 500
          }}
        >
          {messages.here}
        </TextLink>
      </Text>
      <Text
        variant='body'
        size='l'
        css={{
          marginLeft: 24,
          display: 'list-item',
          listStyleType: 'disc',
          listStylePosition: 'outside'
        }}
      >
        {messages.needMoreHelp}&nbsp;
        <TextLink
          strength='strong'
          href={PHANTOM_IMPORT_URL}
          target='_blank'
          isExternal
          css={{
            lineHeight: '24px',
            color: color.primary.p500,
            fontWeight: 500
          }}
        >
          {messages.guide}
        </TextLink>
        &nbsp;{messages.learnHow}
      </Text>
    </Flex>
  )
}

const PrivateKeyExporterModal = () => {
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useModalState('PrivateKeyExporter')
  const handleClose = useCallback(() => setIsVisible(false), [setIsVisible])
  return (
    <ModalDrawer
      bodyClassName={styles.modal}
      onClose={handleClose}
      isOpen={isVisible}
    >
      {!isMobile ? (
        <ModalHeader
          onClose={handleClose}
          dismissButtonClassName={styles.modalCloseIcon}
        >
          <ModalTitle
            title={messages.privateKey}
            titleClassName={styles.modalTitle}
          />
        </ModalHeader>
      ) : null}
      <ModalContent>
        <Flex direction='column' gap='xl'>
          <KeepThisInformationSecure />
          <AdvancedWalletDetails />
          <Divider orientation='horizontal' />
          <AdditionalResources />
        </Flex>
      </ModalContent>
      {!isMobile ? (
        <ModalFooter>
          <Button
            variant='secondary'
            onClick={handleClose}
            css={{ marginLeft: 24, marginRight: 24 }}
            fullWidth
          >
            {messages.close}
          </Button>
        </ModalFooter>
      ) : null}
    </ModalDrawer>
  )
}

export default PrivateKeyExporterModal
