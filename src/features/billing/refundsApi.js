import {baseApi} from "@/store/api/baseApi";
const tags=["Billing","Appointments","Laboratory","Patients","Inpatient"];
export const refundsApi=baseApi.injectEndpoints({endpoints:builder=>({
 refundBills:builder.query({query:params=>({url:"/billing/refunds/bills",params}),providesTags:tags}),
 refundHistory:builder.query({query:params=>({url:"/billing/refunds",params}),providesTags:tags}),
 createRefund:builder.mutation({query:body=>({url:"/billing/refunds",method:"POST",body}),invalidatesTags:(_data,error)=>error?[]:tags}),
 decideRefund:builder.mutation({query:({id,...body})=>({url:`/billing/refunds/${id}/decision`,method:"POST",body}),invalidatesTags:(_data,error)=>error?[]:tags}),
})});
export const {useRefundBillsQuery,useRefundHistoryQuery,useCreateRefundMutation,useDecideRefundMutation}=refundsApi;
