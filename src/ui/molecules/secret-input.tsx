"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/ui/primitives/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/primitives/input-group";

/**
 * Ô nhập bí mật chỉ ghi (API key, cookie, token): `type="password"`, mono, nút hiện/ẩn.
 * Không bao giờ nhận giá trị đã lưu từ server; `isSet` chỉ đổi placeholder sang "đã lưu — nhập để thay".
 */
type SecretInputProps = Omit<React.ComponentProps<"input">, "type" | "size"> & {
  isSet?: boolean;
  /** Placeholder khi đã có giá trị lưu. */
  setPlaceholder?: string;
  invalid?: boolean;
  /** Nút bên phải (vd Test). */
  trailing?: React.ReactNode;
};

function SecretInput({ isSet, setPlaceholder, placeholder, invalid, trailing, className, ...props }: SecretInputProps) {
  const t = useTranslations("common.secret");
  const [visible, setVisible] = React.useState(false);
  return (
    <InputGroup className={className}>
      <InputGroupInput
        type={visible ? "text" : "password"}
        mono
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        placeholder={isSet ? (setPlaceholder ?? t("setPlaceholder")) : placeholder}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <IconButton
          icon={visible ? EyeOff : Eye}
          size="icon-sm"
          label={visible ? t("hide") : t("show")}
          tooltip={false}
          onClick={() => setVisible((v) => !v)}
        />
        {trailing}
      </InputGroupAddon>
    </InputGroup>
  );
}

export { SecretInput, type SecretInputProps };
