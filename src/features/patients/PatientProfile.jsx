"use client";
import {bangladeshDate,bangladeshTime,bangladeshTimestamp} from "@/lib/time";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UserRound, Phone, CalendarDays, GitMerge, Search } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useGetPatientQuery, useUpdatePatientMutation, useMutatePatientRecordMutation, useFindPatientDuplicatesMutation, useGetPatientTimelineQuery, useAddPatientNoteMutation, useLazyListPatientsQuery, usePreviewPatientMergeMutation, useMergePatientsMutation } from "./patientsApi";
import { demographicDefaults, contactDefaults, addressDefaults, identifierDefaults, demographicPayload, pickDefaults, DemographicFields, ContactFields, AddressFields, IdentifierFields, fullName, human, dateLabel, PatientError } from "./PatientForms";

const defaults = { demographics: demographicDefaults, contacts: contactDefaults, addresses: addressDefaults, identifiers: identifierDefaults };
const display = (value) => value === null || value === undefined || value === "" ? "Not recorded" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);
export function PatientProfile() {
  const { patientId } = useParams(), permissions = useAppSelector((state) => state.auth.permissions);
  const canView = permissions.includes("patient.view");
  const query = useGetPatientQuery(patientId, { skip: !canView });
  const [tab, setTab] = useState("overview"), [editor, setEditor] = useState(null), [remove, setRemove] = useState(null), [merge, setMerge] = useState(null), [error, setError] = useState(null), [notice, setNotice] = useState(""), [matches, setMatches] = useState(null);
  const [mutateRecord, mutating] = useMutatePatientRecordMutation(), [duplicates, checking] = useFindPatientDuplicatesMutation();
  if (!canView) return <PatientError error="You do not have permission to view this patient." />;
  if (query.isLoading || query.isFetching && !query.currentData) return <p role="status">Loading patient profile...</p>;
  if (query.isError) return <PatientError error={query.error} onReload={query.refetch} />;
  const data = query.currentData?.data;
  if (!data) return null;
  const patient = data.patient, editable = permissions.includes("patient.update") && patient.status === "active", canMerge = editable && permissions.includes("patient.merge");
  const openEditor = (collection, item = null, kind = null) => setEditor({ collection, itemId: item?.id, values: { ...pickDefaults(defaults[collection], item || (collection === "demographics" ? patient : {})), ...(kind ? { kind } : {}) }, revision: patient.revision });
  const findDuplicates = async () => {
    setError(null);
    try { const response = await duplicates({ firstName: patient.firstName, lastName: patient.lastName, dateOfBirth: patient.dateOfBirth, phone: patient.phone, email: patient.email, excludePatientId: patient.id, identifiers: data.identifiers.map(({ type, value, issuingCountry }) => ({ type, value, issuingCountry })) }).unwrap(); setMatches(response.data); }
    catch (failure) { setError(failure); }
  };
  const removeRecord = async () => {
    setError(null);
    try { await mutateRecord({ patientId, collection: remove.collection, itemId: remove.item.id, remove: true, expectedRevision: remove.revision }).unwrap(); setRemove(null); setNotice("Patient record removed."); }
    catch (failure) { setError(failure); setRemove(null); }
  };
  const recordActions = (collection, item) => editable && <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => openEditor(collection, item)}>Edit {collection === "contacts" ? "contact" : collection === "addresses" ? "address" : "identifier"}</Button><Button size="sm" variant="ghost" onClick={() => setRemove({ collection, item, revision: patient.revision })}>Remove</Button></div>;
  return <div className="space-y-5"><Link href="/patients" className="text-sm text-primary underline">Back to patients</Link><PageHeader title={fullName(patient)} description={`Patient profile · MRN ${patient.mrn}`} actions={<>{patient.status === "active" && <Button variant="outline" disabled={checking.isLoading} onClick={findDuplicates}><Search className="h-4 w-4" />Check duplicates</Button>}{canMerge && <Button variant="outline" onClick={() => setMerge({})}><GitMerge className="h-4 w-4" />Merge another profile</Button>}</>} />
    {data.canonicalPatient && <Card><p className="font-medium">This patient record has been merged and is read-only.</p><Link href={`/patients/${data.canonicalPatient.id}`} className="text-primary underline">Open {fullName(data.canonicalPatient)} · MRN {data.canonicalPatient.mrn}</Link></Card>}
    <Card><div className="flex flex-wrap items-center gap-5"><div className="rounded-xl bg-muted p-4"><UserRound className="h-8 w-8" /></div><div><p className="font-mono text-lg font-semibold">{patient.mrn}</p><p className="text-sm text-muted-foreground">{human(patient.status)} · Registered {dateLabel(patient.createdAt)}</p></div><p className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4" />{dateLabel(patient.dateOfBirth)}{patient.birthDateEstimated ? " (estimated)" : ""}</p><p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4" />{patient.phone || "No phone recorded"}</p></div>{data.aliases.length > 0 && <p className="mt-4 text-sm">Linked previous MRNs: {data.aliases.map((alias, index) => <span key={alias.id}>{index ? ", " : ""}<Link className="text-primary underline" href={`/patients/${alias.id}`}>{alias.mrn}</Link></span>)}</p>}</Card>
    <PatientError error={error} onReload={error ? query.refetch : undefined} />{notice && <p role="status" className="text-sm">{notice}</p>}
    {matches && <Card><div className="flex items-center justify-between"><h2 className="font-semibold">Duplicate review</h2><Button size="sm" variant="ghost" onClick={() => setMatches(null)}>Close duplicate review</Button></div>{!matches.length && <p className="mt-3 text-sm">No matching active profiles found.</p>}{matches.map((match) => <div key={match.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"><div><Link href={`/patients/${match.id}`} className="font-medium text-primary underline">{fullName(match)} · {match.mrn}</Link><p>{match.reasons.join("; ")}</p></div>{canMerge && <Button size="sm" onClick={() => setMerge({ sourcePatientId: match.id })}>Review merge</Button>}</div>)}</Card>}
    <nav aria-label="Patient sections" className="flex flex-wrap gap-2 border-b pb-3">{["overview", "contacts", "addresses", "identifiers", "timeline"].map((name) => <Button key={name} variant={tab === name ? "primary" : "outline"} aria-current={tab === name ? "page" : undefined} onClick={() => setTab(name)}>{name === "overview" ? "Demographics" : human(name)}</Button>)}</nav>
    {tab === "overview" && <Card><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">Demographics</h2>{editable && <Button size="sm" variant="outline" onClick={() => openEditor("demographics")}>Edit demographics</Button>}</div><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Object.keys(demographicDefaults).map((key) => <div key={key}><dt className="text-xs text-muted-foreground">{human(key)}</dt><dd className="mt-1 break-words text-sm">{["dateOfBirth", "deceasedDate"].includes(key) ? dateLabel(patient[key]) : display(patient[key])}</dd></div>)}</dl></Card>}
    {tab === "contacts" && <div className="grid gap-5 lg:grid-cols-2">{["emergency", "guardian"].map((kind) => <Card key={kind}><div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">{kind === "emergency" ? "Emergency contacts" : "Guardians"}</h2>{editable && <Button size="sm" variant="outline" onClick={() => openEditor("contacts", null, kind)}>Add {kind === "emergency" ? "emergency contact" : "guardian"}</Button>}</div>{!data.contacts.some((contact) => contact.kind === kind) && <p className="text-sm text-muted-foreground">No {kind === "emergency" ? "emergency contacts" : "guardians"} recorded.</p>}<div className="space-y-3">{data.contacts.filter((contact) => contact.kind === kind).map((contact) => <div key={contact.id} className="rounded-md border p-3"><p className="font-medium">{contact.name}{contact.isPrimary && <span className="ml-2 text-xs text-muted-foreground">Primary</span>}</p><p className="text-sm">{contact.relationship} · {contact.phone}</p>{[contact.alternatePhone, contact.email, contact.address, contact.notes].filter(Boolean).map((line, index) => <p key={index} className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{line}</p>)}{recordActions("contacts", contact)}</div>)}</div></Card>)}</div>}
    {tab === "addresses" && <Card><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Addresses</h2>{editable && <Button size="sm" variant="outline" onClick={() => openEditor("addresses")}>Add address</Button>}</div>{!data.addresses.length && <p className="text-sm text-muted-foreground">No addresses recorded.</p>}<div className="grid gap-4 sm:grid-cols-2">{data.addresses.map((address) => <div key={address.id} className="rounded-md border p-3"><p className="font-medium">{human(address.kind)}{address.isPrimary ? " · Primary" : ""}</p><p className="mt-1 text-sm">{[address.line1, address.line2, address.city, address.district, address.state, address.postalCode, address.country].filter(Boolean).join(", ")}</p>{recordActions("addresses", address)}</div>)}</div></Card>}
    {tab === "identifiers" && <Card><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Identity documents</h2>{editable && <Button size="sm" variant="outline" onClick={() => openEditor("identifiers")}>Add identifier</Button>}</div>{!data.identifiers.length && <p className="text-sm text-muted-foreground">No identity documents recorded.</p>}<div className="grid gap-4 sm:grid-cols-2">{data.identifiers.map((identifier) => <div key={identifier.id} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{human(identifier.type)}{identifier.issuingCountry ? ` · ${identifier.issuingCountry}` : ""}</p><p className="mt-1 break-all font-mono text-sm">{identifier.value}</p>{recordActions("identifiers", identifier)}</div>)}</div></Card>}
    {tab === "timeline" && <PatientTimeline patient={patient} editable={editable} onReload={query.refetch} />}
    {editor && <PatientEditor key={`${editor.collection}-${editor.itemId || "new"}`} patientId={patientId} editor={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setNotice("Patient profile saved."); }} onReload={() => { setEditor(null); query.refetch(); }} />}
    {merge && <MergeDialog patient={patient} initialSource={merge.sourcePatientId} onClose={() => setMerge(null)} onMerged={() => { setMerge(null); setMatches(null); setTab("overview"); setNotice("Patient profiles merged. Previous MRNs remain linked."); query.refetch(); }} />}
    <ConfirmDialog open={!!remove} onClose={() => setRemove(null)} onConfirm={removeRecord} loading={mutating.isLoading} title="Remove patient record?" description="This removes the item from the current profile and records the action in the timeline." confirmLabel="Remove record" />
  </div>;
}
function PatientEditor({ patientId, editor, onClose, onSaved, onReload }) {
  const [values, setValues] = useState(editor.values), [error, setError] = useState(null);
  const [update, updating] = useUpdatePatientMutation(), [mutate, mutating] = useMutatePatientRecordMutation();
  const busy = updating.isLoading || mutating.isLoading;
  const save = async (event) => {
    event.preventDefault(); setError(null);
    try {
      if (editor.collection === "demographics") await update({ id: patientId, expectedRevision: editor.revision, ...demographicPayload(values) }).unwrap();
      else await mutate({ patientId, collection: editor.collection, itemId: editor.itemId, values, expectedRevision: editor.revision }).unwrap();
      onSaved();
    } catch (failure) { setError(failure); }
  };
  const fields = { demographics: DemographicFields, contacts: ContactFields, addresses: AddressFields, identifiers: IdentifierFields }, Fields = fields[editor.collection];
  return <Modal open onClose={busy ? () => {} : onClose} title={editor.collection === "demographics" ? "Edit demographics" : `${editor.itemId ? "Edit" : "Add"} ${editor.collection === "contacts" ? "contact" : editor.collection === "addresses" ? "address" : "identifier"}`} size="lg"><form onSubmit={save} className="space-y-4"><div className="max-h-[65vh] space-y-4 overflow-y-auto p-1"><PatientError error={error} onReload={error?.status === 409 ? onReload : undefined} /><fieldset disabled={busy}><Fields values={values} onChange={(key, value) => setValues((previous) => ({ ...previous, [key]: value }))} /></fieldset></div><div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save patient record"}</Button></div></form></Modal>;
}
function PatientTimeline({ patient, editable, onReload }) {
  const [page, setPage] = useState(1), [note, setNote] = useState(""), [error, setError] = useState(null);
  const query = useGetPatientTimelineQuery({ id: patient.id, page, pageSize: 20 }), [addNote, adding] = useAddPatientNoteMutation();
  const save = async (event) => {
    event.preventDefault(); setError(null);
    try { await addNote({ id: patient.id, note, expectedRevision: patient.revision }).unwrap(); setNote(""); setPage(1); }
    catch (failure) { setError(failure); }
  };
  const data = query.currentData?.data;
  return <div className="space-y-4">{editable && <Card><h2 className="mb-3 font-semibold">Add timeline note</h2><form onSubmit={save} className="space-y-3"><label className="block space-y-1.5 text-sm"><span>Timeline note</span><Textarea value={note} required maxLength={2000} onChange={(event) => setNote(event.target.value)} /></label><PatientError error={error} onReload={error?.status === 409 ? onReload : undefined} /><Button type="submit" disabled={adding.isLoading || !note.trim()}>Add note</Button></form></Card>}<Card><h2 className="mb-4 font-semibold">Patient timeline</h2>{query.isError ? <PatientError error={query.error} onReload={query.refetch} /> : query.isLoading ? <p role="status">Loading timeline...</p> : <ol className="space-y-4">{data?.items.map((entry) => <li key={entry.id} className="border-l-2 border-primary/30 pl-4"><p className="text-sm font-medium">{entry.summary}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(entry.createdAt))} Bangladesh time · {entry.actorName || "System / former user"}</p>{entry.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.note}</p>}{entry.metadata.changes && <details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">View changes</summary><dl className="mt-2 space-y-2">{Object.entries(entry.metadata.changes).map(([key, change]) => <div key={key}><dt className="font-medium">{human(key)}</dt><dd className="break-words text-muted-foreground">{display(change.before)} → {display(change.after)}</dd></div>)}</dl></details>}</li>)}</ol>}<div className="mt-5 flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}>Previous events</Button><span className="text-sm">Page {page}</span><Button variant="outline" disabled={query.isFetching || !data || page * 20 >= data.total} onClick={() => setPage((value) => value + 1)}>Next events</Button></div></Card></div>;
}
function MergeDialog({ patient, initialSource, onClose, onMerged }) {
  const [search, setSearch] = useState(""), [review, setReview] = useState(null), [error, setError] = useState(null), [choices, setChoices] = useState({}), [confirmation, setConfirmation] = useState(""), [reason, setReason] = useState(""), [consent, setConsent] = useState(false);
  const [lookup, lookupState] = useLazyListPatientsQuery(), [preview, previewing] = usePreviewPatientMergeMutation(), [merge, merging] = useMergePatientsMutation();
  useEffect(() => {
    let active = true;
    if (initialSource) preview({ id: patient.id, sourcePatientId: initialSource }).unwrap().then((result) => { if (active) setReview(result.data); }).catch((failure) => { if (active) setError(failure); });
    return () => { active = false; };
  }, [initialSource, patient.id, preview]);
  const choose = async (sourcePatientId) => {
    setError(null); setChoices({}); setConfirmation(""); setConsent(false);
    try { setReview((await preview({ id: patient.id, sourcePatientId }).unwrap()).data); }
    catch (failure) { setError(failure); }
  };
  const commit = async (event) => {
    event.preventDefault(); setError(null);
    try { await merge({ id: patient.id, sourcePatientId: review.source.id, sourceRevision: review.source.revision, targetRevision: review.target.revision, sourceMrnConfirmation: confirmation, demographicChoices: choices, reason }).unwrap(); onMerged(); }
    catch (failure) { setError(failure); }
  };
  return <Modal open onClose={merging.isLoading ? () => {} : onClose} title="Review patient merge" size="lg"><div className="max-h-[75vh] space-y-4 overflow-y-auto p-1"><p className="text-sm">Keep <strong>{fullName(patient)} · {patient.mrn}</strong> as the main profile. Find the duplicate profile to merge into it.</p><form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); lookup({ search, page: 1, pageSize: 10, includeMerged: "false" }); }}><label className="flex-1 space-y-1.5 text-sm"><span>Find source patient</span><Input required minLength={2} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="MRN, name or phone" /></label><Button type="submit" disabled={lookupState.isFetching}>Find patient</Button></form>
    {lookupState.isError && <PatientError error={lookupState.error} />}{lookupState.data?.data.items.filter((row) => row.id !== patient.id).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"><span>{fullName(row)} · {row.mrn} · {dateLabel(row.dateOfBirth)}</span><Button size="sm" variant="outline" disabled={previewing.isLoading || merging.isLoading} onClick={() => choose(row.id)}>Compare {row.mrn}</Button></div>)}
    {previewing.isLoading && <p role="status">Comparing patient profiles...</p>}<PatientError error={error} />{review && <form onSubmit={commit} className="space-y-4"><div className="rounded-md border p-3 text-sm"><p>Source: <strong>{fullName(review.source)} · {review.source.mrn}</strong></p><p>Target: <strong>{fullName(review.target)} · {review.target.mrn}</strong></p><p className="mt-2 text-muted-foreground">The source record becomes read-only and its MRN stays linked. Active contacts, addresses and identifiers move to the target. Both timelines remain accessible. This merge cannot be undone.</p></div>
      <fieldset disabled={merging.isLoading} className="space-y-4"><h3 className="text-sm font-semibold">Resolve demographic differences</h3>{!review.conflicts.length && <p className="text-sm">Demographics match.</p>}{review.conflicts.map((difference) => <div key={difference.key} className="rounded-md border p-3 text-sm"><p className="font-medium">{human(difference.key)}</p><p className="break-words text-muted-foreground">Source: {display(difference.source)}</p><p className="break-words text-muted-foreground">Target: {display(difference.target)}</p><label className="mt-2 block space-y-1"><span>Keep {human(difference.key)}</span><Select value={choices[difference.key] || "target"} onChange={(event) => setChoices((previous) => ({ ...previous, [difference.key]: event.target.value }))}><option value="target">Target value</option><option value="source">Source value</option></Select></label></div>)}
      <dl className="grid grid-cols-3 gap-2 text-xs">{Object.entries(review.counts).map(([key, count]) => <div key={key}><dt>{human(key)}</dt><dd>{count.target} + {count.source} records{count.target + count.source > count.limit ? " — exceeds limit" : ""}</dd></div>)}</dl>
      <label className="block space-y-1.5 text-sm"><span>Reason for merge</span><Textarea required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><label className="block space-y-1.5 text-sm"><span>Type source MRN {review.source.mrn} to confirm</span><Input required pattern="[0-9]{6}" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} />I reviewed both profiles and the selected values</label><Button type="submit" variant="destructive" disabled={merging.isLoading || !consent || confirmation !== review.source.mrn || Object.values(review.counts).some((count) => count.source + count.target > count.limit)}>{merging.isLoading ? "Merging..." : "Confirm patient merge"}</Button></fieldset>
    </form>}</div></Modal>;
}
