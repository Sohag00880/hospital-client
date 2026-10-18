import { baseApi } from "@/store/api/baseApi";
const tags = (id) => [{ type: "Patients", id }, { type: "Patients", id: "LIST" }];
async function synchronizeProfile(args, { dispatch, getState, queryFulfilled }) {
  const originalUser = getState().auth.user;
  try {
    const { data } = await queryFulfilled, current = getState().auth;
    if (current.user?.id !== originalUser?.id || current.user?.tenantId !== originalUser?.tenantId || !current.permissions.includes("patient.view")) return;
    const id = data.data.patient?.id || args.id;
    dispatch(patientsApi.util.updateQueryData("getPatient", id, (cached) => {
      if (data.data.patient) cached.data = data.data;
      else if (cached.data?.patient) cached.data.patient.revision = data.data.revision;
    }));
  } catch { /* Failed writes leave the existing profile untouched. */ }
}
export const patientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPatients: builder.query({ query: (params) => ({ url: "/patients", params }), providesTags: [{ type: "Patients", id: "LIST" }] }),
    getPatient: builder.query({ query: (id) => `/patients/${id}`, providesTags: (_result, _error, id) => [{ type: "Patients", id }] }),
    registerPatient: builder.mutation({ query: (body) => ({ url: "/patients", method: "POST", body }), invalidatesTags: (_result, error) => error ? [] : [{ type: "Patients", id: "LIST" }] }),
    updatePatient: builder.mutation({ query: ({ id, ...body }) => ({ url: `/patients/${id}`, method: "PATCH", body }), onQueryStarted: synchronizeProfile, invalidatesTags: (_result, error, { id }) => error ? [] : tags(id) }),
    findPatientDuplicates: builder.mutation({ query: (body) => ({ url: "/patients/duplicates", method: "POST", body }) }),
    mutatePatientRecord: builder.mutation({ query: ({ patientId, collection, itemId, remove, ...body }) => ({ url: `/patients/${patientId}/${collection}${itemId ? `/${itemId}` : ""}`, method: remove ? "DELETE" : itemId ? "PATCH" : "POST", body }), onQueryStarted: synchronizeProfile, invalidatesTags: (_result, error, { patientId }) => error ? [] : tags(patientId) }),
    getPatientTimeline: builder.query({ query: ({ id, ...params }) => ({ url: `/patients/${id}/timeline`, params }), providesTags: (_result, _error, { id }) => [{ type: "Patients", id }] }),
    addPatientNote: builder.mutation({ query: ({ id, ...body }) => ({ url: `/patients/${id}/timeline`, method: "POST", body }), onQueryStarted: synchronizeProfile, invalidatesTags: (_result, error, { id }) => error ? [] : tags(id) }),
    previewPatientMerge: builder.mutation({ query: ({ id, ...body }) => ({ url: `/patients/${id}/merge-preview`, method: "POST", body }) }),
    mergePatients: builder.mutation({ query: ({ id, ...body }) => ({ url: `/patients/${id}/merge`, method: "POST", body }), onQueryStarted: synchronizeProfile, invalidatesTags: (_result, error) => error ? [] : ["Patients"] }),
  }),
});
export const { useListPatientsQuery, useLazyListPatientsQuery, useGetPatientQuery, useRegisterPatientMutation, useUpdatePatientMutation, useFindPatientDuplicatesMutation, useMutatePatientRecordMutation, useGetPatientTimelineQuery, useAddPatientNoteMutation, usePreviewPatientMergeMutation, useMergePatientsMutation } = patientsApi;
