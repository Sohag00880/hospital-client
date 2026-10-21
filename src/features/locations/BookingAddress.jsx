"use client";
import {useEffect,useId,useRef,useState} from "react";
import {Check,ChevronDown,MapPin,Search} from "lucide-react";
import {Input} from "@/components/ui/Input";
import {Button} from "@/components/ui/Button";
import {useLocationDistrictsQuery,useLocationUpazilasQuery,useLocationUnionsQuery} from "./locationsApi";

function LocationSelect({label,value,onChange,query,disabled}){
 const id=useId(),root=useRef(null),trigger=useRef(null),[open,setOpen]=useState(false),[search,setSearch]=useState(""),[active,setActive]=useState(0);
 const rows=query.currentData?.data || [],selected=rows.find(row=>row.id===value),text=row=>`${row.name} — ${row.bnName}`;
 const matching=rows.filter(row=>`${row.name} ${row.bnName}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 const show=()=>{setSearch("");setActive(0);setOpen(true);};
 const choose=row=>{onChange(row.id);setOpen(false);trigger.current?.focus();};
 useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);},[open]);
 return <div ref={root} className="relative space-y-1.5" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <label htmlFor={id} className="block text-sm font-medium">{label}</label>
  <button ref={trigger} id={id} type="button" role="combobox" aria-required="true" aria-expanded={open&&!disabled} aria-controls={`${id}-options`} disabled={disabled} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={()=>open?setOpen(false):show()} onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();show();}if(e.key==="Escape")setOpen(false);}}><span className={selected?"":"text-muted-foreground"}>{selected?text(selected):`Select ${label.toLowerCase()}`}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground"/></button>
  {open&&!disabled&&<div className="absolute z-30 mt-1 w-full min-w-56 rounded-lg border border-border bg-card p-2 shadow-lg"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><Input autoFocus role="searchbox" aria-label={`Search ${label.toLowerCase()}`} aria-controls={`${id}-options`} aria-activedescendant={matching[active]?`${id}-${matching[active].id}`:undefined} placeholder="Search in English or Bangla" className="pl-8" value={search} onChange={e=>{setSearch(e.target.value);setActive(0);}} onKeyDown={e=>{
   if(e.key==="ArrowDown"){e.preventDefault();setActive(i=>Math.min(i+1,matching.length-1));}if(e.key==="ArrowUp"){e.preventDefault();setActive(i=>Math.max(0,i-1));}if(e.key==="Enter"){e.preventDefault();if(matching[active])choose(matching[active]);}if(e.key==="Escape"){e.preventDefault();setOpen(false);trigger.current?.focus();}
  }}/></div>
   {query.isFetching?<p role="status" className="p-3 text-sm text-muted-foreground">Loading {label.toLowerCase()}s…</p>:query.isError?<div className="p-3"><p role="alert" className="text-sm text-destructive">Could not load {label.toLowerCase()}s.</p><Button size="sm" variant="outline" className="mt-2" onClick={()=>query.refetch()}>Retry</Button></div>:<ul id={`${id}-options`} role="listbox" aria-label={`${label} options`} className="mt-2 max-h-52 overflow-y-auto">{matching.map((row,index)=><li role="presentation" key={row.id}><button id={`${id}-${row.id}`} type="button" role="option" aria-selected={row.id===value} className={`flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm ${active===index?"bg-muted":"hover:bg-muted"}`} onMouseEnter={()=>setActive(index)} onClick={()=>choose(row)}><span>{text(row)}</span>{row.id===value&&<Check className="h-4 w-4 shrink-0 text-primary"/>}</button></li>)}{!matching.length&&<li role="presentation" className="p-3 text-sm text-muted-foreground">No matching {label.toLowerCase()}.</li>}</ul>}
  </div>}
 </div>;
}
export function BookingAddress({value,onChange,disabled}){
 const districts=useLocationDistrictsQuery(),upazilas=useLocationUpazilasQuery(value.districtId,{skip:!value.districtId}),unions=useLocationUnionsQuery(value.upazilaId,{skip:!value.upazilaId});
 const villageId=useId();
 return <section aria-label="Patient address" className="space-y-4 rounded-xl border border-border p-4 sm:p-5"><h2 className="flex items-center gap-2 text-base font-semibold"><MapPin className="h-4 w-4 text-primary"/>Address</h2>
  <div className="grid gap-4 md:grid-cols-3"><LocationSelect label="District" query={districts} value={value.districtId} disabled={disabled} onChange={districtId=>onChange({...value,districtId,upazilaId:"",unionId:""})}/><LocationSelect key={`upazila-${value.districtId}`} label="Upazila" query={upazilas} value={value.upazilaId} disabled={disabled||!value.districtId} onChange={upazilaId=>onChange({...value,upazilaId,unionId:""})}/><LocationSelect key={`union-${value.upazilaId}`} label="Union" query={unions} value={value.unionId} disabled={disabled||!value.upazilaId} onChange={unionId=>onChange({...value,unionId})}/></div>
  <div className="space-y-1.5"><label htmlFor={villageId} className="block text-sm font-medium">Village <span className="font-normal text-muted-foreground">(optional)</span></label><Input id={villageId} maxLength={150} value={value.village} disabled={disabled} placeholder="Enter village name" onChange={e=>onChange({...value,village:e.target.value})}/></div>
 </section>;
}
