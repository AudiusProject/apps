export const ENTER_FOREGROUND = 'LIFECYCLE/ENTER_FOREGROUND'
export const ENTER_BACKGROUND = 'LIFECYCLE/ENTER_BACKGROUND'

type EnterForegroundAction = {
  type: typeof ENTER_FOREGROUND
}

type EnterBackgroundAction = {
  type: typeof ENTER_BACKGROUND
}

export type LifecycleActions = EnterForegroundAction | EnterBackgroundAction

export const enterForeground = (): EnterForegroundAction => ({
  type: ENTER_FOREGROUND
})

export const enterBackground = (): EnterBackgroundAction => ({
  type: ENTER_BACKGROUND
})
