import * as React from 'react'

export type Column<T> = {
  key: keyof T
  header: React.ReactNode
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

export function DataTable<T extends { id: string | number }>({ columns, rows, onSort, sort }: { columns: Column<T>[]; rows: T[]; onSort?: (key: keyof T, dir: 'asc' | 'desc') => void; sort?: { key: keyof T; dir: 'asc' | 'desc' } }) {
  function toggleSort(col: Column<T>) {
    if (!col.sortable || !onSort) return
    const dir = sort && sort.key === col.key && sort.dir === 'asc' ? 'desc' : 'asc'
    onSort(col.key, dir)
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {columns.map((c, i) => (
              <th key={i} className="px-2 py-2">
                <button className="inline-flex items-center gap-1" onClick={() => toggleSort(c)} aria-label={typeof c.header === 'string' ? `Sort by ${c.header}` : undefined}>
                  {c.header}
                  {sort && sort.key === c.key && <span aria-hidden>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              {columns.map((c, i) => (
                <td key={i} className="px-2 py-2">
                  {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

