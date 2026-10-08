import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, CloudUpload, Plus, RefreshCw, SendHorizontal, Settings, Trash, X, type LucideIcon, type LucideProps } from "lucide-react";
import { cn } from "@/ui/utils";

const motionBase = "transition-transform duration-(--duration-slow) ease-out";

/**
 * Icon Lucide, stroke 2, màu theo `currentColor`.
 * Kích thước: `md` 16px (mặc định), `sm` 14px (toolbar, tab), `xs` 12px (badge).
 * `motion`: icon diễn động từ khi rê chuột vào nút cha có class `group` (Button đã có sẵn).
 */
const iconVariants = cva("shrink-0", {
  variants: {
    size: { xs: "size-3", sm: "size-3.5", md: "size-4", lg: "size-5" },
    tone: {
      inherit: "",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive",
    },
    motion: {
      none: "",
      nudge: "icon-nudge",
      spinHalf: "icon-spin-half",
      lift: "icon-lift",
      turn: "icon-turn",
      grow: `${motionBase} group-hover:scale-115`,
      tilt: `${motionBase} group-hover:-rotate-8`,
      gear: `${motionBase} group-hover:rotate-60`,
    },
    spin: { true: "animate-spin", false: "" },
  },
  defaultVariants: { size: "md", tone: "inherit", motion: "none", spin: false },
});

type IconMotion = NonNullable<VariantProps<typeof iconVariants>["motion"]>;

/** Động từ của icon theo Button.md: Send tiến, Refresh quay, Upload nhấc, X/Plus xoay, Check phóng, Trash nghiêng, Settings xoay 60°. */
const VERB_MOTION = new Map<LucideIcon, IconMotion>([
  [SendHorizontal, "nudge"],
  [RefreshCw, "spinHalf"],
  [CloudUpload, "lift"],
  [X, "turn"],
  [Plus, "turn"],
  [Check, "grow"],
  [Trash, "tilt"],
  [Settings, "gear"],
]);

function iconMotionFor(icon: LucideIcon): IconMotion {
  return VERB_MOTION.get(icon) ?? "none";
}

type IconProps = Omit<LucideProps, "size"> &
  VariantProps<typeof iconVariants> & {
    icon: LucideIcon;
    /** Có `label` thì icon mang nghĩa (role="img"); không có thì ẩn khỏi trình đọc màn hình. */
    label?: string;
  };

function Icon({ icon: Comp, size, tone, motion, spin, label, className, ...props }: IconProps) {
  return (
    <Comp
      data-slot="icon"
      strokeWidth={2}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn(iconVariants({ size, tone, motion, spin }), className)}
      {...props}
    />
  );
}

export { Icon, iconVariants, iconMotionFor, type IconProps, type IconMotion };
