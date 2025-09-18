# Template: Department of Education Provider

This example mirrors a real-world IdP with quirks: form-encoded token exchange, custom headers, and a bespoke `/me` profile.

```ts
import { departmentOfEducation } from '@keyloom/providers/templates/department-education'

const deptEdu = departmentOfEducation({
  clientId: process.env.DEPT_EDU_CLIENT_ID!,
  clientSecret: process.env.DEPT_EDU_CLIENT_SECRET!,
})

// In Next.js config
providers: [deptEdu]
```

Key traits:
- `tokenStyle: 'form'` with `Accept: application/json`
- Robust `mapProfile` that tolerates non-OIDC shapes
- Scopes: `profile email`

For test validation:

```ts
import { testing } from '@keyloom/providers'
const res = testing.runProviderContract(deptEdu)
if (!res.ok) throw new Error(res.errors.join('\n'))
```

