import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AsyncEntry } from "@napi-rs/keyring";
import { logger } from "@/ship/adapters/logger";
import { env } from "@/ship/engine/env";

const SERVICE = "spec-studio";

/**
 * Kho secret (API key, PAT, OAuth refresh token, cookie NotebookLM).
 * Ưu tiên keychain của hệ điều hành; máy không có keychain (Linux headless, CI) thì dùng
 * ~/.spec-studio/secrets.json quyền 600. Secret không bao giờ nằm trong repository hay config.json.
 *
 * Tham chiếu secret là chuỗi `ref` (vd "ws_7f3a29c1:git_token", "llm:google"); trong cấu hình viết "secret:<ref>".
 */
export interface SecretStore {
  get(ref: string): Promise<string | undefined>;
  set(ref: string, value: string): Promise<void>;
  delete(ref: string): Promise<void>;
}

class KeyringSecretStore implements SecretStore {
  async get(ref: string) {
    return (await new AsyncEntry(SERVICE, ref).getPassword()) ?? undefined;
  }
  async set(ref: string, value: string) {
    await new AsyncEntry(SERVICE, ref).setPassword(value);
  }
  async delete(ref: string) {
    await new AsyncEntry(SERVICE, ref).deleteCredential();
  }
}

class FileSecretStore implements SecretStore {
  private file() {
    return path.join(env().SPEC_STUDIO_HOME, "secrets.json");
  }
  private async read(): Promise<Record<string, string>> {
    try {
      return JSON.parse(await readFile(this.file(), "utf8")) as Record<string, string>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw err;
    }
  }
  private async write(data: Record<string, string>) {
    const { mkdir, rename, writeFile } = await import("node:fs/promises");
    await mkdir(path.dirname(this.file()), { recursive: true, mode: 0o700 });
    const tmp = `${this.file()}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(tmp, this.file());
  }
  async get(ref: string) {
    return (await this.read())[ref];
  }
  async set(ref: string, value: string) {
    await this.write({ ...(await this.read()), [ref]: value });
  }
  async delete(ref: string) {
    const data = await this.read();
    delete data[ref];
    await this.write(data);
  }
}

/** Thử keychain; lỗi (không có Secret Service / D-Bus) thì chuyển sang file và ghi nhớ lựa chọn. */
class FallbackSecretStore implements SecretStore {
  private chosen?: SecretStore;
  private readonly keyring = new KeyringSecretStore();
  private readonly file = new FileSecretStore();

  private async store(): Promise<SecretStore> {
    if (this.chosen) return this.chosen;
    try {
      await this.keyring.get("__probe__");
      this.chosen = this.keyring;
    } catch (err) {
      logger.warn({ err }, "keychain không dùng được, lưu secret vào secrets.json (quyền 600)");
      this.chosen = this.file;
    }
    return this.chosen;
  }

  async get(ref: string) {
    return (await this.store()).get(ref);
  }
  async set(ref: string, value: string) {
    return (await this.store()).set(ref, value);
  }
  async delete(ref: string) {
    return (await this.store()).delete(ref);
  }
}

const globalForSecrets = globalThis as unknown as { __specStudioSecrets?: SecretStore };
export const secrets: SecretStore = (globalForSecrets.__specStudioSecrets ??= new FallbackSecretStore());

/** "secret:<ref>" → giá trị thật; chuỗi thường giữ nguyên. */
export async function resolveSecretValue(value: string): Promise<string | undefined> {
  return value.startsWith("secret:") ? secrets.get(value.slice("secret:".length)) : value;
}
