import { createIdentityDatabase } from "@dpmedia/auth";
import { isAppRole } from "@dpmedia/auth/roles";
import { invitation } from "@dpmedia/auth/schema";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { Bindings } from "../bindings";
export async function hashInvitationToken(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function sendInvitation(
  env: Bindings,
  input: {
    app: "arts" | "music";
    email: string;
    role: string;
    invitedBy: string;
    artistId?: number;
    localProfileId?: number;
  },
) {
  if (!isAppRole(input.app, input.role))
    throw new HTTPException(400, { message: "Invalid application role" });
  const id = crypto.randomUUID(),
    token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const db = createIdentityDatabase(env.AUTH_DB);
  await db.insert(invitation).values({
    ...input,
    id,
    email: input.email.toLowerCase(),
    tokenHash: await hashInvitationToken(token),
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  const title = input.app === "arts" ? "Dead Party Arts" : "Dead Party Media";
  const origin = input.app === "arts" ? env.ARTS_APP_URL : env.WEB_APP_URL;
  try {
    await env.EMAIL.send({
      from: env.MAIL_FROM,
      to: input.email,
      subject: `Your invitation to ${title}`,
      text: `You have been invited to ${title} as ${input.role}. Accept your invitation: ${origin.replace(/\/$/, "")}/invitation/${token}\nThis invitation expires in seven days.`,
    });
  } catch (error) {
    await db.delete(invitation).where(eq(invitation.id, id));
    throw error;
  }
  return id;
}
