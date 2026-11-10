export function encodeFormFields(form: FormData) {
  const fields: Record<string, string | string[]> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string") throw new Error("Upload files through the media endpoint first");
    const previous = fields[key];
    fields[key] =
      previous === undefined
        ? value
        : Array.isArray(previous)
          ? [...previous, value]
          : [previous, value];
  }
  return fields;
}
