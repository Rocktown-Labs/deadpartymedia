"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export interface AdminBulkAction<Row> {
  /** Applies the API call for one row; returns false on failure. */
  apply: (row: Row) => Promise<boolean>;
  label: string;
  /** Optimistic row update after a successful toggle. */
  toggle?: (row: Row) => Row;
}

export interface AdminDataTableProps<Row extends { id: number | string }> {
  bulkAction?: AdminBulkAction<Row>;
  columns: ColumnDef<Row, any>[];

  initialRows: Row[];
  newTo?: string;
  subtitle: string;
  title: string;
}

/**
 * Shared admin data table — tanstack-table with selection, optional bulk
 * action (publish/visibility toggles), pagination, and new/edit links.
 * The posts screen keeps its bespoke PostsTable; this is the pattern for
 * the remaining entity lists.
 */
export function AdminDataTable<Row extends { id: number | string }>({
  bulkAction,
  columns,
  initialRows,
  newTo,
  subtitle,
  title,
}: AdminDataTableProps<Row>) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const selected = table.getSelectedRowModel().rows.map((row) => row.original);
  const hasBulk = bulkAction && bulkAction.toggle;

  async function runBulk() {
    if (!bulkAction || selected.length === 0) {
      return;
    }
    setBusy(true);
    setMessage(null);
    let failures = 0;
    for (const row of selected) {
      const ok = await bulkAction.apply(row);
      if (!ok) {
        failures += 1;
      }
    }
    setBusy(false);
    table.toggleAllRowsSelected(false);
    if (failures > 0) {
      setMessage(`${failures} of ${selected.length} failed`);
      return;
    }
    if (bulkAction.toggle) {
      const selectedIds = new Set(selected.map((row) => row.id));
      setRows((previous) =>
        previous.map((row) => (selectedIds.has(row.id) ? bulkAction.toggle!(row) : row)),
      );
    }
    setMessage(`Updated ${selected.length} ✓`);
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
        {newTo ? (
          <Link to={newTo}>
            <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90" size="sm">
              New
            </Button>
          </Link>
        ) : null}
      </div>

      {hasBulk ? (
        <div className="mb-3 flex items-center gap-3">
          <Button
            disabled={busy || selected.length === 0}
            onClick={() => {
              void runBulk();
            }}
            size="sm"
            variant="outline"
          >
            {busy ? "Working…" : `${bulkAction.label} (${selected.length})`}
          </Button>
          {message ? <span className="text-sm text-gray-400">{message}</span> : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {hasBulk ? <th className="px-4 py-2.5" /> : null}
                {headerGroup.headers.map((header) => (
                  <th className="px-4 py-2.5 font-medium" key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr className="border-b border-white/5 last:border-b-0" key={row.id}>
                {hasBulk ? (
                  <td className="px-4 py-2.5">
                    <input
                      aria-label={`Select row ${String(row.original.id)}`}
                      checked={row.getIsSelected()}
                      className="accent-[#7CFC00]"
                      disabled={busy}
                      onChange={row.getToggleSelectedHandler()}
                      type="checkbox"
                    />
                  </td>
                ) : null}
                {row.getVisibleCells().map((cell) => (
                  <td className="px-4 py-2.5" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <Button
          disabled={!table.getCanPreviousPage()}
          onClick={() => {
            table.previousPage();
          }}
          size="sm"
          variant="ghost"
        >
          ←
        </Button>
        <span className="text-gray-500">
          Page {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
        </span>
        <Button
          disabled={!table.getCanNextPage()}
          onClick={() => {
            table.nextPage();
          }}
          size="sm"
          variant="ghost"
        >
          →
        </Button>
        <Link className="ml-auto text-[#7CFC00] hover:underline" to="/admin">
          ← Admin desk
        </Link>
      </div>
    </>
  );
}
