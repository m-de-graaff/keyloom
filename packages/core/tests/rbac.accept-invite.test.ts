import { describe, expect, it } from "vitest";
import { memoryAdapter, acceptInvite, issueInviteToken } from "@keyloom/core";

const SECRET = "test_secret";

describe("RBAC: acceptInvite flow", () => {
  it("accepts a valid invite and creates membership", async () => {
    const a: any = memoryAdapter();
    const org = await a.createOrganization({ name: "Acme" });
    const user = await a.createUser({ email: "user@example.com" });

    const { token, tokenHash, expiresAt } = await issueInviteToken(
      user.email!,
      org.id,
      "member",
      SECRET
    );

    await a.createInvite({
      orgId: org.id,
      email: user.email!,
      role: "member",
      tokenHash,
      expiresAt,
    });

    const result = await acceptInvite({
      adapter: a,
      orgId: org.id,
      token,
      userId: user.id,
      userEmail: user.email!,
      secret: SECRET,
    });

    expect(result.membership.userId).toBe(user.id);
    expect(result.membership.orgId).toBe(org.id);

    const stored = await a.getInviteByTokenHash(org.id, tokenHash);
    expect(stored?.acceptedAt).toBeInstanceOf(Date);
  });

  it("rejects expired invites", async () => {
    const a: any = memoryAdapter();
    const org = await a.createOrganization({ name: "Acme" });
    const user = await a.createUser({ email: "user2@example.com" });

    const { token, tokenHash } = await issueInviteToken(
      user.email!,
      org.id,
      "member",
      SECRET
    );
    const expired = new Date(Date.now() - 1000);

    await a.createInvite({
      orgId: org.id,
      email: user.email!,
      role: "member",
      tokenHash,
      expiresAt: expired,
    });

    await expect(
      acceptInvite({
        adapter: a,
        orgId: org.id,
        token,
        userId: user.id,
        userEmail: user.email!,
        secret: SECRET,
      })
    ).rejects.toThrow("invite_expired");
  });

  it("rejects invite when user email does not match invite email", async () => {
    const a: any = memoryAdapter();
    const org = await a.createOrganization({ name: "Acme" });
    const user = await a.createUser({ email: "user3@example.com" });

    const { token, tokenHash, expiresAt } = await issueInviteToken(
      "target@example.com",
      org.id,
      "member",
      SECRET
    );

    await a.createInvite({
      orgId: org.id,
      email: "target@example.com",
      role: "member",
      tokenHash,
      expiresAt,
    });

    await expect(
      acceptInvite({
        adapter: a,
        orgId: org.id,
        token,
        userId: user.id,
        userEmail: user.email!,
        secret: SECRET,
      })
    ).rejects.toThrow("invite_email_mismatch");
  });
});
