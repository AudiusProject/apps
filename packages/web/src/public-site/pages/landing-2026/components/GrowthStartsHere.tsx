import styles from './GrowthStartsHere.module.css'

const messages = {
  headline: 'Growth starts here.',
  subline:
    'Features built for artists, labels, and music communities to unlock their full potential.',
  features: [
    {
      title: 'Free and Unlimited',
      body: 'We\u2019re free to use, no upload limits, and Ad-free. Everyone gets access to high quality 128kbps audio and the option to sell music direct with lossless downloads.'
    },
    {
      title: 'Grow Your Scene',
      body: 'Curated playlists, social features, fan clubs, and lean-in experiences, make it easy for you to find your crowd and stand out.'
    },
    {
      title: 'Engage in Contests',
      body: 'Join contests hosted by your favorite artists, labels, and collectives to win official releases, production gear, cash, and more.'
    }
  ]
}

type GrowthStartsHereProps = {
  isMobile: boolean
}

export const GrowthStartsHere = (_props: GrowthStartsHereProps) => {
  return (
    <section className={styles.section} aria-labelledby='growth-heading'>
      <div className={styles.bg}>
        <img src='/landing-2026/features-bg.svg' alt='' />
      </div>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id='growth-heading' className={styles.headline}>
            {messages.headline}
          </h2>
          <p className={styles.subline}>{messages.subline}</p>
        </div>
        <div className={styles.contentRow}>
          <div className={styles.visualWrap}>
            <img
              src='/landing-2026/features-visual.jpg'
              alt='Audius app interface'
              loading='lazy'
            />
          </div>
          <div className={styles.featuresList}>
            {messages.features.map((feature) => (
              <div key={feature.title} className={styles.feature}>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureBody}>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
