import "server-only";
import { classifyGitFailure, gitErrorDetail } from "@/ship/adapters/git";
import { GoogleError } from "@/ship/adapters/google";
import type { RunResult } from "@/ship/adapters/process";
import type { AppException } from "@/ship/parents/AppException";
import { DriveNotFoundException } from "./DriveNotFoundException";
import { DriveRequestFailedException } from "./DriveRequestFailedException";
import { GitAuthFailedException } from "./GitAuthFailedException";
import { GitCommandFailedException } from "./GitCommandFailedException";
import { GoogleAuthRequiredException } from "./GoogleAuthRequiredException";
import { GoogleNotConfiguredException } from "./GoogleNotConfiguredException";
import { PullConflictException } from "./PullConflictException";
import { PushRejectedException } from "./PushRejectedException";

/** Lỗi của một lệnh git → exception có mã; stderr (đã che credential) đặt ở params.detail. */
export function gitFailure(command: string, r: RunResult): AppException {
  const params = { command, detail: gitErrorDetail(r) };
  switch (classifyGitFailure(r)) {
    case "AUTH":
      return new GitAuthFailedException(params);
    case "REJECTED":
      return command === "push" ? new PushRejectedException(params) : new GitCommandFailedException(params);
    case "CONFLICT":
      return command === "pull" ? new PullConflictException(params) : new GitCommandFailedException(params);
    default:
      return new GitCommandFailedException(params);
  }
}

/** GoogleError của adapter → exception có mã; lỗi khác giữ nguyên. */
export function googleFailure(err: unknown): unknown {
  if (!(err instanceof GoogleError)) return err;
  const params = err.detail ? { detail: err.detail } : undefined;
  switch (err.kind) {
    case "NOT_CONFIGURED":
      return new GoogleNotConfiguredException();
    case "UNAUTHORIZED":
      return new GoogleAuthRequiredException();
    case "NOT_FOUND":
      return new DriveNotFoundException(params);
    default:
      return new DriveRequestFailedException(params);
  }
}
