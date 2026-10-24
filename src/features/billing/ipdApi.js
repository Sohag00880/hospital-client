import {baseApi} from "@/store/api/baseApi";
export const ipdApi=baseApi.enhanceEndpoints({addTagTypes:["IpdBill","IpdChargeCatalog"]}).injectEndpoints({endpoints:builder=>({
 ipdChargeCatalog:builder.query({query:()=>"/billing/ipd/charges",providesTags:["IpdChargeCatalog"]}),
 ipdTemplateSave:builder.mutation({query:body=>({url:"/billing/ipd/charges",method:"POST",body}),invalidatesTags:(_data,error)=>error?[]:["IpdChargeCatalog"]}),
 ipdBills:builder.query({query:params=>({url:"/billing/ipd",params}),providesTags:["IpdBill"]}),
 ipdAccount:builder.query({query:id=>`/billing/ipd/${id}`,providesTags:["IpdBill"]}),
 ipdReports:builder.query({query:params=>({url:"/billing/ipd/reports",params}),providesTags:["IpdBill"]}),
 ipdSave:builder.mutation({query:({id,...body})=>({url:`/billing/ipd/${id}`,method:"POST",body}),invalidatesTags:(_data,error)=>error?[]:["IpdBill","Inpatient"]}),
})});
export const {useIpdChargeCatalogQuery,useIpdTemplateSaveMutation,useIpdBillsQuery,useIpdAccountQuery,useIpdReportsQuery,useIpdSaveMutation}=ipdApi;
