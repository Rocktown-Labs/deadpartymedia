import { describe, expect, it } from "vite-plus/test";
import { planClerkImport } from "../src/clerk-import";

const csv =
  "id,primary_email_address,first_name,last_name,verified_email_addresses,password_digest,password_hasher,totp_secret\nuser_preserved,artist@example.test,Artist,Name,artist@example.test,,,\n";
const snapshot = [
  {
    id: "user_preserved",
    created_at: 1700000000000,
    updated_at: 1700000000000,
    public_metadata: { roles: ["artmaker", "arts_writer", "writer"] },
    external_accounts: [],
  },
];
describe("Clerk migration plan", () => {
  it("preserves IDs and imports only the selected app's roles", () => {
    const plan = planClerkImport(csv, snapshot, ["arts"]);
    expect(plan.summary).toEqual({ users: 1, credentials: 0, oauth: 0, memberships: 2 });
    expect(plan.sql).toContain("'user_preserved'");
    expect(plan.sql).toContain("'arts_writer'");
    expect(plan.sql).not.toContain("'music'");
    expect(plan.sql).not.toContain("'writer'");
    expect(plan.sql).toContain("ON CONFLICT (id) DO NOTHING");
  });
  it("requires explicit scopes when importing both applications", () => {
    expect(() => planClerkImport(csv, snapshot, ["arts", "music"])).toThrow(
      "explicit per-user membership map",
    );
    const plan = planClerkImport(csv, snapshot, ["arts", "music"], {
      user_preserved: { arts: ["arts_writer"], music: [] },
    });
    expect(plan.summary.memberships).toBe(1);
    expect(plan.sql).not.toContain("'music'");
  });
  it("refuses missing password exports instead of breaking password sign-in silently", () => {
    expect(() =>
      planClerkImport(csv, [{ ...snapshot[0], password_enabled: true }], ["arts"]),
    ).toThrow("Password digest missing");
  });
  it("refuses MFA downgrade", () => {
    expect(() =>
      planClerkImport(csv, [{ ...snapshot[0], two_factor_enabled: true }], ["arts"]),
    ).toThrow("refusing to downgrade");
  });
  it("rejects incomplete metadata exports", () => {
    expect(() => planClerkImport(csv, [], ["arts"])).toThrow("metadata missing");
  });
});
