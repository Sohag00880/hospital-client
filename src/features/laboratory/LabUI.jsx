"use client";
import {useId} from "react";
import {Input} from "@/components/ui/Input";
export const stages=["ordered","sample_collected","processing","result_entered","finalized"];
export const stageLabel=value=>({ordered:"Order",sample_collected:"Sample Collection",processing:"Processing",result_entered:"Result Entry",finalized:"Finalization"}[value] || value);
export function LabError({error}){return error?<p role="alert" className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{typeof error==="string"?error:error.data?.error?.message || "Laboratory request failed. Please retry."}</p>:null;}
export function LabField({label,children,...props}){const id=useId();return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children?children(id):<Input id={id} {...props}/>}</div>;}
export function StageBadge({status}){return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status==="finalized"?"bg-emerald-100 text-emerald-900":"bg-muted text-foreground"}`}>{stageLabel(status)}</span>;}
