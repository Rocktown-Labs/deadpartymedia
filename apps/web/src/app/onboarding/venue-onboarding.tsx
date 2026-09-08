"use client";

import { useActionState, useEffect, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useSession } from "@clerk/nextjs";
import type { Route } from "next";
import Image from "next/image";
import { MapPin, Globe, Phone, Users, Building2 } from "lucide-react";
import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { venueOnboardingAction } from "./actions";
import { venueFormOptions } from "./form-options";
import type { VenueFormData } from "./form-options";
import { toast } from "sonner";

interface VenueOnboardingProps {
  initialValues?: Partial<VenueFormData> | null;
}

function hasSuccessfulSubmission(state: unknown): state is { success: true } {
  if (typeof state !== "object" || state === null) {
    return false;
  }
  const { success } = state as { success?: unknown };
  return success === true;
}

export function VenueOnboarding({ initialValues }: VenueOnboardingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { session } = useSession();
  const [state, action] = useActionState(venueOnboardingAction, initialFormState);

  const form = useForm({
    ...venueFormOptions,
    transform: useTransform((baseForm) => mergeForm(baseForm, state ?? initialFormState), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);

  useEffect(() => {
    if (!initialValues) {
      return;
    }
    const fields: (keyof VenueFormData)[] = [
      "name",
      "city",
      "address",
      "state",
      "phone",
      "website",
      "capacity",
      "description",
    ];
    for (const field of fields) {
      const val = initialValues[field];
      if (typeof val === "string" && val.trim().length > 0) {
        form.setFieldValue(field, val);
      }
    }
  }, [form, initialValues]);

  // Handle successful submission
  useEffect(() => {
    if (hasSuccessfulSubmission(state) && user) {
      toast.success("Venue profile created successfully!");
      Promise.all([user.reload(), session?.reload()]).then(() => {
        const rawRedirect = searchParams.get("redirect_url") || searchParams.get("redirect");
        const destination =
          rawRedirect &&
          !rawRedirect.startsWith("/onboarding") &&
          !rawRedirect.startsWith("/sign-in") &&
          !rawRedirect.startsWith("/sign-up")
            ? rawRedirect
            : "/venues";
        router.push(destination as Route);
      });
    }
  }, [state, user, session, router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="container mx-auto px-6 pt-40 pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <Image
              src="/images/dead-party-logo.png"
              alt="Dead Party Media"
              width={80}
              height={80}
              className="mx-auto mb-6"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7CFC00]/10 border border-[#7CFC00]/20 text-[#7CFC00] text-xs font-mono font-bold uppercase tracking-widest mb-3">
              <Building2 className="w-3.5 h-3.5" /> Venue Registration
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2 text-white">
              Claim & Register Your Venue
            </h1>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Get listed in the Arkansas music directory, showcase your stage specs, and post upcoming concerts.
            </p>
          </div>

          {/* Form */}
          <div className="bg-[#111111] border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-2xl">
            <form
              action={action as never}
              onSubmit={(e) => {
                e.preventDefault();
                const formState = form.state;
                if (!formState.canSubmit) {
                  return;
                }
                const formData = new FormData();
                const values = formState.values;
                Object.entries(values).forEach(([key, value]) => {
                  if (value !== undefined && value !== null) {
                    formData.append(key, String(value));
                  }
                });
                startTransition(() => {
                  action(formData);
                });
              }}
              className="space-y-6"
            >
              {/* Error Display */}
              {formErrors && formErrors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm font-medium">
                    {Array.isArray(formErrors) ? formErrors.join(", ") : String(formErrors)}
                  </p>
                </div>
              )}

              {/* Venue Name */}
              <form.Field name="name">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="block text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2"
                    >
                      Venue Name *
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. Vino's Pizza-Pub-Brewery"
                      required
                      className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors text-sm"
                    />
                  </div>
                )}
              </form.Field>

              {/* City & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <form.Field name="city">
                  {(field) => (
                    <div>
                      <label
                        htmlFor={field.name}
                        className="block text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2 flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#7CFC00]" /> City *
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Little Rock"
                        required
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors text-sm"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="address">
                  {(field) => (
                    <div>
                      <label
                        htmlFor={field.name}
                        className="block text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2"
                      >
                        Street Address
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. 923 W 7th St"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors text-sm"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Phone & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <form.Field name="phone">
                  {(field) => (
                    <div>
                      <label
                        htmlFor={field.name}
                        className="block text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2 flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-zinc-400" /> Phone
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. 501-375-8466"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors text-sm"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="website">
                  {(field) => (
                    <div>
                      <label
                        htmlFor={field.name}
                        className="block text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2 flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5 text-zinc-400" /> Website
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="url"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="https://vinosbrewpub.com"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors text-sm"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Capacity & Genres / Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <form.Field name="capacity">
                  {(field) => (
                    <div>
                      <label
                        htmlFor={field.name}
                        className="block text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2 flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5 text-[#7CFC00]" /> Room Capacity
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors text-sm"
                      />
                    </div>
                  )}
                </form.Field>

                <div className="sm:col-span-2">
                  <form.Field name="description">
                    {(field) => (
                      <div>
                        <label
                          htmlFor={field.name}
                          className="block text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2"
                        >
                          Music Genres & Stage Vibe
                        </label>
                        <input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g. Punk, Hardcore, Indie, Metal"
                          className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors text-sm"
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer text-sm shadow-xl"
              >
                Complete Venue Setup
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
