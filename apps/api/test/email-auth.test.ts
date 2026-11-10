import { env } from "cloudflare:test";
import { describe, expect, it } from "vite-plus/test";
import { app } from "../src/index";

describe("email verification and passwordless sign-in", () => {
  it("requires signup verification, accepts one-use email codes, and retains password sign-in", async () => {
    let message = "";
    const bindings = {
      ...env,
      EMAIL: {
        send: async (mail: { text?: string }) => {
          message = mail.text || "";
        },
      },
    } as unknown as typeof env;
    const post = (path: string, body: unknown) =>
      app.request(
        `http://localhost:3000/api/auth/${path}`,
        {
          method: "POST",
          headers: { origin: "http://localhost:3002", "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        bindings,
      );
    const email = "email-methods@example.test";
    const password = "correct horse battery staple";
    const signup = await post("sign-up/email", { email, password, name: "Email methods" });
    expect(signup.status).toBe(200);
    expect(signup.headers.getSetCookie().join()).not.toContain("session_token=");
    expect(message).toMatch(/\b\d{6}\b/);
    const firstCode = message.match(/\b\d{6}\b/)![0];
    expect((await post("sign-in/email", { email, password })).status).toBe(403);
    // Password sign-in resends verification, replacing the first code.
    const verificationCode = message.match(/\b\d{6}\b/)![0];
    const verify = await post("email-otp/verify-email", { email, otp: verificationCode });
    expect(verify.status).toBe(200);
    expect(verify.headers.getSetCookie().join()).toContain("session_token=");
    expect((await post("email-otp/verify-email", { email, otp: verificationCode })).status).toBe(
      400,
    );
    expect(firstCode).toHaveLength(6);
    expect((await post("sign-in/email", { email, password })).status).toBe(200);
    expect((await post("email-otp/send-verification-otp", { email, type: "sign-in" })).status).toBe(
      200,
    );
    const signInCode = message.match(/\b\d{6}\b/)![0];
    expect((await post("sign-in/email-otp", { email, otp: "0000000" })).status).toBe(400);
    const login = await post("sign-in/email-otp", { email, otp: signInCode });
    expect(login.status).toBe(200);
    expect(login.headers.getSetCookie().join()).toContain("session_token=");
    expect((await post("sign-in/email-otp", { email, otp: signInCode })).status).toBe(400);
    const unknown = "unregistered@example.test";
    await post("email-otp/send-verification-otp", { email: unknown, type: "sign-in" });
    expect(
      await env.AUTH_DB.prepare("SELECT id FROM auth_user WHERE email=?").bind(unknown).first(),
    ).toBeNull();
  });
});
