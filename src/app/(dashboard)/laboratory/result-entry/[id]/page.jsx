import {LabResultPage} from "@/features/laboratory/LabResultPage";
export const metadata={title:"Laboratory Results"};
export default async function Page({params,searchParams}){const {id}=await params;const query=await searchParams;return <LabResultPage id={id} category={query?.from==="reports"?undefined:"pathology"} returnTo={query?.from==="reports"?"reports":"results"}/>;}
