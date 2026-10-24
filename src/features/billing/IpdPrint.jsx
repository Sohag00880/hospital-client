"use client";
import {createPortal} from "react-dom";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {bangladeshTimestamp} from "@/lib/time";
export const money=value=>Number(value||0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2});
export function IpdPrint({data,entry,onClose}){
 const source=!entry&&data.account.finalSnapshot?data.account.finalSnapshot:data;
 const {admission:a,summary:s}=source;
 const reversed=new Set(source.entries.filter(row=>row.kind==="void").map(row=>row.replacesId));
 const entries=entry?[entry]:source.entries.filter(row=>row.kind!=="void"&&!reversed.has(row.id));
 const content=  <div className="space-y-4 text-sm"><h2 className="text-xl font-bold">{a.hospitalName}</h2><h3 className="font-semibold">{entry?"IPD Receipt":data.account.finalizedAt?"Final IPD Bill":"IPD Bill Statement"}</h3>
   <p>{a.patientName} · MRN {a.mrn}<br/>{a.admissionNumber} · {a.doctorName}</p>
   {entry&&<p className="break-all">Receipt: IPD-{entry.id}<br/>{bangladeshTimestamp(entry.createdAt)} · {entry.author}</p>}
   <table className="w-full text-left"><thead><tr className="border-b"><th className="py-2">Description</th><th>Quantity × rate</th><th className="text-right">BDT</th></tr></thead><tbody>{entries.map(e=><tr key={e.id} className="border-b"><td className="py-2">{e.name||e.kind.replaceAll("_"," ")}<p className="text-xs">{e.description}{e.method?` · ${e.method}`:""}</p></td><td>{e.quantity?`${e.quantity} × ${money(e.unitPrice)}`:"—"}</td><td className="text-right">{money(e.amount)}</td></tr>)}</tbody></table>
   {!entry&&<div className="ml-auto max-w-xs space-y-1">{[["Gross",s.gross],["Discount",s.discount],["Net bill",s.net],["Paid / advance applied",s.paid],["Due",s.due],["Unused advance",s.advance],["Refundable credit",s.credit]].map(([title,value])=><p key={title} className="flex justify-between gap-8"><span>{title}</span><strong>{money(value)}</strong></p>)}</div>}
   <p className="text-xs">All amounts in BDT. Times shown in Asia/Dhaka. Corrections remain available in the bill history.</p>
  </div>;
 return <><Modal open title={entry?"Receipt":"Patient bill"} size="lg" onClose={onClose}>
  <style>{`@media print{body> *:not(#ipd-print-root){display:none!important}body>#ipd-print-root{display:block!important;background:white;color:black;padding:20px}#ipd-print-root tr{break-inside:avoid}}`}</style>
  {content}<div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={()=>window.print()}>Print / Save PDF</Button></div>
 </Modal>{createPortal(<div id="ipd-print-root" className="hidden">{content}</div>,document.body)}</>;
}
