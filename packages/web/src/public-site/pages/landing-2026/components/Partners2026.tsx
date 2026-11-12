import logoDdex from '../assets/logos/ddex.png'
import logoDistrokid from '../assets/logos/distrokid.png'
import logoDowntown from '../assets/logos/downtown.png'
import logoEmpire from '../assets/logos/empire.png'
import logoFuga from '../assets/logos/fuga.png'
import logoKobalt from '../assets/logos/kobalt.png'
import logoLabelworx from '../assets/logos/labelworx.png'
import logoNettwerk from '../assets/logos/nettwerk.png'
import logoWarner from '../assets/logos/warner.png'

import styles from './Partners2026.module.css'

const partners = [
  { name: 'Warner', src: logoWarner, width: 376, height: 136 },
  { name: 'Kobalt', src: logoKobalt, width: 356, height: 136 },
  {
    name: 'DistroKid',
    src: logoDistrokid,
    small: true,
    width: 322,
    height: 43
  },
  { name: 'Downtown', src: logoDowntown, width: 470, height: 136 },
  { name: 'Empire', src: logoEmpire, width: 177, height: 136 },
  { name: 'Fuga', src: logoFuga, width: 442, height: 136 },
  { name: 'Nettwerk', src: logoNettwerk, width: 172, height: 136 },
  { name: 'LabelWorx', src: logoLabelworx, width: 729, height: 136 },
  { name: 'DDEX', src: logoDdex, width: 443, height: 136 }
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
                width={p.width}
                height={p.height}
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
