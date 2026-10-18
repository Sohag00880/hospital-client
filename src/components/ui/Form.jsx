"use client";

import { createContext, useContext } from "react";
import { FormProvider as RHFProvider, useFormContext } from "react-hook-form";
import { cn } from "@/lib/cn";
import { Input } from "./Input";

export function FormProvider({ form, children, className, onSubmit }) {
  return (
    <RHFProvider {...form}>
      <form
        className={cn("space-y-4", className)}
        onSubmit={onSubmit ?? form.handleSubmit(() => {})}
        noValidate
      >
        {children}
      </form>
    </RHFProvider>
  );
}

const FieldContext = createContext(null);

export function FormField({ name, label, description, required, children }) {
  const ctx = useFormContext();
  const error = ctx?.formState?.errors?.[name];

  return (
    <FieldContext.Provider value={{ name }}>
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={name}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
        )}
        {children}
        {description && !error?.message && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {error?.message && (
          <p className="text-xs text-destructive" role="alert">
            {error.message}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export function FormInput(props) {
  const ctx = useFormContext();
  const field = useContext(FieldContext);
  if (!field || !ctx) {
    return <Input {...props} />;
  }
  const error = ctx.formState.errors?.[field.name];
  return (
    <Input {...ctx.register(field.name)} invalid={Boolean(error)} {...props} />
  );
}