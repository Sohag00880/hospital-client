"use client";
import {useState} from "react";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Button} from "@/components/ui/Button";
import {Select} from "@/components/ui/Select";
import {Input} from "@/components/ui/Input";
import {Card} from "@/components/ui/Card";
import {Modal} from "@/components/ui/Modal";
import {DataTable} from "@/components/ui/DataTable";
import {useLabTestsQuery,useSaveLabTestMutation,labQueryOptions} from "./laboratoryApi";
import {LabError,LabField} from "./LabUI";
export function LabCatalog(){
  const permissions=useAppSelector(s=>s.auth.permissions),allowed=permissions.includes("lab.view"),canEdit=permissions.includes("lab.update");
  const query=useLabTestsQuery(undefined,{...labQueryOptions,skip:!allowed}),[dialog,setDialog]=useState(null);
  if(!allowed)return <LabError error="You do not have permission to view Laboratory."/>;
  return <div className="space-y-5"><PageHeader title="Laboratory Test Catalog" actions={canEdit&&<Button onClick={()=>setDialog({})}>Add test</Button>}/>
    <LabError error={query.error}/><DataTable rows={query.currentData?.data || []} loading={query.isFetching} rowKey={row=>row.id} emptyTitle="No laboratory tests configured" columns={[
      {key:"code",header:"Code",accessor:row=>row.code},{key:"name",header:"Test",accessor:row=>row.name},{key:"sample",header:"Specimen",accessor:row=>row.specimenType},
      {key:"amount",header:"Amount (BDT)",accessor:row=>Number(row.amount ?? 0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})},{key:"parameters",header:"Parameters",accessor:row=>row.parameters.length},{key:"active",header:"Status",accessor:row=>row.active?"Active":"Inactive"},
      ...(canEdit?[{key:"actions",header:"Actions",accessor:row=><Button size="sm" variant="outline" onClick={()=>setDialog(row)}>Edit</Button>}]:[]),
    ]}/>{dialog&&<TestForm row={dialog} onClose={()=>setDialog(null)}/>}</div>;
}
function TestForm({row,onClose}){
  const fresh=()=>({id:crypto.randomUUID(),label:"",type:"numeric",unit:"",referenceRange:""});
  const [values,setValues]=useState(()=>({code:row.code || "",name:row.name || "",amount:row.amount ?? "0.00",specimenType:row.specimenType || "",active:row.active ?? true,parameters:row.parameters || [fresh()]}));
  const [save,state]=useSaveLabTestMutation(),[error,setError]=useState(null);
  const change=(key,value)=>setValues(old=>({...old,[key]:value}));
  const parameter=(index,key,value)=>change("parameters",values.parameters.map((item,i)=>i===index?{...item,[key]:value}:item));
  return <Modal open title={row.id?"Edit laboratory test":"Add laboratory test"} size="lg" onClose={state.isLoading?()=>{}:onClose}><form className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" onSubmit={async event=>{event.preventDefault();setError(null);try{await save({...values,...(row.id?{id:row.id,expectedRevision:row.revision}:{})}).unwrap();onClose();}catch(e){setError(e);}}}>
    <LabError error={error}/><div className="grid gap-4 sm:grid-cols-2"><LabField label="Test code" required maxLength={30} pattern="[A-Za-z0-9_-]+" value={values.code} onChange={event=>change("code",event.target.value)}/><LabField label="Test name" required maxLength={150} value={values.name} onChange={event=>change("name",event.target.value)}/><LabField label="Specimen type" required maxLength={80} placeholder="e.g. Blood" value={values.specimenType} onChange={event=>change("specimenType",event.target.value)}/><LabField label="Test amount (BDT)" type="number" required min="0" max="9999999.99" step="0.01" value={values.amount} onChange={event=>change("amount",event.target.value)}/><LabField label="Status">{id=><Select id={id} value={values.active?"active":"inactive"} onChange={event=>change("active",event.target.value==="active")}><option value="active">Active</option><option value="inactive">Inactive</option></Select>}</LabField></div>
    <h3 className="font-semibold">Result parameters</h3>{values.parameters.map((item,index)=><Card key={item.id} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><LabField label={`Parameter ${index+1} name`} required maxLength={120} value={item.label} onChange={event=>parameter(index,"label",event.target.value)}/><LabField label={`Parameter ${index+1} type`}>{id=><Select id={id} value={item.type} onChange={event=>parameter(index,"type",event.target.value)}><option value="numeric">Numeric</option><option value="text">Text</option></Select>}</LabField><LabField label={`Parameter ${index+1} unit`} maxLength={30} value={item.unit} onChange={event=>parameter(index,"unit",event.target.value)}/><LabField label={`Parameter ${index+1} reference range`} maxLength={150} value={item.referenceRange} onChange={event=>parameter(index,"referenceRange",event.target.value)}/></div><Button size="sm" variant="outline" disabled={values.parameters.length===1} onClick={()=>change("parameters",values.parameters.filter((_,i)=>i!==index))}>Remove parameter</Button></Card>)}
    <Button variant="outline" disabled={values.parameters.length>=30} onClick={()=>change("parameters",[...values.parameters,fresh()])}>Add parameter</Button><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={state.isLoading}>Cancel</Button><Button type="submit" disabled={state.isLoading}>{state.isLoading?"Saving...":"Save test"}</Button></div>
  </form></Modal>;
}
