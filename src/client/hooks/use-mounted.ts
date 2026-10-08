"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** `true` sau khi hydrate ở client — cho UI phụ thuộc theme/thiết bị (tránh lệch SSR). */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
