import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "../lib/api-client";

const GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

/**
 * Ported from apps/web/src/app/venue-dashboard/events/new — the "submit a
 * show" flow. Posts to the platform API's POST /music/events (validated,
 * authenticated, creates a draft event), mirroring the web app's
 * submit-show modal fields.
 */
export const Route = createFileRoute("/venue-dashboard/events/new")({
  component: SubmitShowPage,
  head: () => ({ meta: [{ title: "Submit a Show | Dead Party Media" }] }),
});

function SubmitShowPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: string) => (event: { target: { value: string } }) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
  };

  async function submit() {
    setSaving(true);
    setError(null);
    const result = await apiPost("/music/events", form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to submit show");
      return;
    }
    await navigate({ to: "/venue-dashboard" });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-28 pb-20">
      <h1 className="mb-2 text-4xl font-black">Submit a Show</h1>
      <p className="mb-8 text-sm text-gray-400">
        Listings are reviewed before publishing (created as drafts).
      </p>

      <div className="space-y-4">
        <Field label="Title">
          <Input onChange={set("title")} value={form.title ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date (YYYY-MM-DD)">
            <Input onChange={set("date")} placeholder="2026-12-31" value={form.date ?? ""} />
          </Field>
          <Field label="Time">
            <Input onChange={set("time")} placeholder="7:00 PM" value={form.time ?? ""} />
          </Field>
        </div>
        <Field label="Venue">
          <Input onChange={set("venue")} value={form.venue ?? ""} />
        </Field>
        <Field label="Location">
          <Input onChange={set("location")} value={form.location ?? ""} />
        </Field>
        <Field label="Genre">
          <Select
            onValueChange={(value) => {
              setForm((previous) => ({ ...previous, genre: value }));
            }}
            value={form.genre ?? ""}
          >
            <SelectTrigger>{form.genre || "Select genre"}</SelectTrigger>
            <SelectContent>
              {GENRES.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Price">
          <Input onChange={set("price")} placeholder="$10" value={form.price ?? ""} />
        </Field>
        <Field label="Ticket link">
          <Input onChange={set("ticketLink")} value={form.ticketLink ?? ""} />
        </Field>
        <Field label="Lineup / artists">
          <Input onChange={set("artists")} value={form.artists ?? ""} />
        </Field>
        <Field label="Description">
          <Textarea onChange={set("description")} rows={4} value={form.description ?? ""} />
        </Field>

        {error ? (
          <p className="rounded-md border border-red-500/40 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <Button
          className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
          disabled={saving}
          onClick={() => {
            void submit();
          }}
          type="button"
        >
          {saving ? "Submitting…" : "Submit show"}
        </Button>
      </div>
    </main>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-300">{label}</Label>
      {children}
    </div>
  );
}
