import {baseApi} from "@/store/api/baseApi";
const refresh=(_result,error)=>error?[]:["Laboratory"];
export const laboratoryApi=baseApi.injectEndpoints({endpoints:builder=>({
  labTests:builder.query({query:params=>({url:"/laboratory/tests",params}),providesTags:["LabTests"]}),
  saveLabTest:builder.mutation({query:({id,...body})=>({url:id?`/laboratory/tests/${id}`:"/laboratory/tests",method:id?"PATCH":"POST",body}),invalidatesTags:(_result,error)=>error?[]:["LabTests"]}),
  labOrders:builder.query({query:params=>({url:"/laboratory/orders",params}),providesTags:["Laboratory"]}),
  labOrder:builder.query({query:id=>`/laboratory/orders/${id}`,providesTags:["Laboratory"]}),
  createLabOrder:builder.mutation({query:body=>({url:"/laboratory/orders",method:"POST",body}),invalidatesTags:(_result,error)=>error?[]:["Laboratory","Appointments"]}),
  labSampleAction:builder.mutation({query:({id,sampleId,action,...body})=>({url:`/laboratory/orders/${id}/samples/${sampleId}/${action}`,method:"POST",body}),invalidatesTags:refresh}),
  saveLabResults:builder.mutation({query:({id,...body})=>({url:`/laboratory/orders/${id}/results`,method:"PUT",body}),invalidatesTags:refresh}),
  labAction:builder.mutation({query:({id,action,...body})=>({url:`/laboratory/orders/${id}/${action}`,method:"POST",body}),invalidatesTags:refresh}),
  labDocument:builder.query({query:({id,sampleId,kind})=>`/laboratory/orders/${id}/${sampleId?`samples/${sampleId}/label`:kind==="order"?"order-slip":"report"}`,providesTags:["Laboratory"]}),
})});
export const {useLabTestsQuery,useSaveLabTestMutation,useLabOrdersQuery,useLabOrderQuery,useCreateLabOrderMutation,useLabSampleActionMutation,useSaveLabResultsMutation,useLabActionMutation,useLabDocumentQuery}=laboratoryApi;
export const labQueryOptions={refetchOnMountOrArgChange:true};
