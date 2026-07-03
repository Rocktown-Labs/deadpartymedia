import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Instagram, MapPin, Phone, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { MEDIUM_OPTIONS, artmakerOnboardingSchema } from "#/lib/artmakers.ts";
import {
  getCurrentArtmaker,
  requireUser,
  saveArtmakerOnboarding,
} from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => requireUser(),
  component: Onboarding,
  loader: () => getCurrentArtmaker(),
});

function Onboarding() {
  const currentArtmaker = Route.useLoaderData();
  const saveArtmaker = useServerFn(saveArtmakerOnboarding);
  const navigate = useNavigate();
  const [name, setName] = useState(currentArtmaker?.name ?? "");
  const [city, setCity] = useState(currentArtmaker?.city ?? "");
  const [state, setState] = useState(currentArtmaker?.state ?? "AR");
  const [pronouns, setPronouns] = useState(currentArtmaker?.pronouns ?? "");
  const [showPronouns, setShowPronouns] = useState(currentArtmaker?.showPronouns ?? false);
  const [phoneNumber, setPhoneNumber] = useState(currentArtmaker?.phoneNumber ?? "");
  const [instagramUsername, setInstagramUsername] = useState(
    currentArtmaker?.instagramUsername ?? "",
  );
  const [medium, setMedium] = useState<string[]>(currentArtmaker?.medium ?? []);
  const [customMedium, setCustomMedium] = useState("");
  const [bio, setBio] = useState(currentArtmaker?.bio ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedMediumSet = useMemo(() => new Set(medium), [medium]);

  const toggleMedium = (value: string) => {
    setMedium((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const parsed = artmakerOnboardingSchema.safeParse({
      bio,
      city,
      customMedium,
      instagramUsername,
      medium,
      name,
      phoneNumber,
      pronouns,
      showPronouns,
      state,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveArtmaker({ data: parsed.data });
      const slug = result.artmaker?.slug;

      if (slug) {
        await navigate({ to: "/artmakers/$slug", params: { slug } });
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not save your artist profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="px-5 pt-40 pb-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
            Artist onboarding
          </p>
          <h1 className="mt-4 font-black text-5xl leading-none tracking-tighter">
            Get on the Arkansas arts wall.
          </h1>
          <p className="mt-5 text-neutral-300 leading-7">
            This starts with the same information the team has been collecting: name, city, pronouns
            if you want them public, medium, phone, and Instagram. Artwork uploads come next.
          </p>
          <div className="mt-8 grid gap-3 text-neutral-400 text-sm">
            <p className="flex items-center gap-3">
              <UserRound className="size-4 text-[#7CFC00]" />
              Public artist profile
            </p>
            <p className="flex items-center gap-3">
              <Instagram className="size-4 text-[#7CFC00]" />
              Instagram-first discovery
            </p>
            <p className="flex items-center gap-3">
              <MapPin className="size-4 text-[#7CFC00]" />
              Arkansas city directory
            </p>
            <p className="flex items-center gap-3">
              <Phone className="size-4 text-[#7CFC00]" />
              Private contact field for the team
            </p>
          </div>
        </aside>

        <form onSubmit={submit} className="border border-neutral-800 bg-[#101010] p-5 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Name">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="First name, full name, or artist name"
              />
            </Field>
            <Field label="Instagram username">
              <Input
                value={instagramUsername}
                onChange={(event) => setInstagramUsername(event.target.value)}
                placeholder="@yourhandle"
              />
            </Field>
            <Field label="City">
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Little Rock"
              />
            </Field>
            <Field label="State">
              <Input
                value={state}
                maxLength={2}
                onChange={(event) => setState(event.target.value)}
                placeholder="AR"
              />
            </Field>
            <Field label="Phone number">
              <Input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="(501) 555-0101"
              />
            </Field>
            <Field label="Pronouns">
              <Input
                value={pronouns}
                onChange={(event) => setPronouns(event.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-3 border border-neutral-800 bg-[#080808] p-3 text-neutral-300 text-sm">
            <input
              type="checkbox"
              checked={showPronouns}
              onChange={(event) => setShowPronouns(event.target.checked)}
              className="size-4 accent-[#7CFC00]"
            />
            Show pronouns on the public profile
          </label>

          <div className="mt-8">
            <Label className="font-black text-xs uppercase tracking-[0.22em]">Medium</Label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {MEDIUM_OPTIONS.map((option) => {
                const isSelected = selectedMediumSet.has(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleMedium(option)}
                    className={`flex min-h-11 items-center justify-between gap-3 border px-3 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-[#7CFC00] bg-[#7CFC00] text-black"
                        : "border-neutral-800 bg-[#080808] text-neutral-300 hover:border-neutral-600"
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && <Check className="size-4" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <Input
                value={customMedium}
                onChange={(event) => setCustomMedium(event.target.value)}
                placeholder="Something else? Add it here."
              />
            </div>
          </div>

          <div className="mt-8">
            <Field label="Short bio">
              <Textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Optional for now. Tell people what you make, where they may have seen it, or what you are working toward."
                rows={5}
              />
            </Field>
          </div>

          {error && (
            <div className="mt-5 border border-red-500/50 bg-red-950/30 p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="h-12 rounded-none bg-[#7CFC00] px-6 font-black text-black text-xs uppercase tracking-[0.2em] hover:bg-[#a5ff43]"
            >
              {isSaving ? "Saving" : "Publish Profile"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <Label className="font-black text-xs uppercase tracking-[0.22em]">{label}</Label>
      {children}
    </label>
  );
}
