# collapsible-tabs

Vendored copy of [react-native-collapsible-tab-view](https://github.com/PedroBern/react-native-collapsible-tab-view) 8.0.1 (MIT, see `LICENSE`), taken from the `src/` folder of the npm tarball.

Upstream has not pushed since 2025-07. The Reanimated 4 port only exists as `9.0.0-rc.0`, published from an unmerged PR (#483). Vendoring lets us apply that port and new-architecture fixes as ordinary diffs.

The files are kept close to upstream so upstream diffs still apply. They are excluded from eslint in `.eslintignore`.

## Changes from upstream 8.0.1

- Removed `FlashList.tsx` and `MasonryFlashList.tsx` and their exports. Nothing in the app uses them, and they are written against FlashList 1 internals (`recyclerlistview_unsafe`).
- `hooks.tsx`: imported `ContainerRef` and `RefComponent` from `./types` instead of from the package itself.
- `Container.tsx`: cast `containerRef` to `React.RefObject<ContainerRef>` where it is passed to `renderHeader` and `renderTabBar`, for current `@types/react`.
- `FlatList.tsx` and `SectionList.tsx`: removed three `@ts-expect-error` comments that no longer have an error to suppress.

None of these change runtime behaviour.
