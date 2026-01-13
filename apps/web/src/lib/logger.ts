import pino from "pino";
import { env } from "@dpmedia/env/web";

const isDevelopment = env.NODE_ENV === "development";

// Determine log level based on environment
const getLogLevel = (): pino.Level => {
  if (env.LOG_LEVEL) {
    return env.LOG_LEVEL as pino.Level;
  }
  return isDevelopment ? "debug" : "info";
};

// Create base logger configuration
const createLoggerConfig = (): pino.LoggerOptions => {
  const baseConfig: pino.LoggerOptions = {
    level: getLogLevel(),
    base: {
      env: env.NODE_ENV || "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // Development: pretty printing
  if (isDevelopment) {
    return {
      ...baseConfig,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          singleLine: false,
        },
      },
    };
  }

  // Production: structured JSON
  return {
    ...baseConfig,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };
};

// Create the base logger instance
export const logger = pino(createLoggerConfig());

// Export types for TypeScript
export type Logger = typeof logger;

// Helper to create child loggers with context
export function createChildLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

// Helper to create request-scoped logger
export function createRequestLogger(
  requestId: string,
  additionalContext?: Record<string, unknown>
): Logger {
  return logger.child({
    requestId,
    ...additionalContext,
  });
}

// Export default logger
export default logger;
