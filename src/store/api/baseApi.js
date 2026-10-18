import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { publicEnv } from "@/lib/env";
import { clearCredentials, setCredentials } from "@/features/auth/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
    headers.set("accept", "application/json");
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshResult = await rawBaseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions,
    );

    if (refreshResult.data?.success) {
      const data = refreshResult.data.data;
      api.dispatch(
        setCredentials({
          user: data.user,
          accessToken: data.accessToken,
          roles: data.roles,
          permissions: data.permissions,
          isPlatformAdmin: data.isPlatformAdmin,
        }),
      );
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Billing",
    "Laboratory", "LabTests",
    "References",
    "Doctors", "DoctorDepartments",
    "Appointments", "DoctorSchedules",
    "Patients",
    "Auth",
    "Profile",
    "Users",
    "User",
    "Roles",
    "Role",
    "Permissions",
    "Tenants",
    "Tenant",
    "PlatformSettings", "Branding"],
  endpoints: () => ({}),
});
