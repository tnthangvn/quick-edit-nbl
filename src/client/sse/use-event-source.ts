"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { openEventSource, type SseOptions, type SseStatus } from "@/client/sse/event-source";

type UseEventSourceOptions<T> = Omit<SseOptions<T>, "url" | "onStatus" | "events"> & {
  /** Tên event SSE cần nghe; truyền mảng hằng để không mở lại kết nối mỗi lần render. */
  events?: readonly string[];
  enabled?: boolean;
};

/**
 * Nghe một luồng SSE, gọi `onEvent` với event đã parse (kiểu `T` lấy từ code sinh ra).
 * `url = null` hoặc `enabled = false` → không kết nối. Đổi `url` → đóng kết nối cũ, mở kết nối mới.
 *
 * ```ts
 * const { status } = useEventSource<WorkspaceEvent>(`/api/workspaces/${id}/events`, {
 *   onEvent: (e) => useSyncStore.getState().apply(e),
 * });
 * ```
 */
export function useEventSource<T>(url: string | null, { events, parse, onEvent, onParseError, withCredentials, enabled = true }: UseEventSourceOptions<T>) {
  const [status, setStatus] = useState<SseStatus>("idle");
  const emit = useEffectEvent((event: T, type: string) => onEvent(event, type));
  const parseData = useEffectEvent((data: string) => (parse ? parse(data) : (JSON.parse(data) as T)));
  const reportParseError = useEffectEvent((error: unknown, raw: string) => onParseError?.(error, raw));
  const eventsKey = (events ?? ["message"]).join("\n");

  useEffect(() => {
    if (!url || !enabled) return;
    return openEventSource<T>({
      url,
      events: eventsKey.split("\n"),
      parse: parseData,
      onEvent: emit,
      onParseError: reportParseError,
      onStatus: setStatus,
      withCredentials,
    });
  }, [url, enabled, eventsKey, withCredentials]);

  return { status: url && enabled ? status : ("idle" as SseStatus) };
}
