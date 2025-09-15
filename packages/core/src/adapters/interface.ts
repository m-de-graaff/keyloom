import type { User } from '../types';
export interface Adapter {
  createUser(data: Partial<User>): Promise<User>;
  getUser(id: string): Promise<User | null>;
}
