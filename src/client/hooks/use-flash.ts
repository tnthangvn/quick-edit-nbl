"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cờ bật trong `duration` ms rồi tự tắt — cho trạng thái `success` của Button (~1.5s, Button.md).
 * ```ts
 * const [saved, flashSaved] = useFlash();
 * onSuccess: () => flashSaved()
 * <Button success={saved} successText="Đã lưu" />
 * ```
 */
export function useFlash(duration = 1500) {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOn(true);
    timer.current = setTimeout(() => setOn(false), duration);
  }, [duration]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return [on, flash] as const;
}
