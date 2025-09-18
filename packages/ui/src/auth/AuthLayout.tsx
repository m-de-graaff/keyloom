"use client";
import * as React from "react";
import { Card } from "../components/card";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md border shadow-lg">
        <div className="p-6 sm:p-8">
          {(title || subtitle) && (
            <header className="mb-6 space-y-2 text-center">
              {title && (
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </header>
          )}
          <div className="grid gap-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </div>
      </Card>
    </div>
  );
}

