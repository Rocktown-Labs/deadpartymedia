"use client";

import { useActionState, useEffect, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useSession } from "@clerk/nextjs";
import type { Route } from "next";
import Image from "next/image";
import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { fanOnboardingAction } from "./actions";
import { fanFormOptions } from "./form-options";
import { toast } from "sonner";

interface FanOnboardingProps {
  initialName?: string;
}

function hasSuccessfulSubmission(state: unknown): state is { success: true } {
  if (typeof state !== "object" || state === null) {
    return false;
  }
  const { success } = state as { success?: unknown };
  return success === true;
}

export function FanOnboarding({ initialName }: FanOnboardingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { session } = useSession();
  const [state, action] = useActionState(fanOnboardingAction, initialFormState);

  const form = useForm({
    ...fanFormOptions,
    transform: useTransform((baseForm) => mergeForm(baseForm, state ?? initialFormState), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);

  useEffect(() => {
    if (!initialName || initialName.trim().length === 0) {
      return;
    }
    const currentName = String(form.getFieldValue("name") ?? "");
    if (currentName.trim().length > 0) {
      return;
    }
    form.setFieldValue("name", initialName.trim());
  }, [form, initialName]);

  // Handle successful submission
  useEffect(() => {
    if (hasSuccessfulSubmission(state) && user) {
      toast.success("Onboarding completed successfully!");
      Promise.all([user.reload(), session?.reload()]).then(() => {
        const rawRedirect = searchParams.get("redirect_url") || searchParams.get("redirect");
        const destination =
          rawRedirect &&
          !rawRedirect.startsWith("/onboarding") &&
          !rawRedirect.startsWith("/sign-in") &&
          !rawRedirect.startsWith("/sign-up")
            ? rawRedirect
            : "/";
        router.push(destination as Route);
      });
    }
  }, [state, user, session, router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="container mx-auto px-6 pt-40 pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Image
              src="/images/dead-party-logo.png"
              alt="Dead Party Media"
              width={80}
              height={80}
              className="mx-auto mb-6"
            />
            <h1 className="text-4xl font-black mb-2">Complete Your Profile</h1>
            <p className="text-gray-400">Let's get your profile ready</p>
          </div>

          {/* Form */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8">
            <form
              action={action as never}
              onSubmit={(e) => {
                e.preventDefault();

                // Get current form state
                const formState = form.state;

                // Create FormData from form values
                const formData = new FormData();
                const { values } = formState;

                // Add all form fields to FormData
                Object.entries(values).forEach(([key, value]) => {
                  if (value !== undefined && value !== null && value !== "") {
                    formData.append(key, String(value));
                  }
                });

                // `action` is called imperatively (not via native `<form action={...}>` submit),
                // so wrap in a transition to keep React state updates consistent.
                startTransition(() => action(formData));
              }}
            >
              {/* Form Errors */}
              {formErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-400">
                    {formErrors.map((error, index) => (
                      <li key={index}>{String(error ?? "Unknown error")}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Name Field */}
              <form.Field
                name="name"
                validators={{
                  onBlur: ({ value }) =>
                    !value || value.trim() === "" ? "Name is required" : undefined,
                  onChange: ({ value }) =>
                    !value || value.trim() === "" ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="mb-6">
                    <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                      Name
                    </label>
                    <input
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="Your name"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="mt-2 text-sm text-red-400">
                        {field.state.meta.errors[0] as string}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Submit Button */}
              <form.Subscribe
                selector={(formState) => [formState.canSubmit, formState.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <div className="flex justify-end gap-4">
                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="px-6 py-3 bg-[#7CFC00] text-black font-bold rounded-lg hover:bg-[#6EE600] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? "Completing..." : "Complete"}
                    </button>
                  </div>
                )}
              </form.Subscribe>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
