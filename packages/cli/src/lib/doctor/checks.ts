export type CheckResult = { id: string; ok: boolean; warn?: boolean; message: string }

export async function runDoctorChecks(_cwd = process.cwd()): Promise<CheckResult[]> {
  // Minimal placeholder checks; real implementation will include network/db checks
  const results: CheckResult[] = []
  const hasAuthSecret = !!process.env.AUTH_SECRET
  results.push({
    id: 'env:AUTH_SECRET',
    ok: hasAuthSecret,
    message: hasAuthSecret ? 'AUTH_SECRET present' : 'AUTH_SECRET missing',
  })
  return results
}
