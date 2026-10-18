import { baseApi } from "@/store/api/baseApi";
const changed = (_result, error) => error ? [] : ["References"];
export const referencesApi = baseApi.injectEndpoints({ endpoints: builder => ({
  references: builder.query({ query: params => ({ url: "/references", params }), providesTags: ["References"] }),
  bookingReferences: builder.query({ query: params => ({ url: "/references/booking", params }), providesTags: ["References"] }),
  createReference: builder.mutation({ query: body => ({ url: "/references", method: "POST", body }), invalidatesTags: changed }),
  updateReference: builder.mutation({ query: ({ id, ...body }) => ({ url: `/references/${id}`, method: "PATCH", body }), invalidatesTags: changed }),
  deleteReference: builder.mutation({ query: ({ id, ...body }) => ({ url: `/references/${id}`, method: "DELETE", body }), invalidatesTags: changed }),
  setDefaultReference: builder.mutation({ query: body => ({ url: "/references/default", method: "PUT", body }), invalidatesTags: changed }),
}) });
export const { useReferencesQuery, useBookingReferencesQuery, useCreateReferenceMutation, useUpdateReferenceMutation, useDeleteReferenceMutation, useSetDefaultReferenceMutation } = referencesApi;
