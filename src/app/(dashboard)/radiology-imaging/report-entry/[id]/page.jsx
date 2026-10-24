import {LabResultPage} from "@/features/laboratory/LabResultPage";
export const metadata={title:"Radiology Report"};
export default async function Page({params}){const {id}=await params;return <LabResultPage id={id} category="radiology" returnTo="radiology"/>;}
