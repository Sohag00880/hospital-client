"use client";
import {useId} from "react";
import {Input} from "@/components/ui/Input";
export const stages=["ordered","sample_collected","processing","result_entered","finalized"];
export const stageLabel=value=>({ordered:"Ordered",sample_collected:"Sample collected",processing:"In progress",result_entered:"Results complete",finalized:"Finalized"}[value] || value);
export function LabError({error}){return error?<div role="alert" className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><p>{typeof error==="string"?error:error.data?.error?.message || "Laboratory request failed. Please retry."}</p>{error.data?.error?.details?.issues?.length>0&&<ul className="mt-2 list-disc space-y-1 pl-5">{error.data.error.details.issues.map((issue,index)=><li key={index}>{issue.message}</li>)}</ul>}</div>:null;}
export function LabField({label,children,...props}){const id=useId();return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children?children(id):<Input id={id} {...props}/>}</div>;}
export function StageBadge({status}){return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status==="finalized"?"bg-emerald-100 text-emerald-900":"bg-muted text-foreground"}`}>{stageLabel(status)}</span>;}
