import { z } from "zod";

const uploadResponse = z.object({ key: z.string(), url: z.url(), publicBaseUrl: z.url() });
export interface UploadProgress {
  id: string;
  progress: number;
  status: "uploading" | "complete" | "error";
}
interface UploadOptions {
  files: File[];
  route: "artwork" | "profileImages" | "articleImages" | "eventFlyers";
  onFileStateChange?: (event: { file: UploadProgress }) => void;
}
/** Upload directly through the authenticated API to its native R2 binding. */
export async function uploadMedia({ files, route, onFileStateChange }: UploadOptions) {
  const uploaded: { file: File; key: string; url: string }[] = [];
  const failedFiles: { name: string; error: { type: string; message: string } }[] = [];
  let publicBaseUrl = "";
  // Bound memory and connections: each request contains a single file.
  for (const file of files) {
    const id = crypto.randomUUID();
    const report = (progress: number, status: UploadProgress["status"]) =>
      onFileStateChange?.({ file: { id, progress, status } });
    try {
      report(0, "uploading");
      const response = await new Promise<z.infer<typeof uploadResponse>>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/arts/uploads/${route}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) report(event.loaded / event.total, "uploading");
        };
        xhr.onerror = () =>
          reject(new Error("The transfer to storage failed. Check your connection and try again."));
        xhr.onload = () => {
          try {
            const body: unknown = JSON.parse(xhr.responseText);
            if (xhr.status < 200 || xhr.status >= 300) {
              const error = z.object({ error: z.string() }).safeParse(body);
              throw new Error(error.success ? error.data.error : `Upload failed (${xhr.status})`);
            }
            resolve(uploadResponse.parse(body));
          } catch (error) {
            reject(error);
          }
        };
        const form = new FormData();
        form.set("file", file);
        xhr.send(form);
      });
      uploaded.push({ file, key: response.key, url: response.url });
      publicBaseUrl = response.publicBaseUrl;
      report(1, "complete");
    } catch (error) {
      report(0, "error");
      failedFiles.push({
        name: file.name,
        error: {
          type: "upload",
          message: error instanceof Error ? error.message : "Upload failed",
        },
      });
    }
  }
  return { files: uploaded, failedFiles, metadata: { publicBaseUrl } };
}
