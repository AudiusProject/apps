import { route } from '@audius/common/utils'
import {
  IconMessage as IconContact,
  IconUserGroup as IconCareers,
  IconDiscord,
  IconInstagram,
  IconX
} from '@audius/harmony'

import appIcon from 'assets/img/appIcon.png'
import GroupableList from 'components/groupable-list/GroupableList'
import Grouping from 'components/groupable-list/Grouping'
import Row from 'components/groupable-list/Row'
import Page from 'components/page/Page'
import { COPYRIGHT_TEXT } from 'utils/copyright'

import packageInfo from '../../../../../package.json'

import styles from './AboutSettingsPage.module.css'
import settingsPageStyles from './SettingsPage.module.css'

const {
  AUDIUS_CAREERS_LINK,
  AUDIUS_CONTACT_EMAIL_LINK,
  AUDIUS_DISCORD_LINK,
  AUDIUS_HELP_LINK,
  AUDIUS_INSTAGRAM_LINK,
  AUDIUS_X_LINK,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  API_TERMS
} = route
const { version: appVersion } = packageInfo

const messages = {
  heading: 'About',
  discord: 'Join our community on Discord',
  x: 'Follow us on X',
  instagram: 'Follow us on Instagram',
  contact: 'Contact Us',
  careers: 'Careers at Audius',
  help: 'Help / FAQ',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  apiTerms: 'API Terms',
  title: 'Audius Music',
  version: 'Audius Version',
  copyright: COPYRIGHT_TEXT
}

const AboutSettingsPage = () => {
  return (
    <Page
      title={messages.heading}
      contentClassName={settingsPageStyles.pageContent}
      containerClassName={settingsPageStyles.page}
    >
      <div className={settingsPageStyles.bodyContainer}>
        <div className={styles.header}>
          <img src={appIcon} alt='Audius' />
          <div className={styles.info}>
            <div className={styles.title}>{messages.title}</div>
            <div className={styles.versionInfo}>
              <div>{`${messages.version} ${appVersion}`}</div>
              <div>{messages.copyright}</div>
            </div>
          </div>
        </div>
        <GroupableList>
          <Grouping>
            <Row
              prefix={<IconDiscord className={styles.icon} />}
              title={messages.discord}
              href={AUDIUS_DISCORD_LINK}
            />
            <Row
              prefix={<IconX className={styles.icon} />}
              title={messages.x}
              href={AUDIUS_X_LINK}
            />
            <Row
              prefix={<IconInstagram className={styles.icon} />}
              title={messages.instagram}
              href={AUDIUS_INSTAGRAM_LINK}
            />
            <Row
              prefix={<IconContact className={styles.icon} />}
              title={messages.contact}
              href={AUDIUS_CONTACT_EMAIL_LINK}
            />
            <Row
              prefix={<IconCareers className={styles.icon} />}
              title={messages.careers}
              to={AUDIUS_CAREERS_LINK}
            />
          </Grouping>
          <Grouping>
            <Row title={messages.help} href={AUDIUS_HELP_LINK} />
            <Row
              title={messages.terms}
              to={TERMS_OF_SERVICE}
              target='_blank'
              rel='noreferrer'
            />
            <Row
              title={messages.privacy}
              to={PRIVACY_POLICY}
              target='_blank'
              rel='noreferrer'
            />
            <Row
              title={messages.apiTerms}
              to={API_TERMS}
              target='_blank'
              rel='noreferrer'
            />
          </Grouping>
        </GroupableList>
      </div>
    </Page>
  )
}

export default AboutSettingsPage
