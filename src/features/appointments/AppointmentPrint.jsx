"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppointmentPrintQuery } from "./appointmentsApi";
import { appointmentPrintDocument } from "./appointmentPrintDocument";

export function AppointmentPrint({ id, onClose }) {
  const query = useAppointmentPrintQuery(id, {refetchOnMountOrArgChange:true});
  const frame = useRef(null), printed = useRef(false), mounted = useRef(true), [ready,setReady] = useState(false), [error,setError] = useState("");
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const invokePrint = useCallback(()=>{
    if(!frame.current?.contentWindow)return;
    try { frame.current.contentWindow.focus(); frame.current.contentWindow.print(); }
    catch { setError("The print dialog could not be opened. Use Print / Save PDF to try again."); }
  },[]);
  const loaded = async () => {
    const doc=frame.current?.contentDocument;
    if(!doc)return;
    await Promise.all(Array.from(doc.images).map(img=>new Promise(resolve=>{
      const done=()=>{if(!img.naturalWidth)img.classList.add("failed");resolve();};
      if(img.complete){done();return;}
      img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});
      setTimeout(()=>{if(!img.complete)img.classList.add("failed");resolve();},4000);
    })));
    await doc.fonts?.ready;
    if(!mounted.current || frame.current?.contentDocument!==doc)return;
    const sheet=doc.querySelector(".sheet"), printableHeight=270*96/25.4;
    if(sheet && sheet.scrollHeight>printableHeight)sheet.style.zoom=String(printableHeight/sheet.scrollHeight);
    setReady(true);
    if(!printed.current){printed.current=true;invokePrint();}
  };
  const data=query.currentData?.data;
  return <Modal open title="Appointment print preview" size="lg" onClose={onClose}>
    <p className="mb-3 text-sm text-muted-foreground">A4 portrait: Hospital Copy and Patient Copy on one page, separated by a dotted cut line.</p>
    {query.isFetching && <p role="status">Preparing print...</p>}
    {(query.isError || error) && <p role="alert" className="mb-3 text-sm text-destructive">{error || query.error?.data?.error?.message || "Print details could not be loaded. Close and reopen to try again."}</p>}
    {data && !query.isFetching && !query.isError && <iframe ref={frame} title="Appointment print document" sandbox="allow-same-origin allow-modals" srcDoc={appointmentPrintDocument(data)} onLoad={loaded} className="h-[60vh] w-full rounded border bg-white" />}
    <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button className="bg-teal-700 text-white hover:bg-teal-800" disabled={!ready || query.isFetching || query.isError} onClick={() => { printed.current=false; setReady(false); setError(""); query.refetch(); }}><Printer className="h-4 w-4" />Print / Save PDF</Button></div>
  </Modal>;
}
