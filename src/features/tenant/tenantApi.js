import { baseApi } from "@/store/api/baseApi";

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentTenant: builder.query({
      query: () => ({ url: "/tenant", method: "GET" }),
      providesTags: ["Tenant"],
    }),
    updateCurrentTenant: builder.mutation({
      query: (body) => ({ url: "/tenant", method: "PATCH", body }),
      invalidatesTags: (_result, error) => error ? [] : ["Tenant", "Branding"],
    }),
  }),
});

export const {
  useGetCurrentTenantQuery,
  useUpdateCurrentTenantMutation,
} = tenantApi;