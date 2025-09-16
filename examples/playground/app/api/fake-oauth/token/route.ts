export async function POST() {
  return Response.json({ access_token: 'FAKE_ACCESS', token_type: 'Bearer', expires_in: 3600 })
}

