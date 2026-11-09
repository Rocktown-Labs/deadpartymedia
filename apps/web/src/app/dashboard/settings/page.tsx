"use client";

import { useState, useEffect, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { updateUserProfile } from "./actions";
import { userUpdateSchema } from "@/lib/validations/user";
import type { UserUpdateInput } from "@/lib/validations/user";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { DashboardBackButton } from "../dashboard-back-button";
import { getErrorMessage } from "@/lib/utils/error";

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
  const { isLoaded, isSignedIn, user } = useUser();
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.primaryEmailAddress?.emailAddress || "");
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
          toast.success("Profile updated successfully!");
          // Reload user data to reflect changes
          await user?.reload();
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
                      disabled
                      className="mt-1 bg-[#0A0A0A] border-gray-700 text-white opacity-50 cursor-not-allowed"
                      placeholder="your@email.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email changes require verification. Please use your account settings menu to
                      update your email.
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
                  <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">
                      To change your password, please use the account management menu (click your
                      avatar in the top right).
                    </p>
                    <p className="text-gray-500 text-xs">
                      Password changes are handled securely through Clerk's account portal.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
