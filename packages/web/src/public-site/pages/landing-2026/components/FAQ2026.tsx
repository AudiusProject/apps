import { useState } from 'react'

import { IconCaretDown } from '@audius/harmony'

import styles from './FAQ2026.module.css'

const faqItems = [
  {
    question: 'Who is Audius made for?',
    answer: 'Audius is made for us, the people pushing music scenes forward.'
  },
  {
    question: "I'm an artist. What can I do on Audius?",
    answer:
      "Artists on Audius consistently release music, run remix contests, and create unique experiences for their scene they can't find anywhere else. Demos, WIPs, and anything in between live here. It's not about perfection, it's about participation. Successful artists consistently engage, activate, and collab with their community."
  },
  {
    question: "I'm a record label. What can I do on Audius?",
    answer:
      "Record labels on Audius actively showcase their roster's music, discover artists, and create a community around their brand. They host remix contests, stay connected to emerging scenes, and build the momentum needed to support their releases everywhere else. Like artists, successful labels consistently engage, activate, and connect with their audience."
  },
  {
    question: 'I just love music. What can I do on Audius?',
    answer:
      "Music lovers on Audius keep the culture alive. They play a vital role in directly engaging, amplifying, and creating opportunities for artists to grow in their scene. While some just love the music, many professionally run collectives, promote events, and use the platform to expand what they're already building."
  }
]

type FAQ2026Props = {
  isMobile: boolean
}

export const FAQ2026 = (_props: FAQ2026Props) => {
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set())

  const toggle = (index: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <section className={styles.section} aria-labelledby='faq-heading'>
      <div className={styles.container}>
        <h2 id='faq-heading' className={styles.headline}>
          Frequently Asked Questions
        </h2>
        <div className={styles.faqList} role='list'>
          {faqItems.map((item, index) => {
            const isOpen = openSet.has(index)
            return (
              <button
                key={index}
                type='button'
                className={styles.faqItem}
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                role='listitem'
              >
                <div className={styles.faqHeader}>
                  <p className={styles.faqQuestion}>{item.question}</p>
                  <IconCaretDown
                    size='s'
                    color='default'
                    className={styles.chevron}
                  />
                </div>
                {isOpen ? (
                  <div className={styles.faqContent}>
                    <p className={styles.faqAnswer}>{item.answer}</p>
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
