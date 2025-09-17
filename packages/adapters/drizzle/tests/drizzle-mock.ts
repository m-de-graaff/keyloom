// Minimal test-only replacements for drizzle-orm helpers used by the adapter
// We return lightweight expression objects that our in-memory DB can evaluate.

export type ColumnRef = { name?: string } & Record<string, any>

export type Expr =
  | { kind: 'eq'; left: any; right: any }
  | { kind: 'lt'; left: any; right: any }
  | { kind: 'and'; exprs: Expr[] }
  | { kind: 'isNull'; col: any }
  | { kind: 'isNotNull'; col: any }

export function eq(left: any, right: any): Expr {
  return { kind: 'eq', left, right }
}

export function lt(left: any, right: any): Expr {
  return { kind: 'lt', left, right }
}

export function and(...exprs: Expr[]): Expr {
  return { kind: 'and', exprs }
}

export function isNull(col: any): Expr {
  return { kind: 'isNull', col }
}

export function isNotNull(col: any): Expr {
  return { kind: 'isNotNull', col }
}

export type Order = { kind: 'order'; col: any; dir: 'asc' | 'desc' }
export function desc(col: any): Order {
  return { kind: 'order', col, dir: 'desc' }
}

// sql`count(*)` placeholder
export type SQLToken = { kind: 'sql'; text: string }
export function sql(strings: TemplateStringsArray, ...values: any[]): SQLToken {
  return { kind: 'sql', text: String.raw({ raw: strings }, ...values) }
}
