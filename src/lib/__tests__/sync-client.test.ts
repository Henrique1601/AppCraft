import { describe, expect, it } from "vitest";
import { hashSyncKey } from "@/lib/sync-client";

describe("sync-client", () => {
  it("hashes sync key deterministically with sha256 prefix", async () => {
    const a = await hashSyncKey("minha-chave-segura");
    const b = await hashSyncKey("  minha-chave-segura  ");
    const c = await hashSyncKey("outra-chave-segura");

    expect(a).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("returns empty string for blank key", async () => {
    expect(await hashSyncKey("   ")).toBe("");
  });
});
