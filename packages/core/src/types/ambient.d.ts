declare module '@node-rs/argon2' {
  export function hash(password: string, opts?: Record<string, unknown>): Promise<string>
  export function verify(hash: string, password: string): Promise<boolean>
}

declare module 'bcryptjs' {
  export function hash(password: string, rounds?: number): Promise<string>
  export function compare(password: string, hash: string): Promise<boolean>
}
