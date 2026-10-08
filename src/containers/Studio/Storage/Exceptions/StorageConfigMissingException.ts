import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class StorageConfigMissingException extends AppException {
  readonly code = "STORAGE.CONFIG_MISSING";
  readonly status = 409;
}
