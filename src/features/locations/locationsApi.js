import {baseApi} from "@/store/api/baseApi";
export const locationsApi=baseApi.injectEndpoints({endpoints:builder=>({
 locationDistricts:builder.query({query:()=>"/locations/districts",keepUnusedDataFor:86400}),
 locationUpazilas:builder.query({query:districtId=>({url:"/locations/upazilas",params:{districtId}}),keepUnusedDataFor:86400}),
 locationUnions:builder.query({query:upazilaId=>({url:"/locations/unions",params:{upazilaId}}),keepUnusedDataFor:86400}),
})});
export const {useLocationDistrictsQuery,useLocationUpazilasQuery,useLocationUnionsQuery}=locationsApi;
