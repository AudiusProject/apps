import WavingHandSign from 'assets/fonts/emojis/waving-hand-sign.png'

import styles from './SendMessagePrompt.module.css'

const messages = {
  iconAlt: 'Waving Hand Emoji',
  title: 'Say Hello!',
  text: 'First impressions are important, so make it count!'
}

export const SendMessagePrompt = () => {
  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <img src={WavingHandSign} alt={messages.iconAlt} />
        </div>
        <div>
          <div className={styles.title}>{messages.title}</div>
          <div className={styles.text}>{messages.text}</div>
        </div>
      </div>
    </div>
  )
}
