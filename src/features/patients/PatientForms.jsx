"use client";
import {bangladeshDate,bangladeshTime,bangladeshTimestamp} from "@/lib/time";
import { useId } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export const demographicDefaults = { firstName: "", lastName: "", preferredName: "", ageYears:"", ageRecordedOn:"", dateOfBirth: "", birthDateEstimated: false, sex: "unknown", genderIdentity: "", bloodGroup: "", maritalStatus: "unknown", phone: "", email: "", occupation: "", nationality: "", preferredLanguage: "", deceasedDate: "" };
export const contactDefaults = { kind: "emergency", name: "", relationship: "", phone: "", alternatePhone: "", email: "", address: "", isPrimary: false, notes: "" };
export const addressDefaults = { kind: "current", line1: "", line2: "", city: "", district: "", state: "", postalCode: "", country: "BD", isPrimary: false };
export const identifierDefaults = { type: "national_id", value: "", issuingCountry: "BD" };
export const fullName = (patient) => [patient?.firstName, patient?.lastName].filter(Boolean).join(" ");
export const human = (value) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
export const dateLabel = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Dhaka" }).format(new Date(value)) : "Not recorded";
export const errorMessage = (error) => {
  const issues = error?.data?.error?.details?.issues;
  return issues?.length ? issues.slice(0, 4).map((issue) => `${issue.path.join(" / ") || "Form"}: ${issue.message}`).join(". ") : error?.data?.error?.message || "Unable to complete this action. Please try again.";
};
export const demographicPayload = (input) => { const values={...input,ageYears:input.ageYears === "" ? null : Number(input.ageYears)}; return Object.fromEntries(Object.keys(demographicDefaults).map((key) => [key, values[key] === "" && !["firstName", "lastName"].includes(key) ? null : values[key]])); };
export const pickDefaults = (defaults, record = {}) => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, record[key] ?? value]));
export function Field({ label, name, value, onChange, type = "text", required, maxLength = 100, options, children }) {
  const id = useId();
  return <div className="space-y-1.5 text-sm font-medium"><label htmlFor={id}>{label}{required ? " *" : ""}</label>{options ? <Select id={id} name={name} value={value ?? ""} onChange={(event) => onChange(name, event.target.value)}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? human(option)}</option>)}</Select> : children || <Input id={id} name={name} type={type} required={required} maxLength={maxLength} value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} />}</div>;
}
export function DemographicFields({ values, onChange }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Field label="First name" name="firstName" value={values.firstName} onChange={onChange} required />
    <Field label="Last name" name="lastName" value={values.lastName} onChange={onChange} />
    <Field label="Preferred name" name="preferredName" value={values.preferredName} onChange={onChange} />
    <Field label="Age (years)" name="ageYears" type="number" value={values.ageYears} onChange={onChange} />
    <Field label="Date of birth" name="dateOfBirth" type="date" value={values.dateOfBirth} onChange={onChange} />
    <Field label="Sex" name="sex" value={values.sex} onChange={onChange} options={["unknown", "female", "male", "other"]} />
    <Field label="Phone" name="phone" type="tel" maxLength={30} value={values.phone} onChange={onChange} />
    <Field label="Email" name="email" type="email" maxLength={255} value={values.email} onChange={onChange} />
    <Field label="Gender identity" name="genderIdentity" maxLength={80} value={values.genderIdentity} onChange={onChange} />
    <Field label="Blood group" name="bloodGroup" value={values.bloodGroup} onChange={onChange} options={[{ value: "", label: "Not recorded" }, "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]} />
    <Field label="Marital status" name="maritalStatus" value={values.maritalStatus} onChange={onChange} options={["unknown", "single", "married", "divorced", "widowed", "other"]} />
    <Field label="Occupation" name="occupation" maxLength={120} value={values.occupation} onChange={onChange} />
    <Field label="Nationality" name="nationality" maxLength={80} value={values.nationality} onChange={onChange} />
    <Field label="Preferred language" name="preferredLanguage" maxLength={80} value={values.preferredLanguage} onChange={onChange} />
    <Field label="Date of death (if applicable)" name="deceasedDate" type="date" value={values.deceasedDate} onChange={onChange} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.birthDateEstimated} onChange={(event) => onChange("birthDateEstimated", event.target.checked)} />Birth date is estimated</label>
  </div>;
}
export function ContactFields({ values, onChange, fixedKind = false }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {!fixedKind && <Field label="Contact category" name="kind" value={values.kind} onChange={onChange} options={["emergency", "guardian"]} />}
    <Field label="Contact name" name="name" maxLength={200} value={values.name} onChange={onChange} required />
    <Field label="Relationship" name="relationship" maxLength={80} value={values.relationship} onChange={onChange} required />
    <Field label="Contact phone" name="phone" type="tel" maxLength={30} value={values.phone} onChange={onChange} required />
    <Field label="Alternate phone" name="alternatePhone" type="tel" maxLength={30} value={values.alternatePhone} onChange={onChange} />
    <Field label="Contact email" name="email" type="email" maxLength={255} value={values.email} onChange={onChange} />
    <Field label="Contact address" name="address" maxLength={500} value={values.address} onChange={onChange} />
    <Field label="Contact notes" name="notes" maxLength={1000} value={values.notes} onChange={onChange} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.isPrimary} onChange={(event) => onChange("isPrimary", event.target.checked)} />Primary contact in this category</label>
  </div>;
}
export function AddressFields({ values, onChange }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Address category" name="kind" value={values.kind} onChange={onChange} options={["current", "permanent", "other"]} />
    <Field label="Address line 1" name="line1" maxLength={255} value={values.line1} onChange={onChange} required />
    <Field label="Address line 2" name="line2" maxLength={255} value={values.line2} onChange={onChange} />
    {["city", "district", "state"].map((key) => <Field key={key} label={human(key)} name={key} value={values[key]} onChange={onChange} />)}
    <Field label="Postal code" name="postalCode" maxLength={20} value={values.postalCode} onChange={onChange} />
    <Field label="Country code" name="country" maxLength={2} value={values.country} onChange={(key, value) => onChange(key, value.toUpperCase())} required />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.isPrimary} onChange={(event) => onChange("isPrimary", event.target.checked)} />Primary address</label>
  </div>;
}
export function IdentifierFields({ values, onChange }) {
  return <div className="grid gap-4 sm:grid-cols-3"><Field label="Identifier type" name="type" value={values.type} onChange={onChange} options={["national_id", "passport", "birth_certificate", "other"]} /><Field label="Identifier value" name="value" value={values.value} onChange={onChange} required /><Field label="Issuing country code" name="issuingCountry" maxLength={2} value={values.issuingCountry} onChange={(key, value) => onChange(key, value.toUpperCase())} /></div>;
}
export function PatientError({ error, onReload }) {
  return error ? <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><p>{typeof error === "string" ? error : errorMessage(error)}</p>{onReload && <button type="button" className="mt-2 underline" onClick={onReload}>Reload patient profile</button>}</div> : null;
}
