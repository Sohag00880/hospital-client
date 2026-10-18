"use client";
import {bangladeshDate,bangladeshTime,bangladeshTimestamp} from "@/lib/time";
import { cloneElement, useEffect, useId, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Stethoscope, Pencil, Trash2, RefreshCw, Eye, GraduationCap, Mail, Phone, Building2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { useDoctorsQuery, useDoctorDepartmentsQuery, useCreateDoctorMutation, useCreateDoctorDepartmentMutation, useUpdateDoctorMutation, useDeleteDoctorMutation, useUpdateDoctorDepartmentMutation, useDeleteDoctorDepartmentMutation } from "./doctorsApi";
const live = { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true };
function Field({ title, children }) { const id = useId(); return <div className="space-y-1.5 text-sm"><label htmlFor={id} className="block font-medium">{title}</label>{cloneElement(children, { id })}</div>; }
function ErrorBox({ error, retry }) {
  if (!error) return null;
  return <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><p>{typeof error === "string" ? error : error.data?.error?.message || "Unable to complete this request. Check your connection and retry."}</p>{error.data?.error?.details?.issues?.map((issue, index) => <p key={index}>{issue.path.join(".")}: {issue.message}</p>)}{retry && <Button variant="outline" className="mt-2" onClick={retry}>Retry</Button>}</div>;
}
function Actions({ onView, onEdit, onDelete, disabled, kind }) {
  return <div className="flex flex-wrap gap-2">{onView && <Button size="sm" variant="outline" className="px-2.5" onClick={onView} aria-label="View doctor" title="View doctor details"><Eye className="h-4 w-4" aria-hidden="true" /></Button>}{onEdit && <Button size="sm" variant="outline" disabled={disabled} onClick={onEdit} aria-label={`Edit ${kind}`}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit</Button>}{onDelete && <Button size="sm" variant="outline" className="text-destructive" disabled={disabled} onClick={onDelete} aria-label={`Delete ${kind}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete</Button>}</div>;
}
export function DoctorsPage() {
  const permissions = useAppSelector((s) => s.auth.permissions), canView = permissions.includes("doctor.view"), canCreate = permissions.includes("doctor.create") && permissions.includes("user.create"), canEdit = permissions.includes("doctor.update") && permissions.includes("user.update"), canDelete = permissions.includes("doctor.delete") && permissions.includes("user.update"), canDepartment = permissions.includes("doctor.department");
  const [tab, setTab] = useState("doctors"), [search, setSearch] = useState(""), [debounced, setDebounced] = useState(""), [departmentId, setDepartment] = useState(""), [page, setPage] = useState(1), [editor, setEditor] = useState(null), [notice, setNotice] = useState("");
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const directory = useDoctorsQuery({ search: debounced, departmentId: departmentId || undefined, page, pageSize: 20 }, { ...live, skip: !canView });
  const departments = useDoctorDepartmentsQuery(undefined, { ...live, skip: !canView });
  if (!canView) return <ErrorBox error="You do not have permission to view doctors." />;
  const data = directory.currentData?.data, departmentRows = departments.currentData?.data || [];
  const saved = (text) => { setNotice(text); setEditor(null); setPage(1); if (departmentId && !departmentRows.some((d) => d.id === departmentId)) setDepartment(""); };
  return <div className="space-y-5"><PageHeader title="Doctors" description="Manage doctors and departments in one place." actions={<div className="flex flex-wrap gap-2"><Button variant="outline" aria-label="Refresh doctors and departments" onClick={() => { directory.refetch(); departments.refetch(); }}><RefreshCw className="h-4 w-4" /></Button>{canDepartment && <Button variant="outline" onClick={() => setEditor({ type: "department" })}><Plus className="h-4 w-4" />Create department</Button>}{canCreate && <Button onClick={() => setEditor({ type: "doctor" })}><Plus className="h-4 w-4" />Create doctor</Button>}</div>} />
    <div role="group" aria-label="Doctor management views" className="flex gap-2"><Button variant={tab === "doctors" ? "primary" : "outline"} aria-pressed={tab === "doctors"} onClick={() => setTab("doctors")}>Doctors</Button><Button variant={tab === "departments" ? "primary" : "outline"} aria-pressed={tab === "departments"} onClick={() => setTab("departments")}>Departments</Button></div>
    {notice && <p role="status" className="rounded-md bg-muted p-3 text-sm">{notice}</p>}
    {tab === "departments" ? <>{departments.isError ? <ErrorBox error={departments.error} retry={() => departments.refetch()} /> : <DataTable rows={departmentRows} rowKey={(d) => d.id} loading={!departments.currentData && departments.isFetching} emptyTitle="No departments yet" emptyDescription="Create a department, then select it when adding a doctor." columns={[
      { key: "name", header: "Department", accessor: (d) => <span className="font-medium">{d.name}</span> },
      { key: "count", header: "Doctors", accessor: (d) => d.doctorCount ?? 0 },
      ...(canDepartment ? [{ key: "actions", header: "Actions", accessor: (d) => <Actions kind="department" disabled={departments.isFetching} onEdit={() => setEditor({ type: "editDepartment", department: d })} onDelete={() => setEditor({ type: "deleteDepartment", department: d })} /> }] : []),
    ]} />}</> : <>
    <Card><div className="flex items-center gap-3"><Stethoscope className="h-6 w-6 text-primary" /><div><p className="text-2xl font-semibold">{data?.total ?? "..."}</p><p className="text-sm text-muted-foreground">Doctors</p></div></div></Card>
    <Card><div className="flex flex-wrap items-end gap-4"><div className="min-w-48 flex-1"><Field title="Search doctors"><Input placeholder="Name, login ID, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} /></Field></div><Field title="Department filter"><Select value={departmentId} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}><option value="">All departments</option>{departmentRows.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field></div><ErrorBox error={departments.isError && departments.error} retry={() => departments.refetch()} /></Card>
    {directory.isError ? <ErrorBox error={directory.error} retry={() => directory.refetch()} /> : <DataTable loading={directory.isFetching && !data} rows={data?.items || []} rowKey={(row) => row.id} emptyTitle="No doctors found" emptyDescription="Create a department, then create your first doctor." columns={[
      { key: "name", header: "Doctor", accessor: (row) => <div><p className="font-medium">{row.fullName}</p><p className="font-mono text-xs text-muted-foreground">{row.loginId}</p></div> },
      { key: "department", header: "Department", accessor: (row) => row.departmentName || "Not assigned" },
      { key: "contact", header: "Contact", accessor: (row) => <div><p>{row.phone || "No phone"}</p><p className="text-xs text-muted-foreground">{row.email || "No email"}</p></div> },
      { key: "status", header: "Status", accessor: (row) => <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${row.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{row.status}</span> },
      ...(canView ? [{ key: "actions", header: "Actions", accessor: (row) => <Actions kind="doctor" onView={() => setEditor({ type: "viewDoctor", doctor: row })} disabled={directory.isFetching} onEdit={canEdit ? () => setEditor({ type: "editDoctor", doctor: row }) : undefined} onDelete={canDelete ? () => setEditor({ type: "deleteDoctor", doctor: row }) : undefined} /> }] : []),
    ]} />}
    <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {page}</p><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Previous doctors" disabled={page === 1 || directory.isFetching} onClick={() => setPage(page - 1)}><ArrowLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="Next doctors" disabled={!data || page * 20 >= data.total || directory.isFetching} onClick={() => setPage(page + 1)}><ArrowRight className="h-4 w-4" /></Button></div></div></>}
    {editor && <DoctorEditor key={`${editor.type}:${editor.doctor?.id || editor.department?.id || "new"}`} editor={editor} departments={departmentRows} departmentsError={departments.isError} onClose={() => setEditor(null)} onSaved={saved} onDepartmentDeleted={(id) => { if (departmentId === id) setDepartment(""); }} />}
  </div>;
}
function DoctorEditor({ editor, departments, departmentsError, onClose, onSaved, onDepartmentDeleted }) {
  const canSchedule = useAppSelector(s => s.auth.permissions.includes("appointment.schedule"));
  const doctor = editor.doctor, department = editor.department, isEdit = editor.type === "editDoctor", isDepartment = ["department", "editDepartment"].includes(editor.type), isDelete = ["deleteDoctor", "deleteDepartment"].includes(editor.type);
  const [values, setValues] = useState({ firstName: doctor?.firstName || "", lastName: doctor?.lastName || "", email: doctor?.email || "", phone: doctor?.phone || "", password: "", newVisitFee:doctor?.newVisitFee ?? "0", followUpFee:doctor?.followUpFee ?? "0", qualification: doctor?.qualification || "", weeklySchedule: doctor?.weeklySchedule || [], status: doctor?.status || "active", departmentId: doctor?.departmentId || "" }), [name, setName] = useState(department?.name || ""), [error, setError] = useState(null), [credentials, setCredentials] = useState(null);
  const [create, creating] = useCreateDoctorMutation(), [createDepartment, creatingDepartment] = useCreateDoctorDepartmentMutation(), [update, updating] = useUpdateDoctorMutation(), [remove, removing] = useDeleteDoctorMutation(), [updateDepartment, updatingDepartment] = useUpdateDoctorDepartmentMutation(), [removeDepartment, removingDepartment] = useDeleteDoctorDepartmentMutation();
  const busy = [creating, creatingDepartment, updating, removing, updatingDepartment, removingDepartment].some((state) => state.isLoading);
  const field = (key) => ({ value: values[key], onChange: (e) => setValues({ ...values, [key]: e.target.value }) });
  if (editor.type === "viewDoctor") return <DoctorDetails doctor={doctor} onClose={onClose} />;
  const title = { department: "Create department", editDepartment: "Edit department", deleteDepartment: "Delete department", doctor: "Create doctor", editDoctor: "Edit doctor", deleteDoctor: "Delete doctor" }[editor.type];
  const submit = async (e) => { e.preventDefault(); setError(null); try {
    if (editor.type === "department") { await createDepartment({ name }).unwrap(); onSaved("Department created."); }
    else if (editor.type === "editDepartment") { await updateDepartment({ id: department.id, name, expectedRevision: department.revision }).unwrap(); onSaved("Department updated."); }
    else if (editor.type === "deleteDepartment") { await removeDepartment({ id: department.id, expectedRevision: department.revision }).unwrap(); onDepartmentDeleted(department.id); onSaved("Department deleted."); }
    else if (editor.type === "deleteDoctor") { await remove({ id: doctor.id, expectedUpdatedAt: doctor.updatedAt }).unwrap(); onSaved("Doctor deleted. Appointment history has been kept."); }
    else if (isEdit) { const { password: _password, ...changes } = { ...values,newVisitFee:Number(values.newVisitFee),followUpFee:Number(values.followUpFee) }; await update({ id: doctor.id, ...changes, email: changes.email || undefined, expectedUpdatedAt: doctor.updatedAt }).unwrap(); onSaved("Doctor updated."); }
    else { const { status: _status, ...account } = {...values,newVisitFee:Number(values.newVisitFee),followUpFee:Number(values.followUpFee)}; const result = await create({ ...account, email: account.email || undefined, password: account.password || undefined }).unwrap(); setCredentials({ loginId: result.data.user.loginId, password: values.password || result.data.generatedPassword }); }
  } catch (err) { setError(err); } };
  return <Modal open title={title} onClose={busy ? () => {} : onClose} size="lg"><div className="max-h-[75vh] overflow-y-auto pr-1">{credentials ? <div className="space-y-4"><p role="status">Doctor created. Save these credentials before closing.</p><p className="text-sm">Login ID: <span className="select-all font-mono">{credentials.loginId}</span></p><p className="text-sm">Initial password: <span className="select-all break-all font-mono">{credentials.password}</span></p><p className="text-sm text-muted-foreground">The doctor will change this password after signing in.</p><Button onClick={() => onSaved("Doctor created and available for appointment scheduling.")}>Done</Button></div> : <form onSubmit={submit} className="space-y-4"><ErrorBox error={error} />
    {isDelete ? <div className="space-y-3"><p className="font-semibold">{doctor?.fullName || department?.name}</p><p className="text-sm text-muted-foreground">{doctor ? "This doctor will be removed from the list and cannot sign in. Existing appointment history will be kept. Cancel or reschedule any open appointments first." : "This department will be removed from selection. Move any assigned doctors to another department first."}</p>{department?.doctorCount > 0 && <p className="text-sm text-destructive">{department.doctorCount} doctor(s) are assigned to this department. Move them before deleting.</p>}</div> : isDepartment ? <Field title="Department name"><Input required autoFocus maxLength={150} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cardiology" /></Field> : <>
      <div className="grid gap-4 sm:grid-cols-2"><Field title="First name"><Input required autoComplete="given-name" maxLength={100} {...field("firstName")} /></Field><Field title="Last name"><Input autoComplete="family-name" maxLength={100} {...field("lastName")} /></Field><Field title="Email (optional)"><Input type="email" maxLength={255} autoComplete="email" {...field("email")} /></Field><Field title="Phone (optional)"><Input type="tel" maxLength={30} autoComplete="tel" {...field("phone")} /></Field>{!isEdit && <div className="sm:col-span-2"><Field title="Initial password (optional)"><Input type="password" autoComplete="new-password" minLength={6} maxLength={200} {...field("password")} /></Field><p className="mt-1 text-xs text-muted-foreground">Leave blank to generate a password automatically.</p></div>}</div>
      <Field title="Qualification (optional)"><Textarea rows={5} maxLength={5000} placeholder={"MBBS\nFCPS (Medicine)\nMD (Cardiology)"} {...field("qualification")} /></Field><p className="text-xs text-muted-foreground">Add degrees and qualifications on separate lines.</p>
      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"><Field title="New visit fee"><Input required type="number" min="0" max="9999999.99" step="0.01" {...field("newVisitFee")} /></Field><Field title="Follow-up fee"><Input required type="number" min="0" max="9999999.99" step="0.01" {...field("followUpFee")} /></Field></div>
      <WeeklyHours value={values.weeklySchedule} disabled={!canSchedule || busy} onChange={weeklySchedule => setValues({ ...values, weeklySchedule })} />
      <Field title="Select department"><Select required disabled={departmentsError} {...field("departmentId")}><option value="">Select department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
      {isEdit && <Field title="Status"><Select {...field("status")}><option value="active">Active</option><option value="inactive">Inactive</option>{!["active", "inactive"].includes(values.status) && <option value={values.status} disabled>{values.status}</option>}</Select></Field>}
      {!departments.length && <p className="text-sm text-muted-foreground">Create a department using Create department on this page first.</p>}{departmentsError && <ErrorBox error="Departments could not be loaded. Close this dialog and retry loading the list." />}
    </>}
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button variant={isDelete ? "destructive" : "primary"} type="submit" disabled={busy || !isDelete && !isDepartment && (!values.departmentId || departmentsError) || editor.type === "deleteDepartment" && department?.doctorCount > 0}>{busy ? "Saving..." : isEdit || editor.type === "editDepartment" ? "Save changes" : title}</Button></div>
  </form>}</div></Modal>;
}

function DoctorDetails({ doctor, onClose }) {
  const initials = `${doctor.firstName?.[0] || doctor.fullName?.[0] || "D"}${doctor.lastName?.[0] || ""}`.toUpperCase();
  return <Modal open title="Doctor details" onClose={onClose} size="lg"><div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
    <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4"><div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{initials}</div><div className="min-w-0"><h3 className="break-words text-lg font-semibold">{doctor.fullName}</h3><p className="font-mono text-xs text-foreground/80">{doctor.loginId}</p><span className="mt-1 inline-block text-sm font-medium capitalize">{doctor.status}</span></div></div>
    <dl className="grid gap-4 sm:grid-cols-2">{[[Building2, "Department", doctor.departmentName || "Not assigned"], [Phone, "Phone", doctor.phone || "Not recorded"], [Mail, "Email", doctor.email || "Not recorded"]].map(([Icon, label, value]) => <div key={label} className="rounded-lg border p-3"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" aria-hidden="true" />{label}</dt><dd className="mt-2 break-words text-sm font-medium">{value}</dd></div>)}</dl>
    <section className="rounded-lg border p-4" aria-label="Qualifications"><h3 className="flex items-center gap-2 font-semibold"><GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />Qualifications</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{doctor.qualification || "No qualifications added yet."}</p></section>
    <dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">New visit fee</dt><dd className="mt-2 text-lg font-semibold">{Number(doctor.newVisitFee || 0).toFixed(2)}</dd></div><div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">Follow-up fee</dt><dd className="mt-2 text-lg font-semibold">{Number(doctor.followUpFee || 0).toFixed(2)}</dd></div></dl>
    <WeeklyHours value={doctor.weeklySchedule || []} readOnly />
    <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close details</Button></div>
  </div></Modal>;
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const clockTime = minute => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const minuteTime = value => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
function WeeklyHours({ value, onChange, disabled = false, readOnly = false }) {
  const [sameRoom, setSameRoom] = useState(() => new Set(value.map(row => row.room || "")).size <= 1);
  const [sharedRoom, setSharedRoom] = useState(value[0]?.room || "");
  const change = (day, patch) => onChange(value.map(row => row.day === day ? { ...row, ...patch } : row));
  const useOneRoom = () => { setSameRoom(true); onChange(value.map(row => ({ ...row, room: sharedRoom }))); };
  return <fieldset className="space-y-4 rounded-xl border p-4" disabled={disabled}>
    <legend className="px-1 text-sm font-semibold">Weekly visiting hours</legend>
    <p className="text-xs text-muted-foreground">Select visiting days and set the hours and room. Times are in Bangladesh time.</p>
    {readOnly ? value.length ? <dl className="divide-y">{[...value].sort((a,b) => a.day-b.day).map(row => <div key={row.day} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><dt className="font-medium">{weekdays[row.day]}</dt><dd className="text-right"><p>{clockTime(row.startMinute)} to {clockTime(row.endMinute)}</p><p className="mt-1 text-xs text-muted-foreground">{row.room ? `Room: ${row.room}` : "Room not specified"}</p></dd></div>)}</dl> : <p className="text-sm text-muted-foreground">No weekly hours set.</p> : <>
      {disabled && <p className="text-xs text-muted-foreground">Schedule management permission is required to change visiting hours.</p>}
      <div className="rounded-lg bg-muted/40 p-3 space-y-3">
        <div role="group" aria-label="Room arrangement" className="flex flex-wrap gap-2"><Button size="sm" variant={sameRoom ? "primary" : "outline"} aria-pressed={sameRoom} onClick={useOneRoom}>Same room every day</Button><Button size="sm" variant={!sameRoom ? "primary" : "outline"} aria-pressed={!sameRoom} onClick={() => setSameRoom(false)}>Different rooms by day</Button></div>
        {sameRoom ? <Field title="Room for all visiting days"><Input maxLength={100} placeholder="e.g. 201 or Chamber A" value={sharedRoom} onChange={e => { setSharedRoom(e.target.value); onChange(value.map(row => ({ ...row, room: e.target.value }))); }} /></Field> : <p className="text-xs text-muted-foreground">Enter a room beside each selected day below.</p>}
      </div>
      <div className="space-y-2">{weekdays.map((name, day) => { const row = value.find(r => r.day === day); return <div key={day} className={`rounded-lg border p-3 ${row ? "border-primary/30 bg-muted/20" : ""}`}>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input className="h-4 w-4 accent-primary" type="checkbox" checked={!!row} onChange={e => onChange(e.target.checked ? [...value, { day, startMinute: 540, endMinute: 780, room: sameRoom ? sharedRoom : "" }].sort((a,b) => a.day-b.day) : value.filter(r => r.day !== day))} />{name}{!row && <span aria-hidden="true" className="ml-auto text-xs font-normal text-muted-foreground">Off</span>}</label>
        {row && <div className={`mt-3 grid gap-3 ${sameRoom ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}><Field title={`${name} start`}><Input required type="time" value={clockTime(row.startMinute)} onChange={e => change(day, { startMinute: e.target.value ? minuteTime(e.target.value) : 0 })} /></Field><Field title={`${name} end`}><Input required type="time" value={clockTime(row.endMinute)} onChange={e => change(day, { endMinute: e.target.value ? minuteTime(e.target.value) : 0 })} /></Field>{!sameRoom && <Field title={`${name} room`}><Input maxLength={100} placeholder="e.g. 201" value={row.room || ""} onChange={e => change(day, { room: e.target.value })} /></Field>}{row.endMinute <= row.startMinute && <p className="text-sm text-destructive sm:col-span-full">End time must be after start time.</p>}</div>}
      </div>; })}</div>
    </>}
  </fieldset>;
}
