import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorRepoNotFoundException extends AppException {
  readonly code = "CONNECTOR.REPO_NOT_FOUND";
  readonly status = 404;
}
