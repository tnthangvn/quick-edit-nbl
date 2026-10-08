import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class PublishTargetNotConfiguredException extends AppException {
  readonly code = "PUBLISH.TARGET_NOT_CONFIGURED";
  readonly status = 409;
}
