export type OAuthProvider = {
  id: string
  discovery?: { issuer: string }
  authorization: { url: string; params?: Record<string, string> }
  token: {
    url: string
    style?: 'json' | 'form'
    headers?: Record<string, string>
    customizeBody?: (
      body: URLSearchParams | Record<string, unknown>,
    ) =>
      | URLSearchParams
      | Record<string, unknown>
      | Promise<URLSearchParams | Record<string, unknown>>
  }
  userinfo?: {
    url?: string // may be omitted when using id_token
    map?: (raw: any, tokens: Tokens) => Profile
  }
  profileFromIdToken?: (claims: Record<string, any>) => Profile
  scopes?: string[]
}

export type Profile = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  emailVerified?: boolean
}

export type Tokens = {
  access_token: string
  token_type?: string
  refresh_token?: string
  expires_in?: number
  id_token?: string
  scope?: string
}
