"use client";

import * as React from "react";
import { Kbd, KbdGroup, type kbdVariants } from "@/ui/primitives/kbd";
import type { VariantProps } from "class-variance-authority";

/**
 * Phím tắt hiển thị bằng Kbd (Kbd.md): `mod` = `⌘` trên macOS, `Ctrl` trên Windows/Linux. Mỗi phím một Kbd.
 * `<Shortcut keys={["mod", "S"]} />` → ⌘ S / Ctrl S.
 */
type ShortcutProps = VariantProps<typeof kbdVariants> & { keys: readonly string[]; className?: string };

const subscribeNoop = () => () => {};
const isMacClient = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** `true` trên macOS (sau hydrate). */
function useIsMac() {
  return React.useSyncExternalStore(subscribeNoop, isMacClient, () => false);
}

function Shortcut({ keys, surface, className }: ShortcutProps) {
  const isMac = useIsMac();
  return (
    <KbdGroup className={className}>
      {keys.map((k) => (
        <Kbd key={k} surface={surface}>
          {k === "mod" ? (isMac ? "⌘" : "Ctrl") : k}
        </Kbd>
      ))}
    </KbdGroup>
  );
}

export { Shortcut, useIsMac, type ShortcutProps };
