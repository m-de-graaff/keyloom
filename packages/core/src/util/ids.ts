import { randomUUID } from 'node:crypto' // use UUID v4 for now; swap to ulid/uuidv7 later
export const newId = () => randomUUID()
