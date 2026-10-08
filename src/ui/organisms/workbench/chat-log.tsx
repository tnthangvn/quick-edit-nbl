"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Bot, CircleAlert, GitCompareArrows } from "lucide-react";
import { useTranslations } from "next-intl";
import { getGetSpecQueryOptions } from "@/client/api/generated";
import type { SpecSyncStatus } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { chatErrorPayload, getWorkspaceChat } from "@/client/stores/workbench-chat";
import { buildCliTimeline, useCliRunStore } from "@/client/stores/workbench-cli-store";
import { useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { proposalKey, useProposalStore } from "@/client/stores/workbench-proposal-store";
import { ChatMessage } from "@/ui/molecules/chat-message";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";
import { useAgentSettings } from "./use-agent-settings";

type ToolPart = Extract<UIMessage["parts"][number], { toolCallId: string }>;
type ProposeInput = { filename?: string; newContent?: string };
type ProposeOutput = { proposed?: boolean; reason?: string; error?: string };

/** Thời gian chờ SSE `SPEC_PROPOSED` trước khi dùng dự phòng từ tool part. */
const FALLBACK_DELAY_MS = 1500;

/**
 * Log chat (spec 3.4, ChatMessage.md). API: tin nhắn của `useChat` (user / assistant / tool). CLI: dòng thời gian của run
 * (khối stdout, tool call, câu trả lời). Cuộn xuống cuối khi có nội dung mới.
 */
export function ChatLog({ workspaceId }: { workspaceId: string }) {
  const { mode } = useAgentSettings();
  const end = React.useRef<HTMLDivElement>(null);
  const chat = useChat({ chat: getWorkspaceChat(workspaceId) });
  const cliRun = useCliRunStore((s) => (s.run?.workspaceId === workspaceId ? s.run : null));
  useProposalFallback(workspaceId, chat.messages);

  const tick = mode === "API" ? `${chat.messages.length}:${JSON.stringify(chat.messages.at(-1)?.parts.length)}:${chat.status}` : `${cliRun?.lastSeq}`;
  React.useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [tick]);

  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {mode === "API" ? <ApiLog messages={chat.messages} status={chat.status} error={chat.error} /> : <CliLog run={cliRun} />}
      <div ref={end} />
    </div>
  );
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
          </ChatMessage>
        ) : (
          <React.Fragment key={m.id}>
            {m.parts.map((part, i) => {
              if (isTextUIPart(part)) {
                return part.text.trim() ? (
                  <ChatMessage key={i} variant="assistant">
                    <span className="whitespace-pre-wrap">{part.text}</span>
                  </ChatMessage>
                ) : null;
              }
              if (isToolUIPart(part)) return <ToolRow key={part.toolCallId} part={part} />;
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
function ToolRow({ part }: { part: ToolPart }) {
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
      else if (handled) label = t("reviewed");
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
 */
function useProposalFallback(workspaceId: string, messages: UIMessage[]) {
  const queryClient = useQueryClient();
  const scheduled = React.useRef(new Set<string>());

  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const m of messages) {
      if (m.role !== "assistant") continue;
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

function CliLog({ run }: { run: ReturnType<typeof useCliRunStore.getState>["run"] }) {
  const t = useTranslations("workbench.chat");
  const items = React.useMemo(() => buildCliTimeline(run?.events ?? []), [run?.events]);
  if (!run) return <Hint />;
  const running = run.status === "RUNNING";
  return (
    <>
      <ChatMessage variant="user">{run.prompt}</ChatMessage>
      {items.length === 0 && running ? (
        <ChatMessage variant="log" logTitle={t("cliTitle", { profile: run.profileId })} streaming>
          {t("cliStarting")}
        </ChatMessage>
      ) : null}
      {items.map((item) => {
        switch (item.kind) {
          case "log":
            return (
              <ChatMessage key={item.key} variant="log" logTitle={t("cliTitle", { profile: run.profileId })} streaming={running && item === items.at(-1)}>
                {item.text}
              </ChatMessage>
            );
          case "tool":
            return (
              <ChatMessage key={item.key} variant="tool" toolName={item.name}>
                <code className="font-mono">{item.input}</code>
              </ChatMessage>
            );
          case "message":
            return (
              <ChatMessage key={item.key} variant="assistant">
                <span className="whitespace-pre-wrap">{item.text}</span>
              </ChatMessage>
            );
          case "proposal":
            return <CliProposalRow key={item.key} runId={run.runId} file={item.file} />;
        }
      })}
      {!running ? (
        <p className="m-0 text-xs leading-4 text-muted-foreground">
          {t(`cliStatus.${run.status}`, { code: run.exitCode ?? "—" })}
        </p>
      ) : null}
      {run.error ? <ErrorLine error={run.error} /> : null}
    </>
  );
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
