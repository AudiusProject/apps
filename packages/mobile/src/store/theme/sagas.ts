import type {
  SetThemeAction,
  SetThemePaletteAction,
  SetThemeModeAction
} from '@audius/common/store'
import { themeActions } from '@audius/common/store'
import { takeEvery, call } from 'typed-redux-saga'

import {
  THEME_MODE_KEY,
  THEME_PALETTE_KEY,
  THEME_STORAGE_KEY
} from 'app/constants/storage-keys'
import { localStorage } from 'app/services/local-storage'

const { setTheme, setThemePalette, setThemeMode } = themeActions

function* setThemeAsync(action: SetThemeAction) {
  const { theme } = action.payload
  yield* call([localStorage, 'setItem'], THEME_STORAGE_KEY, theme)
}

function* setThemePaletteAsync(action: SetThemePaletteAction) {
  const { themePalette } = action.payload
  yield* call([localStorage, 'setItem'], THEME_PALETTE_KEY, themePalette)
}

function* setThemeModeAsync(action: SetThemeModeAction) {
  const { themeMode } = action.payload
  yield* call([localStorage, 'setItem'], THEME_MODE_KEY, themeMode)
}

function* watchSetTheme() {
  yield* takeEvery(setTheme, setThemeAsync)
}

function* watchSetThemePalette() {
  yield* takeEvery(setThemePalette, setThemePaletteAsync)
}

function* watchSetThemeMode() {
  yield* takeEvery(setThemeMode, setThemeModeAsync)
}

export default function sagas() {
  return [watchSetTheme, watchSetThemePalette, watchSetThemeMode]
}
