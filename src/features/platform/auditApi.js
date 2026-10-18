import { baseApi } from "@/store/api/baseApi";

export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAuditLogs: builder.query({
      query: (params = {}) => ({
        url: "/platform/audit-logs",
        method: "GET",
        params,
      }),
      providesTags: ["AuditLogs"],
    }),
  }),
});

export const { useListAuditLogsQuery } = auditApi;