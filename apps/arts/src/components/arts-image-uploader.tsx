import { uploadFiles } from "@better-upload/client";
import { Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { getPublicUploadUrl } from "#/lib/upload.ts";

interface ArtsImageUploaderProps {
  label?: string;
  onChange: (url: string) => void;
  value: string;
}

function getUploadedKey(candidate: Record<string, unknown>): string {
  const objectInfo = candidate.objectInfo as { key?: string } | undefined;
  const uploadedObject = candidate.uploadedObject as { key?: string } | undefined;
  return objectInfo?.key ?? uploadedObject?.key ?? (candidate.key as string) ?? "";
}

export function ArtsImageUploader({
  label = "Image / Photo",
  onChange,
  value,
}: ArtsImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFiles({
        files: [file],
        route: "artwork",
      });

      const uploadedFiles = (result.files ?? []) as Record<string, unknown>[];
      const firstFile = uploadedFiles[0];

      if (!firstFile) {
        throw new Error("No file object returned from upload.");
      }

      const key = getUploadedKey(firstFile);
      const url = key ? getPublicUploadUrl(key) : (firstFile.url as string) || "";

      if (!url) {
        throw new Error("Could not construct public URL for upload.");
      }

      onChange(url);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={() => setIsUrlMode(!isUrlMode)}
          className="text-xs text-[#7CFC00] hover:underline"
        >
          {isUrlMode ? "Switch to File Upload" : "Switch to URL Input"}
        </button>
      </div>

      {value ? (
        <div className="relative aspect-video max-h-48 overflow-hidden rounded-lg border border-gray-800 bg-black flex items-center justify-center">
          <img src={value} alt="Preview" className="h-full w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/80 text-white hover:bg-red-600"
            title="Remove image"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : isUrlMode ? (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="font-mono text-sm"
        />
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-800 bg-[#0A0A0A] p-6 text-center transition-colors hover:border-[#7CFC00]/50 hover:bg-[#111111]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Loader2 className="size-6 animate-spin text-[#7CFC00]" />
              <p className="text-xs font-bold">Uploading image to R2 storage...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <UploadCloud className="size-8 text-[#7CFC00]" />
              <p className="text-xs font-bold text-white">Click or drag image file to upload</p>
              <p className="text-[10px]">PNG, JPG, WEBP up to 10MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
