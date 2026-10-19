import {baseApi} from "@/store/api/baseApi";
const tags=["Billing","Appointments","Laboratory"];
export const billingApi=baseApi.injectEndpoints({endpoints:builder=>({
  pcReport:builder.query({query:params=>({url:"/billing/pc",params}),providesTags:["Billing","Appointments","Laboratory"]}),
  pcReceipt:builder.query({query:({id,paymentId})=>`/billing/pc/${id}/payments/${paymentId}/receipt`,providesTags:["Billing"]}),
  pcHistory:builder.query({query:({id,...params})=>({url:`/billing/pc/${id}/payments`,params}),providesTags:["Billing"]}),
  payPcBill:builder.mutation({query:({id,paymentId,...body})=>({url:`/billing/pc/${id}/payments${paymentId?`/${paymentId}`:""}`,method:paymentId?"PATCH":"POST",body}),invalidatesTags:(_result,error)=>error?[]:["Billing"]}),
  billingReport:builder.query({query:({kind,...params})=>({url:`/billing/${kind}`,params}),providesTags:tags}),
  patientDue:builder.query({query:params=>({url:"/billing/due",params}),providesTags:tags}),
  doctorLedger:builder.query({query:({id,...params})=>({url:`/billing/doctors/${id}`,params}),providesTags:tags}),
  doctorPaymentReceipt:builder.query({query:({id,paymentId})=>`/billing/doctors/${id}/payments/${paymentId}/receipt`,providesTags:["Billing"]}),
  labPaymentHistory:builder.query({query:({id,...params})=>({url:`/billing/laboratory/${id}/payments`,params}),providesTags:["Billing"]}),
  editLabPayment:builder.mutation({query:({id,paymentId,...body})=>({url:`/billing/laboratory/${id}/payments/${paymentId}`,method:"PATCH",body}),invalidatesTags:(_result,error)=>error?[]:tags}),
  setPatientPrintPermission:builder.mutation({query:({id,...body})=>({url:`/billing/patients/${id}/print-permission`,method:"PATCH",body}),invalidatesTags:(_result,error)=>error?[]:["Billing","Laboratory"]}),
  settleLabBill:builder.mutation({query:({id,...body})=>({url:`/billing/laboratory/${id}/settle`,method:"POST",body}),invalidatesTags:(_result,error)=>error?[]:["Billing","Laboratory"]}),
  recordBillingPayment:builder.mutation({query:({kind,id,...body})=>({url:`/billing/${kind}/${id}/payments`,method:"POST",body}),invalidatesTags:(_result,error)=>error?[]:["Billing","Laboratory"]}),
})});
export const {usePcReceiptQuery,usePcReportQuery,usePcHistoryQuery,usePayPcBillMutation,useBillingReportQuery,usePatientDueQuery,useDoctorLedgerQuery,useDoctorPaymentReceiptQuery,useLabPaymentHistoryQuery,useEditLabPaymentMutation,useRecordBillingPaymentMutation,useSetPatientPrintPermissionMutation,useSettleLabBillMutation}=billingApi;
