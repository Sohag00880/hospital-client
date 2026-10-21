"use client";
import {formatAddress} from "@/lib/address";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { bangladeshTimestamp } from "@/lib/time";

const label = value => value ? value.replaceAll("_", " ").replace(/^./, c => c.toUpperCase()) : "Not recorded";
const stamp = value => value ? `${bangladeshTimestamp(value)} (Bangladesh time)` : "Not recorded";

export function BookingDetails({ row, age, onClose }) {
  const fields = [
    ["Patient", row.patientName], ["MRN", row.mrn], ["Phone", row.phone],
    ["Address",formatAddress(row.address)],
    ["Age", age], ["Gender", label(row.gender)], ["Doctor", row.doctorName],
    ["Appointment date", row.date], [row.status === "pending" ? "Estimated serial" : "Serial", row.serialNumber ?? row.estimatedSerialNumber ?? "-"],
    ["Visit type", row.visitType === "follow_up" ? "Follow-up" : "New"],
    ["Amount", row.amount == null ? "Not recorded" : Number(row.amount).toFixed(2)],
    ["Reference By", row.referenceName], ["Reference ID", row.referenceCode],
    ["Status", label(row.status)], ["Created By", row.createdByName],
    ["Time & date", stamp(row.createdAt)],
    ["Refund amount",row.refundAmount == null ? "-" : Number(row.refundAmount).toFixed(2)],
    ["Refunded",row.refundedAt && stamp(row.refundedAt)], ["Refund reason",row.refundReason],
    ["Confirmed", row.checkedInAt && stamp(row.checkedInAt)],
    ["Consultation started", row.startedAt && stamp(row.startedAt)],
    ["Completed", row.completedAt && stamp(row.completedAt)],
    ["Reason", row.reason], ["Cancellation reason", row.cancellationReason],
  ];
  return <Modal open title="Patient and booking details" size="lg" onClose={onClose}>
    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
      <dl className="grid gap-4 sm:grid-cols-2">{fields.map(([name, value]) => <div key={name} className="rounded-md border p-3"><dt className="text-xs font-medium text-muted-foreground">{name}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{value === "" || value == null ? "Not recorded" : value}</dd></div>)}</dl>
      <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div>
    </div>
  </Modal>;
}
