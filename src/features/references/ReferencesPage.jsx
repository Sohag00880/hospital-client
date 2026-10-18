"use client";
import { useEffect, useId, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { useReferencesQuery, useCreateReferenceMutation, useUpdateReferenceMutation, useDeleteReferenceMutation, useSetDefaultReferenceMutation } from "./referencesApi";

import { referenceError as message } from "./referenceError";
function Field({ name, children }) { const id = useId(); return <div className="space-y-1.5 text-sm"><label htmlFor={id} className="block font-medium">{name}</label>{children(id)}</div>; }

export function ReferencesPage() {
  const permissions = useAppSelector(state => state.auth.permissions), canView = permissions.includes("user.view"), canCreate = permissions.includes("user.create"), canEdit = permissions.includes("user.update");
  const [search, setSearch] = useState(""), [debounced, setDebounced] = useState(""), [page, setPage] = useState(1), [editor, setEditor] = useState(null), [remove, setRemove] = useState(null), [error, setError] = useState(null), [notice, setNotice] = useState("");
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const query = useReferencesQuery({ search: debounced, page, pageSize: 20 }, { skip: !canView, refetchOnMountOrArgChange: true });
  const [setDefault, setting] = useSetDefaultReferenceMutation(), [deleteReference, deleting] = useDeleteReferenceMutation();
  if (!canView) return <p role="alert">You do not have permission to view references.</p>;
  const data = query.currentData?.data, rows = data?.items || [], defaultReference = data?.defaultReference;
  const options = defaultReference && !rows.some(row => row.id === defaultReference.id) ? [defaultReference, ...rows] : rows;
  const chooseDefault = async id => { setError(null); try { await setDefault({ referenceId: id || null }).unwrap(); setNotice(id ? "Default reference saved. It will be selected for new appointments." : "Default reference cleared."); } catch (e) { setError(e); } };
  return <div className="space-y-5"><PageHeader title="References" description="Manage referral contacts and the default for appointment bookings." actions={canCreate && <Button onClick={() => setEditor({})}><Plus className="h-4 w-4" />Add reference</Button>} />
    {notice && <p role="status" className="rounded-md bg-muted p-3 text-sm">{notice}</p>}{(error || query.isError) && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{message(error || query.error)}</p>}
    <Card><div className="grid gap-4 md:grid-cols-2"><Field name="Search references">{id => <Input id={id} placeholder="ID or name" value={search} onChange={e => setSearch(e.target.value)} />}</Field><Field name="Default reference">{id => <Select id={id} value={defaultReference?.id || ""} disabled={!canEdit || setting.isLoading || query.isFetching} onChange={e => chooseDefault(e.target.value)}><option value="">No default reference</option>{options.map(row => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</Select>}</Field></div><p className="mt-3 text-xs text-muted-foreground">Search by ID or name to find a reference. Use the default selector or Set default on a matching row.</p></Card>
    <DataTable loading={query.isFetching && !data} rows={rows} rowKey={row => row.id} emptyTitle="No references found" columns={[
      { key: "id", header: "Reference ID", accessor: row => <span className="font-mono">{row.code}</span> },
      { key: "name", header: "Name", accessor: row => <div className="font-medium">{row.name}{row.isDefault && <span className="ml-2 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Default</span>}</div> },
      { key: "phone", header: "Phone", accessor: row => row.phone },
      { key: "designation", header: "Designation", accessor: row => row.designation },
      { key: "address", header: "Address", accessor: row => <span className="whitespace-pre-wrap break-words">{row.address}</span> },
      { key: "actions", header: "Actions", accessor: row => canEdit ? <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setEditor(row)}><Pencil className="h-3 w-3" />Edit</Button>{!row.isDefault && <Button variant="primary" size="sm" disabled={setting.isLoading || query.isFetching} onClick={() => chooseDefault(row.id)}>Set default</Button>}<Button variant="outline" size="sm" disabled={row.isDefault || deleting.isLoading} title={row.isDefault ? "Change or clear the default before deleting" : "Delete reference"} onClick={() => setRemove(row)}><Trash2 className="h-3 w-3" />Delete</Button></div> : "-" },
    ]} />
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Page {page} - {data?.total || 0} references</p><div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Previous references" disabled={page === 1 || query.isFetching} onClick={() => setPage(page - 1)}><ArrowLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Next references" disabled={!data || page * 20 >= data.total || query.isFetching} onClick={() => setPage(page + 1)}><ArrowRight className="h-4 w-4" /></Button></div></div>
    {editor && <ReferenceEditor key={editor.id || "new"} row={editor} onClose={() => setEditor(null)} onSaved={row => { setEditor(null); setNotice(`Reference ${row.code} saved.`); }} />}
    <ConfirmDialog open={!!remove} title="Delete reference?" description="This contact will no longer be available for new bookings. Existing appointment references are retained." confirmLabel="Delete reference" loading={deleting.isLoading} onClose={() => setRemove(null)} onConfirm={async () => { setError(null); try { await deleteReference({ id: remove.id, expectedRevision: remove.revision }).unwrap(); setRemove(null); setNotice("Reference deleted."); } catch (e) { setRemove(null); setError(e); } }} />
  </div>;
}

function ReferenceEditor({ row, onClose, onSaved }) {
  const [values, setValues] = useState({ name: row.name || "", phone: row.phone || "", address: row.address || "", designation: row.designation || "" }), [error, setError] = useState(null);
  const [create, creating] = useCreateReferenceMutation(), [update, updating] = useUpdateReferenceMutation(), busy = creating.isLoading || updating.isLoading;
  return <Modal open title={row.id ? "Edit reference" : "Create reference"} onClose={busy ? () => {} : onClose}><form className="space-y-4" onSubmit={async e => { e.preventDefault(); setError(null); try { const result = await (row.id ? update({ id: row.id, expectedRevision: row.revision, ...values }) : create(values)).unwrap(); onSaved(result.data); } catch (e) { setError(e); } }}>
    {row.code && <p className="font-mono text-sm">{row.code}</p>}{error && <p role="alert" className="text-sm text-destructive">{message(error)}</p>}
    {["name", "phone", "designation", "address"].map(key => <Field key={key} name={key[0].toUpperCase() + key.slice(1)}>{id => key === "address" ? <Textarea id={id} required maxLength={1000} value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} /> : <Input id={id} required type={key === "phone" ? "tel" : "text"} maxLength={key === "phone" ? 30 : 150} value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} />}</Field>)}
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save reference"}</Button></div>
  </form></Modal>;
}
