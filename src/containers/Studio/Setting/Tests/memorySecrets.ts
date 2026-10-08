import type { SecretStore } from "@/ship/adapters/secrets";

/** Secret store trong bộ nhớ cho test. */
export class MemorySecrets implements SecretStore {
  readonly data = new Map<string, string>();
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
