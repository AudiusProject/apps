import { useCallback, useEffect, useState } from 'react'

import { useCurrentAccountUser, useCurrentUserId } from '@audius/common/api'
import { Name } from '@audius/common/models'
import { route } from '@audius/common/utils'
import {
  Box,
  Text,
  Flex,
  IconCaretLeft,
  useTheme,
  IconTriangleExclamation,
  Divider,
  IconQuestionCircle,
  IconVisibilityHidden,
  IconLifeRing,
  TextLink,
  Button,
  PlainButton,
  IconAudiusLogoHorizontal,
  IconAudiusLogoHorizontalColor,
  Switch
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'

import { useModalState } from 'common/hooks/useModalState'
import { make, useRecord } from 'common/store/analytics/actions'
import { Avatar } from 'components/avatar/Avatar'
import { useRequiresAccount } from 'hooks/useRequiresAccount'
import { push } from 'utils/navigation'
import { isDarkMode } from 'utils/theme/theme'

import styles from './PrivateKeyExporterPage.module.css'

const { SETTINGS_PAGE, TRENDING_PAGE } = route

const messages = {
  backToSettings: 'Back To Settings',
  showPrivateKey: 'Show Private Key',
  yourOwnRisk: 'Use At Your Own Risk',
  what: 'What does this do?',
  thisTool:
    'This tool is able to display the address and private key associated with your Audius account. Your private key grants anyone who possesses it complete access to your Audius account.',
  advancedUsers:
    'Advanced users may be able to utilize this to enable experiences outside of the Audius ecosystem, but doing so exposes you to great risk.',
  note: 'Note: This wallet will not contain in-app $AUDIO balances.',
  understandTheRisk: 'Understand the Risks',
  improperUse:
    'Improper use can cause irreversible damage. This includes, but is not limited to:',
  untrustworthyParties:
    'Granting untrustworthy parties complete control over your account.',
  compromisingSecurity:
    'Compromising the security of any connected wallets, and services.',
  lossOfFunds: 'Loss of funds.',
  unforeseenConsequences:
    'Other unforeseen consequences, including unexpected behavior within Audius and related products.',
  keepItSecret: 'Keep it secret. Keep it safe.',
  yourPrivateKey:
    'Your private key should be kept confidential and stored securely.',
  audiusWillNever: 'Audius will NEVER request your private key.',
  avoidPhishing:
    'Avoid phishing attempts and never enter your private key on suspicious websites.',
  needHelp: 'Need Help?',
  featureIntended:
    'This feature is intended for use by advanced users only. If you have questions or need assistance, please reach out to',
  support: 'Audius support.',
  agree: 'Agree and Continue',
  iUnderstand:
    'I understand the risks associated with extracting my private key.',
  iAccept: 'I accept full responsibility for its security and use.',
  iAcknowledge:
    'I acknowledge I am liable for any damages or losses that may arise from the use of this tool.',
  goBack: 'Go Back',
  proceed: 'I Understand The Risks'
}

const AUDIUS_SUPPORT_EMAIL = 'support@audius.co'

const Header = () => {
  const { color } = useTheme()
  const { data: accountUserId } = useCurrentUserId()
  const darkMode = isDarkMode()
  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      backgroundColor='white'
      pv='xl'
      css={{
        paddingLeft: 80,
        paddingRight: 80,
        boxShadow:
          '0px 4px 8px 0px rgba(0, 0, 0, 0.06), 0px 0px 4px 0px rgba(0, 0, 0, 0.04)'
      }}
    >
      <Link to={TRENDING_PAGE}>
        {darkMode ? (
          <IconAudiusLogoHorizontal
            className={styles.horizontalLogo}
            fill={color.neutral.n800}
          />
        ) : (
          <IconAudiusLogoHorizontalColor className={styles.horizontalLogo} />
        )}
      </Link>
      <Flex direction='row-reverse'>
        <Avatar
          userId={accountUserId ?? undefined}
          css={{ width: 52, height: 52 }}
        />
      </Flex>
    </Flex>
  )
}

const BackToSettings = () => {
  const dispatch = useDispatch()
  const handleClick = useCallback(() => {
    dispatch(push(SETTINGS_PAGE))
  }, [dispatch])
  return (
    <PlainButton iconLeft={IconCaretLeft} onClick={handleClick}>
      {messages.backToSettings}
    </PlainButton>
  )
}

const ShowPrivateKey = () => {
  const { color } = useTheme()
  return (
    <Flex direction='column' alignItems='flex-start' mv='l' pv='xl' gap='l'>
      <Text variant='heading' css={{ fontSize: 34 }} color='accent'>
        {messages.showPrivateKey}
      </Text>
      <Flex gap='s'>
        <IconTriangleExclamation fill={color.special.darkRed} />
        <Text variant='body' color='danger' size='l' css={{ fontWeight: 700 }}>
          {messages.yourOwnRisk}
        </Text>
      </Flex>
    </Flex>
  )
}

const WhatDoesThisDo = () => {
  const { color } = useTheme()
  return (
    <Flex direction='column' alignItems='flex-start' mv='l' pv='xl' gap='l'>
      <Flex alignItems='center' gap='s'>
        <IconQuestionCircle size='m' fill={color.neutral.n800} />
        <Text variant='heading' size='m'>
          {messages.what}
        </Text>
      </Flex>
      <Text variant='body' textAlign='left'>
        {messages.thisTool}
      </Text>
      <Text variant='body' textAlign='left'>
        {messages.advancedUsers}
      </Text>
      <Text variant='body' textAlign='left' strength='strong'>
        {messages.note}
      </Text>
    </Flex>
  )
}

const UnderstandTheRisks = () => {
  const { color } = useTheme()
  const bulletPoints = [
    messages.untrustworthyParties,
    messages.compromisingSecurity,
    messages.lossOfFunds,
    messages.unforeseenConsequences
  ]
  return (
    <Box pv='xl'>
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
            {messages.understandTheRisk}
          </Text>
        </Flex>
        <Text variant='body' strength='strong' textAlign='left' color='danger'>
          {messages.improperUse}
        </Text>
        {bulletPoints.map((bulletPoint, i) => (
          <Text
            key={`bullet-point${i}`}
            variant='body'
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
    </Box>
  )
}

const KeepItSecret = () => {
  const { color } = useTheme()
  const bulletPoints = [
    messages.yourPrivateKey,
    messages.audiusWillNever,
    messages.avoidPhishing
  ]
  return (
    <Flex direction='column' alignItems='flex-start' mv='l' pv='xl' gap='l'>
      <Flex alignItems='center' gap='s'>
        <IconVisibilityHidden size='m' fill={color.neutral.n800} />
        <Text variant='heading' size='m'>
          {messages.keepItSecret}
        </Text>
      </Flex>
      {bulletPoints.map((bulletPoint, i) => (
        <Text
          key={`bullet-point${i}`}
          variant='body'
          textAlign='left'
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

const NeedHelp = () => {
  const { color } = useTheme()
  return (
    <Flex direction='column' alignItems='flex-start' mv='l' pv='xl' gap='l'>
      <Flex alignItems='center' gap='s'>
        <IconLifeRing
          size='m'
          fill={color.neutral.n800}
          css={{ fill: 'yellow' }}
        />
        <Text variant='heading' size='m'>
          {messages.needHelp}
        </Text>
      </Flex>
      <Text variant='body' textAlign='left'>
        {messages.featureIntended}&nbsp;
        <TextLink
          href={`mailto:${AUDIUS_SUPPORT_EMAIL}`}
          target='_blank'
          css={{ color: color.primary.p500 }}
        >
          {messages.support}
        </TextLink>
      </Text>
    </Flex>
  )
}

const AgreeAndContinue = () => {
  const dispatch = useDispatch()
  const [, setIsPrivateKeyExporterModalVisible] =
    useModalState('PrivateKeyExporter')
  const [agreed, setAgreed] = useState(false)
  const bulletPoints = [
    messages.iUnderstand,
    messages.iAccept,
    messages.iAcknowledge
  ]
  const handleCancel = useCallback(() => {
    dispatch(push(SETTINGS_PAGE))
  }, [dispatch])
  const handleProceed = useCallback(() => {
    setIsPrivateKeyExporterModalVisible(true)
  }, [setIsPrivateKeyExporterModalVisible])
  return (
    <Flex direction='column' alignItems='flex-start' mv='l' pv='xl' gap='xl'>
      <Text variant='heading' size='m'>
        {messages.agree}
      </Text>
      <Flex alignItems='flex-start' gap='xl'>
        <Switch checked={agreed} onChange={() => setAgreed(!agreed)} />
        <Flex direction='column' gap='s'>
          {bulletPoints.map((bulletPoint, i) => (
            <Text
              key={`bullet-point${i}`}
              variant='body'
              textAlign='left'
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
      </Flex>
      <Flex gap='xl' mt='s' wrap='wrap'>
        <Button variant='secondary' onClick={handleCancel}>
          {messages.goBack}
        </Button>
        <Button
          variant='destructive'
          onClick={handleProceed}
          disabled={!agreed}
        >
          {messages.proceed}
        </Button>
      </Flex>
    </Flex>
  )
}

const PrivateKeyExporterPage = () => {
  useRequiresAccount()
  const record = useRecord()
  const { data: accountUserId } = useCurrentUserId()
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const [hasViewed, setHasViewed] = useState(false)
  useEffect(() => {
    if (accountHandle && accountUserId && !hasViewed) {
      setHasViewed(true)
      record(
        make(Name.EXPORT_PRIVATE_KEY_PAGE_VIEWED, {
          handle: accountHandle,
          userId: accountUserId
        })
      )
    }
  }, [accountHandle, accountUserId, hasViewed, record])
  return (
    <Flex direction='column' css={{ width: '100%' }}>
      <Header />
      <Box
        mt='3xl'
        pt='xl'
        ph='4xl'
        w='100%'
        backgroundColor='white'
        border='strong'
        borderRadius='m'
        css={{
          margin: '48px auto',
          maxWidth: 960,
          boxShadow:
            '0px 4px 8px 0px rgba(0, 0, 0, 0.06), 0px 0px 4px 0px rgba(0, 0, 0, 0.04)'
        }}
      >
        <BackToSettings />
        <ShowPrivateKey />
        <Divider orientation='horizontal' />
        <WhatDoesThisDo />
        <UnderstandTheRisks />
        <KeepItSecret />
        <Divider orientation='horizontal' />
        <NeedHelp />
        <Divider orientation='horizontal' />
        <AgreeAndContinue />
      </Box>
      <Box pt='3xl' />
    </Flex>
  )
}

export default PrivateKeyExporterPage
