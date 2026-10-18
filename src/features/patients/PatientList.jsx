"use client";
import {bangladeshDate,bangladeshTime,bangladeshTimestamp} from "@/lib/time";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserPlus, Search, ArrowLeft, ArrowRight } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { useListPatientsQuery } from "./patientsApi";
import { dateLabel, fullName, human, PatientError } from "./PatientForms";

export function PatientList() {
  const permissions = useAppSelector((state) => state.auth.permissions), canView = permissions.includes("patient.view");
  const [search, setSearch] = useState(""), [debounced, setDebounced] = useState(""), [sex, setSex] = useState(""), [appointmentDate, setAppointmentDate] = useState(null), [page, setPage] = useState(1), [includeMerged, setIncludeMerged] = useState(false);
  useEffect(() => { setAppointmentDate(bangladeshDate()); }, []);
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const query = useListPatientsQuery({ page, pageSize: 20, search: debounced, sex: sex || undefined, appointmentDate: appointmentDate || undefined, includeMerged: String(includeMerged) }, { skip: !canView || appointmentDate === null });
  if (!canView) return <PatientError error="You do not have permission to view patients." />;
  const data = query.currentData?.data;
  return <div className="space-y-5"><PageHeader title="Patients" actions={permissions.includes("patient.create") && <Link href="/patients/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><UserPlus className="h-4 w-4" />Register patient</Link>} />
    <Card><div className="flex items-center gap-3"><div className="rounded-lg bg-muted p-3"><Users className="h-5 w-5" /></div><div><p className="text-2xl font-semibold">{data?.total ?? "—"}</p><p className="text-sm text-muted-foreground">Patients matching your appointment date and search filters</p></div></div></Card>
    <Card><div className="flex flex-wrap items-end gap-4"><label className="min-w-48 flex-1 space-y-1.5 text-sm"><span className="flex items-center gap-2"><Search className="h-4 w-4" />Search patients</span><Input placeholder="Name, MRN, phone, email or identifier" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="space-y-1.5 text-sm"><span>Sex</span><Select value={sex} onChange={(event) => { setSex(event.target.value); setPage(1); }}><option value="">All</option>{["female", "male", "other", "unknown"].map((value) => <option key={value} value={value}>{human(value)}</option>)}</Select></label><label className="space-y-1.5 text-sm"><span>Appointment date (Bangladesh time)</span><Input type="date" className="cursor-pointer" onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch { /* The native calendar icon remains available. */ } }} value={appointmentDate ?? ""} onChange={(event) => { setAppointmentDate(event.target.value); setPage(1); }} /></label>{appointmentDate && <Button variant="outline" onClick={() => { setAppointmentDate(""); setPage(1); }}>Clear date</Button>}<label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" checked={includeMerged} onChange={(event) => { setIncludeMerged(event.target.checked); setPage(1); }} />Include merged records</label></div></Card>
    {query.isError ? <PatientError error={query.error} onReload={query.refetch} /> : <div aria-busy={query.isFetching}><DataTable loading={query.isFetching && !data} rows={data?.items || []} rowKey={(row) => row.id} emptyTitle="No patients found" emptyDescription="Try another search or register a patient." columns={[
      { key: "patient", header: "Patient", accessor: (row) => <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/patients/${row.id}`}>{fullName(row)}{row.preferredName && <span className="block text-xs text-muted-foreground">{row.preferredName}</span>}</Link> },
      { key: "mrn", header: "MRN", accessor: (row) => <span className="font-mono">{row.mrn}</span> },
      { key: "dob", header: "Birth date", accessor: (row) => dateLabel(row.dateOfBirth) },
      { key: "sex", header: "Sex", accessor: (row) => human(row.sex) },
      { key: "phone", header: "Phone", accessor: (row) => row.phone || "Not recorded" },
      { key: "status", header: "Status", accessor: (row) => human(row.status) },
    ]} /></div>}
    <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Page {page}</span><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Previous patients" title="Previous patients" disabled={page === 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /></Button><Button variant="outline" size="icon" aria-label="Next patients" title="Next patients" disabled={query.isFetching || !data || page * 20 >= data.total} onClick={() => setPage((value) => value + 1)}><ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div></div>
  </div>;
}
