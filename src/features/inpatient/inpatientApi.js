import {baseApi} from "@/store/api/baseApi";
const tags=["Inpatient"];
export const inpatientApi=baseApi.enhanceEndpoints({addTagTypes:[...tags,"IpdBill"]}).injectEndpoints({endpoints:builder=>({
 inpatientSetup:builder.query({query:()=>"/inpatient/setup",providesTags:(_data,_error,mode)=>mode==="manual"?[]:tags}),
 inpatientCensus:builder.query({query:params=>({url:"/inpatient/admissions",params})}),
 inpatientWrite:builder.mutation({query:({path,method="POST",body})=>({url:`/inpatient/${path}`,method,body}),invalidatesTags:(_data,error,arg)=>error?[]:arg.path==="admissions"?[...tags,"Patients","IpdBill"]:tags}),
})});
export const queryOptions={refetchOnMountOrArgChange:true,refetchOnFocus:true,refetchOnReconnect:true,pollingInterval:30000};
export const manualQueryOptions={refetchOnMountOrArgChange:true,refetchOnFocus:true,refetchOnReconnect:false,pollingInterval:0};




export const {useInpatientSetupQuery,useInpatientCensusQuery,useInpatientWriteMutation}=inpatientApi;
