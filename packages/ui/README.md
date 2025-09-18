# @keyloom/ui

Keyloom’s UI library for authentication flows, organization management, and reusable primitives. It ships:

- Design tokens, Tailwind preset, and CSS variables (light/dark)
- Headless primitives (forms, OTP, provider button, data table)
- Styled components (Tailwind + Radix UI)
- Auth components (SignIn, SignUp, MagicLink, ResetPassword, 2FA)
- Org & RBAC components (OrgSwitcher, MembersTable, RoleGate)

## Install

pnpm add @keyloom/ui clsx lucide-react tailwindcss @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-checkbox @radix-ui/react-avatar

## Tailwind preset

In tailwind.config.cjs:

```js
const keyloom = require('@keyloom/ui/theme/tailwind-preset.cjs');
module.exports = { presets: [keyloom], content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'] };
```

Global CSS:

```css
@import '@keyloom/ui/theme/css-vars.css';
```

## Usage

```tsx
import { SignInForm, Providers } from '@keyloom/ui/auth';
import { Card } from '@keyloom/ui/components/card';

export default function Page() {
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <Providers callbackUrl="/dashboard" />
        <SignInForm redirectTo="/dashboard" />
      </Card>
    </div>
  );
}
```

See source for more components and props.

