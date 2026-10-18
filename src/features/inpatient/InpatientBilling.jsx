"use client";
import {useEffect,useState} from "react";
import {Plus,Undo2} from "lucide-react";
import {useAppSelector} from "@/store/hooks";
import {Button} from "@/components/ui/Button";
import {DataTable} from "@/components/ui/DataTable";
import {useInpatientBillQuery,useInpatientCatalogQuery,queryOptions} from "./inpatientApi";
import {Badge,ErrorBox,FormDialog,dateTime,field,label} from "./InpatientUI";

export const money=value=>`BDT ${Number(value||0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const entryLabel=kind=>({total_add:"Total amount increased",total_reduce:"Total amount reduced",payment_void:"Payment corrected"}[kind]||label(kind));
const methods=["cash","bank","mobile"].map(value=>({value,label:label(value)}));
export function InpatientBilling({admission}){
 const permissions=useAppSelector(s=>s.auth.permissions),canCollect=permissions.includes("billing.create"),canApprove=permissions.includes("billing.approve"),allowed=permissions.includes("billing.view");
 const query=useInpatientBillQuery(admission.id,{...queryOptions,skip:!allowed}),[dialog,setDialog]=useState(null),[notice,setNotice]=useState("");
 const data=query.currentData?.data;
 if(!allowed)return <ErrorBox error="You do not have permission to view billing."/>;
 if(!data)return <><ErrorBox error={query.error}/>{query.isLoading&&<p role="status" className="text-sm text-muted-foreground">Loading admission bill…</p>}</>;
 const summary=data.summary,active=admission.status==="admitted",voided=new Set(data.items.filter(e=>e.kind==="void").map(e=>e.chargeId));
 return <div className="space-y-5">
  <ErrorBox error={query.error}/>{notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
  <div className="flex flex-wrap gap-2">{active&&canCollect&&<Button size="sm" onClick={()=>setDialog({type:"charge"})}><Plus className="h-4 w-4"/>Add charge</Button>}{canApprove&&Number(summary.credit)>0&&<Button size="sm" variant="outline" onClick={()=>setDialog({type:"refund"})}><Undo2 className="h-4 w-4"/>Refund credit</Button>}</div>
  {!active&&<p className="rounded-xl bg-muted p-3 text-sm">Charges are closed after discharge. Payments can be recorded from IPD Due.</p>}
  <h3 className="font-semibold">Itemized charges</h3><DataTable rows={data.items.filter(e=>e.kind==="charge")} rowKey={e=>e.id} emptyTitle="No charges added" columns={[
   {key:"category",header:"Charge",accessor:e=><div><p className="font-medium">{e.chargeName||label(e.category)}</p>{e.chargeName&&<p className="text-xs text-muted-foreground">{label(e.category)}</p>}</div>},
   ...(data.items.some(e=>e.kind==="charge"&&e.description?.trim())?[{key:"item",header:"Description",accessor:e=>e.description?.trim()?<p className="font-medium">{e.description}</p>:null}]:[]),
   {key:"quantity",header:"Days",accessor:e=>e.category==="bed"?e.quantity:null},{key:"rate",header:"Unit price",accessor:e=>e.category==="bed"?money(e.unitPrice):null},{key:"amount",header:"Amount",accessor:e=>money(e.amount)},
   {key:"status",header:"Status",accessor:e=><Badge tone={voided.has(e.id)?"neutral":"blue"}>{voided.has(e.id)?"Voided":"Posted"}</Badge>},
   {key:"action",header:"",accessor:e=>active&&canApprove&&!voided.has(e.id)?<Button size="sm" variant="outline" onClick={()=>setDialog({type:"void",row:e})}>Void charge</Button>:"—"},
  ]}/>
  <h3 className="font-semibold">Payments & adjustments</h3><DataTable rows={data.items.filter(e=>e.kind!=="charge")} rowKey={e=>e.id} emptyTitle="No payments or adjustments" columns={[
   {key:"date",header:"Recorded",accessor:e=>dateTime(e.createdAt)},{key:"kind",header:"Type",accessor:e=><Badge tone={e.kind==="payment"?"green":"amber"}>{entryLabel(e.kind)}</Badge>},{key:"amount",header:"Amount",accessor:e=>money(e.amount)},{key:"method",header:"Method",accessor:e=>e.method?label(e.method):"—"},{key:"note",header:"Description / reason",accessor:e=>e.description},{key:"author",header:"Recorded by",accessor:e=>e.author},
  ]}/>
  {dialog&&<BillDialog dialog={dialog} summary={summary} admission={admission} onClose={()=>setDialog(null)} onSaved={()=>{setNotice("Admission bill updated.");}}/>}
 </div>;
}
function BillDialog({dialog,summary,admission,onClose,onSaved}){
 const catalog=useInpatientCatalogQuery(undefined,{refetchOnMountOrArgChange:true});
 const savedCharges=(catalog.currentData?.data||[]).filter(row=>row.active);
 const type=dialog.type,base=`admissions/${admission.id}/bill`;
 let fields,path,title,initial={},prepare=(v,key)=>({...v,requestKey:key});
 if(type==="charge"){
  title="Add admission charge";path=`${base}/charge`;initial={quantity:1,category:"bed"};
  fields=[field("catalogId","Saved charge","select",{required:false,wide:true,placeholder:"Custom charge",options:savedCharges.map(row=>({value:row.id,label:row.name+" · "+money(row.price)})),onValueChange:id=>{const row=savedCharges.find(r=>r.id===id);return row?{category:row.category,unitPrice:row.price,amount:row.price,description:row.description,expectedCatalogRevision:row.revision}:{expectedCatalogRevision:undefined};}}),field("category","Charge category","select",{options:["bed","doctor","medicine","test","procedure","other"].map(value=>({value,label:label(value)})),onValueChange:()=>({catalogId:"",expectedCatalogRevision:undefined})}),field("quantity","Days","number",{min:1,max:3650,when:v=>v.category==="bed"}),field("unitPrice","Unit price","number",{min:"0.01",max:"999999999999.99",step:"0.01",when:v=>v.category==="bed"}),field("amount","Amount","number",{min:"0.01",max:"999999999999.99",step:"0.01",when:v=>v.category!=="bed"}),field("description","Description","textarea",{maxLength:500,wide:true,required:false})];
  prepare=(v,key)=>({category:v.category,description:v.description||"",requestKey:key,...(v.catalogId?{catalogId:v.catalogId,expectedCatalogRevision:v.expectedCatalogRevision}:{}),...(v.category==="bed"?{quantity:Number(v.quantity),unitPrice:String(v.unitPrice)}:{amount:String(v.amount)})});
 }else if(type==="void"){
  title="Void incorrect charge";path=`${base}/void`;fields=[field("description","Reason for voiding","textarea",{maxLength:500})];prepare=(v,key)=>({...v,chargeId:dialog.row.id,requestKey:key});
 }else{
  title="Refund excess credit";path=`${base}/transaction`;initial={method:"cash",amount:summary.credit};
  fields=[field("amount","Amount (BDT)","number",{min:"0.01",step:"0.01",max:summary.credit}),field("method","Payment method","select",{options:methods}),field("description","Reason","textarea",{maxLength:500})];prepare=(v,key)=>({...v,kind:"refund",amount:String(v.amount),requestKey:key});
 }
 return <FormDialog title={title} path={path} fields={fields} initial={initial} prepare={prepare} onClose={onClose} onSaved={onSaved} submitLabel={type==="void"?"Confirm void":"Save"}>{type==="charge"&&<ErrorBox error={catalog.error}/>} {type==="void"&&<p className="rounded-lg bg-muted p-3 text-sm">{dialog.row.description?.trim()&&<span>{dialog.row.description} · </span>}{money(dialog.row.amount)}. The original entry remains in the bill history.</p>}</FormDialog>;
}

export function TotalAmountDialog({admission,onClose,onSaved}){
 const query=useInpatientBillQuery(admission.id,{refetchOnMountOrArgChange:true});
 const [data,setData]=useState(null);
 useEffect(()=>{if(!data&&!query.isFetching&&query.currentData?.data)setData(query.currentData.data);},[data,query.isFetching,query.currentData]);
 if(!data)return <><ErrorBox error={query.error}/><p role="status">Loading current bill...</p><Button variant="outline" onClick={onClose}>Cancel</Button></>;
 return <FormDialog title={Number(data.summary.net)>0?"Edit total amount":"Add total amount"} description={admission.patientName} path={`admissions/${admission.id}/bill/total`} initial={{amount:data.summary.net}} fields={[field("amount","Total amount","number",{min:"0",max:"999999999999.99",step:"0.01",wide:true})]} prepare={(v,key)=>({amount:String(v.amount),expectedNet:data.summary.net,expectedEntryCount:data.items.length,requestKey:key})} onClose={onClose} onSaved={onSaved} submitLabel="Save total amount"><div className="rounded-xl bg-muted/40 p-4 text-sm"><p>Current total: <strong>{money(data.summary.net)}</strong></p><p className="mt-1">Paid: {money(data.summary.paid)}</p><p className="mt-3 text-muted-foreground">Enter the full bill amount. Charges added later will increase this total.</p></div></FormDialog>;
}
