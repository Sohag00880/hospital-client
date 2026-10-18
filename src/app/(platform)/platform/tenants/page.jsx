"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Ban, Eye, Pencil, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import {
  useListTenantsQuery,
} from "@/features/platform/platformApi";
import { useAppDispatch } from "@/store/hooks";

function statusVariant(status) {
  return {
    trial: "warning",
    active: "success",
    suspended: "destructive",
    cancelled: "default",
  }[status] ?? "default";
}

export default function PlatformTenantsPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isFetching } = useListTenantsQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const columns = [
    {
      key: "name",
      header: "Tenant",
      accessor: (t) => (
        <div>
          <p className="font-medium">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.slug}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      accessor: (t) => <span className="capitalize">{t.type}</span>,
    },
    {
      key: "plan",
      header: "Plan",
      accessor: (t) => <Badge variant="primary">{t.plan}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (t) => (
        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      accessor: (t) => (
        <span className="text-xs text-muted-foreground">
          {t.contactEmail || t.contactPhone || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      accessor: (t) => (
        <div className="flex justify-end gap-1">
          <Link href={`/platform/tenants/${t.id}`}>
            <Button variant="ghost" size="icon" title="View">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/platform/tenants/${t.id}/edit`}>
            <Button variant="ghost" size="icon" title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          {t.status === "suspended" && (
            <Link href={`/platform/tenants/${t.id}`}>
              <Button variant="ghost" size="icon" title="Reactivate">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </Button>
            </Link>
          )}
          {t.status === "active" && (
            <Link href={`/platform/tenants/${t.id}`}>
              <Button variant="ghost" size="icon" title="Suspend">
                <Ban className="h-4 w-4 text-destructive" />
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Tenants"
        description={`${total} hospital${total === 1 ? "" : "s"} on the platform`}
        breadcrumbs={[
          { label: "Platform", href: "/platform/tenants" },
          { label: "Tenants" },
        ]}
        actions={
          <Link href="/platform/tenants/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Tenant
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, slug, or email"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(t) => t.id}
        loading={isLoading || isFetching}
        emptyTitle="No tenants yet"
        emptyDescription="Create your first tenant to get started."
      />
    </>
  );
}