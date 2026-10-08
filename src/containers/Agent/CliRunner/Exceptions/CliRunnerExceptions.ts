import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class CliProfileNotFoundException extends AppException {
  readonly code = "AGENT.CLI_PROFILE_NOT_FOUND";
  readonly status = 404;
}

/** Binary của profile không có trong PATH / không chạy được. params: { command } */
export class CliNotInstalledException extends AppException {
  readonly code = "AGENT.CLI_NOT_INSTALLED";
  readonly status = 400;
}

/** Args của profile có `{spec}` nhưng người dùng chưa chọn spec nào. */
export class CliSpecContextRequiredException extends AppException {
  readonly code = "AGENT.CLI_SPEC_CONTEXT_REQUIRED";
  readonly status = 400;
}

export class SandboxFailedException extends AppException {
  readonly code = "AGENT.SANDBOX_FAILED";
  readonly status = 500;
}

export class CliRunNotFoundException extends AppException {
  readonly code = "AGENT.RUN_NOT_FOUND";
  readonly status = 404;
}

export class CliRunAlreadyActiveException extends AppException {
  readonly code = "AGENT.RUN_ALREADY_ACTIVE";
  readonly status = 409;
}
