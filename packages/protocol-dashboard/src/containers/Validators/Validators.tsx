import NodeTable from 'components/NodeTable'
import Page from 'components/Page'

import styles from './Validators.module.css'

const messages = {
  title: 'VALIDATORS'
}

const Validators = () => {
  return (
    <Page title={messages.title} className={styles.container}>
      <NodeTable className={styles.serviceTable} />
    </Page>
  )
}

export default Validators
