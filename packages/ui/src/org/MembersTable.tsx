"use client";
import * as React from "react";
import { DataTable } from "../primitives/data-table";
import type { Column } from "../primitives/data-table";
import { Select } from "../components/select";
import { Button } from "../components/button";
import { Badge } from "../components/badge";

export type Member = {
  id: string;
  name?: string | null;
  email?: string;
  role: string;
  status?: "active" | "invited" | "suspended";
};

export function MembersTable({
  members,
  onRoleChange,
  onRemove,
  roles = ["owner", "admin", "member", "viewer"],
}: {
  members: Member[];
  onRoleChange?: (id: string, role: string) => void;
  onRemove?: (id: string) => void;
  roles?: string[];
}) {
  const [sort, setSort] = React.useState<
    { key: keyof Member; dir: "asc" | "desc" } | undefined
  >();
  const rows = React.useMemo(() => {
    if (!sort) return members;
    const arr = [...members];
    arr.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (
        (av! > bv! ? 1 : av! < bv! ? -1 : 0) * (sort.dir === "asc" ? 1 : -1)
      );
    });
    return arr;
  }, [members, sort]);

  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (v, r) => r.name || r.email || r.id,
    },
    { key: "email", header: "Email", sortable: true },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (v, r) => (
        <Select
          value={r.role}
          onChange={(e) => onRoleChange?.(r.id, e.target.value)}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (v) =>
        v === "active" ? (
          <Badge variant="success">Active</Badge>
        ) : v === "invited" ? (
          <Badge>Invited</Badge>
        ) : v === "suspended" ? (
          <Badge variant="warning">Suspended</Badge>
        ) : null,
    },
    {
      key: "id",
      header: "",
      render: (_v, r) => (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onRemove?.(r.id)}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      {...(sort ? { sort } : {})}
      onSort={(k, dir) => setSort({ key: k as keyof Member, dir })}
    />
  );
}
