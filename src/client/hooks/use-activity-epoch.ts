"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Số đếm tăng mỗi lần component bị ẩn (Next.js cacheComponents giữ route cũ trong React `<Activity>`:
 * ẩn thì chạy cleanup của effect nhưng giữ state). Dùng làm `key` cho widget tự quản DOM (Monaco)
 * để khi hiện lại thì tạo mới thay vì dùng instance đã bị dispose trong cleanup.
 * Xem node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md.
 */
export function useActivityEpoch(): number {
  const [epoch, setEpoch] = useState(0);
  useLayoutEffect(() => () => setEpoch((e) => e + 1), []);
  return epoch;
}
