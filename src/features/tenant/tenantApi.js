import { baseApi } from "@/store/api/baseApi";

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPcBill:builder.query({query:()=>"/tenant/configure/pc-bill",providesTags:["Tenant"]}),
    updatePcBill:builder.mutation({query:body=>({url:"/tenant/configure/pc-bill",method:"PATCH",body}),invalidatesTags:(_result,error)=>error?[]:["Tenant"]}),
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
  useGetPcBillQuery,
  useUpdatePcBillMutation,
  useGetCurrentTenantQuery,
  useUpdateCurrentTenantMutation,
} = tenantApi;