import { flexRowCentered, makeStyles } from 'app/styles'

export const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  content: {
    padding: spacing(4),
    paddingTop: spacing(6),
    gap: spacing(6),
    flex: 1
  },
  scrollViewContainer: {
    flex: 1
  },
  scrollViewContent: {
    padding: spacing(4),
    paddingTop: spacing(13),
    gap: spacing(6)
  },
  subheader: {
    textAlign: 'center',
    marginBottom: spacing(3)
  },
  progressSubheader: {
    textAlign: 'left'
  },
  subheaderIcon: {
    marginBottom: spacing(3),
    marginRight: 10
  },
  task: {
    width: '100%'
  },
  taskHeader: {
    ...flexRowCentered()
  },
  audioMatchingDescriptionContainer: {
    gap: spacing(3)
  },
  statusGridColumns: {
    padding: spacing(2),
    gap: spacing(4),
    flexDirection: 'row',
    justifyContent: 'center'
  },
  rewardCell: {
    justifyContent: 'center'
  },
  progressCell: {
    flex: 1,
    paddingLeft: spacing(4),
    borderLeftWidth: 1,
    borderColor: palette.neutralLight8
  },
  statusCell: {
    alignItems: 'center',
    paddingLeft: spacing(8),
    paddingRight: spacing(8),
    paddingTop: spacing(3),
    backgroundColor: palette.neutralLight9,
    borderBottomLeftRadius: spacing(4),
    borderBottomRightRadius: spacing(4)
  },
  statusCellComplete: {
    backgroundColor: palette.staticAccentGreenLight1
  },
  audioAmount: {
    textAlign: 'center',
    fontSize: typography.fontSize.xxxxxl
  },
  audioLabel: {
    textAlign: 'center',
    fontSize: spacing(3)
  },
  stickyClaimRewardsContainer: {
    borderTopWidth: 1,
    borderTopColor: palette.borderDefault,
    paddingBottom: spacing(10),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    width: '100%'
  },
  claimRewardsContainer: {
    marginVertical: spacing(4),
    width: '100%'
  },
  claimRewardsError: {
    textAlign: 'center',
    color: palette.accentRed,
    fontSize: spacing(4),
    marginTop: spacing(6)
  },
  claimButtonContainer: {
    width: '100%'
  },
  claimButton: {
    paddingVertical: spacing(3)
  },
  claimableAmount: {
    marginVertical: spacing(4),
    textAlign: 'center',
    color: palette.staticAccentGreenLight1
  },
  claimedAmountContainer: {
    ...flexRowCentered(),
    borderTopColor: palette.borderStrong,
    backgroundColor: palette.backgroundSurface2,
    justifyContent: 'center',
    borderTopWidth: 1,
    padding: spacing(4)
  },
  claimedAmount: {
    marginTop: spacing(4),
    textAlign: 'center',
    color: palette.neutralLight4
  }
}))
