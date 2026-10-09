"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/ui/primitives/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/primitives/input-group";

/**
 * Ô nhập bí mật (API key, cookie, token): `type="password"`, mono, nút hiện/ẩn.
 * Giá trị đã lưu không nằm trong form: `isSet` + `masked` (bản che từ API) hiện ở placeholder.
 * Ô đang trống mà bấm Hiện thì gọi `onReveal` (endpoint reveal) và hiện plaintext ở placeholder, không ghi vào form.
 */
type SecretInputProps = Omit<React.ComponentProps<"input">, "type" | "size"> & {
  isSet?: boolean;
  /** Bản che giá trị đã lưu, vd "ghp_••••••••a1b2". */
  masked?: string | null;
  /** Placeholder khi đã có giá trị lưu. */
  setPlaceholder?: string;
  /** Lấy plaintext giá trị đã lưu (chỉ gọi khi người dùng bấm Hiện). */
  onReveal?: () => Promise<string>;
  /** Lỗi khi reveal (organism dịch thông báo). */
  onRevealError?: (error: unknown) => void;
  invalid?: boolean;
  /** Nút bên phải (vd Test). */
  trailing?: React.ReactNode;
};

function SecretInput({ isSet, masked, setPlaceholder, onReveal, onRevealError, placeholder, invalid, trailing, className, ...props }: SecretInputProps) {
  const t = useTranslations("common.secret");
  const [visible, setVisible] = React.useState(false);
  // Plaintext gắn với bản che lúc reveal: giá trị đã lưu đổi (lưu / xoá) thì tự bỏ.
  const savedKey = `${isSet ? 1 : 0}|${masked ?? ""}`;
  const [revealedState, setRevealedState] = React.useState<{ key: string; value: string } | null>(null);
  const revealed = revealedState?.key === savedKey ? revealedState.value : null;
  const setRevealed = (value: string | null) => setRevealedState(value === null ? null : { key: savedKey, value });
  const [revealing, setRevealing] = React.useState(false);
  const isEmpty = props.value === undefined ? false : String(props.value) === "";
  const canReveal = Boolean(isSet && onReveal) && (isEmpty || props.value === undefined);

  const toggle = async () => {
    if (visible || revealed !== null) {
      setVisible(false);
      setRevealed(null);
      return;
    }
    setVisible(true);
    if (!canReveal || !onReveal) return;
    setRevealing(true);
    try {
      setRevealed(await onReveal());
    } catch (err) {
      setVisible(false);
      onRevealError?.(err);
    } finally {
      setRevealing(false);
    }
  };

  const savedPlaceholder = setPlaceholder ?? (masked ? t("maskedPlaceholder", { masked }) : t("setPlaceholder"));
  const shown = visible || revealed !== null;
  return (
    <InputGroup className={className}>
      <InputGroupInput
        type={shown ? "text" : "password"}
        mono
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        placeholder={revealed ?? (isSet ? savedPlaceholder : placeholder)}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <IconButton
          icon={shown ? EyeOff : Eye}
          size="icon-sm"
          label={shown ? t("hide") : t("show")}
          tooltip={false}
          loading={revealing}
          onClick={() => void toggle()}
        />
        {trailing}
      </InputGroupAddon>
    </InputGroup>
  );
}

export { SecretInput, type SecretInputProps };
