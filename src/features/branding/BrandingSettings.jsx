"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useGetBrandingQuery, useSaveBrandingMutation, useResetBrandingMutation, usePreviewBrandingMutation } from "./brandingApi";
const message = (error) => error?.data?.error?.message || "Branding could not be updated. Check the values and try again.";

export function BrandingSettings({ scope = "tenant" }) {
  const { permissions, isPlatformAdmin } = useAppSelector((state) => state.auth);
  const allowed = scope === "platform" ? isPlatformAdmin : permissions.includes("branding.manage");
  const query = useGetBrandingQuery(scope, { skip: !allowed });
  if (!allowed) return <Card><h1>Branding access denied</h1><p>Branding management permission is required.</p></Card>;
  if (query.isLoading) return <p role="status">Loading branding...</p>;
  if (query.isError) return <Card><p role="alert">Branding could not be loaded.</p><Button onClick={query.refetch}>Retry branding</Button></Card>;
  if (!query.data?.data) return null;
  return <div className="space-y-6"><PageHeader title={scope === "platform" ? "Platform branding" : "Branding"} description="Manage display identity, colors and login/print presentation. Saving applies changes immediately." /><BrandingForm scope={scope} data={query.data.data} /></div>;
}
function BrandingForm({ scope, data }) {
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({ defaultValues: data.branding });
  const [save, saving] = useSaveBrandingMutation(), [inherit, inheriting] = useResetBrandingMutation(), [preview, previewing] = usePreviewBrandingMutation();
  const [error, setError] = useState(null), [notice, setNotice] = useState(null), [sample, setSample] = useState(null);
  const busy = saving.isLoading || inheriting.isLoading || previewing.isLoading;
  const submit = handleSubmit(async (values) => {
    setError(null); setNotice(null);
    try { const result = await save({ scope, values }).unwrap(); reset(result.data.branding); setSample(null); setNotice("Branding saved. Changes are active."); }
    catch (failure) { setError(message(failure)); }
  });
  const showPreview = handleSubmit(async (values) => {
    setError(null);
    try { setSample((await preview({ scope, values }).unwrap()).data); }
    catch (failure) { setError(message(failure)); }
  });
  const resetBranding = async () => {
    setError(null); setNotice(null);
    try { const result = await inherit(scope).unwrap(); reset(result.data.branding); setSample(null); setNotice(scope === "platform" ? "Built-in branding restored." : "Platform branding inherited."); }
    catch (failure) { setError(message(failure)); }
  };
  return <Card><form onSubmit={submit} className="space-y-5">
    <p className="text-sm text-muted-foreground">Branding is separate from your organization&apos;s official name and support settings. Contact details remain private unless you choose to publish them.</p>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {[["displayName", "Display name", 200], ["shortName", "Short name", 60], ["logoUrl", "Hospital logo URL", 500], ["primaryColor", "Primary color", 7], ["accentColor", "Accent color", 7], ["phone", "Contact phone", 30], ["email", "Contact email", 255], ["website", "Website", 500]].map(([key, label, max]) => <div key={key} className="space-y-1.5"><label htmlFor={`branding-${key}`} className="block text-sm font-medium">{label}</label><Input id={`branding-${key}`} {...register(key)} maxLength={max} required={key === "displayName" || key.endsWith("Color")} type={key === "email" ? "email" : ["website","logoUrl"].includes(key) ? "url" : "text"} pattern={key.endsWith("Color") ? "#[0-9a-fA-F]{6}" : undefined} placeholder={key.endsWith("Color") ? "#2563eb" : undefined} /></div>)}
      {[["address", "Contact address", 500], ["printHeader", "Print header", 1000], ["printFooter", "Print footer", 1000]].map(([key, label, max]) => <div key={key} className="space-y-1.5"><label htmlFor={`branding-${key}`} className="block text-sm font-medium">{label}</label><Textarea id={`branding-${key}`} {...register(key)} maxLength={max} /></div>)}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("showLoginBranding")} />Show branding on login</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("publicContacts")} />Publish contact details on login</label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || !isDirty}>Save branding</Button><Button variant="outline" disabled={busy} onClick={showPreview}>Preview branding</Button><Button variant="outline" disabled={busy || isDirty || !Object.keys(data.local).length} onClick={resetBranding}>{scope === "platform" ? "Use built-in branding" : "Inherit platform branding"}</Button></div>
    {isDirty && <p className="text-sm text-muted-foreground">You have unsaved changes.</p>}
    {sample && <div className="grid gap-4 sm:grid-cols-2"><section className="rounded-md border p-4"><h2 className="font-semibold">Login preview</h2>{sample.login ? <><p style={{ borderLeft: `4px solid ${sample.login.primaryColor}`, paddingLeft: 8 }}>{sample.login.displayName}</p><p>{sample.login.shortName}</p>{["address", "phone", "email", "website"].map((key) => sample.login[key] ? <p key={key}>{sample.login[key]}</p> : null)}</> : <p>Login branding is disabled.</p>}</section><section className="rounded-md border p-4"><h2 className="font-semibold">Print preview</h2><p className="whitespace-pre-wrap">{sample.branding.printHeader}</p><p className="my-4 font-medium">{sample.branding.displayName}</p><p className="whitespace-pre-wrap">{sample.branding.printFooter}</p></section></div>}
  </form></Card>;
}
