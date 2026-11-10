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
      user_preserved: { arts: ["artmaker", "arts_writer"], music: ["writer"] },
    });
    expect(plan.summary.memberships).toBe(3);
    expect(plan.sql).toContain("'music'");
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
  it("refuses a scoped map that silently drops an existing Clerk role", () => {
    expect(() =>
      planClerkImport(csv, snapshot, ["arts", "music"], {
        user_preserved: { arts: ["arts_writer"], music: [] },
      }),
    ).toThrow("drops Clerk role");
  });
  it("reserves an existing profile without inventing verified email or credentials", () => {
    const plan = planClerkImport(
      csv,
      snapshot,
      ["arts", "music"],
      {
        user_preserved: { arts: ["artmaker", "arts_writer"], music: ["writer"] },
      },
      [
        {
          id: "wp_placeholder:admin",
          email: "Reserved@Example.test",
          name: "Reserved admin",
          createdAt: 1,
          updatedAt: 1,
          memberships: { arts: ["super_admin"], music: ["super_admin"] },
        },
      ],
    );
    expect(plan.summary).toEqual({ users: 2, credentials: 0, oauth: 0, memberships: 5 });
    expect(plan.sql).toContain("'reserved@example.test'");
    expect(plan.sql).toContain("'wp_placeholder:admin'");
    expect(plan.sql).not.toContain("auth_account");
    expect(plan.sql).toContain(
      "email_verified, disabled, created_at, updated_at) VALUES ('wp_placeholder:admin', 'reserved@example.test', 'Reserved admin', 0, 0, 1, 1)",
    );
  });
  it("rejects reserved identities that collide with imported accounts", () => {
    expect(() =>
      planClerkImport(csv, snapshot, ["arts"], undefined, [
        {
          id: "wp_placeholder:admin",
          email: "artist@example.test",
          name: "Wrong identity",
          createdAt: 1,
          updatedAt: 1,
          memberships: { arts: ["super_admin"] },
        },
      ]),
    ).toThrow("conflicts");
  });
});
