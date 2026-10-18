"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useRegisterPatientMutation, useFindPatientDuplicatesMutation } from "./patientsApi";
import { demographicDefaults, contactDefaults, addressDefaults, identifierDefaults, demographicPayload, DemographicFields, ContactFields, AddressFields, IdentifierFields, PatientError, fullName, dateLabel } from "./PatientForms";

export function PatientRegistration() {
  const permissions = useAppSelector((state) => state.auth.permissions), router = useRouter(), key = useRef(null);
  const [values, setValues] = useState(demographicDefaults), [emergency, setEmergency] = useState({ ...contactDefaults, kind: "emergency", isPrimary: true }), [guardian, setGuardian] = useState({ ...contactDefaults, kind: "guardian", isPrimary: true }), [address, setAddress] = useState({ ...addressDefaults, isPrimary: true }), [identifier, setIdentifier] = useState(identifierDefaults);
  const [enabled, setEnabled] = useState({}), [error, setError] = useState(null), [matches, setMatches] = useState(null), [override, setOverride] = useState(false), [reason, setReason] = useState("");
  const [register, registering] = useRegisterPatientMutation(), [check, checking] = useFindPatientDuplicatesMutation();
  const change = (setter) => (name, value) => setter((previous) => ({ ...previous, [name]: value }));
  const related = () => ({ contacts: [...(enabled.emergency ? [emergency] : []), ...(enabled.guardian ? [guardian] : [])], addresses: enabled.address ? [address] : [], identifiers: enabled.identifier ? [identifier] : [] });
  const find = async () => {
    setError(null);
    try { const result = await check({ firstName: values.firstName, lastName: values.lastName, dateOfBirth: values.dateOfBirth || null, phone: values.phone || null, email: values.email || null, identifiers: related().identifiers }).unwrap(); setMatches(result.data); setOverride(false); }
    catch (failure) { setError(failure); }
  };
  const save = async (event) => {
    event.preventDefault(); setError(null);
    if (!key.current) key.current = crypto.randomUUID();
    try { const result = await register({ ...demographicPayload(values), ...related(), registrationKey: key.current, ...(override ? { duplicateOverrideReason: reason } : {}) }).unwrap(); router.push(`/patients/${result.data.patient.id}`); }
    catch (failure) { setError(failure); if (failure?.data?.error?.details?.candidates) { setMatches(failure.data.error.details.candidates); setOverride(false); } }
  };
  if (!permissions.includes("patient.create") || !permissions.includes("patient.view")) return <PatientError error="You do not have permission to register patients." />;
  const busy = registering.isLoading || checking.isLoading;
  return <div className="space-y-5"><PageHeader title="Register patient" description="A permanent six-digit MRN is assigned after registration." actions={<Link className="text-sm text-primary underline" href="/patients">Back to patients</Link>} /><form onSubmit={save} className="space-y-5"><fieldset disabled={busy} className="space-y-5">
    <Card><h2 className="mb-4 text-base font-semibold">Demographics</h2><DemographicFields values={values} onChange={change(setValues)} /></Card>
    {[["identifier", "Add an identity document", <IdentifierFields key="identifier" values={identifier} onChange={change(setIdentifier)} />], ["emergency", "Add an emergency contact", <ContactFields key="emergency" values={emergency} onChange={change(setEmergency)} fixedKind />], ["guardian", "Add a guardian", <ContactFields key="guardian" values={guardian} onChange={change(setGuardian)} fixedKind />], ["address", "Add an address", <AddressFields key="address" values={address} onChange={change(setAddress)} />]].map(([name, label, fields]) => <Card key={name}><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!enabled[name]} onChange={(event) => setEnabled((previous) => ({ ...previous, [name]: event.target.checked }))} />{label}</label>{enabled[name] && <div className="mt-4">{fields}</div>}</Card>)}
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Duplicate review</h2><p className="text-sm text-muted-foreground">Check existing profiles before creating a new record.</p></div><Button variant="outline" onClick={find}>Check for duplicates</Button></div>
      {matches && <div className="mt-4 space-y-3">{!matches.length ? <p role="status" className="text-sm">No matching patients found. Registration checks again before saving.</p> : <><p className="text-sm font-medium">Possible matches — review before proceeding</p>{matches.map((patient) => <div key={patient.id} className="rounded-md border p-3 text-sm"><Link href={`/patients/${patient.id}`} className="font-medium text-primary underline">{fullName(patient)} · MRN {patient.mrn}</Link><p>{dateLabel(patient.dateOfBirth)} · {patient.phone || "No phone"}</p><p className="text-muted-foreground">{patient.reasons.join("; ")}</p></div>)}{!matches.some((patient) => patient.identifierMatch) && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} />I reviewed the matches; this is a different patient</label>{override && <label className="block space-y-1.5 text-sm"><span>Reason for separate registration</span><Textarea required minLength={10} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>}</>}</>}</div>}
    </Card><PatientError error={error} /><div className="flex gap-3"><Button type="submit" disabled={busy || matches?.some((patient) => patient.identifierMatch)}>{registering.isLoading ? "Registering..." : "Register patient"}</Button><Link href="/patients" className="inline-flex items-center px-3 text-sm text-muted-foreground">Cancel</Link></div>
  </fieldset></form></div>;
}
