import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AsyncEntry } from "@napi-rs/keyring";
import { decryptSecret, encryptSecret } from "@/ship/adapters/cipher";
import { logger } from "@/ship/adapters/logger";
import "@/ship/contracts/secrets";
import { env } from "@/ship/engine/env";
import { RepositoryBase } from "@/ship/parents/RepositoryBase";

const SERVICE = "spec-studio";

/**
 * Kho secret (API key, PAT, OAuth refresh token, cookie NotebookLM).
 * Lưu qua repository (model `secrets`, chạy trên DATA_DRIVER: JSON hoặc POSTGRES), giá trị luôn mã hoá
 * AES-256-GCM bằng master key (ship/adapters/cipher); chỉ giải mã trong BE khi cần dùng.
 * Secret cũ trong keychain / secrets.json được chuyển sang kho mã hoá ở lần đọc đầu tiên rồi xoá khỏi chỗ cũ.
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

/** Kho cũ (trước khi mã hoá): keychain, lỗi (không có Secret Service / D-Bus) thì secrets.json. Chỉ còn dùng để chuyển dữ liệu. */
class LegacySecretStore implements SecretStore {
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

class SecretRepository extends RepositoryBase<"secrets"> {
  protected readonly model = "secrets" as const;

  async findValue(ref: string): Promise<string | undefined> {
    return (await this.findOne({ ref }))?.value;
  }
  async saveValue(ref: string, value: string): Promise<void> {
    await this.upsert({ ref, value }, ["ref"]);
  }
  async deleteByRef(ref: string): Promise<void> {
    await this.delete({ ref });
  }
}

/** Secret mã hoá trong DB / JSON; đọc trượt thì thử kho cũ và chuyển sang (một lần). */
export class EncryptedSecretStore implements SecretStore {
  constructor(
    private readonly repo: Pick<SecretRepository, "findValue" | "saveValue" | "deleteByRef"> = new SecretRepository(),
    private readonly legacy?: SecretStore,
  ) {}

  async get(ref: string) {
    const stored = await this.repo.findValue(ref);
    if (stored !== undefined) return decryptSecret(stored);
    return this.migrateLegacy(ref);
  }
  async set(ref: string, value: string) {
    await this.repo.saveValue(ref, encryptSecret(value));
  }
  async delete(ref: string) {
    await this.repo.deleteByRef(ref);
    await this.legacyDelete(ref);
  }

  private async migrateLegacy(ref: string): Promise<string | undefined> {
    if (!this.legacy) return undefined;
    let value: string | undefined;
    try {
      value = await this.legacy.get(ref);
    } catch (err) {
      logger.warn({ err, ref }, "không đọc được secret cũ");
      return undefined;
    }
    if (value === undefined) return undefined;
    await this.set(ref, value);
    await this.legacyDelete(ref);
    return value;
  }

  private async legacyDelete(ref: string) {
    try {
      await this.legacy?.delete(ref);
    } catch {
      // Không có ở kho cũ: bỏ qua.
    }
  }
}

const globalForSecrets = globalThis as unknown as { __specStudioEncryptedSecrets?: SecretStore };
export const secrets: SecretStore = (globalForSecrets.__specStudioEncryptedSecrets ??= new EncryptedSecretStore(undefined, new LegacySecretStore()));

/** "secret:<ref>" → giá trị thật; chuỗi thường giữ nguyên. */
export async function resolveSecretValue(value: string): Promise<string | undefined> {
  return value.startsWith("secret:") ? secrets.get(value.slice("secret:".length)) : value;
}
