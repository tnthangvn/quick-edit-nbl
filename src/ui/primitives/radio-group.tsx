"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/** Nút radio 16px (lựa chọn dạng thẻ trong wizard): viền 1.5px `input`, chọn = viền + chấm `primary` scale-in. */
const radioGroupItemVariants = cva(
  "peer group/radio relative grid size-4 shrink-0 cursor-pointer place-items-center rounded-full border-[1.5px] border-input bg-card transition-[border-color] duration-(--duration-base) ease-out focus-visible:outline-offset-2 not-disabled:hover:border-primary disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-primary",
  {
    variants: { size: { md: "" } },
    defaultVariants: { size: "md" },
  },
);

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />;
}

function RadioGroupItem({ className, size, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item> & VariantProps<typeof radioGroupItemVariants>) {
  return (
    <RadioGroupPrimitive.Item data-slot="radio-group-item" className={cn(radioGroupItemVariants({ size }), className)} {...props}>
      <RadioGroupPrimitive.Indicator forceMount className="size-2 scale-0 rounded-full bg-primary transition-transform duration-(--duration-slow) ease-out group-data-[state=checked]/radio:scale-100" />
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem, radioGroupItemVariants };
