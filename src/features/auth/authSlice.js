import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  accessToken: null,
  roles: [],
  permissions: [],
  isPlatformAdmin: false,
  mustChangePassword: false,
  status: "idle", // "idle" | "loading" | "authenticated" | "unauthenticated"
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      const {
        user,
        accessToken,
        roles = [],
        permissions = [],
        isPlatformAdmin = false,
        mustChangePassword = false,
      } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.roles = roles;
      state.permissions = permissions;
      state.isPlatformAdmin = isPlatformAdmin;
      state.mustChangePassword = mustChangePassword;
      state.status = "authenticated";
    },
    clearCredentials(state) {
      state.user = null;
      state.accessToken = null;
      state.roles = [];
      state.permissions = [];
      state.isPlatformAdmin = false;
      state.mustChangePassword = false;
      state.status = "unauthenticated";
    },
    setMustChangePassword(state, action) {
      state.mustChangePassword = action.payload;
    },
  },
});

export const { setCredentials, clearCredentials, setMustChangePassword } =
  authSlice.actions;

export const authReducer = authSlice.reducer;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.status === "authenticated";
export const selectIsPlatformAdmin = (state) => state.auth.isPlatformAdmin;
export const selectPermissions = (state) => state.auth.permissions;
export const selectRoles = (state) => state.auth.roles;

export function selectHasPermission(state, permission) {
  return state.auth.permissions.includes(permission);
}