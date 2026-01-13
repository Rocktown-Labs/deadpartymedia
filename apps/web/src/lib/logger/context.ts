import { randomUUID } from "crypto";
import type { Logger } from "../logger";
import { createChildLogger } from "../logger";

/**
 * Generate a unique request ID for correlation tracking
 */
export function generateRequestId(): string {
  return randomUUID();
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
