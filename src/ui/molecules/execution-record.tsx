"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Brain,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  FilePen,
  FilePlus,
  FileText,
  Globe,
  ListChecks,
  Search,
  SquareTerminal,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/ui/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/primitives/collapsible";
import { Icon } from "@/ui/primitives/icon";
import { RowButton } from "@/ui/primitives/row-button";
import { Spinner } from "@/ui/primitives/spinner";

/**
 * Execution record của một lượt Agent (tham khảo open-design): khối gập/mở chứa quá trình làm việc —
 * suy nghĩ, tool (mỗi tool một dòng: icon theo loại, động từ, đối tượng mono, thời gian), lời kể giữa chừng, stdout thô.
 * Đang chạy thì mở và hiện spinner; xong tự gập (trừ khi người dùng đã tự mở / gập). Chỉ gray + blue, đỏ khi lỗi.
 */

export type RecordState = "RUNNING" | "DONE" | "FAILED" | "STOPPED";
export type StepToolKind = "READ" | "EDIT" | "WRITE" | "SEARCH" | "EXEC" | "WEB" | "PLAN" | "TASK" | "OTHER";
export type StepStatus = "RUNNING" | "DONE" | "ERROR";

const TOOL_ICON: Record<StepToolKind, LucideIcon> = {
  READ: FileText,
  EDIT: FilePen,
  WRITE: FilePlus,
  SEARCH: Search,
  EXEC: SquareTerminal,
  WEB: Globe,
  PLAN: ListChecks,
  TASK: Users,
  OTHER: Wrench,
};

const STATE_ICON: Record<Exclude<RecordState, "RUNNING">, LucideIcon> = { DONE: CircleCheck, FAILED: CircleAlert, STOPPED: CircleSlash };

const recordHeaderVariants = cva("font-medium", {
  variants: {
    state: {
      RUNNING: "text-foreground",
      DONE: "text-muted-foreground",
      FAILED: "text-destructive",
      STOPPED: "text-muted-foreground",
    } satisfies Record<RecordState, string>,
  },
});

type ExecutionRecordProps = VariantProps<typeof recordHeaderVariants> & {
  state: RecordState;
  /** Nhãn chính, vd "Đang làm việc", "Đã làm việc trong 34s". */
  title: React.ReactNode;
  /** Phần phụ bên phải tiêu đề (số bước...). */
  meta?: React.ReactNode;
  /** Không có bước nào: chỉ hiện tiêu đề, không mở được. */
  empty?: boolean;
  /** Mở sẵn khi đã xong (vd lượt không có câu trả lời: kết quả chỉ nằm trong record). */
  defaultOpen?: boolean;
  children?: React.ReactNode;
  className?: string;
};

function ExecutionRecord({ state, title, meta, empty = false, defaultOpen = false, children, className }: ExecutionRecordProps) {
  // null = theo trạng thái (đang chạy thì mở); người dùng đã bấm thì giữ lựa chọn của họ.
  const [userOpen, setUserOpen] = React.useState<boolean | null>(null);
  const open = !empty && (userOpen ?? (state === "RUNNING" || defaultOpen));
  return (
    <Collapsible
      data-slot="execution-record"
      data-state-run={state}
      open={open}
      onOpenChange={(v) => setUserOpen(v)}
      className={cn("flex min-w-0 flex-col", className)}
      aria-busy={state === "RUNNING" || undefined}
    >
      <CollapsibleTrigger asChild disabled={empty}>
        <RowButton interactive={!empty} className="w-fit max-w-full gap-1.5 -ml-1.5">
          {state === "RUNNING" ? <Spinner size="xs" tone="primary" /> : <Icon icon={STATE_ICON[state]} size="xs" tone={state === "FAILED" ? "destructive" : "muted"} />}
          <span className={cn(recordHeaderVariants({ state }), "truncate")}>{title}</span>
          {meta ? <span className="shrink-0 text-muted-foreground tabular-nums">{meta}</span> : null}
          {!empty ? (
            <Icon icon={ChevronRight} size="xs" tone="muted" className="transition-transform duration-(--duration-base) ease-out group-data-[state=open]/row:rotate-90" />
          ) : null}
        </RowButton>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-pop-in">
        <ol className="m-0 mt-1 ml-[5px] flex list-none flex-col gap-px border-l border-border py-0.5 pl-2.5">{children}</ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ---------------------------------------------------------------- Bước: tool */

const stepStatusVariants = cva("shrink-0 text-xs leading-4 tabular-nums", {
  variants: {
    status: { RUNNING: "text-primary", DONE: "text-muted-foreground", ERROR: "text-destructive" } satisfies Record<StepStatus, string>,
  },
});

type ToolStepProps = {
  toolKind: StepToolKind;
  /** Động từ đã dịch ("Đọc", "Sửa", "Chạy"...) hoặc tên tool khi không rõ loại. */
  verb: string;
  /** Tên tool gốc (mono, hiện khi rê chuột). */
  name: string;
  target: string | null;
  status: StepStatus;
  /** "2.1s", "Lỗi"...; bỏ trống thì không hiện. */
  meta?: string | null;
  output?: string | null;
  /** Nhãn đọc màn hình cho trạng thái đang chạy. */
  runningLabel: string;
};

function ToolStep({ toolKind, verb, name, target, status, meta, output, runningLabel }: ToolStepProps) {
  const expandable = Boolean(output?.trim());
  const row = (
    <RowButton interactive={expandable} title={name}>
      {status === "RUNNING" ? (
        <Spinner size="xs" tone="primary" label={runningLabel} />
      ) : (
        <Icon icon={status === "ERROR" ? CircleAlert : TOOL_ICON[toolKind]} size="xs" tone={status === "ERROR" ? "destructive" : "muted"} />
      )}
      <span className="shrink-0 font-medium text-foreground">{verb}</span>
      {target ? <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{target}</code> : <span className="flex-1" />}
      {meta ? <span className={stepStatusVariants({ status })}>{meta}</span> : null}
      {expandable ? (
        <Icon icon={ChevronRight} size="xs" tone="muted" className="opacity-0 transition-[opacity,transform] duration-(--duration-base) ease-out group-hover/row:opacity-100 group-data-[state=open]/row:rotate-90 group-data-[state=open]/row:opacity-100" />
      ) : null}
    </RowButton>
  );
  if (!expandable) return <li data-slot="tool-step">{row}</li>;
  return (
    <li data-slot="tool-step">
      <Collapsible>
        <CollapsibleTrigger asChild>{row}</CollapsibleTrigger>
        <CollapsibleContent className="data-[state=open]:animate-pop-in">
          <StepOutput tone={status === "ERROR" ? "error" : "normal"}>{output}</StepOutput>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

const stepOutputVariants = cva(
  "m-0 my-1 ml-5 max-h-40 overflow-auto rounded-md border border-border bg-editor px-2.5 py-1.5 font-mono text-[11px] leading-4 whitespace-pre-wrap break-words",
  { variants: { tone: { normal: "text-foreground", error: "text-destructive" } }, defaultVariants: { tone: "normal" } },
);

function StepOutput({ tone, children }: VariantProps<typeof stepOutputVariants> & { children: React.ReactNode }) {
  return <pre className={stepOutputVariants({ tone })}>{children}</pre>;
}

/* ---------------------------------------------------------------- Bước: suy nghĩ */

type ThinkingStepProps = {
  label: string;
  text: string;
  /** Đang stream: mở sẵn để thấy suy nghĩ hiện dần. */
  live?: boolean;
};

function ThinkingStep({ label, text, live = false }: ThinkingStepProps) {
  const [userOpen, setUserOpen] = React.useState<boolean | null>(null);
  const open = userOpen ?? live;
  const preview = text.trim().split("\n")[0];
  return (
    <li data-slot="thinking-step">
      <Collapsible open={open} onOpenChange={setUserOpen}>
        <CollapsibleTrigger asChild>
          <RowButton>
            <Icon icon={Brain} size="xs" tone="muted" />
            <span className="shrink-0 font-medium text-foreground">{label}</span>
            {!open ? <span className="min-w-0 flex-1 truncate text-muted-foreground italic">{preview}</span> : <span className="flex-1" />}
            <Icon icon={ChevronRight} size="xs" tone="muted" className="transition-transform duration-(--duration-base) ease-out group-data-[state=open]/row:rotate-90" />
          </RowButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="m-0 my-1 ml-5 max-h-48 overflow-auto text-xs leading-[18px] whitespace-pre-wrap text-muted-foreground italic">{text}</p>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/* ---------------------------------------------------------------- Bước: lời kể / stdout */

function NoteStep({ children }: { children: React.ReactNode }) {
  return (
    <li data-slot="note-step" className="px-1.5 py-1 text-xs leading-[18px] text-muted-foreground">
      {children}
    </li>
  );
}

function LogStep({ title, text, live = false }: { title: string; text: string; live?: boolean }) {
  const ref = React.useRef<HTMLPreElement>(null);
  React.useEffect(() => {
    if (live && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, live]);
  return (
    <li data-slot="log-step" className="py-0.5">
      <div className="ml-1.5 overflow-hidden rounded-md border border-border bg-editor">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted px-2.5 py-0.5 font-mono text-[11px] leading-4 text-muted-foreground">
          <Icon icon={SquareTerminal} size="xs" />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {live ? <Spinner size="xs" tone="primary" /> : null}
        </div>
        <pre ref={ref} className="m-0 max-h-40 overflow-auto px-2.5 py-1.5 font-mono text-[11px] leading-4 whitespace-pre-wrap text-foreground">
          {text}
        </pre>
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- Thống kê cuối lượt */

/** Một dòng caption: các mục đã có (thiếu thì bỏ, không in "0" hay "—"). */
function RunStats({ items, className }: { items: (string | null | undefined | false)[]; className?: string }) {
  const shown = items.filter((s): s is string => Boolean(s));
  if (shown.length === 0) return null;
  return (
    <p data-slot="run-stats" className={cn("m-0 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-4 text-muted-foreground tabular-nums", className)}>
      {shown.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span aria-hidden>·</span> : null}
          <span>{s}</span>
        </React.Fragment>
      ))}
    </p>
  );
}

export { ExecutionRecord, LogStep, NoteStep, RunStats, ThinkingStep, ToolStep, type ExecutionRecordProps, type ToolStepProps };
