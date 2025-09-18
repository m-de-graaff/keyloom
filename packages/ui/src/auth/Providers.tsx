import * as React from "react";
import { ProviderButton } from "../primitives/provider-button";

export type Provider = {
  id: string;
  name?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function Providers({
  providers = defaultProviders,
  callbackUrl,
}: {
  providers?: Provider[];
  callbackUrl?: string;
}) {
  if (!providers?.length) return null;
  return (
    <div className="grid gap-2">
      {providers.map((p) => (
        <ProviderButton
          key={p.id}
          id={p.id}
          {...(callbackUrl ? { callbackUrl } : {})}
          {...(p.icon ? { icon: p.icon } : {})}
        >
          {p.name ?? readable(p.id)}
        </ProviderButton>
      ))}
    </div>
  );
}

const defaultProviders: Provider[] = [{ id: "github" }, { id: "google" }];

function readable(id: string) {
  return id.replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
}
