import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret, setMasterKeyForTesting } from "@/ship/adapters/cipher";
import { JsonDataDriver, setDataDriverForTesting } from "@/ship/adapters/data";
import { EncryptedSecretStore, type SecretStore } from "@/ship/adapters/secrets";

class MemoryStore implements SecretStore {
  data = new Map<string, string>();
  async get(ref: string) {
    return this.data.get(ref);
  }
  async set(ref: string, value: string) {
    this.data.set(ref, value);
  }
  async delete(ref: string) {
    this.data.delete(ref);
  }
}

describe("cipher", () => {
  const key = randomBytes(32);

  it("mã hoá AES-256-GCM: IV ngẫu nhiên, giải mã đúng, sai key / sửa dữ liệu thì lỗi", () => {
    const a = encryptSecret("ghp_secret", key);
    const b = encryptSecret("ghp_secret", key);
    expect(a).toMatch(/^enc:v1:/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("ghp_secret");
    expect(decryptSecret(a, key)).toBe("ghp_secret");
    expect(() => decryptSecret(a, randomBytes(32))).toThrow();
    const tampered = `${a.slice(0, -2)}${a.endsWith("A") ? "B" : "A"}A`;
    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it("che: giữ 4 đầu + 4 cuối, chuỗi ngắn che hết", () => {
    expect(maskSecret("ghp_1234567890abcd")).toBe("ghp_••••••••abcd");
    expect(maskSecret("short")).toBe("••••••••");
  });
});

describe("EncryptedSecretStore", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "spec-studio-secrets-"));
    setDataDriverForTesting(new JsonDataDriver(path.join(tmp, "data")));
    setMasterKeyForTesting(randomBytes(32));
  });
  afterEach(() => {
    setDataDriverForTesting(undefined);
    setMasterKeyForTesting(undefined);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("ghi xuống JSON chỉ có ciphertext, đọc ra plaintext, xoá được", async () => {
    const store = new EncryptedSecretStore();
    await store.set("llm:GOOGLE", "sk-plain-value");
    const raw = readFileSync(path.join(tmp, "data", "secrets.json"), "utf8");
    expect(raw).not.toContain("sk-plain-value");
    expect(raw).toContain("enc:v1:");
    expect(await store.get("llm:GOOGLE")).toBe("sk-plain-value");
    await store.set("llm:GOOGLE", "sk-new");
    expect(await store.get("llm:GOOGLE")).toBe("sk-new");
    await store.delete("llm:GOOGLE");
    expect(await store.get("llm:GOOGLE")).toBeUndefined();
  });

  it("secret cũ (keychain / secrets.json) được chuyển sang kho mã hoá rồi xoá khỏi chỗ cũ", async () => {
    const legacy = new MemoryStore();
    legacy.data.set("google:oauth", '{"refresh_token":"r1"}');
    const store = new EncryptedSecretStore(undefined, legacy);
    expect(await store.get("google:oauth")).toBe('{"refresh_token":"r1"}');
    expect(legacy.data.has("google:oauth")).toBe(false);
    expect(await new EncryptedSecretStore().get("google:oauth")).toBe('{"refresh_token":"r1"}');
  });
});
