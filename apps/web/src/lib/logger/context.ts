import type { Logger } from "../logger";
import { createChildLogger } from "../logger";

/**
 * Generate a unique request ID for correlation tracking
 * Uses web-compatible crypto API that works in Edge Runtime
 */
export function generateRequestId(): string {
  // Use crypto.getRandomValues() which is available in Edge Runtime
  // Generate a UUID v4 compatible string
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to UUID string format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Create a logger with request context
 */
export function withRequestContext(
  logger: Logger,
  requestId: string,
  additionalContext?: Record<string, unknown>
): Logger {
  return createChildLogger({
    requestId,
    ...additionalContext,
  });
}

/**
 * Create a logger with user context (sanitized)
 */
export function withUserContext(
  logger: Logger,
  userId: string,
  role?: string,
  additionalContext?: Record<string, unknown>
): Logger {
  return createChildLogger({
    userId,
    ...(role && { role }),
    ...additionalContext,
  });
}

/**
 * Create a logger with operation context
 */
export function withOperationContext(
  logger: Logger,
  operation: string,
  entityType?: string,
  entityId?: string | number,
  additionalContext?: Record<string, unknown>
): Logger {
  return createChildLogger({
    operation,
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...additionalContext,
  });
}
