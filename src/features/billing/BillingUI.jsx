"use client";
import {useId,useRef,useState} from "react";
import {Card} from "@/components/ui/Card";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {Button} from "@/components/ui/Button";
import {Modal} from "@/components/ui/Modal";
import {bangladeshTimestamp} from "@/lib/time";
import {useAppSelector} from "@/store/hooks";
import {useRecordBillingPaymentMutation,useSettleLabBillMutation} from "./billingApi";

export const money=value=>Number(value ?? 0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2});
export const timestamp=value=>value?bangladeshTimestamp(value):"-";
export const queryOptions={refetchOnMountOrArgChange:true,refetchOnFocus:true,refetchOnReconnect:true};
export function BillingError({error}){return error?<p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{typeof error==="string"?error:error.data?.error?.message || "Unable to load billing data. Please retry."}</p>:null;}
export function Field({label,children,...props}){const id=useId();return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children?children(id):<Input id={id} {...props}/>}</div>;}
export function Summary({values}){return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{values.map(([label,value])=><Card key={label}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-2 text-xl font-semibold ${label.includes("Due") || label==="Payable"?"text-amber-700":""}`}>{value==null?"—":money(value)}</p></Card>)}</div>;}
export function Pagination({data,page,setPage,busy}){return <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{data?.total ?? 0} records · Page {page}</p><div className="flex gap-2"><Button variant="outline" disabled={page===1 || busy} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="outline" disabled={!data || page*data.pageSize>=data.total || busy} onClick={()=>setPage(page+1)}>Next</Button></div></div>;}
export function PaymentForm({kind,account,onClose,onSaved}){
  const doctor=kind==="doctors",balance=doctor?account.balance:account.due;
  const canDiscount=useAppSelector(s=>s.auth.permissions.includes("billing.approve")),choiceId=useId();
  const [amount,setAmount]=useState(balance),[method,setMethod]=useState("cash"),[settle,setSettle]=useState(false),[reason,setReason]=useState("Management concession"),[error,setError]=useState(null),requestKey=useRef(null);
  const [save,state]=useRecordBillingPaymentMutation(),[settleBill,settlementState]=useSettleLabBillMutation();
  const busy=state.isLoading || settlementState.isLoading;
  const received=Number(amount),remaining=Math.max(0,Math.round(Number(balance)*100)-Math.round(received*100))/100;
  const discounting=!doctor&&canDiscount&&settle&&remaining>0;
  const valid=amount!==""&&Number.isFinite(received)&&received>=0&&received<=Number(balance)&&(received>0 || discounting);
  const change=(setter,value)=>{setter(value);requestKey.current=null;};
  return <Modal open title={doctor?"Pay doctor bill":"Collect lab payment"} size={doctor?"md":"lg"} onClose={busy?()=>{}:onClose}><form className="space-y-4" onSubmit={async event=>{
    event.preventDefault();setError(null);
    if(!valid)return;
    if(!requestKey.current)requestKey.current=crypto.randomUUID();
    try{
      const body={id:account.id,requestKey:requestKey.current,amount,method};
      const response=discounting?await settleBill({...body,expectedDue:balance,reason}).unwrap():await save({...body,kind}).unwrap();
      onSaved(response.data);
    }catch(e){setError(e);}
  }}><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm"><div><p className="font-semibold">{doctor?account.doctorName:account.patientName}</p>{!doctor&&<p className="mt-1 text-xs text-muted-foreground">{account.orderNumber} | MRN {account.mrn}</p>}</div><div className="text-right"><p className="text-xs text-muted-foreground">{doctor?"Current payable":"Current due"}</p><p className="text-xl font-semibold">{money(balance)}</p></div></div>
    <BillingError error={error}/><fieldset disabled={busy} className="max-h-[52vh] min-w-0 space-y-4 overflow-y-auto pr-1">
      <Field label="Payment amount" type="number" min={!doctor&&canDiscount?"0":"0.01"} max={balance} step="0.01" required value={amount} onChange={e=>change(setAmount,e.target.value)}/>
      {!doctor&&amount!==""&&Number.isFinite(received)&&received>=0&&remaining>0&&canDiscount&&<fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">What happens to the remaining {money(remaining)}?</legend><div className="grid gap-3 sm:grid-cols-2">
        {[[true,"Discount & settle bill","Waive the remaining amount. This order will have no due."],[false,"Keep remaining as due","Accept this payment and collect the balance later."]].map(([value,label,description])=><label key={label} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${settle===value?"border-primary bg-primary/5":"border-border hover:bg-muted/50"}`}><input type="radio" className="mt-1" name={choiceId} checked={settle===value} onChange={()=>change(setSettle,value)}/><span><b>{label}</b><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span></label>)}
      </div></fieldset>}
      {!doctor&&amount!==""&&Number.isFinite(received)&&received>=0&&<div aria-live="polite" className={`grid grid-cols-3 gap-3 rounded-lg border p-4 ${discounting?"border-emerald-200 bg-emerald-50 text-emerald-950":"bg-muted/40"}`}>{[["Receiving now",received],["Discount",discounting?remaining:0],["Due after payment",discounting?0:remaining]].map(([label,value])=><div key={label}><p className="text-xs opacity-75">{label}</p><p className="mt-1 text-lg font-semibold">{money(value)}</p></div>)}</div>}
      {discounting&&<Field label="Discount reason">{id=><Select id={id} value={reason} onChange={e=>change(setReason,e.target.value)}><option>Management concession</option><option>Financial hardship</option><option>Staff / family concession</option><option>Promotional discount</option></Select>}</Field>}
      <Field label="Payment method">{id=><Select id={id} value={method} onChange={e=>change(setMethod,e.target.value)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile">Mobile banking</option></Select>}</Field>
      {discounting&&<p className="text-xs text-muted-foreground">The received payment and discount will be recorded separately. The remaining amount will be waived permanently for this order.</p>}
    </fieldset><div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || !valid}>{busy?"Saving?":discounting?"Receive & settle bill":"Record payment"}</Button></div>
  </form></Modal>;
}
export const paymentColumns=[
  {key:"date",header:"Paid at",accessor:row=>timestamp(row.createdAt)},
  {key:"amount",header:"Amount",align:"right",accessor:row=>money(row.amount)},
  {key:"method",header:"Method",accessor:row=>({cash:"Cash",bank:"Bank",mobile:"Mobile banking"}[row.method] || row.method)},
  {key:"actor",header:"Recorded by",accessor:row=>row.createdByName},
];
