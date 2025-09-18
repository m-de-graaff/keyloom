declare module '@node-rs/argon2' {
  export interface HashOptions {
    memoryCost?: number
    timeCost?: number
    parallelism?: number
    hashLength?: number
    salt?: string | Uint8Array
    version?: 16 | 19
    variant?: 0 | 1 | 2
  }
  export function hash(password: string, options?: HashOptions): Promise<string>
  export function verify(hash: string, password: string): Promise<boolean>
}

declare module 'bcryptjs' {
  export function hash(
    data: string,
    saltOrRounds: number | string,
  ): Promise<string>
  export function compare(data: string, encrypted: string): Promise<boolean>
}