import { logger } from "../logger";
import { withOperationContext } from "./context";
import { sanitizeError } from "./sanitize";

const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second

/**
 * Log a database operation with timing and context
 */
export async function logDbOperation<T>(
  operation: string,
  entityType: string,
  entityId?: string | number,
  fn?: () => Promise<T>,
): Promise<T | undefined> {
  const startTime = Date.now();
  const log = withOperationContext(logger, operation, entityType, entityId);

  try {
    if (fn) {
      const result = await fn();
      const duration = Date.now() - startTime;

      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        log.warn(
          { duration, entityId, entityType, operation },
          `Slow database operation: ${operation} took ${duration}ms`,
        );
      } else {
        log.info(
          { duration, entityId, entityType, operation },
          `Database operation completed: ${operation}`,
        );
      }

      return result;
    }
    // Just log the operation without executing
    log.info({ entityId, entityType, operation }, `Database operation: ${operation}`);
    return undefined;
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(
      {
        duration,
        entityId,
        entityType,
        error: sanitizeError(error),
        operation,
      },
      `Database operation failed: ${operation}`,
    );
    throw error;
  }
}

/**
 * Helper to log database create operations
 */
export async function logDbCreate<T>(entityType: string, fn: () => Promise<T>): Promise<T> {
  return logDbOperation("create", entityType, undefined, fn) as Promise<T>;
}

/**
 * Helper to log database update operations
 */
export async function logDbUpdate<T>(
  entityType: string,
  entityId: string | number,
  fn: () => Promise<T>,
): Promise<T> {
  return logDbOperation("update", entityType, entityId, fn) as Promise<T>;
}

/**
 * Helper to log database delete operations
 */
export async function logDbDelete<T>(
  entityType: string,
  entityId: string | number,
  fn: () => Promise<T>,
): Promise<T> {
  return logDbOperation("delete", entityType, entityId, fn) as Promise<T>;
}
