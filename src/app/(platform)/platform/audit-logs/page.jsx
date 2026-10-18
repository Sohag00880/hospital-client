"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { useListAuditLogsQuery } from "@/features/platform/auditApi";

function severityVariant(sev) {
  return {
    info: "default",
    warning: "warning",
    critical: "destructive",
  }[sev] ?? "default";
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB",{timeZone:"Asia/Dhaka"});
  } catch {
    return iso;
  }
}

export default function PlatformAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, isFetching } = useListAuditLogsQuery({
    page,
    pageSize: 50,
    search: search || undefined,
    severity: severity || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const columns = [
    {
      key: "createdAt",
      header: "Time",
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(r.createdAt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      accessor: (r) => (
        <span className="font-medium text-xs">{r.action}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      accessor: (r) => (
        <Badge variant={severityVariant(r.severity)}>
          {r.severity ?? "info"}
        </Badge>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      accessor: (r) => (
        <span className="text-xs">{r.tenantName ?? "—"}</span>
      ),
    },
    {
      key: "user",
      header: "User",
      accessor: (r) => (
        <span className="text-xs">{r.userEmail ?? "—"}</span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      accessor: (r) => (
        <span className="text-xs">
          {r.entityType ? `${r.entityType}` : "—"}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.ipAddress ?? "—"}
        </span>
      ),
    },
  ];

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description={`${total} event${total === 1 ? "" : "s"} recorded`}
        breadcrumbs={[
          { label: "Platform", href: "/platform/tenants" },
          { label: "Audit Logs" },
        ]}
      />

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search action, entity, description"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="To"
            />
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        loading={isLoading || isFetching}
        emptyTitle="No audit events"
        emptyDescription="Activity will appear here as users interact with the system."
      />

      {total > 50 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded border border-border px-3 py-1 hover:bg-muted disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              className="rounded border border-border px-3 py-1 hover:bg-muted disabled:opacity-50"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 50 >= total}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}