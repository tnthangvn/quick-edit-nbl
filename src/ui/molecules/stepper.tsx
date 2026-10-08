"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { Check, CircleAlert, Minus } from "lucide-react";
import { cn } from "@/ui/utils";
import { Icon } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";

/**
 * Danh sách bước dọc (wireframe Projects `wf-step`): chấm tròn 22px + tiêu đề + mô tả.
 * Dùng cho thanh bước của Wizard (TODO / CURRENT / DONE) và tiến trình tạo project (RUNNING / ERROR / SKIPPED).
 * Mỗi trạng thái có icon riêng, không chỉ khác màu.
 */
export type StepStatus = "TODO" | "CURRENT" | "DONE" | "RUNNING" | "ERROR" | "SKIPPED";

const stepVariants = cva("relative flex items-start gap-2.5 py-2 text-[13px] leading-[18px]", {
  variants: {
    status: {
      TODO: "text-muted-foreground",
      CURRENT: "text-foreground [&_[data-step-title]]:font-semibold",
      DONE: "text-foreground",
      RUNNING: "text-foreground [&_[data-step-title]]:font-semibold",
      ERROR: "text-destructive",
      SKIPPED: "text-muted-foreground",
    } satisfies Record<StepStatus, string>,
  },
  defaultVariants: { status: "TODO" },
});

const stepDotVariants = cva(
  "relative z-10 grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] bg-card text-[11px] font-semibold transition-[background-color,border-color,box-shadow,color] duration-(--duration-slow) ease-out",
  {
    variants: {
      status: {
        TODO: "border-input text-muted-foreground",
        CURRENT: "border-primary text-primary shadow-[0_0_0_3px_var(--color-primary-soft)]",
        DONE: "border-primary bg-primary text-primary-foreground",
        RUNNING: "border-primary text-primary shadow-[0_0_0_3px_var(--color-primary-soft)]",
        ERROR: "border-destructive bg-destructive-soft text-destructive",
        SKIPPED: "border-input bg-muted text-muted-foreground",
      } satisfies Record<StepStatus, string>,
    },
    defaultVariants: { status: "TODO" },
  },
);

export type StepperItem = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  status: StepStatus;
};

type StepperProps = {
  items: StepperItem[];
  "aria-label"?: string;
  className?: string;
};

function StepDot({ status, index }: { status: StepStatus; index: number }) {
  let content: React.ReactNode = index + 1;
  if (status === "DONE") content = <Icon icon={Check} size="xs" strokeWidth={3} className="animate-scale-in" />;
  else if (status === "RUNNING") content = <Spinner size="xs" />;
  else if (status === "ERROR") content = <Icon icon={CircleAlert} size="xs" strokeWidth={2.5} />;
  else if (status === "SKIPPED") content = <Icon icon={Minus} size="xs" strokeWidth={2.5} />;
  return <span className={stepDotVariants({ status })}>{content}</span>;
}

function Stepper({ items, className, ...props }: StepperProps) {
  return (
    <ol data-slot="stepper" aria-label={props["aria-label"]} className={cn("relative m-0 flex list-none flex-col p-0", className)}>
      {items.map((item, i) => (
        <li
          key={item.id}
          data-status={item.status}
          aria-current={item.status === "CURRENT" || item.status === "RUNNING" ? "step" : undefined}
          className={stepVariants({ status: item.status })}
        >
          {i < items.length - 1 ? <span aria-hidden className="absolute top-[30px] bottom-[-8px] left-[10px] w-0.5 rounded-full bg-border" /> : null}
          <StepDot status={item.status} index={i} />
          <span className="flex min-w-0 flex-col">
            <span data-step-title className="font-medium">
              {item.title}
            </span>
            {item.description ? <span className="mt-0.5 text-xs leading-4 text-muted-foreground">{item.description}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export { Stepper, stepDotVariants, stepVariants, type StepperProps };
