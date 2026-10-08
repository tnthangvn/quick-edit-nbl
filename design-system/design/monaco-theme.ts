// Spec Studio — Monaco themes generated from the design system tokens (blue + gray).
// Dùng: <Editor beforeMount={registerSpecStudioThemes} theme={isDark ? "spec-studio-dark" : "spec-studio-light"} options={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, lineHeight: 20 }} />
import type { Monaco } from "@monaco-editor/react";

export const specStudioLight = {
  "base": "vs",
  "inherit": true,
  "rules": [
    {
      "token": "keyword.md",
      "foreground": "1d5fd6",
      "fontStyle": "bold"
    },
    {
      "token": "variable.md",
      "foreground": "4b5563"
    },
    {
      "token": "string.link.md",
      "foreground": "1d5fd6"
    }
  ],
  "colors": {
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
    "diffEditor.removedTextBackground": "#f6bdb9"
  }
} as const;

export const specStudioDark = {
  "base": "vs-dark",
  "inherit": true,
  "rules": [
    {
      "token": "keyword.md",
      "foreground": "5b9df8",
      "fontStyle": "bold"
    },
    {
      "token": "variable.md",
      "foreground": "9ca3af"
    },
    {
      "token": "string.link.md",
      "foreground": "5b9df8"
    }
  ],
  "colors": {
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
    "diffEditor.removedTextBackground": "#6a2a2a"
  }
} as const;

export function registerSpecStudioThemes(monaco: Monaco) {
  monaco.editor.defineTheme("spec-studio-light", specStudioLight as any);
  monaco.editor.defineTheme("spec-studio-dark", specStudioDark as any);
}
