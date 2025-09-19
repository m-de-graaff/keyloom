import type { KeyloomAdapter } from "@keyloom/core";

export type AdapterContractResult = { ok: boolean; errors: string[] };

/**
 * Minimal adapter contract checks (shape only) for custom adapters.
 * Use within your test runner to quickly validate required methods exist.
 */
export function runAdapterContract(adapter: Partial<KeyloomAdapter>): AdapterContractResult {
  const errors: string[] = [];
  const reqFns = [
    "createUser",
    "getUserByEmail",
    "createSession",
    "getSession",
    "deleteSession",
    "createVerificationToken",
    "useVerificationToken",
  ];
  for (const fn of reqFns) {
    if (typeof (adapter as any)[fn] !== "function") {
      errors.push(`missing method: ${fn}`);
    }
  }
  // Optional but recommended
  if (!adapter.capabilities) errors.push("missing capabilities");
  return { ok: errors.length === 0, errors };
}

/**
 * Simple fixtures for tests.
 */
export const fixtures = {
  user(email = "user@example.com") {
    return { id: "u_1", email } as any;
  },
  password() {
    return "Passw0rd!";
  },
};

