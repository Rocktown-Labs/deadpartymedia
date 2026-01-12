"use client";

import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SearchUsers() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const queryTerm = formData.get("search") as string;
        const params = new URLSearchParams();
        if (queryTerm) {
          params.set("search", queryTerm);
        }
        const queryString = params.toString();
        const url = queryString ? `${pathname}?${queryString}` : pathname;
        // Use router.push with type assertion since we're dynamically constructing the URL
        router.push(url as Parameters<typeof router.push>[0]);
      }}
      className="flex gap-4 items-end"
    >
      <div className="flex-1">
        <Label htmlFor="search">Search for users</Label>
        <Input
          id="search"
          name="search"
          type="text"
          placeholder="Search by name or email..."
          className="mt-1"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-[#7CFC00] text-black font-bold rounded-lg hover:bg-[#7CFC00]/90"
      >
        Search
      </button>
    </form>
  );
}
