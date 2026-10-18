import { baseApi } from "@/store/api/baseApi";
const refresh = (_data, error) => error ? [] : ["Doctors", "DoctorDepartments", "Users", "User", "Appointments", "DoctorSchedules"];
export const doctorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    doctors: builder.query({ query: (params) => ({ url: "/doctors", params }), providesTags: ["Doctors", "User", "Roles"] }),
    doctorDepartments: builder.query({ query: () => "/doctors/departments", providesTags: ["DoctorDepartments"] }),
    createDoctor: builder.mutation({ query: (body) => ({ url: "/doctors", method: "POST", body }), invalidatesTags: refresh }),
    createDoctorDepartment: builder.mutation({ query: (body) => ({ url: "/doctors/departments", method: "POST", body }), invalidatesTags: (_data, error) => error ? [] : ["DoctorDepartments"] }),
    updateDoctor: builder.mutation({ query: ({ id, ...body }) => ({ url: `/doctors/${id}`, method: "PATCH", body }), invalidatesTags: refresh }),
    deleteDoctor: builder.mutation({ query: ({ id, ...body }) => ({ url: `/doctors/${id}`, method: "DELETE", body }), invalidatesTags: refresh }),
    updateDoctorDepartment: builder.mutation({ query: ({ id, ...body }) => ({ url: `/doctors/departments/${id}`, method: "PATCH", body }), invalidatesTags: refresh }),
    deleteDoctorDepartment: builder.mutation({ query: ({ id, ...body }) => ({ url: `/doctors/departments/${id}`, method: "DELETE", body }), invalidatesTags: refresh }),
    assignDoctorDepartment: builder.mutation({ query: ({ id, ...body }) => ({ url: `/doctors/${id}/department`, method: "PATCH", body }), invalidatesTags: refresh }),
  }),
});
export const { useDoctorsQuery, useDoctorDepartmentsQuery, useCreateDoctorMutation, useCreateDoctorDepartmentMutation, useAssignDoctorDepartmentMutation, useUpdateDoctorMutation, useDeleteDoctorMutation, useUpdateDoctorDepartmentMutation, useDeleteDoctorDepartmentMutation } = doctorsApi;
