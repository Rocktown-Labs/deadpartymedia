"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch, apiPost } from "@/lib/api-client";

export type EntityField = {
  key: string;
  label: string;
  options?: readonly string[];
  placeholder?: string;
  textarea?: boolean;
  type?: "text" | "checkbox" | "select";
};

export interface EntityFormProps {
  /** Entity slug for the API path: /music/admin/<entity> */
  endpoint: string;
  fields: EntityField[];
  /** Existing row ID (edit mode) or null (create mode) */
  id?: number;
  initial: Record<string, unknown>;
  title: string;
}

/**
 * Shared admin entity form — renders the zod-schema fields against the
 * admin CRUD API (POST to create, PATCH to edit). Each entity configures
 * the field list; the form handles state, submission, and error display.
 */
export function EntityForm({ endpoint, fields, id, initial, title }: EntityFormProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const defaults: Record<string, string | boolean> = {};
    for (const field of fields) {
      const raw = initial[field.key];
      defaults[field.key] =
        field.type === "checkbox" ? Boolean(raw) : raw == null ? "" : String(raw);
    }
    return defaults;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.key];
      if (field.type === "checkbox") {
        body[field.key] = Boolean(value);
      } else if (typeof value === "string" && value.length > 0) {
        body[field.key] = field.key === "artistId" ? Number.parseInt(value, 10) : value;
      } else {
        body[field.key] = null;
      }
    }

    const result = id ? await apiPatch(`${endpoint}/${id}`, body) : await apiPost(endpoint, body);
    setBusy(false);
    if (!result.ok) {
      const error = (result as { error?: string }).error;
      setMessage(error ?? "Failed to save");
      return;
    }
    setMessage("Saved ✓");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">{id ? `Edit ${title}` : `New ${title}`}</h1>
        {message ? <span className="text-sm text-gray-400">{message}</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          if (field.type === "checkbox") {
            return (
              <label className="flex items-center gap-2 text-sm text-gray-300" key={field.key}>
                <input
                  checked={Boolean(values[field.key])}
                  className="accent-[#7CFC00]"
                  onChange={(event) => {
                    setValues((previous) => ({ ...previous, [field.key]: event.target.checked }));
                  }}
                  type="checkbox"
                />
                {field.label}
              </label>
            );
          }
          return (
            <div className="space-y-1.5" key={field.key}>
              <Label className="text-gray-300">{field.label}</Label>
              {field.options ? (
                <Select
                  onValueChange={(value) => {
                    setValues((previous) => ({ ...previous, [field.key]: value }));
                  }}
                  value={String(values[field.key] ?? "")}
                >
                  <SelectTrigger>
                    {String(values[field.key] ?? "") || field.placeholder || "Select"}
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.textarea ? (
                <Textarea
                  onChange={(event) => {
                    setValues((previous) => ({ ...previous, [field.key]: event.target.value }));
                  }}
                  placeholder={field.placeholder}
                  rows={3}
                  value={String(values[field.key] ?? "")}
                />
              ) : (
                <Input
                  onChange={(event) => {
                    setValues((previous) => ({ ...previous, [field.key]: event.target.value }));
                  }}
                  placeholder={field.placeholder}
                  value={String(values[field.key] ?? "")}
                />
              )}
            </div>
          );
        })}
      </div>

      <Button
        className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
        disabled={busy}
        onClick={() => {
          void save();
        }}
        type="button"
      >
        {busy ? "Saving…" : `Save ${title.toLowerCase()}`}
      </Button>
    </div>
  );
}
