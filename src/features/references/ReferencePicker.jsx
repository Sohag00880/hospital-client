"use client";
import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useBookingReferencesQuery } from "./referencesApi";

export function ReferencePicker({ value, onChange, onPending, disabled }) {
  const id = useId(), [search, setSearch] = useState(""), [debounced, setDebounced] = useState("");
  useEffect(() => { const timer = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const results = useBookingReferencesQuery({ search: debounced, pageSize: 20 }, { skip: !debounced });
  useEffect(() => {
    if (!search.trim() || debounced !== search.trim()) return;
    const code = search.trim().toUpperCase();
    const exact = results.currentData?.data?.items?.find(row => row.code.toUpperCase() === code);
    if (exact) { onChange(exact); onPending(false); setSearch(""); }
  }, [search, debounced, results.currentData, onChange, onPending]);
  const choose = row => { onChange(row); onPending(false); setSearch(""); };
  return <div className="space-y-2 text-sm">
    <label htmlFor={id} className="block font-medium">Reference (ID or name)</label>
    <Input id={id} disabled={disabled} autoComplete="off" placeholder="Search reference ID or name" value={search} onChange={e => { setSearch(e.target.value); onChange(null); onPending(!!e.target.value.trim()); }} />
    {value && <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3"><p><span className="font-mono font-semibold">{value.code}</span> - {value.name}{value.isDefault && <span className="ml-2 text-xs text-muted-foreground">Default</span>}</p><Button size="sm" variant="outline" disabled={disabled} onClick={() => choose(null)}>Clear reference</Button></div>}
    {search.trim() && <div className="max-h-48 overflow-y-auto rounded-md border p-2">{results.isFetching || debounced !== search.trim() ? <p role="status">Searching references...</p> : results.isError ? <p role="alert" className="text-destructive">References could not be loaded. Enter the search again.</p> : results.currentData?.data?.items?.length ? <ul aria-label="Reference search results">{results.currentData.data.items.map(row => <li key={row.id}><button type="button" disabled={disabled} className="w-full rounded p-2 text-left hover:bg-muted focus-visible:outline focus-visible:outline-primary" onClick={() => choose(row)}><span className="font-mono">{row.code}</span> - {row.name}<span className="block text-xs text-muted-foreground">{row.designation}</span></button></li>)}</ul> : <p>No matching reference.</p>}<Button size="sm" variant="outline" disabled={disabled} className="mt-2" onClick={() => choose(null)}>No reference</Button></div>}
    {!value && !search && <p className="text-xs text-muted-foreground">No reference selected.</p>}
  </div>;
}
