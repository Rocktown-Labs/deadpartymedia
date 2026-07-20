import { uploadFiles } from "@better-upload/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Upload, UserPlus } from "lucide-react";
import { useState } from "react";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { createArtsArtmakerStub, requireArtsStaff } from "#/lib/artmakers.functions.ts";
import {
  analyzeArtsEventFlyer,
  createArtsEventFromFlyer,
  type ArtsFlyerAnalysis,
} from "#/lib/event-import.functions.ts";

interface EventDraftFields {
  artmakerIds: number[];
  date: string;
  description: string;
  image: string;
  location: string;
  price: string;
  ticketLink: string;
  time: string;
  title: string;
  venue: string;
}

export const Route = createFileRoute("/admin/events/import")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminEventImport,
});

function getUploadedObjectKey(file: unknown) {
  const candidate = file as {
    objectInfo?: { key?: string };
    uploadedObject?: { key?: string };
    key?: string;
  };
  return candidate.objectInfo?.key ?? candidate.uploadedObject?.key ?? candidate.key ?? "";
}

function draftFromAnalysis(analysis: ArtsFlyerAnalysis): EventDraftFields {
  return {
    artmakerIds: analysis.matchedArtmakers.map((artmaker) => artmaker.id),
    date: analysis.date,
    description: analysis.description,
    image: analysis.imageUrl,
    location: analysis.location,
    price: analysis.price ?? "",
    ticketLink: analysis.ticketLink ?? "",
    time: analysis.time,
    ticketLink: analysis.ticketLink ?? "",
    venue: analysis.venue,
  };
}

function AdminEventImport() {
  const staff = Route.useRouteContext();
  const analyze = useServerFn(analyzeArtsEventFlyer);
  const createEvent = useServerFn(createArtsEventFromFlyer);
  const createArtmakerStub = useServerFn(createArtsArtmakerStub);

  const [analysis, setAnalysis] = useState<ArtsFlyerAnalysis | null>(null);
  const [fields, setFields] = useState<EventDraftFields | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [editedArtmakerNames, setEditedArtmakerNames] = useState<Record<string, string>>({});
  const [customArtmakerName, setCustomArtmakerName] = useState("");
  const [createdArtmakers, setCreatedArtmakers] = useState<Array<{ id: number; name: string }>>([]);
  const [isCreatingArtmaker, setIsCreatingArtmaker] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const analyzeMutation = useMutation({
    mutationFn: async (payload: { imageKey?: string; imageUrl?: string }) =>
      analyze({ data: payload }),
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Could not analyze flyer.");
    },
    onSuccess: (nextAnalysis) => {
      setAnalysis(nextAnalysis);
      setFields(draftFromAnalysis(nextAnalysis));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) =>
      uploadFiles({
        files,
        route: "eventFlyers",
      }),
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Flyer upload failed.");
    },
    onSuccess: (result) => {
      const imageKey = getUploadedObjectKey((result.files ?? [])[0]);
      if (!imageKey) {
        setError("The flyer uploaded, but no object key came back from storage.");
        return;
      }
      setError("");
      analyzeMutation.mutate({ imageKey });
    },
  });

  const setField = <K extends keyof EventDraftFields>(key: K, value: EventDraftFields[K]) => {
    setFields((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleCreateArtmaker = async (nameToUse: string) => {
    const trimmed = nameToUse.trim();
    if (!trimmed || isCreatingArtmaker) {
      return;
    }
    setIsCreatingArtmaker(true);
    setError("");
    try {
      const result = await createArtmakerStub({
        data: {
          city: fields?.location || "Little Rock",
          name: trimmed,
          state: "AR",
        },
      });
      if (result.success && result.artmaker) {
        setCreatedArtmakers((prev) => [...prev, result.artmaker]);
        if (fields) {
          setField("artmakerIds", [...new Set([...fields.artmakerIds, result.artmaker.id])]);
        }
        setSuccess(`Created and attached artmaker profile: "${result.artmaker.name}"`);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to create artmaker stub.",
      );
    } finally {
      setIsCreatingArtmaker(false);
    }
  };

  const allMatchedArtmakers = [...(analysis?.matchedArtmakers ?? []), ...createdArtmakers];

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">AI import</p>
          <h1 className="mt-3 font-black text-4xl tracking-tight">Event flyer import</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Upload an arts flyer, review the extracted event details, match or create artmakers,
            then publish.
          </p>
        </div>
        <Link
          to="/admin/events"
          className="rounded-lg border border-gray-800 px-4 py-3 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
        >
          Back to events
        </Link>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-950/20 p-4 text-red-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-6 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 p-4 text-[#7CFC00]">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <div className="mb-5">
            <h2 className="font-black text-xl">Upload flyer</h2>
            <p className="mt-2 text-gray-500 text-sm">
              Cloudflare R2 upload, then Gemini analysis.
            </p>
          </div>

          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 bg-[#080808] p-6 text-center hover:border-[#7CFC00]">
            {uploadMutation.isPending || analyzeMutation.isPending ? (
              <Loader2 className="mb-3 size-8 animate-spin text-[#7CFC00]" />
            ) : (
              <Upload className="mb-3 size-8 text-[#7CFC00]" />
            )}
            <span className="font-black text-sm uppercase tracking-[0.18em]">
              {uploadMutation.isPending
                ? "Uploading"
                : analyzeMutation.isPending
                  ? "Analyzing"
                  : "Choose flyer image"}
            </span>
            <span className="mt-2 text-gray-500 text-sm">PNG, JPG, GIF, WebP. One flyer.</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploadMutation.isPending || analyzeMutation.isPending}
              onChange={(event) => {
                const files = [...(event.target.files ?? [])].slice(0, 1);
                if (files.length > 0) {
                  setError("");
                  setSuccess("");
                  uploadMutation.mutate(files);
                }
                event.target.value = "";
              }}
            />
          </label>

          <div className="mt-6 grid gap-3">
            <Label htmlFor="manual-image-url">Or analyze public image URL</Label>
            <div className="flex gap-3">
              <Input
                id="manual-image-url"
                value={manualImageUrl}
                onChange={(event) => setManualImageUrl(event.target.value)}
                placeholder="https://..."
              />
              <Button
                type="button"
                disabled={analyzeMutation.isPending || !manualImageUrl.trim()}
                onClick={() => {
                  setError("");
                  setSuccess("");
                  analyzeMutation.mutate({ imageUrl: manualImageUrl.trim() });
                }}
              >
                Analyze
              </Button>
            </div>
          </div>

          {analysis ? (
            <div className="mt-6 rounded-lg border border-gray-800 bg-[#080808] p-4 space-y-4">
              <div className="flex items-center gap-2 text-[#7CFC00]">
                <CheckCircle2 className="size-4" />
                <span className="font-black text-xs uppercase tracking-[0.18em]">
                  Analysis ready
                </span>
              </div>
              {analysis.possibleDuplicate ? (
                <p className="text-yellow-200 text-sm">
                  Possible duplicate: {analysis.possibleDuplicate.title} at{" "}
                  {analysis.possibleDuplicate.venue} on {analysis.possibleDuplicate.date}.
                </p>
              ) : null}
              {analysis.warnings.length > 0 ? (
                <div className="grid gap-2">
                  {analysis.warnings.map((warning) => (
                    <p key={warning} className="flex gap-2 text-gray-400 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-300" />
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}

              {/* Editable Unmatched Artmakers */}
              {analysis.unmatchedArtmakers.length > 0 ? (
                <div className="border-gray-800 border-t pt-4 space-y-3">
                  <p className="font-black text-xs text-gray-400 uppercase tracking-wider">
                    Unmatched Artmakers Extracted (Editable)
                  </p>
                  {analysis.unmatchedArtmakers.map((originalName) => {
                    const currentName = editedArtmakerNames[originalName] ?? originalName;

                    return (
                      <div
                        key={originalName}
                        className="rounded-lg border border-gray-800 bg-[#111111] p-3 space-y-2"
                      >
                        <Label
                          htmlFor={`unmatched-artmaker-${originalName}`}
                          className="text-xs text-gray-400 font-medium"
                        >
                          Fix / Edit Name
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id={`unmatched-artmaker-${originalName}`}
                            value={currentName}
                            onChange={(e) =>
                              setEditedArtmakerNames((prev) => ({
                                ...prev,
                                [originalName]: e.target.value,
                              }))
                            }
                            className="h-9 font-bold text-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={isCreatingArtmaker || !currentName.trim()}
                            onClick={() => handleCreateArtmaker(currentName)}
                          >
                            <UserPlus className="mr-1.5 size-3.5" />
                            Create Profile
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Add Custom Artmaker */}
              <div className="border-gray-800 border-t pt-4 space-y-2">
                <Label
                  htmlFor="custom-artmaker-input"
                  className="text-xs font-black text-[#7CFC00] uppercase tracking-wider"
                >
                  + Add Custom Artmaker
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-artmaker-input"
                    value={customArtmakerName}
                    onChange={(e) => setCustomArtmakerName(e.target.value)}
                    placeholder="Type artmaker name..."
                    className="h-9 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCreatingArtmaker || !customArtmakerName.trim()}
                    onClick={async () => {
                      await handleCreateArtmaker(customArtmakerName);
                      setCustomArtmakerName("");
                    }}
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Create Stub
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <h2 className="font-black text-xl">Review event</h2>
          {fields ? (
            <form
              className="mt-5 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                setSuccess("");
                try {
                  const created = await createEvent({ data: fields });
                  setSuccess(`Created ${created.status} event #${created.eventId}.`);
                  setAnalysis(null);
                  setFields(null);
                } catch (caughtError) {
                  setError(
                    caughtError instanceof Error
                      ? caughtError.message
                      : "Could not create the imported event.",
                  );
                }
              }}
            >
              <Field label="Title">
                <Input
                  value={fields.title}
                  onChange={(event) => setField("title", event.target.value)}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Venue">
                  <Input
                    value={fields.venue}
                    onChange={(event) => setField("venue", event.target.value)}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={fields.location}
                    onChange={(event) => setField("location", event.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Date">
                  <Input
                    type="date"
                    value={fields.date}
                    onChange={(event) => setField("date", event.target.value)}
                  />
                </Field>
                <Field label="Time">
                  <Input
                    value={fields.time}
                    onChange={(event) => setField("time", event.target.value)}
                  />
                </Field>
                <Field label="Price">
                  <Input
                    value={fields.price}
                    onChange={(event) => setField("price", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Ticket link">
                <Input
                  value={fields.ticketLink}
                  onChange={(event) => setField("ticketLink", event.target.value)}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={fields.description}
                  onChange={(event) => setField("description", event.target.value)}
                  rows={7}
                />
              </Field>
              {allMatchedArtmakers.length > 0 ? (
                <div className="rounded-lg border border-gray-800 bg-[#080808] p-4">
                  <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.18em]">
                    Matched & Attached Artmakers
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {allMatchedArtmakers.map((artmaker) => (
                      <label
                        key={artmaker.id}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-800 bg-[#111111] px-3 py-2 text-sm font-medium text-white"
                      >
                        <input
                          type="checkbox"
                          checked={fields.artmakerIds.includes(artmaker.id)}
                          onChange={(event) => {
                            setField(
                              "artmakerIds",
                              event.target.checked
                                ? [...fields.artmakerIds, artmaker.id]
                                : fields.artmakerIds.filter((id) => id !== artmaker.id),
                            );
                          }}
                        />
                        {artmaker.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <Button type="submit">Create arts event</Button>
            </form>
          ) : (
            <p className="mt-5 rounded-lg border border-gray-800 bg-[#080808] p-6 text-gray-400">
              Upload a flyer or paste a public image URL to generate a review draft.
            </p>
          )}
        </section>
      </div>
    </ArtsAdminShell>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="font-bold text-gray-400 text-xs uppercase tracking-[0.18em]">{label}</span>
      {children}
    </label>
  );
}
