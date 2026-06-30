import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { hashPassword, verifyPassword, createSessionToken, verify } from "./auth";

describe("Password hashing", () => {
  it("hashes a password", async () => {
    const hash = await hashPassword("testPassword123");
    expect(hash).not.toBe("testPassword123");
    expect(hash.startsWith("$2")).toBe(true);
  });
  it("verifies correct password", async () => {
    const hash = await hashPassword("mySecret");
    expect(await verifyPassword("mySecret", hash)).toBe(true);
  });
  it("rejects wrong password", async () => {
    const hash = await hashPassword("mySecret");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("Session tokens", () => {
  const user = { id: "u1", email: "t@t.in", name: "Test" };
  it("creates and verifies a token", () => {
    const token = createSessionToken(user, "b1", "owner");
    const p = verify(token);
    expect(p?.uid).toBe("u1");
    expect(p?.activeBid).toBe("b1");
    expect(p?.role).toBe("owner");
  });
  it("rejects tampered token", () => {
    const token = createSessionToken(user, "b1", "owner");
    expect(verify(token.slice(0, -5) + "XXXXX")).toBeNull();
  });
  it("rejects invalid signature", () => {
    const token = createSessionToken(user, "b1", "owner");
    const [data] = token.split(".");
    expect(verify(`${data}.invalid`)).toBeNull();
  });
  it("rejects expired token", () => {
    const token = createSessionToken(user, "b1", "owner");
    const [data] = token.split(".");
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    payload.exp = Date.now() - 1000;
    const expiredData = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const secret = process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production";
    const sig = createHmac("sha256", secret).update(expiredData).digest("base64url");
    expect(verify(`${expiredData}.${sig}`)).toBeNull();
  });
  it("supports all 13 roles", () => {
    const roles = ["owner","partner","manager","cashier","sales","purchase","store_keeper","warehouse_manager","delivery","employee","auditor","ca","accountant"] as const;
    for (const role of roles) {
      const p = verify(createSessionToken(user, "b1", role));
      expect(p?.role).toBe(role);
    }
  });
});
