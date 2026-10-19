import {baseApi} from "@/store/api/baseApi";
const tags=["Inpatient"];
export const inpatientApi=baseApi.enhanceEndpoints({addTagTypes:tags}).injectEndpoints({endpoints:builder=>({
 inpatientSetup:builder.query({query:()=>"/inpatient/setup",providesTags:(_data,_error,mode)=>mode==="manual"?[]:tags}),
 inpatientCensus:builder.query({query:params=>({url:"/inpatient/admissions",params})}),
 inpatientChart:builder.query({query:id=>`/inpatient/admissions/${id}`,providesTags:tags}),
 inpatientBill:builder.query({query:id=>`/inpatient/admissions/${id}/bill`,providesTags:tags}),
 inpatientDue:builder.query({query:params=>({url:"/inpatient/due",params}),providesTags:tags}),
 inpatientCatalog:builder.query({query:()=>"/inpatient/charge-catalog",providesTags:tags}),
 inpatientWrite:builder.mutation({query:({path,method="POST",body})=>({url:`/inpatient/${path}`,method,body}),invalidatesTags:(_data,error)=>error?[]:tags}),
})});
export const {useInpatientDueQuery,useInpatientSetupQuery,useInpatientCensusQuery,useInpatientChartQuery,useInpatientBillQuery,useInpatientCatalogQuery,useInpatientWriteMutation}=inpatientApi;
export const queryOptions={refetchOnMountOrArgChange:true,refetchOnFocus:true,refetchOnReconnect:true,pollingInterval:30000};
export const manualQueryOptions={refetchOnMountOrArgChange:true,refetchOnFocus:true,refetchOnReconnect:false,pollingInterval:0};
