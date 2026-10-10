"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createAgentSession, getListAgentSessionsQueryKey, useListSpecs } from "@/client/api/generated";
import type { CliImageInput, CliImageInputMediaType } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useCliRunActions } from "@/client/hooks/use-cli-run";
import { getSessionChat } from "@/client/stores/workbench-chat";
import { useContextFiles, useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { useActiveSessionId, useAgentSessionStore } from "@/client/stores/workbench-session-store";
import { Composer, type ComposerAttachment } from "@/ui/molecules/composer";
import { Badge } from "@/ui/primitives/badge";
import { notify } from "@/ui/primitives/sonner";
import { useAgentBusy } from "./use-agent-busy";
import { useAgentSettings } from "./use-agent-settings";

const MAX_CHIPS = 3;
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp", "image/gif"] satisfies CliImageInputMediaType[];

type Attachment = ComposerAttachment & { file: File };

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Ảnh đã dán trong composer; URL xem trước (blob:) được thu hồi khi bỏ / gửi / rời trang. */
function useAttachments() {
  const t = useTranslations("workbench.composer");
  const [items, setItems] = React.useState<Attachment[]>([]);
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  React.useEffect(() => () => itemsRef.current.forEach((a) => URL.revokeObjectURL(a.url)), []);

  const add = (files: File[]) => {
    const accepted: Attachment[] = [];
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) notify.error(t("imageType"));
      else if (file.size > MAX_IMAGE_BYTES) notify.error(t("imageTooLarge", { max: 5 }));
      else accepted.push({ id: crypto.randomUUID(), name: file.name || "clipboard.png", url: URL.createObjectURL(file), file });
    }
    setItems((prev) => {
      const room = Math.max(0, MAX_IMAGES - prev.length);
      if (accepted.length > room) notify.error(t("imageLimit", { max: MAX_IMAGES }));
      accepted.slice(room).forEach((a) => URL.revokeObjectURL(a.url));
      return [...prev, ...accepted.slice(0, room)];
    });
  };
  const remove = (id: string) =>
    setItems((prev) => {
      prev.filter((a) => a.id === id).forEach((a) => URL.revokeObjectURL(a.url));
      return prev.filter((a) => a.id !== id);
    });
  const clear = () =>
    setItems((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.url));
      return [];
    });
  return { items, add, remove, clear };
}

/**
 * Chatbox (Composer.md, spec 3.4): gửi prompt theo chế độ đang bật — API: `useChat.sendMessage` (context = spec đã tick);
 * CLI: `startCliRun` rồi theo dõi qua SSE. Đang chạy thì nút Send thành Dừng. Chip context hiển thị spec đã chọn.
 * Chưa có phiên chat (mới mở / vừa bấm New session) → tạo phiên rồi mới gửi.
 * Dán ảnh: API gửi kèm tin nhắn (file part), CLI gửi base64 để server ghi vào sandbox. Gõ `@` chọn spec → chèn vào câu và tick context.
 */
export function ChatComposer({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations("workbench.composer");
  const errorMessage = useErrorMessage();
  const [value, setValue] = React.useState("");
  const queryClient = useQueryClient();
  const { mode, profileId, loading } = useAgentSettings();
  const sessionId = useActiveSessionId(workspaceId);
  const chat = useChat({ chat: getSessionChat(workspaceId, sessionId) });
  const { apiBusy, cliRunning } = useAgentBusy(workspaceId);
  const cli = useCliRunActions(workspaceId);
  const context = useContextFiles(workspaceId);
  const [starting, setStarting] = React.useState(false);
  const attachments = useAttachments();
  const specs = useListSpecs(workspaceId);
  const mentionFiles = React.useMemo(() => specs.data?.items.map((i) => i.file) ?? [], [specs.data]);

  const busy = (mode === "API" ? apiBusy : cliRunning) || starting;

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    const created = await createAgentSession({ workspaceId });
    useAgentSessionStore.getState().setActive(workspaceId, created.id);
    void queryClient.invalidateQueries({ queryKey: getListAgentSessionsQueryKey({ workspaceId }) });
    return created.id;
  };

  const submit = async () => {
    const prompt = value.trim();
    if (!prompt) return;
    setStarting(true);
    try {
      const id = await ensureSession();
      const dataUrls = await Promise.all(attachments.items.map((a) => readDataUrl(a.file)));
      if (mode === "API") {
        const target = getSessionChat(workspaceId, id);
        if (target.error) target.clearError();
        const files = attachments.items.map((a, i) => ({ type: "file" as const, mediaType: a.file.type, filename: a.name, url: dataUrls[i] }));
        setValue("");
        attachments.clear();
        void target.sendMessage({ text: prompt, files });
        return;
      }
      const images: CliImageInput[] = attachments.items.map((a, i) => ({
        name: a.name,
        mediaType: a.file.type as CliImageInputMediaType,
        data: dataUrls[i].slice(dataUrls[i].indexOf(",") + 1),
      }));
      await cli.start({ sessionId: id, profileId, prompt, contextFiles: [...context], images });
      setValue("");
      attachments.clear();
    } catch (err) {
      notify.error(mode === "API" ? t("sessionFailed") : t("cliStartFailed"), { description: errorMessage(err) });
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    if (mode === "API") void chat.stop();
    else cli.stop().catch((err: unknown) => notify.error(t("cliStopFailed"), { description: errorMessage(err) }));
  };

  const leading =
    context.length === 0 ? (
      <span className="text-xs leading-4 text-muted-foreground">{t("noContext")}</span>
    ) : (
      <span className="flex min-w-0 items-center gap-1" aria-label={t("contextLabel", { count: context.length })}>
        {context.slice(0, MAX_CHIPS).map((file) => (
          <Badge key={file} variant="primary" size="xs" className="max-w-[160px]">
            <code className="truncate">{file}</code>
          </Badge>
        ))}
        {context.length > MAX_CHIPS ? (
          <Badge variant="neutral" size="xs">
            +{context.length - MAX_CHIPS}
          </Badge>
        ) : null}
      </span>
    );

  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSubmit={() => void submit()}
      onStop={stop}
      busy={busy}
      disabled={loading}
      placeholder={mode === "API" ? t("placeholderApi") : t("placeholderCli")}
      leading={leading}
      attachments={attachments.items}
      onRemoveAttachment={attachments.remove}
      onPasteImages={attachments.add}
      mentions={mentionFiles}
      onMention={(file) => useWorkbenchEditorStore.getState().setContextChecked(workspaceId, file, true)}
    />
  );
}
