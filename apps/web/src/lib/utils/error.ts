interface ErrorWithDigest {
  digest?: unknown;
}

interface ErrorWithArray {
  errors?: unknown;
}

interface NestedError {
  longMessage?: unknown;
  message?: unknown;
}

export function getErrorDigest(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const { digest } = error as ErrorWithDigest;
  if (typeof digest !== "string") {
    return undefined;
  }

  return digest;
}

export function isNextRedirectError(error: unknown): boolean {
  const digest = getErrorDigest(error);
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

export function getNestedErrorMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const { errors } = error as ErrorWithArray;
  if (!Array.isArray(errors) || errors.length === 0) {
    return undefined;
  }

  const firstError = errors[0];
  if (typeof firstError !== "object" || firstError === null) {
    return undefined;
  }

  const { longMessage } = firstError as NestedError;
  if (typeof longMessage === "string" && longMessage.trim().length > 0) {
    return longMessage;
  }

  const { message } = firstError as NestedError;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return undefined;
}
