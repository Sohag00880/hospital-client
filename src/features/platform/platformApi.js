import { baseApi } from "@/store/api/baseApi";

export const platformApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ---------------- Tenants ----------------

    listTenants: builder.query({
      query: (params = {}) => ({
        url: "/platform/tenants",
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.data?.items
          ? [
              ...result.data.items.map((t) => ({ type: "Tenant", id: t.id })),
              { type: "Tenant", id: "LIST" }]
          : [{ type: "Tenant", id: "LIST" }],
    }),

    getTenant: builder.query({
      query: (tenantId) => ({
        url: `/platform/tenants/${tenantId}`,
        method: "GET",
      }),
      providesTags: (_r, _e, tenantId) => [{ type: "Tenant", id: tenantId }],
    }),

    createTenant: builder.mutation({
      query: (body) => ({
        url: "/platform/tenants",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Tenant", id: "LIST" }],
    }),

    updateTenant: builder.mutation({
      query: ({ tenantId, ...body }) => ({
        url: `/platform/tenants/${tenantId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, error, { tenantId }) => error ? [] : [
        "Branding",
        { type: "Tenant", id: tenantId },
        { type: "Tenant", id: "LIST" }],
    }),

    suspendTenant: builder.mutation({
      query: ({ tenantId, reason }) => ({
        url: `/platform/tenants/${tenantId}/suspend`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { tenantId }) => [
        { type: "Tenant", id: tenantId },
        { type: "Tenant", id: "LIST" }],
    }),

    reactivateTenant: builder.mutation({
      query: (tenantId) => ({
        url: `/platform/tenants/${tenantId}/reactivate`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, tenantId) => [
        { type: "Tenant", id: tenantId },
        { type: "Tenant", id: "LIST" }],
    }),
  }),
});

export const {
  useListTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useSuspendTenantMutation,
  useReactivateTenantMutation,
} = platformApi;
