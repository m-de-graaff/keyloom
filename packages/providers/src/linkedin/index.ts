import type { OAuthProvider, Profile } from '@keyloom/core'

type LinkedInProviderOptions = { 
  clientId: string
  clientSecret: string
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function linkedin(
  opts: LinkedInProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'linkedin',
    authorization: {
      url: 'https://www.linkedin.com/oauth/v2/authorization',
      params: { scope: 'r_liteprofile r_emailaddress' },
    },
    token: {
      url: 'https://www.linkedin.com/oauth/v2/accessToken',
      style: 'form',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
    userinfo: {
      url: 'https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
      map: (raw) => ({
        id: String(raw.id),
        name: raw.firstName?.localized?.en_US && raw.lastName?.localized?.en_US 
          ? `${raw.firstName.localized.en_US} ${raw.lastName.localized.en_US}`
          : null,
        email: null, // Need separate API call for email
        image: raw.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier ?? null,
      }),
    },
    scopes: ['r_liteprofile', 'r_emailaddress'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default linkedin
