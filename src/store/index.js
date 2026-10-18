import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./api/baseApi";
import { authReducer } from "@/features/auth/authSlice";
import { uiReducer } from "@/features/ui/uiSlice";

const identity = (auth) => JSON.stringify([auth.user?.id, auth.user?.tenantId, auth.isPlatformAdmin, [...auth.permissions].sort()]);
const resetCacheOnAccountChange = (api) => (next) => (action) => {
  const previous = identity(api.getState().auth);
  const result = next(action);
  // The initial anonymous refresh may finish while a login is in flight.
  // Clearing that same anonymous identity must not abort the login mutation.
  if ((action.type === "auth/clearCredentials" || action.type === "auth/setCredentials") && previous !== identity(api.getState().auth)) api.dispatch(baseApi.util.resetApiState());
  return result;
};

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware, resetCacheOnAccountChange),
    devTools: process.env.NODE_ENV !== "production",
  });

export const store = makeStore();

