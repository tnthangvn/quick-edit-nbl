"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Bot, CircleAlert, GitCompareArrows } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getGetAgentSessionQueryKey,
  getGetSpecQueryOptions,
  getListAgentSessionsQueryKey,
  useGetAgentSession,
} from "@/client/api/generated";
import type { CliRunEvent, CliRunStatus, CliRunStatusEventError, SpecSyncStatus } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useNow } from "@/client/hooks/use-now";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { chatErrorPayload, getSessionChat, isRestoredMessage, seedSessionChat } from "@/client/stores/workbench-chat";
import { buildCliTurn, shortTarget, type ToolKind, type TurnStep } from "@/client/stores/cli-turn";
import { useCliRunStore } from "@/client/stores/workbench-cli-store";
import { useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { useActiveSessionId, useAgentSessionStore } from "@/client/stores/workbench-session-store";
import { proposalKey, useProposalStore } from "@/client/stores/workbench-proposal-store";
import { ChatMessage } from "@/ui/molecules/chat-message";
import { ExecutionRecord, LogStep, NoteStep, RunStats, ThinkingStep, ToolStep, type RecordState } from "@/ui/molecules/execution-record";
import { Markdown } from "@/ui/molecules/markdown";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";
import { useAgentSettings } from "./use-agent-settings";

type ToolPart = Extract<UIMessage["parts"][number], { toolCallId: string }>;
type FilePart = Extract<UIMessage["parts"][number], { type: "file" }>;
const isImagePart = (p: UIMessage["parts"][number]): p is FilePart => p.type === "file" && p.mediaType.startsWith("image");
type ProposeInput = { filename?: string; newContent?: string };
type ProposeOutput = { proposed?: boolean; reason?: string; error?: string };

/** Thời gian chờ SSE `SPEC_PROPOSED` trước khi dùng dự phòng từ tool part. */
const FALLBACK_DELAY_MS = 1500;

/**
 * Log chat của phiên Agent đang mở (spec 3.4, ChatMessage.md). API: tin nhắn của `useChat` (user / assistant / tool),
 * nạp lại từ server khi mở lại phiên. CLI: các run đã lưu của phiên + run đang chạy (stdout, tool call, câu trả lời).
 * Cuộn xuống cuối khi có nội dung mới.
 */
export function ChatLog({ workspaceId }: { workspaceId: string }) {
  const { mode } = useAgentSettings();
  const end = React.useRef<HTMLDivElement>(null);
  const sessionId = useActiveSessionId(workspaceId);
  const session = useSessionData(workspaceId, sessionId);
  const chat = useChat({ chat: getSessionChat(workspaceId, sessionId) });
  const liveRun = useCliRunStore((s) => (sessionId && s.run?.workspaceId === workspaceId && s.run.sessionId === sessionId ? s.run : null));
  useProposalFallback(workspaceId, chat.messages);
  useRefreshOnFinish(workspaceId, sessionId, chat.status, liveRun?.status);

  const savedRuns = session?.runs ?? [];
  const showLive = liveRun !== null && !savedRuns.some((r) => r.runId === liveRun.runId);

  const tick =
    mode === "API"
      ? `${chat.messages.length}:${JSON.stringify(chat.messages.at(-1)?.parts.length)}:${chat.status}`
      : `${savedRuns.length}:${liveRun?.lastSeq}`;
  React.useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [tick]);

  let body: React.ReactNode;
  if (mode === "API") body = <ApiLog messages={chat.messages} status={chat.status} error={chat.error} />;
  else if (savedRuns.length === 0 && !showLive) body = <Hint />;
  else {
    body = (
      <>
        {savedRuns.map((r) => (
          <CliRunBlock key={r.runId} {...r} running={false} />
        ))}
        {showLive ? <CliRunBlock {...liveRun} running={liveRun.status === "RUNNING"} /> : null}
      </>
    );
  }

  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {body}
      <div ref={end} />
    </div>
  );
}

/** Đọc phiên đang mở; nạp hội thoại API vào Chat; phiên không còn (404) thì bỏ chọn. */
function useSessionData(workspaceId: string, sessionId: string | null) {
  const query = useGetAgentSession(sessionId ?? "", { query: { enabled: sessionId !== null } });
  const data = sessionId && query.data?.id === sessionId ? query.data : undefined;
  const missing = (query.error as { status?: number } | null)?.status === 404;

  React.useEffect(() => {
    if (data) seedSessionChat(getSessionChat(workspaceId, data.id), data.messages);
  }, [data, workspaceId]);

  React.useEffect(() => {
    if (missing) useAgentSessionStore.getState().clearActive(workspaceId);
  }, [missing, workspaceId]);

  return data;
}

/** Lượt chat / run vừa xong → server đã lưu: tải lại phiên (run đã lưu thay run live) và danh sách (tiêu đề, thời gian). */
function useRefreshOnFinish(workspaceId: string, sessionId: string | null, chatStatus: string, runStatus: CliRunStatus | undefined) {
  const queryClient = useQueryClient();
  const prev = React.useRef({ chatStatus, runStatus });

  React.useEffect(() => {
    const before = prev.current;
    prev.current = { chatStatus, runStatus };
    if (!sessionId) return;
    const chatDone = before.chatStatus !== "ready" && chatStatus === "ready";
    const runDone = before.runStatus === "RUNNING" && runStatus !== undefined && runStatus !== "RUNNING";
    if (!chatDone && !runDone) return;
    void queryClient.invalidateQueries({ queryKey: getListAgentSessionsQueryKey({ workspaceId }) });
    if (runDone) void queryClient.invalidateQueries({ queryKey: getGetAgentSessionQueryKey(sessionId) });
  }, [chatStatus, runStatus, sessionId, workspaceId, queryClient]);
}

function Hint() {
  const t = useTranslations("workbench.chat");
  return (
    <div className="flex items-center gap-2 text-[13px] leading-[18px] text-muted-foreground">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-soft text-primary" aria-hidden>
        <Icon icon={Bot} size="sm" />
      </span>
      <span>{t("hint")}</span>
    </div>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  const errorMessage = useErrorMessage();
  return (
    <p role="alert" className="m-0 flex items-start gap-1.5 text-[13px] leading-[18px] text-destructive">
      <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
      <span>{errorMessage(error)}</span>
    </p>
  );
}

function ApiLog({ messages, status, error }: { messages: UIMessage[]; status: string; error: Error | undefined }) {
  const t = useTranslations("workbench.chat");
  if (messages.length === 0 && !error) return <Hint />;
  return (
    <>
      {messages.map((m) =>
        m.role === "user" ? (
          <ChatMessage key={m.id} variant="user">
            {m.parts.filter(isTextUIPart).map((p) => p.text).join("\n")}
            {m.parts.some(isImagePart) ? (
              <span className="mt-2 flex flex-wrap gap-1.5">
                {m.parts.filter(isImagePart).map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- data: URL của ảnh đã dán
                  <img key={i} src={p.url} alt={p.filename ?? ""} className="size-16 rounded-md border border-border object-cover" />
                ))}
              </span>
            ) : null}
          </ChatMessage>
        ) : (
          <React.Fragment key={m.id}>
            {m.parts.map((part, i) => {
              if (isTextUIPart(part)) {
                return part.text.trim() ? (
                  <ChatMessage key={i} variant="assistant">
                    <Markdown>{part.text}</Markdown>
                  </ChatMessage>
                ) : null;
              }
              if (isToolUIPart(part)) return <ToolRow key={part.toolCallId} part={part} restored={isRestoredMessage(m.id)} />;
              return null;
            })}
          </React.Fragment>
        ),
      )}
      {status === "submitted" ? (
        <ChatMessage variant="assistant">
          <Spinner size="sm" tone="muted" label={t("thinking")} />
        </ChatMessage>
      ) : null}
      {error ? <ErrorLine error={chatErrorPayload(error)} /> : null}
    </>
  );
}

/** Một tool call: tên mono + tệp liên quan + trạng thái (propose_spec_update → "Chờ duyệt"). */
function ToolRow({ part, restored }: { part: ToolPart; restored: boolean }) {
  const t = useTranslations("workbench.chat.tool");
  const name = getToolName(part as Parameters<typeof getToolName>[0]);
  const input = (part.input ?? {}) as ProposeInput;
  const output = (part.state === "output-available" ? part.output : undefined) as ProposeOutput | undefined;
  const handled = useProposalStore((s) =>
    input.filename ? s.handled.includes(proposalKey({ sourceId: part.toolCallId, file: input.filename })) : false,
  );
  const queued = useProposalStore((s) => s.queue.find((p) => p.sourceId === part.toolCallId)?.key ?? null);

  let status: SpecSyncStatus = "SYNCING";
  let label = t("running");
  if (part.state === "output-error" || output?.error) {
    status = "ERROR";
    label = t("error");
  } else if (part.state === "output-available") {
    status = "SYNCED";
    label = t("done");
    if (name === "propose_spec_update") {
      if (output?.proposed === false) label = t("noChanges");
      else if (handled || restored) label = t("reviewed");
      else {
        status = "UNSAVED";
        label = t("pendingReview");
      }
    }
  } else if (name === "propose_spec_update") {
    label = t("drafting");
  }

  const openDiff = () => {
    if (!queued || !input.filename) return;
    const ws = useProposalStore.getState().queue.find((p) => p.key === queued)?.workspaceId;
    useProposalStore.getState().focus(queued);
    if (ws) useWorkbenchEditorStore.getState().openFile(ws, input.filename);
  };

  return (
    <ChatMessage variant="tool" toolName={name} status={status} statusLabel={label}>
      {input.filename ? (
        <span className="inline-flex items-center gap-2">
          <code className="font-mono">{input.filename}</code>
          {queued ? (
            <Button variant="text" size="sm" icon={GitCompareArrows} className="h-5 px-1" onClick={openDiff}>
              {t("openDiff")}
            </Button>
          ) : null}
        </span>
      ) : null}
    </ChatMessage>
  );
}

/**
 * Dự phòng khi lỡ SSE `SPEC_PROPOSED`: tool part `propose_spec_update` đã xong (`proposed: true`) mà sau 1.5s chưa có
 * đề xuất cùng `toolCallId` trong hàng đợi → đưa vào bằng `input.newContent`, bản gốc đọc lại qua `getSpec`.
 * Bỏ qua tin nhắn nạp lại từ phiên cũ (đề xuất đã xử lý ở lần trước).
 */
function useProposalFallback(workspaceId: string, messages: UIMessage[]) {
  const queryClient = useQueryClient();
  const scheduled = React.useRef(new Set<string>());

  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const m of messages) {
      if (m.role !== "assistant" || isRestoredMessage(m.id)) continue;
      for (const part of m.parts) {
        if (!isToolUIPart(part) || part.state !== "output-available") continue;
        if (getToolName(part as Parameters<typeof getToolName>[0]) !== "propose_spec_update") continue;
        const input = part.input as ProposeInput;
        const output = part.output as ProposeOutput;
        if (!output?.proposed || !input.filename || typeof input.newContent !== "string") continue;
        const key = proposalKey({ sourceId: part.toolCallId, file: input.filename });
        if (scheduled.current.has(key)) continue;
        scheduled.current.add(key);
        const { filename, newContent } = input;
        timers.push(
          setTimeout(async () => {
            const store = useProposalStore.getState();
            if (store.handled.includes(key) || store.queue.some((p) => p.key === key)) return;
            const original = await queryClient
              .fetchQuery(getGetSpecQueryOptions(workspaceId, specFileParam(filename)))
              .then((s) => s.content)
              .catch(() => "");
            useProposalStore.getState().enqueue({ workspaceId, file: filename, original, proposed: newContent, sourceId: part.toolCallId });
          }, FALLBACK_DELAY_MS),
        );
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [messages, queryClient, workspaceId]);
}

type CliRunBlockProps = {
  runId: string;
  prompt: string;
  profileId: string;
  events: CliRunEvent[];
  status: CliRunStatus;
  exitCode: number | null;
  error: CliRunStatusEventError;
  running: boolean;
};

/** "850ms", "12s", "2m 05s"; null khi không có số liệu hoặc quá ngắn để có ý nghĩa. */
function formatDuration(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 100) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec < 10 ? sec.toFixed(1) : Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  return `${m}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;
}

function formatTokens(n: number | null): string | null {
  if (n === null) return null;
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
}

/**
 * Một lượt CLI (tham khảo chat của open-design): prompt → execution record (suy nghĩ, tool, lời kể, stdout; gập khi xong)
 * → câu trả lời cuối dạng Markdown → đề xuất sửa spec → dòng thống kê (thời gian, token, chi phí) → lỗi nếu có.
 */
function CliRunBlock({ runId, prompt, profileId, events, status, error, running }: CliRunBlockProps) {
  const t = useTranslations("workbench.chat");
  const turn = React.useMemo(() => buildCliTurn(events, !running), [events, running]);
  const now = useNow(running);

  const startedMs = turn.startedAt ? Date.parse(turn.startedAt) : null;
  const elapsed = startedMs === null ? null : (running ? now : Date.parse(turn.endedAt ?? turn.startedAt!)) - startedMs;
  const duration = formatDuration(turn.usage?.durationMs ?? elapsed);
  const state: RecordState = running ? "RUNNING" : status === "DONE" ? "DONE" : status === "STOPPED" ? "STOPPED" : "FAILED";
  const lastStep = turn.steps.at(-1);

  const title =
    state === "RUNNING"
      ? lastStep?.kind === "thinking"
        ? t("record.thinking")
        : t("record.working")
      : duration
        ? t(`record.${state}`, { duration })
        : t(`record.${state}Short`);

  const tokensIn = formatTokens(turn.usage?.inputTokens ?? null);
  const tokensOut = formatTokens(turn.usage?.outputTokens ?? null);
  const stats = [
    profileId,
    tokensIn || tokensOut ? t("record.tokens", { input: tokensIn ?? "?", output: tokensOut ?? "?" }) : null,
    turn.usage?.costUsd ? `$${turn.usage.costUsd.toFixed(turn.usage.costUsd < 0.01 ? 4 : 2)}` : null,
    turn.usage?.numTurns ? t("record.turns", { count: turn.usage.numTurns }) : null,
  ];

  return (
    <>
      <ChatMessage variant="user">{prompt}</ChatMessage>
      <ChatMessage variant="assistant">
        <div className="flex min-w-0 flex-col gap-2">
          <ExecutionRecord
            state={state}
            title={title}
            meta={
              state === "RUNNING"
                ? formatDuration(elapsed)
                : turn.toolCount > 0
                  ? t("record.steps", { count: turn.toolCount })
                  : null
            }
            empty={turn.steps.length === 0}
            defaultOpen={!turn.answer && turn.proposals.length === 0}
          >
            {turn.steps.map((step, i) => (
              <RunStep key={step.key} step={step} profileId={profileId} live={running && i === turn.steps.length - 1} />
            ))}
          </ExecutionRecord>
          {turn.answer ? <Markdown>{turn.answer}</Markdown> : null}
          {turn.proposals.length > 0 ? (
            <div className="flex flex-col gap-1">
              {turn.proposals.map((p) => (
                <CliProposalRow key={p.key} runId={runId} file={p.file} />
              ))}
            </div>
          ) : null}
          {!running ? <RunStats items={stats} /> : null}
          {error ? <ErrorLine error={error} /> : null}
        </div>
      </ChatMessage>
    </>
  );
}

const TOOL_VERB_KEYS: Record<ToolKind, string> = {
  READ: "read",
  EDIT: "edit",
  WRITE: "write",
  SEARCH: "search",
  EXEC: "exec",
  WEB: "web",
  PLAN: "plan",
  TASK: "task",
  OTHER: "other",
};

function RunStep({ step, profileId, live }: { step: TurnStep; profileId: string; live: boolean }) {
  const t = useTranslations("workbench.chat");
  switch (step.kind) {
    case "thinking":
      return <ThinkingStep label={t("record.thought")} text={step.text} live={live} />;
    case "text":
      return step.text.trim() ? (
        <NoteStep>
          <Markdown className="text-xs leading-[18px] text-muted-foreground">{step.text.trim()}</Markdown>
        </NoteStep>
      ) : null;
    case "log":
      return <LogStep title={t("cliTitle", { profile: profileId })} text={step.text} live={live} />;
    case "tool":
      return (
        <ToolStep
          toolKind={step.toolKind}
          verb={step.toolKind === "OTHER" ? step.name : t(`record.verb.${TOOL_VERB_KEYS[step.toolKind]}`)}
          name={step.name}
          target={step.target ? shortTarget(step.target) : null}
          status={step.status}
          meta={step.status === "ERROR" ? t("tool.error") : formatDuration(step.durationMs)}
          output={step.output}
          runningLabel={t("tool.running")}
        />
      );
  }
}

/** Đề xuất của run CLI (khoá đề xuất = runId + file). */
function CliProposalRow({ runId, file }: { runId: string; file: string }) {
  const t = useTranslations("workbench.chat.tool");
  // Chỉ "Chờ duyệt" khi đề xuất còn trong hàng đợi (hàng đợi không lưu qua lần tải lại trang).
  const handled = useProposalStore((s) => !s.queue.some((p) => p.key === proposalKey({ sourceId: runId, file })));
  return (
    <ChatMessage variant="tool" toolName="propose_spec_update" status={handled ? "SYNCED" : "UNSAVED"} statusLabel={handled ? t("reviewed") : t("pendingReview")}>
      <code className="font-mono">{file}</code>
    </ChatMessage>
  );
}
