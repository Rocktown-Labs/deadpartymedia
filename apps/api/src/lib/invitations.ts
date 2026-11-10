import { createIdentityDatabase } from "@dpmedia/auth";
import { isAppRole } from "@dpmedia/auth/roles";
import { invitation } from "@dpmedia/auth/schema";
import { and, eq, isNull } from "drizzle-orm";
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
  const values = {
    ...input,
    id,
    email: input.email.toLowerCase(),
    tokenHash: await hashInvitationToken(token),
    expiresAt: new Date(Date.now() + 7 * 86400000),
  };
  const title = input.app === "arts" ? "Dead Party Arts" : "Dead Party Media";
  const origin = input.app === "arts" ? env.ARTS_APP_URL : env.WEB_APP_URL;
  const url = `${origin.replace(/\/$/, "")}/invitation/${token}`;
  // Keep the previous invitation usable if delivery fails. After delivery, one
  // atomic batch replaces pending invitations for this email in this app only.
  await env.EMAIL.send({
    from: env.MAIL_FROM,
    to: input.email,
    subject: `Your invitation to ${title}`,
    text: `You have been invited to ${title} as ${input.role}. Accept your invitation: ${url}\nThis invitation expires in seven days.`,
  });
  await db.batch([
    db
      .delete(invitation)
      .where(
        and(
          eq(invitation.app, input.app),
          eq(invitation.email, values.email),
          isNull(invitation.acceptedAt),
        ),
      ),
    db.insert(invitation).values(values),
  ]);
  return { id, url };
}
