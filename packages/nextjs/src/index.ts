export { createNextHandler } from './handler'
export { createAuthMiddleware } from './middleware'
export { getSession, getUser, guard } from './server-helpers'

// Pages Router bridge (optional):
export function createPagesApiHandler(config: any) {
  const { GET, POST } = require('./handler').createNextHandler(config)
  return async (req: any, res: any) => {
    const method = req.method?.toUpperCase()
    const url = `http://local${req.url}`
    // minimal NextRequest-like object (enough for handler)
    const fakeReq = {
      url,
      method,
      headers: new Map(Object.entries(req.headers)),
      json: async () => req.body,
    } as any
    const resp = method === 'GET' ? await GET(fakeReq) : await POST(fakeReq)
    res.statusCode = resp.status ?? 200
    for (const [k, v] of resp.headers) res.setHeader(k, v as any)
    const body = (await resp.text?.()) ?? JSON.stringify(await resp.json())
    res.end(body)
  }
}
