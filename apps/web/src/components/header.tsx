"use client";
import Link from "next/link";
import type { Route } from "next";

export default function Header() {
  const links = [
    { label: "Home", to: "/" as Route },
    { label: "Dashboard", to: "/dashboard" as Route },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => (
              <Link key={to} href={to}>
                {label}
              </Link>
            ))}
        </nav>
      </div>
      <hr />
    </div>
  );
}
