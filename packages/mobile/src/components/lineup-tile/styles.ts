import { makeStyles, flexRowCentered, font } from 'app/styles'
import { spacing } from 'app/styles/spacing'

export const useStyles = makeStyles(({ palette }) => ({
  statItem: {
    ...flexRowCentered()
  },
  statTextContainer: {
    flexDirection: 'row',
    gap: spacing(3),
    alignItems: 'center'
  },
  statTextProgressBar: {
    height: 4,
    width: 72,
    marginVertical: 0,
    paddingVertical: 0
  },
  statText: {
    ...font('medium'),
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.neutralLight4
  },
  completeStatText: {
    color: palette.secondary
  },
  image: {
    borderRadius: 4,
    height: 72,
    width: 72
  },
  imageContainer: {
    marginTop: spacing(2),
    marginLeft: spacing(2)
  },
  titles: {
    paddingVertical: spacing(1),
    alignItems: 'flex-start',
    marginTop: spacing(2),
    flex: 1,
    gap: spacing(1)
  },
  collectionTitles: {
    alignItems: 'flex-start',
    flex: 1,
    marginTop: spacing(2),
    gap: spacing(1)
  },
  title: {
    ...flexRowCentered(),
    width: '100%'
  },
  titlePlaying: {
    paddingRight: spacing(5)
  },
  artist: {
    ...flexRowCentered(),
    justifyContent: 'flex-start',
    gap: spacing(1),
    width: '100%',
    marginBottom: 'auto',
    paddingRight: spacing(10),
    minHeight: 20
  }
}))
