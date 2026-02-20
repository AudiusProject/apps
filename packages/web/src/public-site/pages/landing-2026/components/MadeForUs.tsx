import styles from './MadeForUs.module.css'

const messages = {
  headline: 'Audius is made for us.',
  body: 'Audius is for people pushing music scenes forward. It\u2019s a platform built on community, connection, and culture-led artist growth. Audius is made for us.'
}

type MadeForUsProps = {
  isMobile: boolean
}

export const MadeForUs = (_props: MadeForUsProps) => {
  return (
    <section className={styles.section} aria-labelledby='about-heading'>
      <div className={styles.inner}>
        <h2 id='about-heading' className={styles.headline}>
          {messages.headline}
        </h2>
        <p className={styles.body}>{messages.body}</p>
      </div>
    </section>
  )
}
