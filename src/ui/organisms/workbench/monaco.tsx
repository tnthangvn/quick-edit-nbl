"use client";

import * as React from "react";
import { DiffEditor, Editor, type DiffOnMount, type OnChange, type OnMount } from "@monaco-editor/react";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActivityEpoch } from "@/client/hooks/use-activity-epoch";
import { useThemeToggle } from "@/client/hooks/use-theme-toggle";
import { useMonacoStatus } from "@/client/monaco-loader";
import { MONACO_OPTIONS, monacoThemeName, registerSpecStudioThemes } from "@/client/monaco-theme";
import { EmptyState } from "@/ui/molecules/empty-state";
import { Spinner } from "@/ui/primitives/spinner";

/** Monaco chỉ render sau khi loader đã trỏ sang package local (monaco-loader.ts). Theme theo next-themes. */
function MonacoGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("workbench.editor");
  const status = useMonacoStatus();
  if (status === "error") return <EmptyState icon={CircleAlert} title={t("monacoFailed")} />;
  if (status !== "ready") return <MonacoLoading />;
  return <>{children}</>;
}

function MonacoLoading() {
  const t = useTranslations("workbench.editor");
  return (
    <div className="grid size-full place-items-center bg-editor">
      <Spinner tone="muted" label={t("loading")} />
    </div>
  );
}

const modelPath = (workspaceId: string, file: string, side?: string) =>
  `spec-studio://${encodeURIComponent(workspaceId)}/${side ? `${side}/` : ""}${file.split("/").map(encodeURIComponent).join("/")}`;

type SpecMonacoEditorProps = {
  workspaceId: string;
  file: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

/**
 * Editor Markdown (EditorPane.md): mỗi file một model (`path`) để giữ undo / vị trí con trỏ khi đổi file.
 * `epoch`: tạo lại editor khi route được hiện lại từ `<Activity>` (editor cũ đã dispose lúc ẩn).
 */
export function SpecMonacoEditor({ workspaceId, file, value, onChange, ariaLabel }: SpecMonacoEditorProps) {
  const { resolved } = useThemeToggle();
  const epoch = useActivityEpoch();
  const handleChange = React.useCallback<OnChange>((v) => onChange(v ?? ""), [onChange]);
  const handleMount = React.useCallback<OnMount>((editor) => editor.focus(), []);
  return (
    <MonacoGate>
      <Editor
        key={epoch}
        path={modelPath(workspaceId, file)}
        language="markdown"
        value={value}
        theme={monacoThemeName(resolved)}
        beforeMount={registerSpecStudioThemes}
        onMount={handleMount}
        onChange={handleChange}
        loading={<MonacoLoading />}
        options={{ ...MONACO_OPTIONS, ariaLabel, padding: { top: 8 } }}
      />
    </MonacoGate>
  );
}

export type DiffStats = { added: number; removed: number };

type SpecMonacoDiffProps = {
  workspaceId: string;
  file: string;
  original: string;
  proposed: string;
  /** Định danh đề xuất: mỗi đề xuất một cặp model riêng (không đụng model đang chờ dispose). */
  instanceId: string;
  /** Lấy nội dung bên Proposed hiện tại (người dùng có thể sửa trước khi Approve). */
  modifiedRef: React.RefObject<(() => string) | null>;
  onStats: (stats: DiffStats) => void;
  ariaLabel: string;
};

/**
 * DiffEditor hai cột Original | Proposed (DiffView.md). Bên Original chỉ đọc. Giữ model khi unmount rồi tự dispose
 * (tránh lỗi "TextModel got disposed before DiffEditorWidget model got reset" của @monaco-editor/react).
 */
export function SpecMonacoDiff({ workspaceId, file, original, proposed, instanceId, modifiedRef, onStats, ariaLabel }: SpecMonacoDiffProps) {
  const { resolved } = useThemeToggle();
  const epoch = useActivityEpoch();
  const cleanup = React.useRef<(() => void) | null>(null);

  const handleMount = React.useCallback<DiffOnMount>(
    (editor) => {
      const modified = editor.getModifiedEditor();
      modifiedRef.current = () => modified.getValue();
      const update = () => {
        const changes = editor.getLineChanges() ?? [];
        let added = 0;
        let removed = 0;
        for (const c of changes) {
          if (c.modifiedEndLineNumber >= c.modifiedStartLineNumber && c.modifiedEndLineNumber > 0) added += c.modifiedEndLineNumber - c.modifiedStartLineNumber + 1;
          if (c.originalEndLineNumber >= c.originalStartLineNumber && c.originalEndLineNumber > 0) removed += c.originalEndLineNumber - c.originalStartLineNumber + 1;
        }
        onStats({ added, removed });
      };
      const sub = editor.onDidUpdateDiff(update);
      cleanup.current = () => {
        sub.dispose();
        const model = editor.getModel();
        modifiedRef.current = null;
        // Đợi DiffEditor của thư viện dispose widget xong rồi mới dispose model.
        setTimeout(() => {
          model?.original.dispose();
          model?.modified.dispose();
        }, 0);
      };
    },
    [modifiedRef, onStats],
  );

  React.useEffect(() => () => cleanup.current?.(), []);

  return (
    <MonacoGate>
      <DiffEditor
        key={epoch}
        original={original}
        modified={proposed}
        language="markdown"
        originalModelPath={modelPath(workspaceId, file, `original-${instanceId}`)}
        modifiedModelPath={modelPath(workspaceId, file, `proposed-${instanceId}`)}
        keepCurrentOriginalModel
        keepCurrentModifiedModel
        theme={monacoThemeName(resolved)}
        beforeMount={registerSpecStudioThemes}
        onMount={handleMount}
        loading={<MonacoLoading />}
        options={{ ...MONACO_OPTIONS, originalEditable: false, readOnly: false, ariaLabel, renderOverviewRuler: false }}
      />
    </MonacoGate>
  );
}
