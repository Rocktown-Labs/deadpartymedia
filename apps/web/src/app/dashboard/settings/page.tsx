"use client";

import { useState, useEffect, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { updateUserProfile, changeUserPassword } from "./actions";
import {
  userUpdateSchema,
  passwordChangeSchema,
  type UserUpdateInput,
  type PasswordChangeInput,
} from "@/lib/validations/user";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, Lock, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

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
          first_name: firstName,
          last_name: lastName,
          email: email,
        };

        const validated = userUpdateSchema.parse(data);
        const result = await updateUserProfile(validated);
        
        if (result.success) {
          toast.success("Profile updated successfully!");
          // Reload user data to reflect changes
          await user?.reload();
        } else {
          toast.error(result.error || "Failed to update profile");
          // Handle field-specific errors if needed
          if (result.error.includes("first_name")) {
            setProfileErrors({ first_name: result.error });
          } else if (result.error.includes("last_name")) {
            setProfileErrors({ last_name: result.error });
          } else if (result.error.includes("email")) {
            setProfileErrors({ email: result.error });
          }
        }
      } catch (error: any) {
        if (error.errors) {
          // Zod validation errors
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((err: any) => {
            if (err.path) {
              fieldErrors[err.path[0]] = err.message;
            }
          });
          setProfileErrors(fieldErrors);
        } else {
          toast.error(error.message || "Failed to update profile");
        }
      }
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    startTransition(async () => {
      try {
        const data: PasswordChangeInput = {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        };

        const validated = passwordChangeSchema.parse(data);
        const result = await changeUserPassword({
          current_password: validated.current_password,
          new_password: validated.new_password,
        });
        
        if (result.success) {
          toast.success("Password changed successfully!");
          form.reset();
        } else {
          toast.error(result.error || "Failed to change password");
          // Note: Clerk handles password changes through their UserProfile component
          // This is a limitation - we should guide users to use Clerk's built-in password change
        }
      } catch (error: any) {
        if (error.errors) {
          // Zod validation errors
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((err: any) => {
            if (err.path) {
              fieldErrors[err.path[0]] = err.message;
            }
          });
          setPasswordErrors(fieldErrors);
        } else {
          toast.error(error.message || "Failed to change password");
        }
      }
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-2xl">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-2xl">
            <p className="text-gray-400">Please sign in to view settings.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
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
                      if (profileErrors.first_name)
                        setProfileErrors({ ...profileErrors, first_name: "" });
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
                      if (profileErrors.last_name)
                        setProfileErrors({ ...profileErrors, last_name: "" });
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
                    Email changes require verification. Please use your account settings menu to update your email.
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
                    To change your password, please use the account management menu (click your avatar in the top right).
                  </p>
                  <p className="text-gray-500 text-xs">
                    Password changes are handled securely through Clerk's account portal.
                  </p>
                </div>
              </div>
            </div>
            {/* Password Change Form - Hidden for now as Clerk handles this through UserProfile */}
            {false && (
            <form
              onSubmit={handlePasswordChange}
              className="space-y-6 mt-8 pt-6 border-t border-gray-800"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-[#7CFC00]" />
                  <h2 className="text-xl font-bold">Change Password</h2>
                </div>

                <div>
                  <Label htmlFor="currentPassword" className="text-gray-300">
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${passwordErrors.current_password ? "border-red-500" : ""}`}
                    placeholder="Enter current password"
                  />
                  {passwordErrors.current_password && (
                    <p className="mt-1 text-sm text-red-500">{passwordErrors.current_password}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="newPassword" className="text-gray-300">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${passwordErrors.new_password ? "border-red-500" : ""}`}
                    placeholder="Enter new password"
                  />
                  {passwordErrors.new_password && (
                    <p className="mt-1 text-sm text-red-500">{passwordErrors.new_password}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-300">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${passwordErrors.confirm_password ? "border-red-500" : ""}`}
                    placeholder="Confirm new password"
                  />
                  {passwordErrors.confirm_password && (
                    <p className="mt-1 text-sm text-red-500">{passwordErrors.confirm_password}</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isPending ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </form>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
