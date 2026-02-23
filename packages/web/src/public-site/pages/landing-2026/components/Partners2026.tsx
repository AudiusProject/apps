import styles from './Partners2026.module.css'

import logoDdex from '../assets/logos/ddex.png'
import logoDistrokid from '../assets/logos/distrokid.png'
import logoDowntown from '../assets/logos/downtown.png'
import logoEmpire from '../assets/logos/empire.png'
import logoFuga from '../assets/logos/fuga.png'
import logoKobalt from '../assets/logos/kobalt.png'
import logoLabelworx from '../assets/logos/labelworx.png'
import logoNettwerk from '../assets/logos/nettwerk.png'
import logoWarner from '../assets/logos/warner.png'

const partners = [
  { name: 'Warner', src: logoWarner },
  { name: 'Kobalt', src: logoKobalt },
  { name: 'DistroKid', src: logoDistrokid, small: true },
  { name: 'Downtown', src: logoDowntown },
  { name: 'Empire', src: logoEmpire },
  { name: 'Fuga', src: logoFuga },
  { name: 'Nettwerk', src: logoNettwerk },
  { name: 'LabelWorx', src: logoLabelworx },
  { name: 'DDEX', src: logoDdex }
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
