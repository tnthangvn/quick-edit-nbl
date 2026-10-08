/**
 * Wrapper `EventSource` dùng chung. Kiểu event lấy từ code sinh ra (vd `WorkspaceEvent`), không tự khai.
 * Event SSE cập nhật store Zustand; event báo dữ liệu server đổi thì chỉ `invalidateQueries` (CLAUDE.md › FE state).
 */
export type SseStatus = "idle" | "connecting" | "open" | "error" | "closed";

export type SseOptions<T> = {
  url: string;
  /** Tên event SSE cần nghe (`event:` trong stream). Mặc định chỉ `message`. */
  events?: readonly string[];
  /** Chuyển `data` thành object; mặc định `JSON.parse`. */
  parse?: (data: string) => T;
  onEvent: (event: T, type: string) => void;
  onStatus?: (status: SseStatus) => void;
  /** Lỗi parse (dữ liệu hỏng) — không đóng kết nối. */
  onParseError?: (error: unknown, raw: string) => void;
  withCredentials?: boolean;
};

/** Mở kết nối, trả về hàm đóng. EventSource tự kết nối lại khi rớt mạng; trạng thái báo qua `onStatus`. */
export function openEventSource<T>({ url, events = ["message"], parse, onEvent, onStatus, onParseError, withCredentials }: SseOptions<T>): () => void {
  const source = new EventSource(url, { withCredentials });
  onStatus?.("connecting");

  const handle = (type: string) => (e: MessageEvent<string>) => {
    let value: T;
    try {
      value = parse ? parse(e.data) : (JSON.parse(e.data) as T);
    } catch (error) {
      onParseError?.(error, e.data);
      return;
    }
    onEvent(value, type);
  };

  const listeners = events.map((type) => [type, handle(type)] as const);
  for (const [type, fn] of listeners) source.addEventListener(type, fn as EventListener);
  source.onopen = () => onStatus?.("open");
  source.onerror = () => onStatus?.(source.readyState === EventSource.CLOSED ? "closed" : "error");

  return () => {
    for (const [type, fn] of listeners) source.removeEventListener(type, fn as EventListener);
    source.close();
    onStatus?.("closed");
  };
}
