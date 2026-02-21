import styles from './Partners2026.module.css'

const partners = [
  { name: 'Warner', src: '/landing-2026/logos/warner.png' },
  { name: 'Kobalt', src: '/landing-2026/logos/kobalt.png' },
  { name: 'DistroKid', src: '/landing-2026/logos/distrokid.png', small: true },
  { name: 'Downtown', src: '/landing-2026/logos/downtown.png' },
  { name: 'Empire', src: '/landing-2026/logos/empire.png' },
  { name: 'Fuga', src: '/landing-2026/logos/fuga.png' },
  { name: 'Nettwerk', src: '/landing-2026/logos/nettwerk.png' },
  { name: 'LabelWorx', src: '/landing-2026/logos/labelworx.png' },
  { name: 'DDEX', src: '/landing-2026/logos/ddex.png' }
]

type Partners2026Props = {
  isMobile: boolean
}

export const Partners2026 = (_props: Partners2026Props) => {
  const doubled = [...partners, ...partners]

  return (
    <section className={styles.section} aria-label='Partners'>
      <div className={styles.container}>
        <div className={styles.trackWrap}>
          <div className={styles.gradientLeft} />
          <div className={styles.track}>
            {doubled.map((p, i) => (
              <img
                key={`${p.name}-${i}`}
                src={p.src}
                alt={p.name}
                className={`${styles.logo} ${p.small ? styles.logoSmall : ''}`}
                loading='lazy'
              />
            ))}
          </div>
          <div className={styles.gradientRight} />
        </div>
      </div>
    </section>
  )
}
