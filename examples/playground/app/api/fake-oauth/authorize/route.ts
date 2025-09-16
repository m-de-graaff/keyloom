export async function GET(req: Request) {
  const url = new URL(req.url)
  const redirectUri = url.searchParams.get('redirect_uri')!
  const state = url.searchParams.get('state')!
  return Response.redirect(`${redirectUri}?code=FAKE_CODE&state=${encodeURIComponent(state)}`)
}

