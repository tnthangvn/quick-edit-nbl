"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/**
 * Segmented control (ModeSwitch.md): nhóm lựa chọn loại trừ, bo `radius-full` trên nền `muted`.
 * Lựa chọn đang bật: nền `card`, icon `primary`. Dựa trên Radix RadioGroup (mũi tên trái/phải để đổi).
 */
const segmentedVariants = cva("inline-flex w-fit shrink-0 gap-0.5 rounded-full border border-border bg-muted p-0.5", {
  variants: {
    size: { sm: "", md: "" },
  },
  defaultVariants: { size: "md" },
});

const segmentedItemVariants = cva(
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] duration-(--duration-fast) ease-out not-disabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-[0_0_0_1px_var(--color-border)] [&_svg]:shrink-0 data-[state=checked]:[&_svg]:text-primary",
  {
    variants: {
      size: {
        sm: "h-5 px-2 text-[11px] leading-4 [&_svg:not([class*='size-'])]:size-3",
        md: "h-6 px-3 text-xs leading-4 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type SegmentedSize = NonNullable<VariantProps<typeof segmentedVariants>["size"]>;
const SegmentedSizeContext = React.createContext<SegmentedSize>("md");

function Segmented({
  className,
  size,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> & VariantProps<typeof segmentedVariants>) {
  return (
    <SegmentedSizeContext.Provider value={size ?? "md"}>
      <RadioGroupPrimitive.Root
        data-slot="segmented"
        orientation={orientation}
        className={cn(segmentedVariants({ size }), className)}
        {...props}
      />
    </SegmentedSizeContext.Provider>
  );
}

function SegmentedItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  const size = React.useContext(SegmentedSizeContext);
  return <RadioGroupPrimitive.Item data-slot="segmented-item" className={cn(segmentedItemVariants({ size }), className)} {...props} />;
}

export { Segmented, SegmentedItem, segmentedVariants, segmentedItemVariants };
