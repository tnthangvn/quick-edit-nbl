"use client";

import * as React from "react";
import { Textarea } from "@/ui/primitives/textarea";

/** Mỗi dòng một phần tử (arguments). */
export const linesToList = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** `KEY=VALUE` (hoặc `Key: Value`) mỗi dòng → record. */
export function linesToRecord(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = /^\s*([^=:\s]+)\s*[=:]\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

export const recordToLines = (rec: Record<string, string> | undefined, sep = "=") =>
  Object.entries(rec ?? {})
    .map(([k, v]) => `${k}${sep}${v}`)
    .join("\n");

type ListProps = { kind: "list"; value: string[] | undefined; onChange: (v: string[]) => void };
type RecordProps = { kind: "record"; value: Record<string, string> | undefined; onChange: (v: Record<string, string>) => void; sep?: string };

type LinesTextareaProps = Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange" | "defaultValue"> & (ListProps | RecordProps);

/**
 * Textarea mono sửa danh sách (mỗi dòng một arg) hoặc record (`KEY=VALUE` mỗi dòng): giữ nguyên chữ người dùng gõ,
 * đẩy giá trị đã tách lên `onChange`. Đổi `key` để nạp lại từ `value` (vd khi reset form).
 */
function LinesTextarea(props: LinesTextareaProps) {
  const { kind, value, onChange, rows = 3, ...rest } = props;
  const sep = props.kind === "record" ? (props.sep ?? "=") : "=";
  const textareaProps = { ...rest } as Record<string, unknown>;
  delete textareaProps.sep;
  const [text, setText] = React.useState(() => (kind === "list" ? (value ?? []).join("\n") : recordToLines(value, sep)));
  return (
    <Textarea
      mono
      rows={rows}
      spellCheck={false}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (kind === "list") (onChange as ListProps["onChange"])(linesToList(e.target.value));
        else (onChange as RecordProps["onChange"])(linesToRecord(e.target.value));
      }}
      {...(textareaProps as React.ComponentProps<typeof Textarea>)}
    />
  );
}

export { LinesTextarea, type LinesTextareaProps };
