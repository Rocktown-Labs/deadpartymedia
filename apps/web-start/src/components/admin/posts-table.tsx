"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";

export interface PostsTableRow {
  authorName: string | null;
  category: string;
  id: number;
  status: string;
  title: string;
  views: number;
}

const columnHelper = createColumnHelper<PostsTableRow>();

/**
 * Admin posts table — the tanstack-table exemplar for the admin parity
 * pass (the Next screens use the same table library with bulk actions).
 * Bulk publish/unpublish loops the API's per-row toggle over the selection.
 */
export function PostsTable({ initialRows }: { initialRows: PostsTableRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // biome-ignore lint/suspicious/noExplicitAny: tanstack-table's ColumnDef is invariant in its second parameter
  const columns: ColumnDef<PostsTableRow, any>[] = [
    columnHelper.display({
      cell: ({ row }) => (
        <input
          aria-label={`Select ${row.original.title}`}
          className="accent-[#7CFC00]"
          checked={row.getIsSelected()}
          disabled={busy}
          onChange={row.getToggleSelectedHandler()}
          type="checkbox"
        />
      ),
      id: "select",
    }),
    columnHelper.accessor("title", {
      cell: (info) => (
        <Link
          className="font-semibold hover:text-[#7CFC00]"
          to="/admin/posts/$id"
          params={{ id: String(info.row.original.id) }}
        >
          {info.getValue()}
        </Link>
      ),
      header: "Title",
    }),
    columnHelper.accessor("status", {
      cell: (info) => (
        <span className={info.getValue() === "published" ? "text-[#7CFC00]" : "text-yellow-400"}>
          {info.getValue()}
        </span>
      ),
      header: "Status",
    }),
    columnHelper.accessor("category", { header: "Category" }),
    columnHelper.accessor("authorName", {
      header: "Author",
      cell: (info) => info.getValue() ?? "—",
    }),
    columnHelper.accessor("views", { header: "Views" }),
  ];

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const selected = table.getSelectedRowModel().rows.map((row) => row.original);

  async function bulkToggle() {
    if (selected.length === 0) {
      return;
    }
    setBusy(true);
    setMessage(null);
    let failures = 0;
    for (const row of selected) {
      const result = await apiPost(`/music/admin/posts/${row.id}/toggle`, {});
      if (!result.ok) {
        failures += 1;
      }
    }
    setBusy(false);
    table.toggleAllRowsSelected(false);
    if (failures > 0) {
      setMessage(`${failures} of ${selected.length} failed`);
      return;
    }
    setRows((previous) =>
      previous.map((row) => {
        if (!selected.some((selectedRow) => selectedRow.id === row.id)) {
          return row;
        }
        return {
          ...row,
          status: row.status === "published" ? "draft" : "published",
        };
      }),
    );
    setMessage(`Toggled ${selected.length} post${selected.length === 1 ? "" : "s"} ✓`);
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Posts</h1>
          <p className="text-sm text-gray-400">Staff-scoped via the platform API</p>
        </div>
        <Link to="/admin/posts/new">
          <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90" size="sm">
            New post
          </Button>
        </Link>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <Button
          disabled={busy || selected.length === 0}
          onClick={() => {
            void bulkToggle();
          }}
          size="sm"
          variant="outline"
        >
          {busy ? "Working…" : `Toggle publish (${selected.length})`}
        </Button>
        {message ? <span className="text-sm text-gray-400">{message}</span> : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
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
