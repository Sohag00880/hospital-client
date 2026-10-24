"use client";
import {bangladeshDate,bangladeshTime} from "@/lib/time";
import { cloneElement, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {formatAddress} from "@/lib/address";
import {useRouter} from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, CircleCheck, Eye, Pencil, Printer } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { useListPatientsQuery } from "@/features/patients/patientsApi";
import { AppointmentPrint } from "./AppointmentPrint";
import { BookingDetails } from "./BookingDetails";
import {AppointmentEditor} from "./AppointmentEditor";
import { useAppointmentDoctorsQuery, useDoctorSchedulesQuery, useAppointmentsQuery, useOpdAppointmentsQuery, useOpdQueueQuery, useCancelDoctorScheduleMutation, useBookAppointmentMutation, useAppointmentActionMutation, useCallNextMutation, queryOptions } from "./appointmentsApi";
const today = () => bangladeshDate();
const states = ["pending", "booked", "in_consultation", "completed", "refunded", "cancelled"];
const opdViews = ["queue", "booked", "in_consultation", "completed", "refunded", "cancelled", "all"];
const viewLabel = value => value === "queue" ? "Live queue" : value === "all" ? "All patients" : value === "booked" ? "Waiting" : label(value);
const label = (value) => value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const time = bangladeshTime;
const ageAt = row => {if(!row.dateOfBirth && row.ageYears == null)return "-";const origin=row.dateOfBirth || row.ageRecordedOn;if(!origin)return row.ageYears ?? "-";const years=Number(row.date.slice(0,4))-Number(origin.slice(0,4))-(row.date.slice(5)<origin.slice(5)?1:0);return Math.max(0,row.dateOfBirth?years:(row.ageYears ?? 0)+years);};
const minuteLabel = (value) => `${String(Math.floor((value % 1440) / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
function ErrorBox({ error }) {
  if (!error) return null;
  return <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{typeof error === "string" ? error : error.data?.error?.message || "Request failed. Check your connection and try again."}</div>;
}
function StatusCell({ row }) {
  const colors = {pending:"bg-amber-100 text-amber-900",booked:"bg-blue-100 text-blue-800",in_consultation:"bg-primary text-primary-foreground",completed:"bg-emerald-100 text-emerald-900",refunded:"bg-purple-100 text-purple-900",cancelled:"bg-muted text-foreground"};
  const stamp = row.status === "completed" ? row.completedAt : row.status === "in_consultation" ? row.startedAt : row.status === "booked" ? row.checkedInAt : null;
  return <div className="space-y-1"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[row.status] || "bg-muted"}`}>{label(row.status)}</span>{stamp && <p className="text-xs text-muted-foreground">{time(stamp)} BD</p>}</div>;
}
function Field({ title, children }) { const id = useId(); return <div className="space-y-1 text-sm"><label htmlFor={id} className="block">{title}</label>{cloneElement(children, { id })}</div>; }
function DayInput(props) { return <Input type="date" onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch {} }} {...props} />; }
export function AppointmentWorkspace({mode="appointments"}) {
  const router=useRouter();
  const isOpd = mode === "opd";
  const permissions = useAppSelector((s) => s.auth.permissions), canView = permissions.includes("appointment.view"), canWrite = permissions.includes("appointment.update"), canBook = permissions.includes("appointment.create") && permissions.includes("patient.view"), canSchedule = permissions.includes("appointment.schedule");
  const [date, setDate] = useState(null), [doctorId, setDoctor] = useState(""), [tab, setTab] = useState(isOpd ? "queue" : "appointments"), [status, setStatus] = useState(""), [search, setSearch] = useState(""), [debounced, setDebounced] = useState(""), [page, setPage] = useState(1), [dialog, setDialog] = useState(null), [error, setError] = useState(null), [notice, setNotice] = useState("");
  useEffect(() => setDate(today()), []);
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const skip = !canView || !date, params = { date: date || "", doctorId: doctorId || undefined };
  const doctors = useAppointmentDoctorsQuery(!isOpd && date ? {date} : undefined, { ...queryOptions, skip: !canView });
  const schedules = useDoctorSchedulesQuery(params, { ...queryOptions, skip: skip || isOpd });
  const listParams = { ...params, status: isOpd ? (states.includes(tab) ? tab : undefined) : status || undefined, search: debounced, page, pageSize: 20 };
  const appointmentRecords = useAppointmentsQuery(listParams, { ...queryOptions, skip: skip || isOpd });
  const opdRecords = useOpdAppointmentsQuery(listParams, { ...queryOptions, skip: skip || !isOpd });
  const appointments = isOpd ? opdRecords : appointmentRecords;
  const queue = useOpdQueueQuery(params, { ...queryOptions, skip: skip || !isOpd && tab !== "queue" });
  const [action, actionState] = useAppointmentActionMutation(), [next, nextState] = useCallNextMutation();
  const nextRequest = useRef(null), busy = actionState.isLoading || nextState.isLoading;
  const fetchingRecords = appointments.isFetching || (isOpd && queue.isFetching);
  if (!canView) return <ErrorBox error="You do not have permission to view appointments." />;
  const doctorRows = doctors.currentData?.data || [], scheduleRows = schedules.currentData?.data || [], list = appointments.currentData?.data, queueRows = queue.currentData?.data || [];
  const consultations = queueRows.filter(row => row.status === "in_consultation");
  const selectedConsultation = consultations.find(row => row.doctorId === doctorId);
  const nextPatient = queueRows.find(row => row.status === "booked" && row.doctorId === doctorId);
  const filteredQueue = queueRows.filter(row => !debounced || [row.patientName, row.mrn, row.phone, row.doctorName].some(value => String(value || "").toLowerCase().includes(debounced.toLowerCase())));
  const changeView = value => { setTab(value); setPage(1); setError(null); };
  const notify = (text) => { setNotice(text); setError(null); };
  const changeDay = (value) => { setDate(value); setPage(1); setError(null); };
  const run = async (row, operation) => { setError(null); try { const saved = await action({ id: row.id, action: operation, expectedRevision: row.revision }).unwrap(); notify(operation === "confirm" ? `Appointment confirmed. Serial ${saved.serialNumber}; patient added to OPD.` : "Consultation started."); } catch (e) { setError(e); } };
  const callNext = async () => { setError(null); const key = `${doctorId}:${date}`; if (nextRequest.current?.key !== key) nextRequest.current = { key, requestKey: crypto.randomUUID() }; try { await next({ doctorId, date, requestKey: nextRequest.current.requestKey }).unwrap(); nextRequest.current = null; notify("Next patient called."); } catch (e) { if (typeof e.status === "number") nextRequest.current = null; setError(e); } };
  const appointmentActions = (row) => <div className="flex flex-wrap gap-2"><div className="flex shrink-0 flex-nowrap gap-2">{canWrite && row.status === "pending" && row.date === today() && <Button size="icon" aria-label="Confirm appointment" title={row.collectionMode==="ledger"?"Confirm appointment; collect remaining fee through Billing":"Confirm appointment and collect fee"} className="h-8 w-8" disabled={busy || fetchingRecords} onClick={() => run(row, "confirm")}><CircleCheck className="h-3.5 w-3.5" /></Button>}<Button size="icon" variant="outline" aria-label="View" title="View" className="h-8 w-8" onClick={() => setDialog({type:"view",row})}><Eye className="h-3.5 w-3.5" /></Button>{canWrite && permissions.includes("patient.view") && <Button size="icon" variant="outline" aria-label="Edit" title="Edit" className="h-8 w-8" onClick={()=>setDialog({type:"edit",row})}><Pencil className="h-3.5 w-3.5"/></Button>}<Button size="icon" aria-label="Print" title="Print" className="h-8 w-8 bg-teal-700 text-white hover:bg-teal-800" onClick={() => setDialog({type:"print",row})}><Printer className="h-3.5 w-3.5" /></Button></div>{canWrite && <>{row.status === "in_consultation" && <Button size="sm" disabled={busy || fetchingRecords} onClick={() => setDialog({ type: "complete", row })}>Complete</Button>}</>}</div>;
  const opdActions = row => <div className="flex flex-wrap gap-2">{canWrite && row.status === "booked" && <Button size="sm" disabled={busy || fetchingRecords || row.date !== today() || !queue.currentData || queue.isError || queueRows.find(item => item.status === "booked" && item.doctorId === row.doctorId)?.id !== row.id || consultations.some(item => item.doctorId === row.doctorId)} onClick={() => run(row, "start")}>Start consultation</Button>}{canWrite && row.status === "in_consultation" && <Button size="sm" disabled={busy || fetchingRecords} onClick={() => setDialog({type:"complete",row})}>Complete</Button>}{(!canWrite || !["booked","in_consultation"].includes(row.status)) && <span className="text-muted-foreground">-</span>}</div>;
  const actions = isOpd ? opdActions : appointmentActions;
  const columns = [
    {key:"serial",header:"Serial",accessor:row=><span className="font-semibold">{row.serialNumber ?? row.estimatedSerialNumber ?? "-"}{row.status === "pending" && <span className="block text-xs font-normal text-muted-foreground">Estimated</span>}</span>},
    { key: "patient", header: "Patient", accessor: (row) => <div>{permissions.includes("patient.view") ? <Link href={`/patients/${row.canonicalPatientId}`} className="font-medium text-primary hover:underline">{row.patientName}</Link> : <span className="font-medium">{row.patientName}</span>}<p className="font-mono text-xs text-muted-foreground">{row.mrn}</p></div> },
    {key:"phone",header:"Phone",accessor:row=>row.phone || "-"},
    {key:"address",header:"Address",accessor:row=><span className="block min-w-48 max-w-xs whitespace-normal break-words">{formatAddress(row.address)}</span>},
    { key: "doctor", header: "Doctor", accessor: (row) => row.doctorName },
    {key:"visit",header:"Visit type",accessor:row=>row.visitType === "follow_up" ? "Follow-up" : "New"},
    {key:"amount",header:"Amount",accessor:row=>row.amount == null ? "Not recorded" : Number(row.amount).toFixed(2)},
    ...(isOpd ? [
      {key:"age",header:"Age",accessor:ageAt},
      {key:"gender",header:"Gender",accessor:row=>label(row.gender || "unknown")},
      {key:"time",header:"Time",accessor:row=>row.createdAt ? time(row.createdAt) : "-"},
    ] : [{key:"createdBy",header:"Created By",accessor:row=>row.createdByName || "Not recorded"}]),
    ...(!isOpd ? [{key:"reference",header:"Reference By",accessor:row=>row.referenceName ? <div>{row.referenceName}<p className="text-xs text-muted-foreground">{row.referenceCode}</p></div> : "Not recorded"}] : []),
    ...(!isOpd ? [{key:"testOrders",header:"Test Orders",accessor:row=><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${row.hasTestOrders?"bg-teal-100 text-teal-800":"bg-muted text-muted-foreground"}`}>{row.hasTestOrders?"Yes":"No"}</span>}] : []),
    { key: "status", header: "Status", accessor: row => <StatusCell row={row} /> },
    { key: "actions", header: "Actions", accessor: actions },
  ];
  return <div className="space-y-5"><PageHeader title={isOpd ? "OPD" : "All Appointments"}  actions={<div className="flex gap-2">{!isOpd && canBook && <Button onClick={() => router.push(`/appointments/book?${new URLSearchParams({date:date || today(),...(doctorId?{doctorId}:{})})}`)}>Book appointment</Button>}</div>} />
    <Card><div className="flex flex-wrap items-end gap-4"><Field title="Appointment date"><DayInput value={date || ""} onChange={(e) => changeDay(e.target.value)} /></Field><Field title="Doctor"><Select value={doctorId} onChange={(e) => { setDoctor(e.target.value); setPage(1); }}><option value="">All doctors</option>{doctorRows.map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}</Select></Field></div>{doctors.isError && <ErrorBox error={doctors.error} />}</Card>
    {!isOpd && <div className="flex flex-wrap gap-2" role="group" aria-label="Appointment views">{["appointments", "schedules"].map((value) => <Button key={value} variant={tab === value ? "primary" : "outline"} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === "queue" ? "OPD queue" : label(value)}</Button>)}</div>}
    {isOpd && <div className="flex flex-wrap gap-2" role="group" aria-label="OPD views">{opdViews.map(value => <Button key={value} variant="outline" className={tab === value ? "border-primary bg-primary/10 text-foreground hover:bg-primary/10" : ""} aria-pressed={tab === value} onClick={() => changeView(value)}>{viewLabel(value)}{states.includes(value) && <span className="rounded bg-muted px-1.5 text-xs text-foreground">{list?.counts?.[value] || 0}</span>}</Button>)}</div>}
    {isOpd && <Card><Field title="Search patient"><Input placeholder="Name, MRN or phone" value={search} onChange={e => setSearch(e.target.value)} /></Field></Card>}
    {notice && <p role="status" className="rounded-md bg-muted p-3 text-sm">{notice}</p>}<ErrorBox error={error} />
    {appointments.isError && <ErrorBox error={appointments.error}/>}
    {!isOpd&&<div className="grid gap-3 sm:grid-cols-3" aria-label="Patient test order summary">{[["Total Patients","totalPatients"],["Test Orders Patients","testOrderPatients"],["Without Test Orders","withoutTestOrderPatients"]].map(([title,key])=><Card key={key}><p className="text-xs font-medium text-muted-foreground">{title}</p><p className="mt-2 text-xl font-semibold">{list?.patientSummary?.[key] ?? 0}</p></Card>)}</div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Amounts by appointment status">{states.filter(value => value !== "in_consultation" && (!isOpd || value !== "pending")).map(value=><Card key={value}><p className="text-xs font-medium text-muted-foreground">{value === "refunded" ? "Refund" : label(value)}</p><p className="mt-2 text-xl font-semibold">{Number(list?.amounts?.[value]?.amount || 0).toFixed(2)}</p><p className="mt-1 text-xs text-muted-foreground">{list?.counts?.[value] || 0} appointments</p></Card>)}</div>
    {!date ? <p>Select a date to continue.</p> : tab === "schedules" ? <><ErrorBox error={schedules.isError && schedules.error} />{!schedules.isFetching && !scheduleRows.length && <Card><p>No doctor schedules for this date.</p><p className="mt-2 text-sm text-muted-foreground">Set visiting days, times and rooms in Doctors to make this doctor available for booking.</p></Card>}<div className="grid gap-4 md:grid-cols-2">{scheduleRows.map((row) => <Card key={row.id}><h2 className="font-semibold">{row.doctorName}</h2><p className="mt-2 text-sm">{minuteLabel(row.startMinute + (row.timeZone === "UTC" ? 360 : 0))}–{minuteLabel(row.endMinute + (row.timeZone === "UTC" ? 360 : 0))} Bangladesh time</p><p className="text-sm text-muted-foreground">{row.room || "Room not specified"} · {label(row.status)}</p><div className="mt-4 flex gap-2">{canBook && row.status === "active" && row.date >= today() && <Button size="sm" onClick={() => router.push(`/appointments/book?${new URLSearchParams({date:row.date,doctorId:row.doctorId})}`)}><CalendarDays className="h-4 w-4" />Book appointment</Button>}{canSchedule && row.status === "active" && <Button size="sm" variant="outline" onClick={() => setDialog({ type: "cancelSchedule", row })}>Cancel schedule</Button>}</div></Card>)}</div></> : tab !== "queue" ? <>

      {!isOpd && <Card><div className="flex flex-wrap gap-4"><Field title="Search patient"><Input placeholder="Name, MRN or phone" value={search} onChange={(e) => setSearch(e.target.value)} /></Field><Field title="Status"><Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{states.map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select></Field></div></Card>}
      <h2 className="sr-only">Appointment records</h2>
      {appointments.isError ? <ErrorBox error={appointments.error} /> : <DataTable columns={columns} rows={list?.items || []} rowKey={(row) => row.id} loading={!list && appointments.isFetching} emptyTitle="No appointments found" />}
      <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {page} · {list?.total ?? 0} appointments</p><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Previous appointments" disabled={page === 1 || appointments.isFetching} onClick={() => setPage(page - 1)}><ArrowLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="Next appointments" disabled={!list || page * 20 >= list.total || appointments.isFetching} onClick={() => setPage(page + 1)}><ArrowRight className="h-4 w-4" /></Button></div></div></> : <>
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Waiting and in consultation</h2><p className="text-sm text-muted-foreground">{date !== today() ? "Viewing another date. Start consultations on the appointment day." : !doctorId ? "Choose a doctor to call the next patient, or start the earliest waiting serial below." : selectedConsultation ? "Complete the current consultation before calling another patient." : nextPatient ? `Next: Serial ${nextPatient.serialNumber ?? "-"} - ${nextPatient.patientName}` : "No patients are waiting for this doctor."}</p></div>{canWrite && <Button disabled={!doctorId || date !== today() || busy || fetchingRecords || !nextPatient || !!selectedConsultation} onClick={callNext}>{nextState.isLoading ? "Calling..." : "Call next"}</Button>}</div></Card>
      {consultations.length > 0 && <section aria-label="Current consultations" className="space-y-3"><h2 className="text-sm font-semibold">In consultation</h2><div className="grid gap-3 lg:grid-cols-2">{consultations.map(row => <Card key={row.id} className="border-primary/30 bg-primary/5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{row.doctorName} - Serial {row.serialNumber ?? "-"}</p><h3 className="mt-1 font-semibold">{row.patientName}</h3><p className="text-sm text-muted-foreground">{row.mrn} {row.phone ? `- ${row.phone}` : ""}</p><p className="mt-2 text-xs text-muted-foreground">{row.startedAt ? `Started ${time(row.startedAt)} (Bangladesh time)` : "Consultation in progress"}</p></div>{canWrite && <Button disabled={busy || fetchingRecords} onClick={() => setDialog({type:"complete",row})}>Complete consultation</Button>}</div></Card>)}</div></section>}
      {queue.isError ? <ErrorBox error={queue.error} /> : <DataTable columns={columns} rows={filteredQueue} rowKey={(row) => row.id} loading={!queue.currentData && queue.isFetching} emptyTitle={debounced ? "No matching patients in this queue" : "No patients in this queue"} />}</>}

    {dialog?.type === "print" && !isOpd ? <AppointmentPrint id={dialog.row.id} onClose={() => setDialog(null)} /> : dialog?.type === "view" && !isOpd ? <BookingDetails row={dialog.row} age={ageAt(dialog.row)} onClose={() => setDialog(null)} /> : dialog?.type === "edit" ? <AppointmentEditor row={dialog.row} onClose={()=>setDialog(null)} onSaved={()=>{setDialog(null);notify("Appointment updated successfully.");}}/> : dialog && <AppointmentDialog key={`${dialog.type}:${dialog.row?.id || dialog.scheduleId || "new"}`} dialog={dialog} date={date || today()} doctorId={dialog.doctorId || doctorId} onClose={() => setDialog(null)} onSaved={(text) => { setDialog(null); notify(text); }} />}

  </div>;
}
function AppointmentDialog({ dialog, date: initialDate, doctorId: initialDoctor, onClose, onSaved }) {
  const type = dialog.type, row = dialog.row, isBooking = type === "book", isMoving = type === "reschedule", usesSchedule = isBooking || isMoving;
  const [date, setDate] = useState(initialDate), [doctorId, setDoctor] = useState(initialDoctor), [scheduleId, setSchedule] = useState(dialog.scheduleId || ""), [reason, setReason] = useState(""), [patientSearch, setPatientSearch] = useState(""), [debounced, setDebounced] = useState(""), [patient, setPatient] = useState(null), [error, setError] = useState(null);
  const bookingKey = useRef(null);
  useEffect(() => { const timer = setTimeout(() => setDebounced(patientSearch), 300); return () => clearTimeout(timer); }, [patientSearch]);
  const schedules = useDoctorSchedulesQuery({ date, doctorId: doctorId || undefined }, { ...queryOptions, skip: !usesSchedule || !date });
  const availableDoctors = useAppointmentDoctorsQuery({ date }, { ...queryOptions, skip: !usesSchedule || !date });
  const doctors = availableDoctors.currentData?.data || [];
  const patients = useListPatientsQuery({ search: debounced, page: 1, pageSize: 10 }, { skip: !isBooking || debounced.length < 2 });
  const [book, booking] = useBookAppointmentMutation(), [action, acting] = useAppointmentActionMutation(), [cancelSchedule, cancelling] = useCancelDoctorScheduleMutation();
  const busy = booking.isLoading || acting.isLoading || cancelling.isLoading;
  const title = { book: "Book appointment", reschedule: "Reschedule appointment", cancel: "Cancel appointment", cancelSchedule: "Cancel doctor schedule", complete: "Complete consultation" }[type];
  const submit = async (e) => { e.preventDefault(); setError(null); try {
    if (isBooking) { if (!patient) return setError("Select a patient and a visiting session."); if (!bookingKey.current) bookingKey.current = crypto.randomUUID(); await book({ bookingKey: bookingKey.current, patientId: patient.id, scheduleId, reason }).unwrap(); }
    else if (isMoving) await action({ id: row.id, action: "reschedule", expectedRevision: row.revision, scheduleId, reason }).unwrap();
    else if (type === "complete") await action({ id: row.id, action: "complete", expectedRevision: row.revision }).unwrap();
    else if (type === "cancelSchedule") await cancelSchedule({ id: row.id, expectedRevision: row.revision }).unwrap();
    else await action({ id: row.id, action: "cancel", expectedRevision: row.revision, reason }).unwrap();
    onSaved({ book: "Appointment saved as pending. Confirm it to assign a serial.", reschedule: "Appointment rescheduled. Confirm it again on the new date.", cancel: "Appointment cancelled.", cancelSchedule: "Doctor schedule cancelled.", complete: "Consultation completed. The patient is now in Completed." }[type]);
  } catch (err) { setError(err); if (typeof err.status === "number") bookingKey.current = null; } };
  const resetSchedule = () => { setSchedule(""); bookingKey.current = null; };
  return <Modal open onClose={busy ? () => {} : onClose} title={title} size="lg"><div className="max-h-[75vh] overflow-y-auto pr-1"><form onSubmit={submit} className="space-y-4"><ErrorBox error={error} />
    {row && <p className="text-sm">{row.patientName || row.doctorName} {row.mrn ? `· ${row.mrn}` : ""}</p>}
    {usesSchedule && <><div className="grid gap-4 sm:grid-cols-2"><Field title="Appointment date"><DayInput required min={today()} value={date} onChange={(e) => { setDate(e.target.value); resetSchedule(); }} /></Field><Field title="Choose doctor"><Select value={doctorId} onChange={(e) => { setDoctor(e.target.value); resetSchedule(); }}><option value="">All doctors</option>{doctors.map((item) => <option value={item.id} key={item.id}>{item.fullName}</option>)}</Select></Field></div>{!doctors.length && <p className="text-sm text-muted-foreground">No active doctors. Assign the Doctor role to an active user in Users first.</p>}</>}
    {isBooking && <><Field title="Find patient"><Input placeholder="Search name or MRN (at least 2 characters)" value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setPatient(null); bookingKey.current = null; }} /></Field><ErrorBox error={patients.isError && patients.error} />{!patient && debounced.length >= 2 && <div className="max-h-36 space-y-1 overflow-y-auto">{patients.isFetching ? <p className="text-sm">Searching...</p> : (patients.currentData?.data?.items || []).map((item) => <button type="button" key={item.id} className="block w-full rounded border p-2 text-left text-sm hover:bg-muted" onClick={() => { setPatient(item); bookingKey.current = null; }}>{item.firstName} {item.lastName} · {item.mrn}</button>)}{!patients.isFetching && patients.currentData?.data?.items?.length === 0 && <p className="text-sm">No patients found. Register the patient first.</p>}</div>}{patient && <p className="rounded bg-muted p-2 text-sm">Selected: {patient.firstName} {patient.lastName} · {patient.mrn}</p>}</>}
    {usesSchedule && <><ErrorBox error={availableDoctors.isError && availableDoctors.error || schedules.isError && schedules.error} /><Field title="Visiting session"><Select required value={scheduleId} disabled={schedules.isFetching} onChange={(e) => { setSchedule(e.target.value); bookingKey.current = null; }}><option value="">Select visiting session</option>{(schedules.currentData?.data || []).filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.doctorName} {minuteLabel(item.startMinute + (item.timeZone === "UTC" ? 360 : 0))} - {minuteLabel(item.endMinute + (item.timeZone === "UTC" ? 360 : 0))} {item.room || "No room"}</option>)}</Select></Field></>}

    {(usesSchedule || type === "cancel") && <Field title={isBooking ? "Reason for visit (optional)" : "Reason"}><Input required={!isBooking} minLength={isBooking ? undefined : 3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); bookingKey.current = null; }} /></Field>}
    {type === "complete" && <p className="rounded-md bg-muted p-3 text-sm">Mark this consultation as completed? The patient will leave the active queue and remain available in Completed with their history.</p>}
    {type === "cancel" && <p className="text-sm text-muted-foreground">This cancels the pending appointment. History is retained.</p>}{type === "cancelSchedule" && <p className="text-sm text-muted-foreground">Active bookings must be cancelled or rescheduled first. Existing history is retained.</p>}{isMoving && <p className="text-sm text-muted-foreground">A waiting patient leaves their queue and must be confirmed again.</p>}
    {error?.status === 409 && <p className="text-sm text-muted-foreground">If this record changed, reopen this page before retrying.</p>}
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Close</Button><Button type="submit" disabled={busy || usesSchedule && (!scheduleId || schedules.isFetching || schedules.isError) || isBooking && !patient}>{busy ? "Saving..." : title}</Button></div>
  </form></div></Modal>;
}
