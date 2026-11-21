import {
  Box,
  Flex,
  HarmonyTheme,
  IconAudiusLogoHorizontal,
  Text,
  useTheme
} from '@audius/harmony'

import IconHouse from 'assets/img/iconHouse.svg'
import ApiCallsStat from 'components/ApiCallsStat'
import Button, { ButtonType } from 'components/Button'
import { Card } from 'components/Card/Card'
import EstimatedAnnualStat from 'components/EstimatedAnnualStat'
import EstimatedWeeklyStat from 'components/EstimatedWeeklyStat'
import {
  APICallsInfoTooltip,
  EstimatedRewardRateInfoTooltip,
  GlobalStakedInfoTooltip,
  UniqueUsersInfoTooltip
} from 'components/InfoTooltip/InfoTooltips'
import Loading from 'components/Loading'
import { ManageAccountCard } from 'components/ManageAccountCard/ManageAccountCard'
import Page from 'components/Page'
import Paper from 'components/Paper'
import Proposal from 'components/Proposal'
import { NoProposals } from 'components/Proposals'
import { RewardsTimingCard } from 'components/RewardsTimingCard/RewardsTimingCard'
import { StatLabel } from 'components/StatLabel/StatLabel'
import TopAddressesTable from 'components/TopAddressesTable'
import TotalStakedStat from 'components/TotalStakedStat'
import TransactionStatus from 'components/TransactionStatus'
import UniqueUsersStat from 'components/UniqueUsersStat'
import { useAccount } from 'store/account/hooks'
import {
  useActiveProposals,
  useRecentProposals
} from 'store/cache/proposals/hooks'
import { TICKER } from 'utils/consts'
import { usePushRoute } from 'utils/effects'
import { createStyles, isMobile } from 'utils/mobile'
import {
  AUDIUS_DAPP_URL,
  DOCS_URL,
  GOVERNANCE,
  OAF_URL,
  WHITEPAPER_URL
} from 'utils/routes'

import desktopStyles from './Home.module.css'
import mobileStyles from './HomeMobile.module.css'
import { InfoCard } from './InfoCard'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  title: 'Overview',
  uniqueMonthlyUsers: 'Unique Monthly Users',
  globalStakedAudio: `Global Staked ${TICKER}`,
  estimatedRewardRate: `Estimated ${TICKER} Reward Rate`,
  apiCalls: 'Monthly API Calls',
  recentProposals: 'Recent Proposals',
  noProposals: 'No Recent Proposals',
  viewAllProposals: 'View All Proposals',
  wtfIsAudius: 'What is Audius?',
  wtf1: "Audius is not just a digital streaming platform; it's a revolution that connects fans and artists, bringing exclusive new music to your fingertips.",
  launchAudius: 'Launch Audius',
  trustedNameTitle: 'Trusted Name in Music Innovation',
  trustedNameDescription:
    'Launched in 2018 and backed by an all-star team of investors, Audius has grown to serve millions of users monthly, standing as the largest non-financial crypto application to date.',
  trustedNameCTA: 'Open Audio Foundation',
  powerOfDecentralizationTitle: 'The Power of Decentralization',
  powerOfDecentralizationDescription:
    'Owned and operated by a diverse community of artists, fans, and developers globally, Audius empowers artists to share unique content and monetize streams directly.',
  powerOfDecentralizationCTA: 'Read The White Paper',
  developerFriendlyTitle: 'Developer Friendly',
  developerFriendlyDescription:
    'Unlock the potential of music innovation with Audius. Our robust API gives access to hundreds of thousands of songs, offering unparalleled opportunities for creativity.',
  developerFriendlyCTA: 'Developer Documentation'
}

const Home = () => {
  const { isLoggedIn, wallet } = useAccount()
  const { recentProposals } = useRecentProposals()
  const { activeProposals } = useActiveProposals()
  const pushRoute = usePushRoute()
  const mobile = isMobile()
  const { typography } = useTheme() as HarmonyTheme

  const proposalsToShow =
    activeProposals && recentProposals
      ? activeProposals && activeProposals.length < 5
        ? activeProposals.concat(
            recentProposals.slice(0, 5 - activeProposals.length) || []
          )
        : activeProposals
      : null

  return (
    <Page icon={IconHouse} title={messages.title}>
      <Flex direction='column' gap='l'>
        <Card direction='column' gap='xl' p='xl'>
          <Flex
            w='100%'
            direction='column'
            alignItems='center'
            justifyContent='center'
          >
            <UniqueUsersStat
              color='heading'
              variant='display'
              strength='strong'
              size={mobile ? 's' : 'l'}
            />
            <Flex inline gap='xs' alignItems='center'>
              <StatLabel
                variant='heading'
                strength='default'
                size={mobile ? 'm' : 's'}
              >
                {messages.uniqueMonthlyUsers}
              </StatLabel>
              <UniqueUsersInfoTooltip />
            </Flex>
          </Flex>
          <Flex gap='s' w='100%' justifyContent='space-around' wrap='wrap'>
            <Flex
              direction='column'
              alignItems='center'
              justifyContent='center'
            >
              <TotalStakedStat
                color='heading'
                variant='display'
                strength='strong'
                size='s'
              />
              <Flex inline gap='xs' alignItems='center'>
                <StatLabel
                  variant='title'
                  size={mobile ? 'm' : 'l'}
                  strength='default'
                >
                  {messages.globalStakedAudio}
                </StatLabel>
                <GlobalStakedInfoTooltip />
              </Flex>
            </Flex>
            <Flex
              direction='column'
              alignItems='center'
              justifyContent='center'
            >
              <ApiCallsStat
                variant='display'
                strength='strong'
                size='s'
                color='heading'
              />
              <Flex inline gap='xs' alignItems='center'>
                <StatLabel
                  variant='title'
                  size={mobile ? 'm' : 'l'}
                  strength='default'
                >
                  {messages.apiCalls}
                </StatLabel>
                <APICallsInfoTooltip />
              </Flex>
            </Flex>
          </Flex>
        </Card>
        <Card
          pv='l'
          ph='xl'
          justifyContent={mobile ? 'space-between' : 'space-around'}
          alignItems='center'
          wrap='wrap'
        >
          <Box mb={mobile ? 'm' : undefined}>
            <Flex inline gap='xs' alignItems='center'>
              <Text
                variant='heading'
                color='subdued'
                size='s'
                strength='default'
              >
                {messages.estimatedRewardRate}
              </Text>
              <EstimatedRewardRateInfoTooltip color='subdued' />
            </Flex>
          </Box>
          <EstimatedWeeklyStat />
          <EstimatedAnnualStat />
        </Card>
        {isLoggedIn && wallet ? (
          <>
            <TransactionStatus />
            <ManageAccountCard wallet={wallet} />
          </>
        ) : null}
        <RewardsTimingCard />
        <Paper className={styles.proposals}>
          <Box p='xl'>
            <Text variant='heading' size='s' strength='default' tag='span'>
              {messages.recentProposals}
            </Text>
          </Box>
          <div className={styles.list}>
            {proposalsToShow ? (
              proposalsToShow.length > 0 ? (
                proposalsToShow.map((proposal, i) => (
                  <Proposal key={i} proposal={proposal} />
                ))
              ) : (
                <NoProposals text={messages.noProposals} />
              )
            ) : (
              <Loading className={styles.loading} />
            )}
          </div>
          <div
            onClick={() => pushRoute(GOVERNANCE)}
            className={styles.moreText}
          >
            {messages.viewAllProposals}
          </div>
        </Paper>
        <TopAddressesTable limit={5} alwaysShowMore />
        <Paper className={styles.wtf}>
          <div className={styles.bg} />
          {!mobile ? <div className={styles.bgImage} /> : null}
          <Flex direction='column' gap='2xl' css={{ maxWidth: 488 }}>
            <IconAudiusLogoHorizontal color='inverse' className={styles.logo} />
            <Flex gap='l' direction='column'>
              <Text
                color='inverse'
                variant='heading'
                size='l'
                strength='default'
              >
                {messages.wtfIsAudius}
              </Text>
              <Text variant='body' color='inverse' size='l' strength='default'>
                {messages.wtf1}
              </Text>
            </Flex>
            <Button
              onClick={() => {
                window.open(AUDIUS_DAPP_URL, '_blank')
              }}
              type={ButtonType.WHITE}
              text={messages.launchAudius}
              css={{
                '& span': { fontWeight: `${typography.weight.bold} !important` }
              }}
            />
          </Flex>
        </Paper>
        <InfoCard
          title={messages.trustedNameTitle}
          description={messages.trustedNameDescription}
          ctaLink={OAF_URL}
          ctaText={messages.trustedNameCTA}
        />
        <Flex gap='l' wrap='wrap'>
          <InfoCard
            title={messages.powerOfDecentralizationTitle}
            description={messages.powerOfDecentralizationDescription}
            ctaLink={WHITEPAPER_URL}
            ctaText={messages.powerOfDecentralizationCTA}
          />
          <InfoCard
            title={messages.developerFriendlyTitle}
            description={messages.developerFriendlyDescription}
            ctaLink={DOCS_URL}
            ctaText={messages.developerFriendlyCTA}
          />
        </Flex>
      </Flex>
    </Page>
  )
}

export default Home
