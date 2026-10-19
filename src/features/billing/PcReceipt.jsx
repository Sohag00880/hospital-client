"use client";
import {useRef,useState} from "react";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {ErrorBox} from "@/features/inpatient/InpatientUI";
import {usePcReceiptQuery} from "./billingApi";
import {pcReceiptHtml} from "./pcReceiptHtml";
export function PcReceipt({referenceId,paymentId,onClose}){
 const query=usePcReceiptQuery({id:referenceId,paymentId},{refetchOnMountOrArgChange:true}),frame=useRef(null),[ready,setReady]=useState(false),[error,setError]=useState(null);
 return <Modal open title="PC payment receipt" size="lg" onClose={onClose}><ErrorBox error={query.error||error}/>{query.isFetching?<p role="status">Preparing receipt...</p>:query.currentData?.data&&<iframe ref={frame} title="PC payment receipt preview" className="h-[65vh] w-full rounded-md border bg-white" sandbox="allow-same-origin allow-modals" srcDoc={pcReceiptHtml(query.currentData.data)} onLoad={()=>setReady(true)}/>}<div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close receipt</Button><Button disabled={!ready||query.isFetching||query.isError} onClick={()=>{try{frame.current.contentWindow.focus();frame.current.contentWindow.print();}catch{setError("The print dialog could not be opened. Please try again.");}}}>Print / Save PDF</Button></div></Modal>;
}
