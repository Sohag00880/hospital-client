"use client";
import {useRef,useState} from "react";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {useLabDocumentQuery,labQueryOptions} from "./laboratoryApi";
import {LabError} from "./LabUI";
import {labDocumentHtml} from "./labDocumentHtml";
export function LabDocument({id,sampleId,kind,closeLabel="Back to order",onClose}){
  const query=useLabDocumentQuery({id,sampleId,kind},labQueryOptions),frame=useRef(null),printRequested=useRef(false),[generation,setGeneration]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(null);
  const print=()=>{try{frame.current.contentWindow.focus();frame.current.contentWindow.print();}catch{setError("The print dialog could not be opened. Please try again.");}};
  return <Modal open title={sampleId?"Sample barcode":kind==="order"?"Laboratory order slip":"Final laboratory report"} size="lg" onClose={onClose}><LabError error={query.error || error}/>{query.isFetching?<p role="status">Preparing document...</p>:!query.isError&&query.currentData?.data&&<iframe key={generation} ref={frame} title="Laboratory print document" className="h-[60vh] w-full rounded border bg-white" sandbox="allow-same-origin allow-modals" srcDoc={labDocumentHtml(query.currentData.data)} onLoad={()=>{setReady(true);if(printRequested.current){printRequested.current=false;print();}}}/>}
    <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>{closeLabel}</Button><Button disabled={!ready || query.isFetching || query.isError} onClick={async()=>{
      setError(null);
      if(sampleId || kind==="order")return print();
      setReady(false);
      const fresh=await query.refetch();
      if(fresh.error)return;
      printRequested.current=true;setGeneration(value=>value+1);
    }}>Print / Save PDF</Button></div></Modal>;
}
