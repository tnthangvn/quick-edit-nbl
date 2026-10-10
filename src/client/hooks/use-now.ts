"use client";

import { useEffect, useState } from "react";

/** Thời điểm hiện tại (ms), cập nhật mỗi `intervalMs` khi `active` (đồng hồ chạy của run đang làm việc). */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
