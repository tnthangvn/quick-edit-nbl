import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle, type LucideProps } from "lucide-react";
import { cn } from "@/ui/utils";

/** Spinner `loader-circle` cho mọi trạng thái đang chạy. Giảm chuyển động: vẫn quay chậm 1.6s/vòng (globals.css). */
const spinnerVariants = cva("shrink-0 animate-spin", {
  variants: {
    size: { xs: "size-3", sm: "size-3.5", md: "size-4", lg: "size-5" },
    tone: { inherit: "", primary: "text-primary", muted: "text-muted-foreground" },
  },
  defaultVariants: { size: "md", tone: "inherit" },
});

type SpinnerProps = Omit<LucideProps, "size"> &
  VariantProps<typeof spinnerVariants> & {
    /** Có `label` thì spinner là `role="status"`; không có thì chỉ trang trí (vd trong nút đang `loading`). */
    label?: string;
  };

function Spinner({ className, size, tone, label, ...props }: SpinnerProps) {
  return (
    <LoaderCircle
      data-slot="spinner"
      strokeWidth={2.5}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(spinnerVariants({ size, tone }), className)}
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
