"use client";
import {useRef,useState} from "react";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {BillingError,queryOptions} from "./BillingUI";
import {useDoctorPaymentReceiptQuery} from "./billingApi";
import {doctorReceiptHtml} from "./doctorReceiptHtml";

export function DoctorReceipt({doctorId,paymentId,onClose}){
  const query=useDoctorPaymentReceiptQuery({id:doctorId,paymentId},queryOptions),frame=useRef(null),[ready,setReady]=useState(false),[error,setError]=useState(null);
  return <Modal open title="Doctor payment receipt" size="lg" onClose={onClose}><BillingError error={query.error || error}/>
    {query.isFetching?<p role="status">Preparing receipt…</p>:query.currentData?.data&&<iframe ref={frame} title="Doctor payment receipt preview" className="h-[65vh] w-full rounded-md border bg-white" sandbox="allow-same-origin allow-modals" srcDoc={doctorReceiptHtml(query.currentData.data)} onLoad={()=>setReady(true)}/>}
    <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Back to history</Button><Button disabled={!ready || query.isFetching || query.isError} onClick={()=>{try{frame.current.contentWindow.focus();frame.current.contentWindow.print();}catch{setError("The print dialog could not be opened. Please try again.");}}}>Print / Save PDF</Button></div>
  </Modal>;
}
