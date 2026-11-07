import { Link } from "@tanstack/react-router";

export interface AdminColumn<Row> {
  key: keyof Row & string;
  label: string;
  render?: (row: Row) => React.ReactNode;
}

export interface AdminTableProps<Row> {
  error: string | null;
  rows: Row[];
  columns: AdminColumn<Row>[];
  subtitle: string;
  title: string;
  total?: number;
}

/** Shared server-rendered admin table for the /admin section screens. */
export function AdminTable<Row extends { id: number | string }>({
  columns,
  error,
  rows,
  subtitle,
  title,
  total,
}: AdminTableProps<Row>) {
  return (
    <>
      <div className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
        {typeof total === "number" ? <p className="text-sm text-gray-500">{total} total</p> : null}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-400">Nothing here yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-left text-gray-400">
              <tr>
                {columns.map((column) => (
                  <th className="px-4 py-2.5 font-medium" key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-white/5 last:border-b-0" key={String(row.id)}>
                  {columns.map((column) => (
                    <td className="px-4 py-2.5" key={column.key}>
                      {column.render
                        ? column.render(row)
                        : String((row[column.key] as unknown) ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6">
        <Link className="text-sm text-[#7CFC00] hover:underline" to="/admin">
          ← Admin desk
        </Link>
      </p>
    </>
  );
}
