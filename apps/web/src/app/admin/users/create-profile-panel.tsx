"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProfileAction = (formData: FormData) => void | Promise<void>;

type CreateProfilePanelProps = {
  action: ProfileAction;
};

const PROFILE_TYPES = ["user", "artist"] as const;
const USER_ROLES = ["writer", "super_admin", "fan"] as const;
const ARTIST_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

const selectInputClassName =
  "h-10 w-full rounded-md border border-gray-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7CFC00]";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function CreateProfilePanel({ action }: CreateProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profileType, setProfileType] = useState<(typeof PROFILE_TYPES)[number]>("user");
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    return profileType === "artist" ? "Create Artist" : "Create User";
  }, [profileType]);

  return (
    <Card className="border-gray-800 bg-[#111111]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <CardTitle className="text-xl">Create Profile</CardTitle>
          <CardDescription>
            Create local profiles first, then send production invites once records are ready.
          </CardDescription>
        </div>
        <Button
          type="button"
          className="bg-[#7CFC00] text-black hover:bg-[#6FE000]"
          onClick={() => {
            setError(null);
            setIsOpen((prev) => !prev);
          }}
        >
          {isOpen ? "Hide Form" : "Create Person"}
        </Button>
      </CardHeader>
      {isOpen ? (
        <CardContent>
          <form
            action={action}
            className="grid gap-3 lg:grid-cols-12"
            onSubmit={(event) => {
              const formData = new FormData(event.currentTarget);
              const nextProfileType = String(formData.get("profileType") ?? "");
              const displayName = String(formData.get("displayName") ?? "").trim();
              const email = String(formData.get("email") ?? "").trim();
              const role = String(formData.get("role") ?? "");
              const genre = String(formData.get("genre") ?? "");

              if (!PROFILE_TYPES.includes(nextProfileType as (typeof PROFILE_TYPES)[number])) {
                event.preventDefault();
                setError("Pick a valid profile type.");
                return;
              }

              if (displayName.length < 2) {
                event.preventDefault();
                setError("Display name must be at least 2 characters.");
                return;
              }

              if (email.length > 0 && !isValidEmail(email)) {
                event.preventDefault();
                setError("Enter a valid email or leave it empty.");
                return;
              }

              if (nextProfileType === "user" && !USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
                event.preventDefault();
                setError("Pick a valid role for a user profile.");
                return;
              }

              if (
                nextProfileType === "artist" &&
                !ARTIST_GENRES.includes(genre as (typeof ARTIST_GENRES)[number])
              ) {
                event.preventDefault();
                setError("Pick a valid genre for an artist profile.");
                return;
              }

              setError(null);
            }}
          >
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Profile Type
              </label>
              <select
                name="profileType"
                value={profileType}
                onChange={(event) => setProfileType(event.target.value as (typeof PROFILE_TYPES)[number])}
                className={selectInputClassName}
                required
              >
                <option value="user">User profile</option>
                <option value="artist">Artist profile</option>
              </select>
            </div>

            <div className="lg:col-span-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Display Name
              </label>
              <Input
                name="displayName"
                placeholder={profileType === "artist" ? "Artist name" : "Display name"}
                minLength={2}
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email
              </label>
              <Input type="email" name="email" placeholder="Email (optional)" />
            </div>

            {profileType === "user" ? (
              <div className="lg:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Role
                </label>
                <select name="role" defaultValue="writer" className={selectInputClassName} required>
                  <option value="writer">Writer</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="fan">Fan</option>
                </select>
                <input type="hidden" name="genre" value="OTHER" />
                <input type="hidden" name="location" value="" />
              </div>
            ) : (
              <>
                <input type="hidden" name="role" value="writer" />
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Genre
                  </label>
                  <select name="genre" defaultValue="OTHER" className={selectInputClassName} required>
                    <option value="OTHER">OTHER</option>
                    <option value="COUNTRY">COUNTRY</option>
                    <option value="EDM">EDM</option>
                    <option value="HARDCORE & ROCK">HARDCORE & ROCK</option>
                    <option value="HIP-HOP & R&B">HIP-HOP & R&B</option>
                  </select>
                </div>
                <div className="lg:col-span-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Artist Location
                  </label>
                  <Input name="location" placeholder="Artist location (optional)" />
                </div>
              </>
            )}

            <div className="flex items-end lg:col-span-1">
              <Button type="submit" className="w-full bg-[#7CFC00] text-black hover:bg-[#6FE000]">
                {submitLabel}
              </Button>
            </div>

            {error ? (
              <div className="lg:col-span-12 rounded-md border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            ) : null}
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
