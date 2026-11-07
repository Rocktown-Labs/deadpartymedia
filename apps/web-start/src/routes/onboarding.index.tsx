import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "../lib/api-client";
import { getSession } from "../lib/auth.functions";

/**
 * Onboarding wizard — ported from apps/web/src/app/onboarding/ (role select
 * + artist/fan/venue forms). Saves POST to the platform API's music
 * onboarding endpoints (apps/api/src/routes/music/onboarding.ts), which
 * mirror the Next server actions' claim/mint + Clerk metadata logic.
 */
export const Route = createFileRoute("/onboarding/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.userId) {
      throw redirect({ to: "/sign-in" });
    }
    return { session };
  },
  component: OnboardingWizard,
  head: () => ({ meta: [{ title: "Onboarding | Dead Party Media" }] }),
});

const GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type Role = "artist" | "fan" | "venue";

function OnboardingWizard() {
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Role | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const set = (key: string) => (event: { target: { value: string } }) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
  };

  async function save() {
    if (!role) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await apiPost(`/music/onboarding/${role}`, form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to complete onboarding");
      return;
    }
    setDone(role);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-6 pt-32 pb-20 text-center">
        <h1 className="mb-3 text-4xl font-black text-[#7CFC00]">You're in! 🎉</h1>
        <p className="mb-8 text-gray-300">
          {done === "artist"
            ? "Your artist profile is live in the directory."
            : done === "venue"
              ? "Your venue is registered."
              : "Your fan account is set up."}
        </p>
        <a className="text-[#7CFC00] underline" href="/">
          Back to home
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-28 pb-20">
      <h1 className="mb-2 text-4xl font-black">Welcome to Dead Party Media</h1>
      <p className="mb-8 text-gray-400">Choose how you want to join the scene.</p>

      {!role ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              { blurb: "Claim your artist profile", key: "artist" },
              { blurb: "Follow and comment on coverage", key: "fan" },
              { blurb: "List your venue's shows", key: "venue" },
            ] as const
          ).map((item) => (
            <button
              className="rounded-lg border border-white/10 p-6 text-left hover:border-[#7CFC00]/50"
              key={item.key}
              onClick={() => {
                setRole(item.key);
              }}
              type="button"
            >
              <h2 className="mb-1 text-xl font-bold capitalize">{item.key}</h2>
              <p className="text-sm text-gray-400">{item.blurb}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {role === "artist" ? (
            <>
              <Field label="Artist name">
                <Input onChange={set("name")} value={form.name ?? ""} />
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
              <Field label="Bio">
                <Textarea onChange={set("bio")} rows={4} value={form.bio ?? ""} />
              </Field>
              <Field label="Location">
                <Input onChange={set("location")} value={form.location ?? ""} />
              </Field>
              <Field label="Spotify artist URL">
                <Input onChange={set("spotifyUrl")} value={form.spotifyUrl ?? ""} />
              </Field>
              <Field label="Spotify artist ID">
                <Input onChange={set("spotifyArtistId")} value={form.spotifyArtistId ?? ""} />
              </Field>
              <Field label="Instagram (@handle or URL)">
                <Input onChange={set("instagram")} value={form.instagram ?? ""} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Image URL (optional)">
                  <Input onChange={set("image")} value={form.image ?? ""} />
                </Field>
                <Field label="Website (optional)">
                  <Input onChange={set("website")} value={form.website ?? ""} />
                </Field>
              </div>
            </>
          ) : role === "fan" ? (
            <Field label="Your name">
              <Input onChange={set("name")} value={form.name ?? ""} />
            </Field>
          ) : (
            <>
              <Field label="Venue name">
                <Input onChange={set("name")} value={form.name ?? ""} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <Input onChange={set("city")} value={form.city ?? "Little Rock"} />
                </Field>
                <Field label="State">
                  <Input onChange={set("state")} value={form.state ?? "AR"} />
                </Field>
              </div>
              <Field label="Address (optional)">
                <Input onChange={set("address")} value={form.address ?? ""} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone (optional)">
                  <Input onChange={set("phone")} value={form.phone ?? ""} />
                </Field>
                <Field label="Booking email (optional)">
                  <Input onChange={set("bookingEmail")} value={form.bookingEmail ?? ""} />
                </Field>
              </div>
              <Field label="Website (optional)">
                <Input onChange={set("website")} value={form.website ?? ""} />
              </Field>
            </>
          )}

          {error ? (
            <p className="rounded-md border border-red-500/40 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-2">
            <Button
              className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
              disabled={saving}
              onClick={() => {
                void save();
              }}
              type="button"
            >
              {saving ? "Saving…" : "Complete onboarding"}
            </Button>
            <Button
              onClick={() => {
                setRole(null);
                setError(null);
              }}
              variant="ghost"
            >
              Back
            </Button>
          </div>
        </div>
      )}
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
