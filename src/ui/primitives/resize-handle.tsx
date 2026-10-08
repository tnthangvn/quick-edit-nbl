"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/** Bước đổi kích thước khi dùng phím mũi tên (Shift = bước lớn). */
const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;

const resizeHandleVariants = cva(
  "group/resize z-10 flex w-2 shrink-0 cursor-col-resize touch-none items-stretch justify-center outline-none select-none",
);

const resizeLineVariants = cva(
  "w-px transition-colors duration-(--duration-fast) group-hover/resize:bg-primary group-focus-visible/resize:bg-primary",
  {
    variants: { dragging: { false: "bg-border", true: "bg-primary" } },
    defaultVariants: { dragging: false },
  },
);

type ResizeHandleProps = Omit<React.ComponentProps<"div">, "onChange"> &
  VariantProps<typeof resizeHandleVariants> & {
    /** Cạnh đang kéo của khung: "end" = cạnh phải (kéo sang phải để rộng ra), "start" = cạnh trái. */
    edge?: "start" | "end";
    /** Kích thước hiện tại (px) của khung được kéo. */
    value: number;
    min: number;
    max: number;
    onValueChange: (value: number) => void;
    label: string;
  };

/**
 * Thanh kéo đổi chiều rộng một khung (vd cột chat Agent). Kéo bằng chuột / cảm ứng (pointer capture) hoặc phím ← →,
 * Home / End. Chỉ báo giá trị mới qua `onValueChange`; nơi dùng tự lưu.
 */
function ResizeHandle({ value, min, max, onValueChange, label, edge = "end", className, ...props }: ResizeHandleProps) {
  const [dragging, setDragging] = React.useState(false);
  const start = React.useRef({ x: 0, value });
  const sign = edge === "end" ? 1 : -1;
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, value };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onValueChange(clamp(start.current.value + sign * (e.clientX - start.current.x)));
  };
  const stop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const next =
      e.key === "ArrowRight" ? value + sign * step
      : e.key === "ArrowLeft" ? value - sign * step
      : e.key === "Home" ? min
      : e.key === "End" ? max
      : null;
    if (next === null) return;
    e.preventDefault();
    onValueChange(clamp(next));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-slot="resize-handle"
      data-dragging={dragging || undefined}
      className={cn(resizeHandleVariants(), className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      {...props}
    >
      <span aria-hidden className={resizeLineVariants({ dragging })} />
    </div>
  );
}

export { ResizeHandle, resizeHandleVariants, type ResizeHandleProps };
