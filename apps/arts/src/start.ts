import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

const hasClerkServerKeys = Boolean(process.env.CLERK_SECRET_KEY);

export const startInstance = createStart(() => ({
  requestMiddleware: hasClerkServerKeys ? [clerkMiddleware()] : [],
}));
