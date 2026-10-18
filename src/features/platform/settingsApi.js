import { baseApi } from "@/store/api/baseApi";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformSettings: builder.query({
      query: () => ({ url: "/platform/settings", method: "GET" }),
      providesTags: ["PlatformSettings"],
    }),
    updatePlatformSettings: builder.mutation({
      query: (body) => ({
        url: "/platform/settings",
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, error) => error ? [] : ["PlatformSettings", "Branding"],
    }),
  }),
});

export const {
  useGetPlatformSettingsQuery,
  useUpdatePlatformSettingsMutation,
} = settingsApi;