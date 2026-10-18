import { baseApi } from "@/store/api/baseApi";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query({
      query: (params = {}) => ({
        url: "/users",
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.data?.items
          ? [
              ...result.data.items.map((u) => ({ type: "User", id: u.id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),

    getUser: builder.query({
      query: (userId) => ({ url: `/users/${userId}`, method: "GET" }),
      providesTags: (_r, _e, userId) => [{ type: "User", id: userId }],
    }),

    inviteUser: builder.mutation({
      query: (body) => ({ url: "/users/invite", method: "POST", body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    updateUser: builder.mutation({
      query: ({ userId, ...body }) => ({
        url: `/users/${userId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    deactivateUser: builder.mutation({
      query: (userId) => ({
        url: `/users/${userId}/deactivate`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, userId) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    activateUser: builder.mutation({
      query: (userId) => ({
        url: `/users/${userId}/activate`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, userId) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    assignRole: builder.mutation({
      query: ({ userId, ...body }) => ({
        url: `/users/${userId}/roles`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: "User", id: userId }],
    }),

    revokeRole: builder.mutation({
      query: ({ userId, userRoleId }) => ({
        url: `/users/${userId}/roles/${userRoleId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: "User", id: userId }],
    }),

  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useInviteUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
  useAssignRoleMutation,
  useRevokeRoleMutation,
} = usersApi;