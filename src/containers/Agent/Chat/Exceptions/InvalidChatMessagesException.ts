import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** `messages` không đúng định dạng UIMessage của AI SDK. */
export class InvalidChatMessagesException extends AppException {
  readonly code = "AGENT.INVALID_MESSAGES";
  readonly status = 400;
}
