import { CommonState } from '@audius/common/store'
import { connect } from 'react-redux'

import { useDevModeHotkey } from 'hooks/useDevModeHotkey'

import styles from './ConfirmerPreview.module.css'

type ConfirmerPreviewProps = {} & ReturnType<typeof mapStateToProps>

const ConfirmerPreview = ({ confirmer }: ConfirmerPreviewProps) => {
  const entities = Object.keys(confirmer.confirm)
  const isEnabled = useDevModeHotkey(67)
  if (!isEnabled) return null

  return (
    <div className={styles.container}>
      <div className={styles.title}>Confirmer Preview</div>
      <div className={styles.inProgressTitle}>In Progress calls</div>
      <div className={styles.inProgress}>
        {entities.length
          ? entities.map((entity) => {
              return (
                <div className={styles.entity} key={entity}>
                  <div className={styles.entityName}>{entity}</div>
                  <div className={styles.index}>
                    In Progress Call: # {confirmer.confirm[entity].index}
                  </div>
                  <div className={styles.calls}>
                    {confirmer.confirm[entity].calls.map((call, i) => {
                      let resultText: string
                      if (call.cancelled) {
                        resultText = 'cancelled'
                      } else if (call.result === null) {
                        resultText = '-'
                      } else {
                        resultText = 'done'
                      }

                      return (
                        <div className={styles.call} key={i}>
                          {i}. result: {resultText}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          : 'None'}
      </div>
    </div>
  )
}

function mapStateToProps(state: CommonState) {
  return {
    confirmer: state.confirmer
  }
}

export default connect(mapStateToProps)(ConfirmerPreview)
