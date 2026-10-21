import {baseApi} from "@/store/api/baseApi";
const refresh=(_result,error)=>error?[]:["Laboratory"];
export const laboratoryApi=baseApi.injectEndpoints({endpoints:builder=>({
  labTests:builder.query({query:params=>({url:"/laboratory/tests",params}),providesTags:["LabTests"]}),
  saveLabTest:builder.mutation({query:({id,...body})=>({url:id?`/laboratory/tests/${id}`:"/laboratory/tests",method:id?"PATCH":"POST",body}),invalidatesTags:(_result,error)=>error?[]:["LabTests"]}),
  editLabOrder:builder.mutation({query:({id,...body})=>({url:`/laboratory/orders/${id}`,method:"PATCH",body}),invalidatesTags:(_r,error)=>error?[]:["Laboratory","Patients","Appointments","Billing"]}),
  labOrders:builder.query({query:params=>({url:"/laboratory/orders",params}),providesTags:["Laboratory"]}),
  labOrder:builder.query({query:id=>`/laboratory/orders/${id}`,providesTags:["Laboratory"]}),
  createLabOrder:builder.mutation({query:body=>({url:"/laboratory/orders",method:"POST",body}),invalidatesTags:(_result,error)=>error?[]:["Laboratory","Appointments"]}),
  collectAllLabSamples:builder.mutation({query:({id,...body})=>({url:`/laboratory/orders/${id}/collect-samples`,method:"POST",body}),invalidatesTags:refresh}),
  labSampleAction:builder.mutation({query:({id,sampleId,action,...body})=>({url:`/laboratory/orders/${id}/samples/${sampleId}/${action}`,method:"POST",body}),invalidatesTags:refresh}),
  saveLabItemResult:builder.mutation({query:({id,itemId,...body})=>({url:`/laboratory/orders/${id}/items/${itemId}/results`,method:"PUT",body}),invalidatesTags:refresh}),
  saveLabResults:builder.mutation({query:({id,...body})=>({url:`/laboratory/orders/${id}/results`,method:"PUT",body}),invalidatesTags:refresh}),
  labAction:builder.mutation({query:({id,action,...body})=>({url:`/laboratory/orders/${id}/${action}`,method:"POST",body}),invalidatesTags:refresh}),
  labDocument:builder.query({query:({id,sampleId,kind,itemIds})=>itemIds?({url:`/laboratory/orders/${id}/item-report`,params:{itemIds:itemIds.join(",")}}):`/laboratory/orders/${id}/${sampleId?`samples/${sampleId}/label`:kind==="order"?"order-slip":"report"}`,providesTags:["Laboratory"]}),
})});
export const {useCollectAllLabSamplesMutation,useEditLabOrderMutation,useSaveLabItemResultMutation,useLabTestsQuery,useSaveLabTestMutation,useLabOrdersQuery,useLabOrderQuery,useCreateLabOrderMutation,useLabSampleActionMutation,useSaveLabResultsMutation,useLabActionMutation,useLabDocumentQuery}=laboratoryApi;
export const labQueryOptions={refetchOnMountOrArgChange:true};
