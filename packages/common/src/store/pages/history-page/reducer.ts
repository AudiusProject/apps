// History page has no persisted state after the tanquery migration.
// Kept as a stub reducer so the combined pages reducer doesn't need to
// branch for history.
const initialState = {}

const reducer = (state = initialState, _action: unknown) => state

export default reducer
