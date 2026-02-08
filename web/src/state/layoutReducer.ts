export function layoutReducer(state: any, action: any) {
  switch (action.type) {
    case "toggle":
      return { ...state, [action.pane]: !state[action.pane] };
    default:
      return state;
  }
}
