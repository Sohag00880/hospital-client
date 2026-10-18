import { baseApi } from "@/store/api/baseApi";

export const rolesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listRoles: builder.query({
      query: (params = {}) => ({ url: "/roles", method: "GET", params }),
      providesTags: (result) =>
        result?.data?.items
          ? [
              ...result.data.items.map((r) => ({ type: "Role", id: r.id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),

    getRole: builder.query({
      query: (roleId) => ({ url: `/roles/${roleId}`, method: "GET" }),
      providesTags: (_r, _e, roleId) => [{ type: "Role", id: roleId }],
    }),

    listPermissions: builder.query({
      query: () => ({ url: "/roles/permissions/all", method: "GET" }),
      providesTags: ["Permissions"],
    }),

    cloneRole: builder.mutation({
      query: ({ roleId, ...body }) => ({ url: `/roles/${roleId}/clone`, method: "POST", body }),
      invalidatesTags: ["Role"],
    }),
    toggleRole: builder.mutation({
      query: ({ roleId, disabled }) => ({ url: `/roles/${roleId}/${disabled ? "disable" : "enable"}`, method: "POST" }),
      invalidatesTags: ["Role"],
    }),
    createRole: builder.mutation({
      query: (body) => ({ url: "/roles", method: "POST", body }),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),

    updateRole: builder.mutation({
      query: ({ roleId, ...body }) => ({
        url: `/roles/${roleId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { roleId }) => [
        { type: "Role", id: roleId },
        { type: "Role", id: "LIST" },
      ],
    }),

    deleteRole: builder.mutation({
      query: (roleId) => ({
        url: `/roles/${roleId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),

    setRolePermissions: builder.mutation({
      query: ({ roleId, permissionCodes }) => ({
        url: `/roles/${roleId}/permissions`,
        method: "PUT",
        body: { permissionCodes },
      }),
      invalidatesTags: (_r, _e, { roleId }) => [{ type: "Role", id: roleId }],
    }),
  }),
});

export const {
  useCloneRoleMutation,
  useToggleRoleMutation,
  useListRolesQuery,
  useGetRoleQuery,
  useListPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useSetRolePermissionsMutation,
} = rolesApi;