type ErrorWithNestedMessage = {
  error?: {
    message?: string;
  };
};

export function getErrorMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const maybe = error as ErrorWithNestedMessage;
  const message = maybe.error?.message;

  return typeof message === "string" && message.trim() ? message : undefined;
}
