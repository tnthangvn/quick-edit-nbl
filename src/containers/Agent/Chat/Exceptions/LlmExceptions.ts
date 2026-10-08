import "server-only";
import { APICallError, LoadAPIKeyError, NoSuchModelError, RetryError } from "ai";
import { AppException } from "@/ship/parents/AppException";

/** Chưa có API key cho provider cần key (mọi provider trừ OLLAMA). */
export class ApiKeyMissingException extends AppException {
  readonly code = "AGENT.API_KEY_MISSING";
  readonly status = 400;
}

export class LlmAuthFailedException extends AppException {
  readonly code = "AGENT.LLM_AUTH_FAILED";
  readonly status = 401;
}

export class ModelNotFoundException extends AppException {
  readonly code = "AGENT.MODEL_NOT_FOUND";
  readonly status = 404;
}

export class LlmRateLimitedException extends AppException {
  readonly code = "AGENT.LLM_RATE_LIMITED";
  readonly status = 429;
}

export class LlmUnreachableException extends AppException {
  readonly code = "AGENT.LLM_UNREACHABLE";
  readonly status = 502;
}

export class LlmRequestFailedException extends AppException {
  readonly code = "AGENT.LLM_REQUEST_FAILED";
  readonly status = 502;
}

/** Google trả 400 (không phải 401) khi key sai; nhận diện qua mã trong body. */
const INVALID_KEY_MARKERS = ["API_KEY_INVALID", "invalid_api_key", "authentication_error", "Incorrect API key"];

/**
 * Đổi lỗi của provider (AI SDK) thành AppException có mã. Không giữ message gốc của provider
 * (có thể lộ URL / thông tin tài khoản); chỉ giữ `cause` để log phía server.
 */
export function toLlmException(err: unknown, ctx: { model: string }): AppException {
  if (err instanceof AppException) return err;
  const inner = RetryError.isInstance(err) ? err.lastError : err;

  if (LoadAPIKeyError.isInstance(inner)) return new ApiKeyMissingException(undefined, { cause: inner });
  if (NoSuchModelError.isInstance(inner)) return new ModelNotFoundException({ model: ctx.model }, { cause: inner });

  if (APICallError.isInstance(inner)) {
    const status = inner.statusCode;
    const body = inner.responseBody ?? "";
    if (status === 401 || status === 403 || INVALID_KEY_MARKERS.some((m) => body.includes(m))) {
      return new LlmAuthFailedException(undefined, { cause: inner });
    }
    if (status === 404) return new ModelNotFoundException({ model: ctx.model }, { cause: inner });
    if (status === 429) return new LlmRateLimitedException(undefined, { cause: inner });
    if (status === undefined) return new LlmUnreachableException(undefined, { cause: inner });
    return new LlmRequestFailedException({ status }, { cause: inner });
  }

  // fetch thất bại trước khi có HTTP response (DNS, ECONNREFUSED, timeout).
  if (inner instanceof TypeError || (inner instanceof Error && inner.name === "TimeoutError")) {
    return new LlmUnreachableException(undefined, { cause: inner });
  }
  return new LlmRequestFailedException(undefined, { cause: inner });
}
