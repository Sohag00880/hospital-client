"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useUpdateRoleMutation, useCloneRoleMutation } from "@/features/roles/rolesApi";

export function EditRoleModal({ role, clone, onClose }) {
  const [values, setValues] = useState({ name: clone ? `${role.name} Copy` : role.name, slug: `${role.slug}_copy`, description: role.description || "", level: role.level, permissionsScope: role.permissionsScope, allowedScopes: role.allowedScopes || ["self"] });
  const [error, setError] = useState("");
  const [update, updateState] = useUpdateRoleMutation();
  const [copy, copyState] = useCloneRoleMutation();
  const field = (key) => ({ value: values[key], onChange: (e) => setValues({ ...values, [key]: e.target.value }) });
  const save = async (e) => {
    e.preventDefault(); setError("");
    try {
      if (clone) await copy({ roleId: role.id, name: values.name, slug: values.slug, description: values.description }).unwrap();
      else await update({ roleId: role.id, name: values.name, description: values.description, level: Number(values.level), permissionsScope: values.permissionsScope, allowedScopes: values.allowedScopes }).unwrap();
      onClose();
    } catch (err) { setError(err?.data?.error?.message || "Unable to save role"); }
  };
  return <Modal open onClose={onClose} title={clone ? "Clone Role" : "Edit Role"}><form onSubmit={save} className="space-y-3">
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    <label className="block text-sm">Name<Input required minLength={2} maxLength={100} {...field("name")} /></label>
    {clone && <label className="block text-sm">Slug<Input required minLength={2} maxLength={100} pattern="[a-z0-9_]+" {...field("slug")} /></label>}
    <label className="block text-sm">Description<Input maxLength={500} {...field("description")} /></label>
    {!clone && <>
      <label className="block text-sm">Level<Input type="number" required min={1} max={99} {...field("level")} /></label>
      <label className="block text-sm">Permission scope<Select {...field("permissionsScope")}>{["tenant", "organization", "self"].map((s) => <option key={s}>{s}</option>)}</Select></label>
      <fieldset className="space-y-1"><legend className="text-sm">Allowed scopes</legend>{["self", "assigned", "organization", "tenant"].map((scope) => <label key={scope} className="flex gap-2 text-sm"><input type="checkbox" checked={values.allowedScopes.includes(scope)} onChange={(e) => setValues({ ...values, allowedScopes: e.target.checked ? [...values.allowedScopes, scope] : values.allowedScopes.filter((s) => s !== scope) })} />{scope}</label>)}</fieldset>
    </>}
    <Button type="submit" disabled={updateState.isLoading || copyState.isLoading}>Save</Button>
  </form></Modal>;
}
