"use client";

import * as React from "react";
import { Combobox, type ComboboxProps } from "@/ui/primitives/combobox";

/**
 * Select gọn cho Quick Setting Toolbar (ChatToolbar.md): `size="sm"`, `mono` (model ID / CLI profile), mở lên trên (`side="top"`)
 * vì nằm sát Chatbox. Là cấu hình sẵn của `Combobox`, không phải base riêng.
 */
type ToolbarSelectProps = Omit<Extract<ComboboxProps, { multiple?: false }>, "size" | "side"> & {
  side?: "top" | "bottom";
};

function ToolbarSelect({ mono = true, side = "top", className, ...props }: ToolbarSelectProps) {
  return <Combobox size="sm" mono={mono} side={side} className={className ?? "w-auto min-w-[180px]"} {...props} />;
}

export { ToolbarSelect, type ToolbarSelectProps };
