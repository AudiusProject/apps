import { useState } from 'react'

import styles from './FAQ2026.module.css'

/** Inline chevron so we control color (white default, purple on hover) without Harmony theme override */
function ChevronDown({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg
        width='16'
        height='16'
        viewBox='0 0 16 16'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M4 6L8 10L12 6'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </span>
  )
}

export const faqItems = [
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
        <div
          className={styles.faqList}
          role='list'
          itemScope
          itemType='https://schema.org/FAQPage'
        >
          {faqItems.map((item, index) => {
            const isOpen = openSet.has(index)
            return (
              <div
                key={index}
                className={styles.faqItemWrapper}
                role='listitem'
                itemScope
                itemProp='mainEntity'
                itemType='https://schema.org/Question'
              >
                <button
                  type='button'
                  className={styles.faqItem}
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.faqHeader}>
                    <p className={styles.faqQuestion} itemProp='name'>
                      {item.question}
                    </p>
                    <ChevronDown className={styles.chevron} />
                  </div>
                </button>
                {/* GEO: Answer always in DOM so crawlers/AI can index it; hidden via CSS when collapsed */}
                <div
                  itemScope
                  itemProp='acceptedAnswer'
                  itemType='https://schema.org/Answer'
                  className={`${styles.faqContent} ${isOpen ? styles.faqContentOpen : styles.faqContentClosed}`}
                  aria-hidden={!isOpen}
                >
                  <p className={styles.faqAnswer} itemProp='text'>
                    {item.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
