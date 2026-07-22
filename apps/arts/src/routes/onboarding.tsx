import { uploadFiles } from "@better-upload/client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ImageUp,
  Instagram,
  Loader2,
  MapPin,
  Phone,
  Upload,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
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
import { type ArtworkDraft, createArtworkDrafts } from "#/lib/artwork-drafts.ts";
import { saveArtwork } from "#/lib/artworks.functions.ts";

const STEPS = [
  { label: "Identity", value: 0 },
  { label: "Practice", value: 1 },
  { label: "Artwork", value: 2 },
] as const;

const artworkDraftSchema = z.object({
  description: z.string().max(700, "Artwork description must stay under 700 characters"),
  forSale: z.boolean(),
  imageKey: z.string().min(1),
  medium: z.string().max(80, "Artwork medium must stay under 80 characters"),
  price: z.string(),
  status: z.enum(["draft", "published"]),
  title: z.string().min(1, "Artwork title is required").max(120),
  year: z.string().max(20, "Artwork year must stay under 20 characters"),
});

export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => requireUser(),
  component: Onboarding,
  loader: () => getCurrentArtmaker(),
});

function Onboarding() {
  const currentArtmaker = Route.useLoaderData();
  const saveArtmaker = useServerFn(saveArtmakerOnboarding);
  const saveArt = useServerFn(saveArtwork);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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
  const [artworkDrafts, setArtworkDrafts] = useState<ArtworkDraft[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedMediumSet = useMemo(() => new Set(medium), [medium]);
  const progressPercent = ((step + 1) / STEPS.length) * 100;

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) =>
      uploadFiles({
        files,
        route: "artwork",
      }),
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Artwork upload failed.");
    },
    onSuccess: (result) => {
      const drafts = createArtworkDrafts((result.files ?? []) as unknown[]);
      setArtworkDrafts((current) => [...current, ...drafts]);
    },
  });

  const toggleMedium = (value: string) => {
    setMedium((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const profilePayload = {
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
  };

  const validateProfile = () => {
    const parsed = artmakerOnboardingSchema.safeParse(profilePayload);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return null;
    }

    return parsed.data;
  };

  const goNext = () => {
    setError("");

    if (step === 0) {
      const partial = z
        .object({
          city: z.string().min(1, "City is required"),
          instagramUsername: z.string().min(1, "Instagram username is required"),
          name: z.string().min(1, "Name is required"),
          phoneNumber: z.string().min(1, "Phone number is required"),
          state: z.string().min(2, "State is required"),
        })
        .safeParse({ city, instagramUsername, name, phoneNumber, state });

      if (!partial.success) {
        setError(partial.error.issues[0]?.message ?? "Finish this step to keep going.");
        return;
      }
    }

    if (step === 1 && !validateProfile()) {
      return;
    }

    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const submit = async () => {
    setError("");
    const parsed = validateProfile();

    if (!parsed) {
      return;
    }

    const artworkResult = z.array(artworkDraftSchema).safeParse(artworkDrafts);

    if (!artworkResult.success) {
      setError(artworkResult.error.issues[0]?.message ?? "Check your artwork details.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveArtmaker({ data: parsed });

      for (const artwork of artworkResult.data) {
        await saveArt({
          data: {
            description: artwork.description,
            forSale: artwork.forSale,
            imageKey: artwork.imageKey,
            medium: artwork.medium,
            price: artwork.price,
            status: artwork.status,
            title: artwork.title,
            year: artwork.year,
          },
        });
      }

      const slug = result.artmaker?.slug;

      if (slug) {
        await navigate({ to: "/artmakers/$slug", params: { slug } });
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save your artmaker profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="px-5 pt-32 pb-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
            Artmaker onboarding
          </p>
          <h1 className="mt-4 font-black text-5xl leading-none tracking-tight md:text-6xl">
            Build the page your work can point to.
          </h1>
          <p className="mt-5 text-neutral-300 leading-7">
            Set up the public profile first, then add a first batch of artwork now or leave it for
            the dashboard. Published artwork appears on your profile and the exhibitions wall.
          </p>
          <div className="mt-8 grid gap-3 text-neutral-400 text-sm">
            <p className="flex items-center gap-3">
              <UserRound className="size-4 text-[#7CFC00]" />
              Public artmaker profile
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

        <section className="border border-neutral-800 bg-[#101010] p-5 md:p-8">
          <div className="mb-8">
            <div className="h-2 overflow-hidden bg-[#050505]">
              <div
                className="h-full bg-[#7CFC00] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {STEPS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStep(item.value)}
                  className={`min-h-11 border px-3 font-black text-xs uppercase tracking-[0.14em] transition-colors ${
                    step === item.value
                      ? "border-[#7CFC00] bg-[#7CFC00] text-black"
                      : "border-neutral-800 bg-[#080808] text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {step === 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Artmaker name">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="First name, full name, studio, or artist name"
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
              <label className="flex items-center gap-3 border border-neutral-800 bg-[#080808] p-3 text-neutral-300 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={showPronouns}
                  onChange={(event) => setShowPronouns(event.target.checked)}
                  className="size-4 accent-[#7CFC00]"
                />
                Show pronouns on the public profile
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <Label className="font-black text-xs uppercase tracking-[0.22em]">Mediums</Label>
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
              <div className="mt-8">
                <Field label="Short bio">
                  <Textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Tell people what you make, where they may have seen it, or what you are working toward."
                    rows={5}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-11 place-items-center border border-[#7CFC00]/40 text-[#7CFC00]">
                  <ImageUp className="size-5" />
                </div>
                <div>
                  <h2 className="font-black text-xl">First artwork batch</h2>
                  <p className="text-neutral-500 text-sm">
                    Optional now. You can add or edit artwork later from the dashboard.
                  </p>
                </div>
              </div>

              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center border border-dashed border-neutral-700 bg-[#080808] p-6 text-center hover:border-[#7CFC00]">
                {uploadMutation.isPending ? (
                  <Loader2 className="mb-3 size-8 animate-spin text-[#7CFC00]" />
                ) : (
                  <Upload className="mb-3 size-8 text-[#7CFC00]" />
                )}
                <span className="font-black text-sm uppercase tracking-[0.18em]">
                  {uploadMutation.isPending ? "Uploading" : "Choose artwork images"}
                </span>
                <span className="mt-2 text-neutral-500 text-sm">
                  PNG, JPG, GIF, WebP. Up to 12 files.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={uploadMutation.isPending}
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    if (files.length > 0) {
                      uploadMutation.mutate(files);
                    }
                    event.target.value = "";
                  }}
                />
              </label>

              <div className="mt-6 grid gap-3">
                {artworkDrafts.length > 0 ? (
                  artworkDrafts.map((item, index) => (
                    <details
                      key={item.id}
                      open={index === 0}
                      className="border border-neutral-800 bg-[#080808]"
                    >
                      <summary className="cursor-pointer px-4 py-3 font-black text-sm uppercase tracking-[0.14em]">
                        {item.title || item.fileName}
                      </summary>
                      <div className="grid gap-4 border-neutral-800 border-t p-4">
                        <Field label="Title">
                          <Input
                            value={item.title}
                            onChange={(event) => {
                              const next = [...artworkDrafts];
                              next[index] = { ...item, title: event.target.value };
                              setArtworkDrafts(next);
                            }}
                          />
                        </Field>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Medium">
                            <Input
                              value={item.medium}
                              onChange={(event) => {
                                const next = [...artworkDrafts];
                                next[index] = { ...item, medium: event.target.value };
                                setArtworkDrafts(next);
                              }}
                            />
                          </Field>
                          <Field label="Year">
                            <Input
                              value={item.year}
                              onChange={(event) => {
                                const next = [...artworkDrafts];
                                next[index] = { ...item, year: event.target.value };
                                setArtworkDrafts(next);
                              }}
                            />
                          </Field>
                        </div>
                        <Field label="Description">
                          <Textarea
                            value={item.description}
                            rows={3}
                            onChange={(event) => {
                              const next = [...artworkDrafts];
                              next[index] = { ...item, description: event.target.value };
                              setArtworkDrafts(next);
                            }}
                          />
                        </Field>
                        <div className="grid gap-3 border border-neutral-800 p-3">
                          <label className="flex items-center gap-3 text-neutral-300 text-sm">
                            <input
                              type="checkbox"
                              checked={item.forSale}
                              onChange={(event) => {
                                const next = [...artworkDrafts];
                                next[index] = { ...item, forSale: event.target.checked };
                                setArtworkDrafts(next);
                              }}
                              className="size-4 accent-[#7CFC00]"
                            />
                            Mark available for future sales
                          </label>
                          {item.forSale ? (
                            <Field label="Price">
                              <Input
                                value={item.price}
                                onChange={(event) => {
                                  const next = [...artworkDrafts];
                                  next[index] = { ...item, price: event.target.value };
                                  setArtworkDrafts(next);
                                }}
                                placeholder="250"
                              />
                            </Field>
                          ) : null}
                          <Field label="Visibility">
                            <select
                              value={item.status}
                              onChange={(event) => {
                                const next = [...artworkDrafts];
                                next[index] = {
                                  ...item,
                                  status: event.target.value as "draft" | "published",
                                };
                                setArtworkDrafts(next);
                              }}
                              className="h-10 border border-neutral-800 bg-[#0A0A0A] px-3 text-white"
                            >
                              <option value="published">Published</option>
                              <option value="draft">Draft</option>
                            </select>
                          </Field>
                        </div>
                      </div>
                    </details>
                  ))
                ) : (
                  <div className="border border-neutral-800 bg-[#080808] p-5">
                    <p className="font-black text-neutral-200">No artwork attached yet.</p>
                    <p className="mt-2 text-neutral-500 text-sm">
                      Finish onboarding now, then add pieces from your dashboard whenever the work
                      is ready.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 border border-red-500/50 bg-red-950/30 p-3 text-red-200 text-sm">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              disabled={step === 0 || isSaving}
              onClick={() => {
                setError("");
                setStep((current) => Math.max(current - 1, 0));
              }}
              className="h-12 rounded-none border border-neutral-700 bg-transparent px-5 font-black text-white text-xs uppercase tracking-[0.18em] hover:border-[#7CFC00] hover:bg-transparent hover:text-[#7CFC00]"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                className="h-12 rounded-none bg-[#7CFC00] px-6 font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#a5ff43]"
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSaving || uploadMutation.isPending}
                onClick={submit}
                className="h-12 rounded-none bg-[#7CFC00] px-6 font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#a5ff43]"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {isSaving ? "Saving" : "Publish Profile"}
              </Button>
            )}
          </div>
        </section>
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
