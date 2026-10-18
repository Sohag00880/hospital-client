import { createSlice, nanoid } from "@reduxjs/toolkit";

const initialState = {
  theme: "system",
  sidebarCollapsed: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload;
    },
    pushToast: {
      reducer(state, action) {
        state.toasts.push(action.payload);
      },
      prepare(input) {
        return {
          payload: {
            id: input.id ?? nanoid(),
            durationMs: 5000,
            ...input,
          },
        };
      },
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;