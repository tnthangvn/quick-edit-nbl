"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/**
 * Thanh trượt (Radix Slider): rãnh `muted`, đoạn đã chọn `primary`, nút tròn `card`.
 * `stops`: số mốc rời rạc để vẽ chấm trên rãnh (thanh chọn mức, vd effort Low → Max).
 */
const sliderVariants = cva("relative flex w-full touch-none items-center select-none data-disabled:opacity-45", {
  variants: { size: { sm: "h-5", md: "h-6" } },
  defaultVariants: { size: "md" },
});

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & VariantProps<typeof sliderVariants> & { stops?: number; thumbLabel?: string };

function Slider({ className, size, stops, thumbLabel, min = 0, max = 100, ...props }: SliderProps) {
  const dots = stops && stops > 1 ? Array.from({ length: stops }, (_, i) => (i / (stops - 1)) * 100) : [];
  return (
    <SliderPrimitive.Root data-slot="slider" min={min} max={max} className={cn(sliderVariants({ size }), className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary/40" />
      </SliderPrimitive.Track>
      {dots.map((left) => (
        <span key={left} aria-hidden className="pointer-events-none absolute size-1 -translate-x-1/2 rounded-full bg-muted-foreground/60" style={{ left: `${left}%` }} />
      ))}
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        className="block size-4 cursor-grab rounded-full border border-border bg-card shadow-popover transition-transform duration-(--duration-fast) ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-110 active:cursor-grabbing"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider, sliderVariants, type SliderProps };
