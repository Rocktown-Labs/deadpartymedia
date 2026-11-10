import { useMusicSession } from "@/lib/auth-client";
import { useRouter } from "@tanstack/react-router";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/utils/error";
import type { UserUpdateInput } from "@/lib/validations/user";
import { userUpdateSchema } from "@/lib/validations/user";
import { Lock, Save, User } from "lucide-react";
import { toast } from "sonner";
import { DashboardBackButton } from "../dashboard-back-button";
import { changeUserPassword, updateUserProfile } from "./actions";

interface ValidationIssue {
  message: string;
  path?: unknown;
}

function hasValidationIssues(error: unknown): error is { errors: ValidationIssue[] } {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  return Array.isArray((error as { errors?: unknown }).errors);
}

export default function SettingsPage() {
  const router = useRouter();
  const { session: user, isPending: sessionPending } = useMusicSession();
  const isLoaded = !sessionPending;
  const isSignedIn = !!user;
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.name.split(" ")[0] || "");
      setLastName(user.name.split(" ").slice(1).join(" ") || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    startTransition(async () => {
      try {
        const data: UserUpdateInput = {
          email: email,
          first_name: firstName,
          last_name: lastName,
        };

        const validated = userUpdateSchema.parse(data);
        const result = await updateUserProfile(validated);

        if (result.success) {
          toast.success(result.message || "Profile updated successfully!");
          // Reload user data to reflect changes
          await router.invalidate();
        } else {
          const errorMessage = result.error ?? "Failed to update profile";
          toast.error(errorMessage);
          // Handle field-specific errors if needed
          if (errorMessage.includes("first_name")) {
            setProfileErrors({ first_name: errorMessage });
          } else if (errorMessage.includes("last_name")) {
            setProfileErrors({ last_name: errorMessage });
          } else if (errorMessage.includes("email")) {
            setProfileErrors({ email: errorMessage });
          }
        }
      } catch (error) {
        if (hasValidationIssues(error)) {
          // Zod validation errors
          const fieldErrors: Record<string, string> = {};
          for (const issue of error.errors) {
            if (!Array.isArray(issue.path) || issue.path.length === 0) {
              continue;
            }
            const [field] = issue.path;
            if (typeof field === "string") {
              fieldErrors[field] = issue.message;
            }
          }
          setProfileErrors(fieldErrors);
        } else {
          toast.error(getErrorMessage(error, "Failed to update profile"));
        }
      }
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl">
              <div className="mb-8">
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl">
              <p className="text-gray-400">Please sign in to view settings.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <div className="mb-8">
              <DashboardBackButton />
              <h1 className="text-4xl font-black mb-2">Settings</h1>
              <p className="text-gray-400">Manage your account settings</p>
            </div>

            <Card className="bg-[#111111] border-gray-800 p-6">
              {/* Profile Information */}
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-[#7CFC00]" />
                    <h2 className="text-xl font-bold">Profile Information</h2>
                  </div>

                  <div>
                    <Label htmlFor="firstName" className="text-gray-300">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (profileErrors.first_name) {
                          setProfileErrors({ ...profileErrors, first_name: "" });
                        }
                      }}
                      className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${profileErrors.first_name ? "border-red-500" : ""}`}
                      placeholder="First name"
                    />
                    {profileErrors.first_name && (
                      <p className="mt-1 text-sm text-red-500">{profileErrors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lastName" className="text-gray-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (profileErrors.last_name) {
                          setProfileErrors({ ...profileErrors, last_name: "" });
                        }
                      }}
                      className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${profileErrors.last_name ? "border-red-500" : ""}`}
                      placeholder="Last name"
                    />
                    {profileErrors.last_name && (
                      <p className="mt-1 text-sm text-red-500">{profileErrors.last_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      className="mt-1 bg-[#0A0A0A] border-gray-700 text-white"
                      placeholder="your@email.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email changes require confirmation. Check your inbox after saving.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-800">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </form>

              {/* Password Change */}
              <div className="space-y-6 mt-8 pt-6 border-t border-gray-800">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-[#7CFC00]" />
                    <h2 className="text-xl font-bold">Change Password</h2>
                  </div>
                  <form
                    className="space-y-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const formElement = event.currentTarget;
                      const form = new FormData(formElement);
                      const password = String(form.get("password") || ""),
                        confirmation = String(form.get("confirmation") || "");
                      if (password !== confirmation) {
                        toast.error("Passwords do not match");
                        return;
                      }
                      const result = await changeUserPassword({
                        current_password: String(form.get("current") || ""),
                        new_password: password,
                      });
                      if (result.success) {
                        toast.success("Password updated");
                        formElement.reset();
                      } else toast.error(result.error || "Unable to update password");
                    }}
                  >
                    <label className="block text-sm text-gray-300">
                      Current password
                      <Input
                        name="current"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="mt-1 bg-[#0A0A0A] border-gray-700"
                      />
                    </label>
                    <label className="block text-sm text-gray-300">
                      New password
                      <Input
                        name="password"
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        required
                        className="mt-1 bg-[#0A0A0A] border-gray-700"
                      />
                    </label>
                    <label className="block text-sm text-gray-300">
                      Confirm password
                      <Input
                        name="confirmation"
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        required
                        className="mt-1 bg-[#0A0A0A] border-gray-700"
                      />
                    </label>
                    <Button type="submit" className="bg-[#7CFC00] text-black font-bold">
                      Update Password
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
