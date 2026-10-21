import { baseApi } from "@/store/api/baseApi";
const refresh = (_result, error) => error ? [] : ["Appointments", "DoctorSchedules"];
export const appointmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    appointmentForEdit:builder.query({query:id=>`/appointments/${id}/edit`,providesTags:["Appointments","Patients"]}),
    editAppointment:builder.mutation({query:({id,...body})=>({url:`/appointments/${id}`,method:"PATCH",body}),invalidatesTags:(_data,error)=>error?[]:["Appointments","Patients","Billing","DoctorSchedules"]}),
    patientAppointmentHistory:builder.query({query:params=>({url:"/appointments/history",params}),providesTags:["Appointments","Patients"]}),
    patientAppointments:builder.query({query:params=>({url:"/appointments/manage",params}),providesTags:["Appointments","Patients"]}),
    appointmentReferences: builder.query({query:params=>({url:"/appointments/booking-references",params}),providesTags:["Appointments","References"]}),
    bookingUsers: builder.query({query:params=>({url:"/appointments/booking-users",params}),providesTags:["Appointments","Users","User"]}),
    bookingDoctors: builder.query({query:params=>({url:"/appointments/booking-doctors",params}),providesTags:["Appointments","Users","User","Doctors"]}),
    appointmentDoctors: builder.query({ query: (params) => ({url:"/appointments/doctors",params}), providesTags: ["Users", "User", "Roles", "Doctors"] }),
    doctorSchedules: builder.query({ query: (params) => ({ url: "/appointments/schedules", params }), providesTags: ["DoctorSchedules"] }),
    appointments: builder.query({ query: (params) => ({ url: "/appointments", params }), providesTags: ["Appointments"] }),
    opdAppointments: builder.query({ query: params => ({ url: "/appointments/opd", params }), providesTags: ["Appointments"] }),
    opdQueue: builder.query({ query: (params) => ({ url: "/appointments/queue", params }), providesTags: ["Appointments"] }),
    appointmentPrint: builder.query({query:id=>`/appointments/${id}/print`,providesTags:["Appointments","Branding","Doctors"]}),
    appointmentHistory: builder.query({ query: (id) => `/appointments/${id}/history`, providesTags: ["Appointments"] }),
    cancelDoctorSchedule: builder.mutation({ query: ({ id, ...body }) => ({ url: `/appointments/schedules/${id}/cancel`, method: "POST", body }), invalidatesTags: refresh }),
    receptionLookup: builder.mutation({query:body=>({url:"/appointments/reception/lookup",method:"POST",body})}),
    receptionBooking: builder.mutation({query:body=>({url:"/appointments/reception",method:"POST",body}),invalidatesTags:(_r,error)=>error?[]:["Appointments","DoctorSchedules","Patients"]}),
    editAppointmentSerial: builder.mutation({query:({id,...body})=>({url:`/appointments/${id}/serial`,method:"PATCH",body}),invalidatesTags:refresh}),
    bookAppointment: builder.mutation({ query: (body) => ({ url: "/appointments", method: "POST", body }), invalidatesTags: (_r, error) => error ? [] : ["Appointments", "DoctorSchedules", "Patients"] }),
    appointmentAction: builder.mutation({ query: ({ id, action, ...body }) => ({ url: `/appointments/${id}/${action}`, method: "POST", body }), invalidatesTags: (result, error, { action }) => error ? [] : [...refresh(result, error), ...(action === "reschedule" ? ["Patients"] : [])] }),
    callNext: builder.mutation({ query: (body) => ({ url: "/appointments/queue/next", method: "POST", body }), invalidatesTags: refresh }),
  }),
});
export const { useAppointmentForEditQuery, useEditAppointmentMutation, usePatientAppointmentHistoryQuery, usePatientAppointmentsQuery, useAppointmentReferencesQuery, useBookingDoctorsQuery, useBookingUsersQuery, useReceptionLookupMutation, useReceptionBookingMutation, useEditAppointmentSerialMutation, useAppointmentDoctorsQuery, useDoctorSchedulesQuery, useAppointmentsQuery, useOpdAppointmentsQuery, useOpdQueueQuery, useAppointmentHistoryQuery, useAppointmentPrintQuery, useCancelDoctorScheduleMutation, useBookAppointmentMutation, useAppointmentActionMutation, useCallNextMutation } = appointmentsApi;
// Fetch on entry or filter changes; successful mutations refresh data through tags.
export const queryOptions = { refetchOnMountOrArgChange: true };
