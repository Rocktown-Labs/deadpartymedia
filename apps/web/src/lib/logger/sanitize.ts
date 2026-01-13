/**
 * Sensitive fields that should never be logged
 */
const SENSITIVE_FIELDS = new Set([
  "password",
  "token",
  "apiKey",
  "api_key",
  "secret",
  "authorization",
  "cookie",
  "session",
  "csrf",
  "creditCard",
  "credit_card",
  "ssn",
  "socialSecurityNumber",
]);

/**
 * Sanitize an object by removing or masking sensitive fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  depth = 0,
  maxDepth = 5
): Partial<T> {
  if (depth > maxDepth) {
    return {} as Partial<T>;
  }

  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Skip sensitive fields
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key as keyof T] = "[REDACTED]" as T[keyof T];
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key as keyof T] = sanitizeObject(
        value as Record<string, unknown>,
        depth + 1,
        maxDepth
      ) as T[keyof T];
    } else if (Array.isArray(value)) {
      // Sanitize array elements
      sanitized[key as keyof T] = value.map((item) =>
        typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>, depth + 1, maxDepth)
          : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Sanitize error object for logging
 */
export function sanitizeError(error: unknown): {
  message: string;
  name?: string;
  stack?: string;
  code?: string;
  cause?: unknown;
} {
  if (error instanceof Error) {
    const sanitized: {
      message: string;
      name?: string;
      stack?: string;
      code?: string;
      cause?: unknown;
    } = {
      message: error.message,
      name: error.name,
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === "development") {
      sanitized.stack = error.stack;
    }

    if ("code" in error) {
      sanitized.code = String(error.code);
    }

    if (error.cause) {
      sanitized.cause = sanitizeError(error.cause);
    }

    return sanitized;
  }

  return {
    message: String(error),
  };
}

/**
 * Sanitize request data for logging
 */
export function sanitizeRequestData(data: {
  method?: string;
  url?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  query?: Record<string, unknown>;
}): {
  method?: string;
  url?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  query?: Record<string, unknown>;
} {
  return {
    method: data.method,
    url: data.url,
    headers: data.headers ? sanitizeObject(data.headers as Record<string, unknown>) : undefined,
    body: data.body ? sanitizeObject(data.body as Record<string, unknown>) : undefined,
    query: data.query ? sanitizeObject(data.query as Record<string, unknown>) : undefined,
  };
}
