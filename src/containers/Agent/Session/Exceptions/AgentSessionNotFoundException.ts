import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class AgentSessionNotFoundException extends AppException {
  readonly code = "AGENT.SESSION_NOT_FOUND";
  readonly status = 404;
}
