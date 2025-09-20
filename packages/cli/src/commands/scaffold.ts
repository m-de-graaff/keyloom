import { join, dirname } from "node:path";
import { writeFileSafe, ensureDir } from "../lib/fs";
import inquirer from "inquirer";
import { spinner, ui, section, banner } from "../lib/ui";
import { existsSync } from "node:fs";

function parseArgs(args: string[]) {
  const out: {
    pages?: string[];
    router?: "app" | "pages";
    cwd?: string;
    all?: boolean;
  } = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--router") out.router = (args[++i] as any) ?? undefined;
    else if (a === "--cwd") out.cwd = args[++i];
    else if (a === "--all") out.all = true;
    else rest.push(a);
  }
  if (rest.length) out.pages = rest;
  return out;
}

const PAGE_KINDS = [
  "login",
  "register",
  "admin",
  "settings",
  "forgot-password",
  "reset-password",
  "verify-email",
  "setup-2fa",
  "verify-2fa",
] as const;

type PageKind = (typeof PAGE_KINDS)[number];

type RouterKind = "app" | "pages";

export async function scaffoldCommand(argv: string[]) {
  const flags = parseArgs(argv);
  const cwd = flags.cwd || process.cwd();

  banner("Keyloom Scaffold");

  // 1) Decide what to scaffold
  const pages: PageKind[] = flags.all
    ? [...PAGE_KINDS]
    : flags.pages?.length
    ? (flags.pages.filter((p): p is PageKind =>
        (PAGE_KINDS as readonly string[]).includes(p)
      ) as PageKind[])
    : (
        await inquirer.prompt<{ pages: PageKind[] }>([
          {
            name: "pages",
            type: "checkbox",
            message: "Select pages to scaffold",
            choices: PAGE_KINDS.map((k) => ({ name: k, value: k })),
            validate: (v: any[]) =>
              v.length ? true : "Select at least one page",
          },
        ])
      ).pages;

  const router: RouterKind =
    flags.router ??
    (
      await inquirer.prompt<{ router: RouterKind }>([
        {
          name: "router",
          type: "list",
          message: "Next.js router to target",
          choices: [
            { name: "App Router (app/)", value: "app" },
            { name: "Pages Router (pages/)", value: "pages" },
          ],
        },
      ])
    ).router;

  section("Scaffolding");
  const s = spinner("Writing files");
  try {
    for (const p of pages) {
      switch (p) {
        case "login":
          router === "app" ? writeAppLogin(cwd) : writePagesLogin(cwd);
          break;
        case "register":
          router === "app" ? writeAppRegister(cwd) : writePagesRegister(cwd);
          break;
        case "admin":
          router === "app" ? writeAppAdmin(cwd) : writePagesAdmin(cwd);
          break;
        case "settings":
          router === "app" ? writeAppSettings(cwd) : writePagesSettings(cwd);
          break;
        case "forgot-password":
          router === "app"
            ? writeAppForgotPassword(cwd)
            : writePagesForgotPassword(cwd);
          break;
        case "reset-password":
          router === "app"
            ? writeAppResetPassword(cwd)
            : writePagesResetPassword(cwd);
          break;
        case "verify-email":
          router === "app"
            ? writeAppVerifyEmail(cwd)
            : writePagesVerifyEmail(cwd);
          break;
        case "setup-2fa":
          router === "app" ? writeAppSetup2fa(cwd) : writePagesSetup2fa(cwd);
          break;
        case "verify-2fa":
          router === "app" ? writeAppVerify2fa(cwd) : writePagesVerify2fa(cwd);
          break;
      }
    }
    s.succeed("Files created");
  } catch (e: any) {
    s.fail("Failed to write some files");
    ui.error(e?.message || String(e));
    ui.info(
      "Tip: re-run with --router app|pages and ensure your project has the expected folder structure."
    );
    process.exit(1);
  }

  section("Next steps");
  ui.info(
    "- Ensure your Keyloom API handler is set up: app/api/auth/[[...keyloom]]/route.ts or pages/api/auth/[...keyloom].ts"
  );
  ui.info(
    "- Add middleware.ts with createAuthMiddleware if not already present"
  );
  ui.info("- Run `keyloom doctor` to validate configuration");
}

function writeAppLogin(cwd: string) {
  const path = join(cwd, "app", "(auth)", "sign-in", "page.tsx");
  const code = `"use client"\nimport { Card } from '@keyloom/ui/components/card'\nimport { Providers, SignInForm } from '@keyloom/ui/auth'\n\nexport const metadata = { title: 'Sign in' }\n\nexport default function Page() {\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <Card className=\"w-full max-w-md p-6 space-y-6\">\n        <h1 className=\"text-2xl font-semibold\">Welcome back</h1>\n        <Providers callbackUrl=\"/dashboard\" />\n        <div className=\"relative\">\n          <div className=\"absolute inset-0 flex items-center\">\n            <span className=\"w-full border-t\" />\n          </div>\n          <div className=\"relative flex justify-center text-xs uppercase\">\n            <span className=\"bg-background px-2 text-muted-foreground\">or</span>\n          </div>\n        </div>\n        <SignInForm redirectTo=\"/dashboard\" />\n      </Card>\n    </div>\n  )\n}\n`;
  function writeAppForgotPassword(cwd: string) {
    const path = join(cwd, "app", "(auth)", "forgot-password", "page.tsx");
    const code = `"use client"\nimport { Card } from '@keyloom/ui/components/card'\nimport { ForgotPasswordForm } from '@keyloom/ui/auth'\n\nexport const metadata = { title: 'Forgot password' }\n\nexport default function Page() {\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <Card className=\"w-full max-w-md p-6\">\n        <h1 className=\"text-2xl font-semibold mb-4\">Reset your password</h1>\n        <ForgotPasswordForm />\n      </Card>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writePagesForgotPassword(cwd: string) {
    const path = join(cwd, "pages", "forgot-password.tsx");
    const code = `import dynamic from 'next/dynamic'\nconst ForgotPasswordForm = dynamic(() => import('@keyloom/ui/auth').then(m => m.ForgotPasswordForm), { ssr: false })\nexport default function Page() {\n  return (\n    <div className=\"min-h-screen grid place-items-center p-6\">\n      <div className=\"w-full max-w-md\">\n        <h1 className=\"text-2xl font-semibold mb-4\">Reset your password</h1>\n        <ForgotPasswordForm />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writeAppResetPassword(cwd: string) {
    const path = join(cwd, "app", "(auth)", "reset-password", "page.tsx");
    const code = `"use client"\nimport { Card } from '@keyloom/ui/components/card'\nimport { ResetPasswordForm } from '@keyloom/ui/auth'\n\nexport const metadata = { title: 'Reset password' }\n\nexport default function Page() {\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <Card className=\"w-full max-w-md p-6\">\n        <h1 className=\"text-2xl font-semibold mb-4\">Reset password</h1>\n        <ResetPasswordForm />\n      </Card>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writePagesResetPassword(cwd: string) {
    const path = join(cwd, "pages", "reset-password.tsx");
    const code = `import dynamic from 'next/dynamic'\nconst ResetPasswordForm = dynamic(() => import('@keyloom/ui/auth').then(m => m.ResetPasswordForm), { ssr: false })\nexport default function Page() {\n  return (\n    <div className=\"min-h-screen grid place-items-center p-6\">\n      <div className=\"w-full max-w-md\">\n        <h1 className=\"text-2xl font-semibold mb-4\">Reset password</h1>\n        <ResetPasswordForm />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writeAppVerifyEmail(cwd: string) {
    const path = join(cwd, "app", "(auth)", "verify-email", "page.tsx");
    const code = `import { EmailVerificationForm } from '@keyloom/ui/auth'\nexport const metadata = { title: 'Verify email' }\nexport default function Page({ searchParams }: { searchParams?: { email?: string } }) {\n  const email = searchParams?.email\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <div className=\"w-full max-w-md p-6 border rounded\">\n        <EmailVerificationForm email={email} />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writePagesVerifyEmail(cwd: string) {
    const path = join(cwd, "pages", "verify-email.tsx");
    const code = `import dynamic from 'next/dynamic'\nconst EmailVerificationForm = dynamic(() => import('@keyloom/ui/auth').then(m => m.EmailVerificationForm), { ssr: false })\nexport default function Page() {\n  return (\n    <div className=\"min-h-screen grid place-items-center p-6\">\n      <div className=\"w-full max-w-md p-6 border rounded\">\n        <EmailVerificationForm />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writeAppSetup2fa(cwd: string) {
    const path = join(cwd, "app", "(auth)", "setup-2fa", "page.tsx");
    const code = `import { guard } from '@keyloom/nextjs'\nimport { TwoFactorSetup } from '@keyloom/ui/auth'\nexport const metadata = { title: 'Two-factor authentication' }\nexport default async function Page() {\n  await guard({ visibility: 'private', redirectTo: '/sign-in' })\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <div className=\"w-full max-w-md p-6 border rounded\">\n        <TwoFactorSetup />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writePagesSetup2fa(cwd: string) {
    const path = join(cwd, "pages", "setup-2fa.tsx");
    const code = `import dynamic from 'next/dynamic'\nconst TwoFactorSetup = dynamic(() => import('@keyloom/ui/auth').then(m => m.TwoFactorSetup), { ssr: false })\nexport default function Page() {\n  return (\n    <div className=\"min-h-screen grid place-items-center p-6\">\n      <div className=\"w-full max-w-md p-6 border rounded\">\n        <TwoFactorSetup />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writeAppVerify2fa(cwd: string) {
    const path = join(cwd, "app", "(auth)", "verify-2fa", "page.tsx");
    const code = `"use client"\nimport { TwoFactorVerify } from '@keyloom/ui/auth'\nexport const metadata = { title: 'Verify 2FA' }\nexport default function Page() {\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <div className=\"w-full max-w-md p-6 border rounded\">\n        <TwoFactorVerify />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  function writePagesVerify2fa(cwd: string) {
    const path = join(cwd, "pages", "verify-2fa.tsx");
    const code = `import dynamic from 'next/dynamic'\nconst TwoFactorVerify = dynamic(() => import('@keyloom/ui/auth').then(m => m.TwoFactorVerify), { ssr: false })\nexport default function Page() {\n  return (\n    <div className=\"min-h-screen grid place-items-center p-6\">\n      <div className=\"w-full max-w-md p-6 border rounded\">\n        <TwoFactorVerify />\n      </div>\n    </div>\n  )\n}\n`;
    const res = writeFileSafe(path, code, { onExists: "skip" });
    console.log(
      res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
    );
  }

  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}

function writePagesLogin(cwd: string) {
  const path = join(cwd, "pages", "sign-in.tsx");
  const code = `import dynamic from 'next/dynamic'\nconst SignInForm = dynamic(() => import('@keyloom/ui/auth').then(m => m.SignInForm), { ssr: false })\nconst Providers = dynamic(() => import('@keyloom/ui/auth').then(m => m.Providers), { ssr: false })\nexport default function Page() {\n  return (\n    <div className=\"min-h-screen grid place-items-center p-6\">\n      <div className=\"w-full max-w-md space-y-6\">\n        <h1 className=\"text-2xl font-semibold\">Welcome back</h1>\n        <Providers callbackUrl=\"/dashboard\" />\n        <SignInForm redirectTo=\"/dashboard\" />\n      </div>\n    </div>\n  )\n}\n`;
  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}

function writeAppRegister(cwd: string) {
  const path = join(cwd, "app", "(auth)", "register", "page.tsx");
  const code = `"use client"\nimport { Card } from '@keyloom/ui/components/card'\nimport { SignUpForm } from '@keyloom/ui/auth'\nexport const metadata = { title: 'Create account' }\nexport default function Page() {\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <Card className=\"w-full max-w-md p-6\">\n        <h1 className=\"text-2xl font-semibold mb-4\">Create your account</h1>\n        <SignUpForm redirectTo=\"/onboarding\" />\n      </Card>\n    </div>\n  )\n}\n`;
  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}

function writePagesRegister(cwd: string) {
  const path = join(cwd, "pages", "register.tsx");
  const code = `import dynamic from 'next/dynamic'\nconst SignUpForm = dynamic(() => import('@keyloom/ui/auth').then(m => m.SignUpForm), { ssr: false })\nexport default function Page() {\n  return (\n    <div className=\"min-h-screen grid place-items-center p-6\">\n      <div className=\"w-full max-w-md\">\n        <h1 className=\"text-2xl font-semibold mb-4\">Create your account</h1>\n        <SignUpForm redirectTo=\"/onboarding\" />\n      </div>\n    </div>\n  )\n}\n`;
  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}

function writeAppAdmin(cwd: string) {
  const dir = join(cwd, "app", "admin");
  const path = join(dir, "page.tsx");
  const code = `import { guard } from '@keyloom/nextjs'\nexport const metadata = { title: 'Admin' }\nexport default async function Page() {\n  await guard({ visibility: 'role:admin', org: 'required', redirectTo: '/sign-in' })\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-semibold\">Admin</h1>\n      <p className=\"text-muted-foreground\">Restricted area for admins.</p>\n    </div>\n  )\n}\n`;
  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}

function writePagesAdmin(cwd: string) {
  const path = join(cwd, "pages", "admin.tsx");
  const code = `import { getSession } from '@keyloom/nextjs'\nexport default async function Page() {\n  const { user } = await getSession()\n  // TODO: enforce role on server via API route or middleware\n  if (!user) return <div>Unauthorized</div>\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-semibold\">Admin</h1>\n      <p className=\"text-muted-foreground\">Restricted area for admins.</p>\n    </div>\n  )\n}\n`;
  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}

function writeAppSettings(cwd: string) {
  const path = join(cwd, "app", "settings", "page.tsx");
  const code = `import { guard } from '@keyloom/nextjs'\nexport const metadata = { title: 'Settings' }\nexport default async function Page() {\n  const { user } = await guard({ visibility: 'private', redirectTo: '/sign-in' })\n  return (\n    <div className=\"max-w-2xl p-6 space-y-6\">\n      <h1 className=\"text-2xl font-semibold\">Account Settings</h1>\n      <form className=\"space-y-4\">\n        {/* TODO: profile fields + password change */}\n      </form>\n    </div>\n  )\n}\n`;
  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}

function writePagesSettings(cwd: string) {
  const path = join(cwd, "pages", "settings.tsx");
  const code = `import { getSession } from '@keyloom/nextjs'\nexport default async function Page() {\n  const { user } = await getSession()\n  if (!user) return <div>Unauthorized</div>\n  return (\n    <div className=\"max-w-2xl p-6 space-y-6\">\n      <h1 className=\"text-2xl font-semibold\">Account Settings</h1>\n      <form className=\"space-y-4\">\n        {/* TODO: profile fields + password change */}\n      </form>\n    </div>\n  )\n}\n`;
  const res = writeFileSafe(path, code, { onExists: "skip" });
  console.log(
    res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`
  );
}
