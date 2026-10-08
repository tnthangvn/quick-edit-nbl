// Spec Studio — Monaco themes, chép từ design-system/design/monaco-theme.ts (blue + gray). Không sửa bản trong design-system.
// Dùng: <Editor beforeMount={registerSpecStudioThemes} theme={monacoThemeName(resolvedTheme)} options={MONACO_OPTIONS} />
import type { Monaco } from "@monaco-editor/react";

type ThemeData = Parameters<Monaco["editor"]["defineTheme"]>[1];

export const SPEC_STUDIO_LIGHT = "spec-studio-light";
export const SPEC_STUDIO_DARK = "spec-studio-dark";

export const specStudioLight: ThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "keyword.md", foreground: "1d5fd6", fontStyle: "bold" },
    { token: "variable.md", foreground: "4b5563" },
    { token: "string.link.md", foreground: "1d5fd6" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#111827",
    "editorLineNumber.foreground": "#6b7280",
    "editorLineNumber.activeForeground": "#111827",
    "editor.lineHighlightBackground": "#f6f7f9",
    "editor.selectionBackground": "#d6e4fc",
    "editorCursor.foreground": "#1d5fd6",
    "diffEditor.insertedLineBackground": "#e3edfd",
    "diffEditor.insertedTextBackground": "#bcd3fa",
    "diffEditor.removedLineBackground": "#fce8e7",
    "diffEditor.removedTextBackground": "#f6bdb9",
  },
};

export const specStudioDark: ThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword.md", foreground: "5b9df8", fontStyle: "bold" },
    { token: "variable.md", foreground: "9ca3af" },
    { token: "string.link.md", foreground: "5b9df8" },
  ],
  colors: {
    "editor.background": "#131518",
    "editor.foreground": "#e5e7eb",
    "editorLineNumber.foreground": "#8b919c",
    "editorLineNumber.activeForeground": "#e5e7eb",
    "editor.lineHighlightBackground": "#1b1e22",
    "editor.selectionBackground": "#1f3a66",
    "editorCursor.foreground": "#5b9df8",
    "diffEditor.insertedLineBackground": "#14294a",
    "diffEditor.insertedTextBackground": "#22447a",
    "diffEditor.removedLineBackground": "#36191a",
    "diffEditor.removedTextBackground": "#6a2a2a",
  },
};

export function registerSpecStudioThemes(monaco: Monaco) {
  monaco.editor.defineTheme(SPEC_STUDIO_LIGHT, specStudioLight);
  monaco.editor.defineTheme(SPEC_STUDIO_DARK, specStudioDark);
}

/** Tên theme Monaco theo theme màu đã resolve của next-themes. */
export function monacoThemeName(resolvedTheme: string | undefined) {
  return resolvedTheme === "dark" ? SPEC_STUDIO_DARK : SPEC_STUDIO_LIGHT;
}

/** Option chung cho Editor / DiffEditor: font mono 13/20 (README › Monaco). */
export const MONACO_OPTIONS = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: 13,
  lineHeight: 20,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on",
  renderSideBySide: true,
} as const;
