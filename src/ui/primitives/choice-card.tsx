"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/**
 * Nhóm lựa chọn dạng thẻ (wireframe Projects/Settings `wf-opt`): mỗi thẻ có chấm radio, tiêu đề, mô tả một câu và
 * phần phụ (trạng thái, badge). Thẻ đang chọn: viền `primary` + vòng `primary-soft`. Dựa trên Radix RadioGroup
 * (mũi tên để đổi, Space chọn). Dùng cho: Nơi lưu file, Kết nối qua, Cách đẩy thay đổi, Sync Strategy, Active CLI.
 */
const choiceCardGroupVariants = cva("grid gap-2", {
  variants: {
    columns: { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3" },
  },
  defaultVariants: { columns: 1 },
});

function ChoiceCardGroup({
  className,
  columns,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> & VariantProps<typeof choiceCardGroupVariants>) {
  return <RadioGroupPrimitive.Root data-slot="choice-card-group" className={cn(choiceCardGroupVariants({ columns }), className)} {...props} />;
}

const choiceCardVariants = cva(
  "group/choice flex w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card text-left text-foreground transition-[border-color,box-shadow,background-color] duration-(--duration-base) ease-out not-disabled:hover:border-input disabled:cursor-not-allowed disabled:opacity-55 data-[state=checked]:border-primary data-[state=checked]:shadow-[0_0_0_3px_var(--color-primary-soft)] data-[state=checked]:hover:border-primary",
  {
    variants: {
      size: { md: "p-3", sm: "px-3 py-2" },
    },
    defaultVariants: { size: "md" },
  },
);

type ChoiceCardProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, "title"> &
  VariantProps<typeof choiceCardVariants> & {
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Dòng phụ dưới mô tả (trạng thái dò CLI, tài khoản…). */
    meta?: React.ReactNode;
    /** Phần bên phải (badge, icon). */
    trailing?: React.ReactNode;
  };

function ChoiceCard({ className, size, title, description, meta, trailing, ...props }: ChoiceCardProps) {
  return (
    <RadioGroupPrimitive.Item data-slot="choice-card" className={cn(choiceCardVariants({ size }), className)} {...props}>
      <span
        aria-hidden
        className="mt-px grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] border-input transition-[border-color] duration-(--duration-base) ease-out group-data-[state=checked]/choice:border-primary"
      >
        <span className="size-2 scale-0 rounded-full bg-primary transition-transform duration-(--duration-slow) ease-out group-data-[state=checked]/choice:scale-100" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] leading-[18px] font-medium">{title}</span>
        {description ? <span className="text-xs leading-4 text-muted-foreground">{description}</span> : null}
        {meta ? <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs leading-4">{meta}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-1.5">{trailing}</span> : null}
    </RadioGroupPrimitive.Item>
  );
}

export { ChoiceCard, ChoiceCardGroup, choiceCardGroupVariants, choiceCardVariants, type ChoiceCardProps };
