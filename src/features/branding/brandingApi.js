import { baseApi } from "@/store/api/baseApi";
const path = (scope) => scope === "platform" ? "/platform/branding" : "/branding";
export const brandingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBranding: builder.query({ query: (scope = "tenant") => path(scope), providesTags: ["Branding"] }),
    getAppearance: builder.query({ query: () => "/branding/appearance", providesTags: ["Branding"] }),
    saveBranding: builder.mutation({ query: ({ scope, values }) => ({ url: path(scope), method: "PATCH", body: values }), invalidatesTags: (_data, error) => error ? [] : ["Branding"] }),
    resetBranding: builder.mutation({ query: (scope) => ({ url: path(scope), method: "DELETE" }), invalidatesTags: (_data, error) => error ? [] : ["Branding"] }),
    previewBranding: builder.mutation({ query: ({ scope, values }) => ({ url: `${path(scope)}/preview`, method: "POST", body: values }) }),
  }),
});
export const { useGetBrandingQuery, useGetAppearanceQuery, useSaveBrandingMutation, useResetBrandingMutation, usePreviewBrandingMutation } = brandingApi;
