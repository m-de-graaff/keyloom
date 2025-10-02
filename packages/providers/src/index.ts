// Re-export all providers

export { default as apple } from './apple/index'
export { default as auth0 } from './auth0/index'
export { default as authentik } from './authentik/index'
export { default as discord } from './discord/index'
export { default as facebook } from './facebook/index'
export { default as githubProvider, github } from './github/index'
export { default as gitlab } from './gitlab/index'
export { default as google } from './google/index'
export { default as instagram } from './instagram/index'
export { default as linkedin } from './linkedin/index'
export { default as microsoft } from './microsoft/index'
export { default as reddit } from './reddit/index'
export { default as spotify } from './spotify/index'
export { default as tiktok } from './tiktok/index'
export { default as twitch } from './twitch/index'
export { default as x } from './x/index'

// DX helpers for custom providers
export * from './factory'
export * as testing from './testing/contract'
export * as templates from './templates/department-education'
