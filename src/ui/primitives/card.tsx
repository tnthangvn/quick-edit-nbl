import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/ui/utils";

/**
 * Thẻ trên nền `card`, viền `border`, `radius-lg`. Phân lớp bằng viền, không bóng (trừ khi hover thẻ bấm được).
 * - `variant="dashed"`: ô tạo mới (New Project) — hover chuyển blue.
 * - `interactive`: hover viền `input` + `shadow-float` + nhấc 1px.
 * - `dimmed`: thẻ mờ (Workspace mất thư mục).
 */
const cardVariants = cva("relative flex flex-col rounded-lg border bg-card text-card-foreground", {
  variants: {
    variant: {
      default: "border-border",
      dashed:
        "cursor-pointer items-center justify-center border-[1.5px] border-dashed border-border text-muted-foreground transition-[color,border-color,background-color] duration-(--duration-base) ease-out hover:border-primary hover:bg-primary-soft hover:text-primary",
    },
    padding: { none: "", md: "gap-3 p-4", lg: "gap-4 p-5" },
    interactive: {
      true: "transition-[border-color,box-shadow,transform] duration-(--duration-base) ease-out hover:-translate-y-px hover:border-input hover:shadow-float has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring motion-reduce:hover:translate-y-0",
      false: "",
    },
    dimmed: { true: "opacity-60", false: "" },
  },
  defaultVariants: { variant: "default", padding: "md", interactive: false, dimmed: false },
});

function Card({
  className,
  variant,
  padding,
  interactive,
  dimmed,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  return <Comp data-slot="card" className={cn(cardVariants({ variant, padding, interactive, dimmed }), className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("m-0 truncate text-sm leading-5 font-semibold", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("m-0 text-xs leading-4 text-muted-foreground", className)} {...props} />;
}

/** Chân thẻ: viền trên, chữ caption `muted-foreground`. */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("mt-auto flex items-center gap-2 border-t border-border pt-2.5 text-xs leading-4 text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Card, CardDescription, CardFooter, CardTitle, cardVariants };
