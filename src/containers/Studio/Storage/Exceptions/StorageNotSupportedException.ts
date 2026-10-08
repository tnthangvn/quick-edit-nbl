import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class StorageNotSupportedException extends AppException {
  readonly code = "STORAGE.NOT_SUPPORTED";
  readonly status = 409;
}
