import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { env } from "@/ship/engine/env";

/**
 * Mã hoá secret trước khi ghi xuống DB / JSON: AES-256-GCM, mỗi lần một IV ngẫu nhiên.
 * Định dạng lưu: "enc:v1:<iv>:<tag>:<ciphertext>" (base64url).
 *
 * Master key (32 byte): env SECRET_ENCRYPTION_KEY (base64 hoặc hex). Không có thì tự sinh một lần vào
 * <SPEC_STUDIO_HOME>/master.key quyền 600 (chỉ hợp chạy local; server phải khai env / KMS).
 * Mất master key = mất mọi secret đã lưu.
 */
const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

const globalForCipher = globalThis as unknown as { __specStudioMasterKey?: Buffer };

function parseKey(raw: string): Buffer {
  const value = raw.trim();
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== KEY_BYTES) throw new Error("SECRET_ENCRYPTION_KEY phải là 32 byte (base64 hoặc 64 ký tự hex)");
  return key;
}

function loadMasterKey(): Buffer {
  const { SECRET_ENCRYPTION_KEY, SPEC_STUDIO_HOME } = env();
  if (SECRET_ENCRYPTION_KEY) return parseKey(SECRET_ENCRYPTION_KEY);
  const file = path.join(SPEC_STUDIO_HOME, "master.key");
  try {
    return parseKey(readFileSync(file, "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const key = randomBytes(KEY_BYTES);
  mkdirSync(SPEC_STUDIO_HOME, { recursive: true, mode: 0o700 });
  // flag "wx": tiến trình khác vừa tạo thì đọc lại key của nó, không ghi đè.
  try {
    writeFileSync(file, key.toString("base64"), { mode: 0o600, flag: "wx" });
    return key;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return parseKey(readFileSync(file, "utf8"));
    throw err;
  }
}

function masterKey(): Buffer {
  return (globalForCipher.__specStudioMasterKey ??= loadMasterKey());
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plain: string, key: Buffer = masterKey()): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

/** Ném lỗi nếu sai key hoặc dữ liệu bị sửa (GCM auth tag). */
export function decryptSecret(stored: string, key: Buffer = masterKey()): string {
  if (!isEncrypted(stored)) throw new Error("secret không đúng định dạng enc:v1");
  const [iv, tag, ciphertext] = stored.slice(PREFIX.length).split(":");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** Bản che để trả ra FE: giữ tối đa 4 ký tự đầu + 4 ký tự cuối, chuỗi ngắn thì che hết. */
export function maskSecret(plain: string): string {
  const value = plain.trim();
  if (value.length <= 12) return "•".repeat(8);
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

/** Chỉ dùng trong test. */
export function setMasterKeyForTesting(key: Buffer | undefined) {
  globalForCipher.__specStudioMasterKey = key;
}
