import { safeImageUrl } from "@dpmedia/contracts";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
  getCurrentArtmaker,
  requireArtmakerDashboardUser,
  saveArtmakerOnboarding,
} from "#/lib/artmakers.functions.ts";
import {
  artmakerOnboardingSchema,
  MEDIUM_OPTIONS,
  normalizeUsername,
  usernameSchema,
} from "#/lib/artmakers.ts";
import { getUploadedObjectKey } from "#/lib/artwork-drafts.ts";
import { authClient, useArtsSession } from "#/lib/auth-client";
import { uploadMedia } from "#/lib/media-upload";
import { buildPublicUploadUrl, describeUploadFailures } from "#/lib/upload.ts";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/profile")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardProfile,
  staleTime: 0,
  loader: () => getCurrentArtmaker(),
});

const CANONICAL_MEDIUM_SET = new Set<string>(MEDIUM_OPTIONS);

function DashboardProfile() {
  const artmaker = Route.useLoaderData();
  const { session } = useArtsSession();
  const router = useRouter();
  const saveArtmaker = useServerFn(saveArtmakerOnboarding);

  const [name, setName] = useState(artmaker?.name ?? session?.name ?? "");
  const [username, setUsername] = useState(session?.username ?? "");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [instagramUsername, setInstagramUsername] = useState(artmaker?.instagramUsername ?? "");
  const [city, setCity] = useState(artmaker?.city ?? "");
  const [state, setState] = useState(artmaker?.state ?? "AR");
  const [phoneNumber, setPhoneNumber] = useState(artmaker?.phoneNumber ?? "");
  const [pronouns, setPronouns] = useState(artmaker?.pronouns ?? "");
  const [showPronouns, setShowPronouns] = useState(artmaker?.showPronouns ?? false);
  const [medium, setMedium] = useState<string[]>(artmaker?.medium ?? []);
  const [customMediumInput, setCustomMediumInput] = useState("");
  const [bio, setBio] = useState(artmaker?.bio ?? "");
  const [profileImage, setProfileImage] = useState(artmaker?.image ?? session?.image ?? "");
  const [profileImageKey, setProfileImageKey] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync local form state whenever fresh loader data arrives.
  useEffect(() => {
    if (!artmaker) {
      return;
    }
    setName(artmaker.name);
    setInstagramUsername(artmaker.instagramUsername);
    setCity(artmaker.city);
    setState(artmaker.state);
    setPhoneNumber(artmaker.phoneNumber);
    setPronouns(artmaker.pronouns ?? "");
    setShowPronouns(artmaker.showPronouns);
    setMedium(artmaker.medium);
    setBio(artmaker.bio ?? "");
    setProfileImage(artmaker.image ?? "");
    setProfileImageKey("");
  }, [artmaker]);

  useEffect(() => {
    if (session?.username) {
      setUsername(session.username);
    }
  }, [session?.username]);

  const selectedMediumSet = useMemo(() => new Set(medium), [medium]);
  const customMediums = useMemo(
    () => medium.filter((item) => !CANONICAL_MEDIUM_SET.has(item)),
    [medium],
  );
  const uploadProgressRef = useRef(new Map<string, number>());

  const profileImageUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      uploadProgressRef.current.clear();
      const result = await uploadMedia({
        files,
        route: "profileImages",
        onFileStateChange: ({ file }) => {
          if (!file.id) {
            return;
          }
          uploadProgressRef.current.set(
            file.id,
            file.status === "complete" ? 1 : (file.progress ?? 0),
          );
          const values = [...uploadProgressRef.current.values()];
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          if (Number.isFinite(average)) {
            setUploadProgress(average);
          }
        },
      });

      if (result.failedFiles.length > 0) {
        throw new Error(describeUploadFailures(result.failedFiles));
      }

      return result;
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Profile image upload failed.");
    },
    onSuccess: (result) => {
      const [uploadedFile] = result.files ?? [];
      const directKey = uploadedFile ? getUploadedObjectKey(uploadedFile) : "";

      if (!directKey) {
        setError("The image uploaded, but no object key came back from storage.");
        return;
      }

      setProfileImageKey(directKey);
      setProfileImage(buildPublicUploadUrl(directKey, result.metadata));
    },
  });

  const toggleMedium = (value: string) => {
    setMedium((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const addCustomMedium = () => {
    const trimmed = customMediumInput.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed.length > 80) {
      setError("Custom medium must stay under 80 characters.");
      return;
    }
    setError("");
    setMedium((current) => (current.includes(trimmed) ? current : [...current, trimmed]));
    setCustomMediumInput("");
  };

  const checkUsernameAvailability = async (candidate: string) => {
    const normalized = normalizeUsername(candidate);
    if (!normalized) {
      setUsernameStatus("idle");
      return true;
    }
    const parsed = usernameSchema.safeParse(normalized);
    if (!parsed.success) {
      setUsernameStatus("invalid");
      return false;
    }
    if (session?.username && parsed.data.toLowerCase() === session.username.toLowerCase()) {
      setUsernameStatus("available");
      return true;
    }
    setUsernameStatus("checking");
    const response = await authClient.isUsernameAvailable({ username: parsed.data });
    if (response.error || !response.data?.available) {
      setUsernameStatus("taken");
      return false;
    }
    setUsernameStatus("available");
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const pendingCustom = customMediumInput.trim();
    const combinedMediums = pendingCustom ? [...new Set([...medium, pendingCustom])] : medium;

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername) {
      const parsedUsername = usernameSchema.safeParse(normalizedUsername);
      if (!parsedUsername.success) {
        setError(parsedUsername.error.issues[0]?.message ?? "Enter a valid username.");
        setUsernameStatus("invalid");
        return;
      }
      const available = await checkUsernameAvailability(parsedUsername.data);
      if (!available) {
        setError("That username is already taken. Choose another one.");
        return;
      }
    }

    const parsed = artmakerOnboardingSchema.safeParse({
      bio,
      city,
      customMedium: "",
      image: profileImage,
      imageKey: profileImageKey,
      instagramUsername,
      medium: combinedMediums,
      name,
      phoneNumber,
      pronouns,
      showPronouns,
      state,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your profile details and try again.");
      return;
    }

    setIsSaving(true);
    try {
      if (
        normalizedUsername &&
        normalizedUsername.toLowerCase() !== (session?.username ?? "").toLowerCase()
      ) {
        const usernameUpdate = await authClient.updateUser({
          displayUsername: normalizedUsername,
          username: normalizedUsername,
        });
        if (usernameUpdate.error) {
          throw new Error(usernameUpdate.error.message || "Could not update username.");
        }
      }

      await saveArtmaker({
        data: {
          ...parsed.data,
          status: "published",
        },
      });

      if (pendingCustom) {
        setMedium(combinedMediums);
        setCustomMediumInput("");
      }

      await router.invalidate();
      toast.success("Profile updated.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!artmaker) {
    return (
      <ArtmakerDashboardShell>
        <div className="mb-8">
          <h1 className="font-black text-4xl tracking-tight">Profile</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Finish setting up your artist profile before editing it here.
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <Link
            to="/onboarding"
            className="inline-flex rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-4 py-3 font-black text-black text-xs uppercase tracking-[0.18em] no-underline"
          >
            Start onboarding
          </Link>
        </div>
      </ArtmakerDashboardShell>
    );
  }

  return (
    <ArtmakerDashboardShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Edit profile</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Update your public page details, mediums, and contact info.
          </p>
        </div>
        <Link
          to="/artmakers/$slug"
          params={{ slug: artmaker.slug }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-800 px-4 py-3 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
        >
          View public profile
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <h2 className="font-black text-xl">Identity</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Artmaker name">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="First name, full name, studio, or artist name"
                required
              />
            </Field>
            <Field label="Account username">
              <Input
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameStatus("idle");
                }}
                onBlur={() => {
                  void checkUsernameAvailability(username);
                }}
                placeholder="unique_handle"
                autoComplete="username"
              />
              {usernameStatus === "checking" ? (
                <p className="text-gray-400 text-xs">Checking availability...</p>
              ) : usernameStatus === "available" ? (
                <p className="text-[#7CFC00] text-xs">Username is available.</p>
              ) : usernameStatus === "taken" ? (
                <p className="text-red-400 text-xs">That username is already taken.</p>
              ) : usernameStatus === "invalid" ? (
                <p className="text-red-400 text-xs">
                  Use 3 to 30 characters: letters, numbers, periods, or underscores.
                </p>
              ) : (
                <p className="text-gray-500 text-xs">
                  Unique sign-in handle (letters, numbers, periods, or underscores).
                </p>
              )}
            </Field>
            <Field label="Instagram username">
              <Input
                value={instagramUsername}
                onChange={(event) => setInstagramUsername(event.target.value)}
                placeholder="@yourhandle"
                required
              />
            </Field>
            <Field label="Phone number">
              <Input
                type="tel"
                inputMode="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="(501) 555-0101"
                required
              />
            </Field>
            <Field label="City">
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Little Rock"
                required
              />
            </Field>
            <Field label="State">
              <Input
                value={state}
                maxLength={2}
                onChange={(event) => setState(event.target.value.toUpperCase())}
                placeholder="AR"
                required
              />
            </Field>
            <Field label="Pronouns">
              <Input
                value={pronouns}
                onChange={(event) => setPronouns(event.target.value)}
                placeholder="Optional"
              />
            </Field>
            <label className="flex items-center gap-3 self-end rounded-md border border-gray-800 bg-[#080808] p-3 text-gray-300 text-sm">
              <input
                type="checkbox"
                checked={showPronouns}
                onChange={(event) => setShowPronouns(event.target.checked)}
                className="size-4 accent-[#7CFC00]"
              />
              Show pronouns on the public profile
            </label>
          </div>

          <div className="mt-6 rounded-lg border border-gray-800 bg-[#080808] p-4">
            <Label className="font-black text-xs uppercase tracking-[0.22em]">Profile image</Label>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {profileImage ? (
                <img
                  src={safeImageUrl(profileImage)}
                  alt={name || "Profile preview"}
                  className="size-24 rounded-md border border-neutral-800 object-cover"
                />
              ) : null}
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-neutral-700 px-4 font-black text-white text-xs uppercase tracking-[0.16em] hover:border-[#7CFC00] hover:text-[#7CFC00]">
                {profileImageUploadMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {profileImageUploadMutation.isPending
                  ? `Uploading ${Math.round(uploadProgress * 100)}%`
                  : profileImage
                    ? "Change image"
                    : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="sr-only"
                  disabled={profileImageUploadMutation.isPending}
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    if (files.length > 0) {
                      profileImageUploadMutation.mutate(files);
                    }
                    event.target.value = "";
                  }}
                />
              </label>
              {profileImage ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setProfileImage("");
                    setProfileImageKey("");
                  }}
                  className="h-11 border-neutral-700 bg-transparent text-gray-300 hover:border-red-500/60 hover:text-red-300"
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-black text-xl">Practice & mediums</h2>
            <span className="text-gray-500 text-xs">{medium.length} selected</span>
          </div>

          {medium.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {medium.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#7CFC00]/50 bg-[#7CFC00]/15 px-3 py-1 font-bold text-[#7CFC00] text-xs"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => toggleMedium(item)}
                    className="rounded-full p-0.5 hover:bg-black/40"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {MEDIUM_OPTIONS.map((option) => {
              const isSelected = selectedMediumSet.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleMedium(option)}
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-[#7CFC00] bg-[#7CFC00] text-black font-bold"
                      : "border-neutral-800 bg-[#080808] text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  <span>{option}</span>
                  {isSelected ? <Check className="size-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <Label className="font-black text-xs uppercase tracking-[0.22em]">
              Add a custom medium
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={customMediumInput}
                onChange={(event) => setCustomMediumInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomMedium();
                  }
                }}
                placeholder="Something else? Add it here."
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomMedium}
                disabled={!customMediumInput.trim()}
                className="shrink-0 border-neutral-700 text-white hover:border-[#7CFC00] hover:text-[#7CFC00]"
              >
                <Plus className="mr-1 size-4" />
                Add
              </Button>
            </div>
            {customMediums.length > 0 ? (
              <p className="mt-2 text-gray-500 text-xs">
                Custom mediums saved on your profile: {customMediums.join(", ")}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <Field label="Short bio">
              <Textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell people what you make, where they may have seen it, or what you are working toward."
                rows={4}
                maxLength={500}
              />
              <p className="text-right text-gray-500 text-xs">{bio.length}/500</p>
            </Field>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-3 text-red-200 text-sm">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="submit"
            disabled={isSaving || profileImageUploadMutation.isPending}
            className="h-12 rounded-lg bg-[#7CFC00] px-6 font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#a5ff43]"
          >
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </ArtmakerDashboardShell>
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
