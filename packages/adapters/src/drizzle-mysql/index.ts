import type { Adapter } from '@keyloom/core';
export function drizzleMysqlAdapter(cfg: { url: string }): Adapter {
  return {
    async createUser(data: Partial<{ id: string; email: string | null }>) {
      return { id: 'stub', email: data.email ?? null };
    },
    async getUser(id: string) {
      return { id, email: null };
    },
  } as unknown as Adapter;
}
