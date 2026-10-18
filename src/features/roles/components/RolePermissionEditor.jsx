"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import {
  useGetRoleQuery,
  useListPermissionsQuery,
  useSetRolePermissionsMutation,
} from "@/features/roles/rolesApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";
import { cn } from "@/lib/cn";

export function RolePermissionEditor({ role, open, onClose }) {
  const dispatch = useAppDispatch();
  const roleId = role?.id;

  const { data: roleData, isLoading: loadingRole } = useGetRoleQuery(roleId, {
    skip: !roleId,
  });
  const { data: allPermsData, isLoading: loadingPerms } = useListPermissionsQuery(
    undefined,
    { skip: !open },
  );
  const [setPerms, { isLoading: saving }] = useSetRolePermissionsMutation();

  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (roleData?.data?.permissions) {
      setSelected(new Set(roleData.data.permissions.map((p) => p.code)));
    }
  }, [roleData]);

  const toggle = (code) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  };

  const toggleCategory = (category, codes, on) => {
    const next = new Set(selected);
    for (const c of codes) {
      if (on) next.add(c);
      else next.delete(c);
    }
    setSelected(next);
  };

  const handleSave = async () => {
    try {
      await setPerms({
        roleId,
        permissionCodes: Array.from(selected),
      }).unwrap();
      dispatch(
        pushToast({ title: "Permissions updated", variant: "success" }),
      );
      onClose();
    } catch (err) {
      dispatch(
        pushToast({
          title: "Failed",
          description: err?.data?.error?.message ?? "Unknown error",
          variant: "error",
        }),
      );
    }
  };

  // Group permissions by category
  const allPerms = allPermsData?.data ?? [];
  const grouped = allPerms.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const isSystemLocked = role?.isSystem && !role?.isEditable;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Permissions — ${role?.name ?? ""}`}
      description={role?.slug}
      widthClass="w-[560px]"
    >
      {loadingRole || loadingPerms ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {isSystemLocked && (
            <div className="rounded border border-warning/40 bg-warning/10 p-3 text-xs">
              This is a locked system role — permissions cannot be changed.
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selected.size} of {allPerms.length} selected
            </p>
            {!isSystemLocked && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {Object.entries(grouped).map(([category, perms]) => {
              const codes = perms.map((p) => p.code);
              const allOn = codes.every((c) => selected.has(c));
              return (
                <div key={category} className="rounded border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold capitalize">
                        {category}
                      </h4>
                      <Badge variant="default">{perms.length}</Badge>
                    </div>
                    {!isSystemLocked && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() =>
                          toggleCategory(category, codes, !allOn)
                        }
                      >
                        {allOn ? "Unselect all" : "Select all"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-start gap-2 rounded px-2 py-1.5",
                          !isSystemLocked && "cursor-pointer hover:bg-muted",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.code)}
                          onChange={() => toggle(p.code)}
                          disabled={isSystemLocked}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.code}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {!isSystemLocked && (
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card pt-4">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save permissions"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}