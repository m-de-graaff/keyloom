"use client";
import * as React from "react";

type FieldErr = { message?: string | null } | null | undefined;

export function FieldErrorText({
  error,
  className,
}: {
  error?: string | FieldErr;
  className?: string;
}) {
  if (!error) return null;
  const msg = typeof error === "string" ? error : error.message;
  return (
    <p
      className={`mt-1 text-xs text-danger ${className || ""}`}
      role="alert"
      aria-live="polite"
    >
      {msg}
    </p>
  );
}

export function FormRow({
  label,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className || ""}`}>
      {label && htmlFor && (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
