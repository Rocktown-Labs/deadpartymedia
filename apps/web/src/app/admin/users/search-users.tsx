import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SearchUsersProps {
  defaultValue: string;
  preservedSortAndOrder: Record<string, string | undefined>;
}

export function SearchUsers({ defaultValue, preservedSortAndOrder }: SearchUsersProps) {
  return (
    <form method="get" action="/admin/users" className="flex items-end gap-4">
      <div className="flex-1">
        <Label htmlFor="search">Search for users</Label>
        <Input
          id="search"
          name="search"
          type="text"
          placeholder="Search by name or email..."
          className="mt-1"
          defaultValue={defaultValue}
        />
      </div>

      {Object.entries(preservedSortAndOrder).map(([key, value]) => {
        if (!value) {
          return null;
        }

        return <input key={key} type="hidden" name={key} value={value} />;
      })}

      <input type="hidden" name="inv_page" value="1" />
      <input type="hidden" name="usr_page" value="1" />
      <input type="hidden" name="art_page" value="1" />

      <button
        type="submit"
        className="rounded-lg bg-[#7CFC00] px-4 py-2 font-bold text-black hover:bg-[#7CFC00]/90"
      >
        Search
      </button>
    </form>
  );
}
