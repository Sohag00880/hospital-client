import {InpatientChart} from "@/features/inpatient/InpatientChart";
export const metadata={title:"Inpatient · Patient chart"};
export default async function Page({params}){const {id}=await params;return <InpatientChart id={id}/>;}
