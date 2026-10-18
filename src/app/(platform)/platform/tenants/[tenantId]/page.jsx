"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  useGetTenantQuery,
  useSuspendTenantMutation,
  useReactivateTenantMutation,
} from "@/features/platform/platformApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

function statusVariant(status) {
  return {
    trial: "warning",
    active: "success",
    suspended: "destructive",
    cancelled: "default",
  }[status] ?? "default";
}

export default function TenantDetailPage() {
  const { tenantId } = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { data, isLoading, error } = useGetTenantQuery(tenantId);
  const [suspendTenant, { isLoading: suspending }] = useSuspendTenantMutation();
  const [reactivateTenant, { isLoading: reactivating }] =
    useReactivateTenantMutation();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendError, setSuspendError] = useState(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading tenant…" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="text-sm text-destructive">
        Failed to load tenant. {error?.data?.error?.message}
      </div>
    );
  }

  const t = data.data;
  const isSuspended = t.status === "suspended";

  const handleSuspend = async () => {
    setSuspendError(null);
    if (suspendReason.trim().length < 3) {
      setSuspendError("Please provide a reason (min 3 characters)");
      return;
    }
    try {
      await suspendTenant({ tenantId, reason: suspendReason.trim() }).unwrap();
      dispatch(
        pushToast({
          title: "Tenant suspended",
          description: `${t.name} has been suspended.`,
          variant: "warning",
        }),
      );
      setSuspendOpen(false);
      setSuspendReason("");
    } catch (err) {
      setSuspendError(
        err?.data?.error?.message ?? "Failed to suspend tenant.",
      );
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateTenant(tenantId).unwrap();
      dispatch(
        pushToast({
          title: "Tenant reactivated",
          description: `${t.name} is now active.`,
          variant: "success",
        }),
      );
      setReactivateOpen(false);
    } catch (err) {
      dispatch(
        pushToast({
          title: "Failed to reactivate",
          description: err?.data?.error?.message ?? "Unknown error",
          variant: "error",
        }),
      );
    }
  };

  return (
    <>
      <Link
        href="/platform/tenants"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to tenants
      </Link>

      <PageHeader
        title={t.name}
        description={`Slug: ${t.slug}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/platform/tenants/${tenantId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>

            {!isSuspended && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setSuspendOpen(true)}
              >
                <Ban className="h-4 w-4" />
                Suspend
              </Button>
            )}

            {isSuspended && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setReactivateOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Reactivate
              </Button>
            )}
          </div>
        }
      />

      {/* Suspension banner */}
      {isSuspended && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              This tenant is currently suspended
            </p>
            {t.suspensionReason && (
              <p className="mt-1 text-muted-foreground">
                Reason: {t.suspensionReason}
              </p>
            )}
            {t.suspendedAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Suspended on{" "}
                {new Date(t.suspendedAt).toLocaleDateString("en-GB", { timeZone:"Asia/Dhaka",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Overview</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Plan</dt>
              <dd>
                <Badge variant="primary">{t.plan}</Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="capitalize">{t.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Country</dt>
              <dd>{t.country}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Timezone</dt>
              <dd>{t.timezone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Currency</dt>
              <dd>{t.currency}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Contact</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{t.contactEmail || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{t.contactPhone || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">City</dt>
              <dd>{t.city || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="max-w-[60%] text-right">{t.address || "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <p className="text-xs text-muted-foreground">
          Full tenant management (users, subscription) coming in later phases.
        </p>
      </Card>

      {/* Suspend confirmation modal */}
      <Modal
        open={suspendOpen}
        onClose={() => {
          setSuspendOpen(false);
          setSuspendReason("");
          setSuspendError(null);
        }}
        title={`Suspend "${t.name}"?`}
        description="All users of this tenant will be signed out and blocked from accessing the platform until reactivated."
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setSuspendOpen(false);
                setSuspendReason("");
                setSuspendError(null);
              }}
              disabled={suspending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={suspending}
            >
              {suspending ? "Suspending…" : "Suspend Tenant"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Reason for suspension{" "}
            <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="e.g. Non-payment, policy violation, customer request…"
            rows={3}
            invalid={!!suspendError}
          />
          {suspendError && (
            <p className="text-xs text-destructive">{suspendError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Minimum 3 characters. This will be visible to the tenant admin.
          </p>
        </div>
      </Modal>

      {/* Reactivate confirmation modal */}
      <Modal
        open={reactivateOpen}
        onClose={() => setReactivateOpen(false)}
        title={`Reactivate "${t.name}"?`}
        description="All users of this tenant will regain access according to their existing roles and permissions."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setReactivateOpen(false)}
              disabled={reactivating}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleReactivate}
              disabled={reactivating}
            >
              {reactivating ? "Reactivating…" : "Reactivate"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          The tenant will return to <strong>active</strong> status.
        </p>
      </Modal>
    </>
  );
}