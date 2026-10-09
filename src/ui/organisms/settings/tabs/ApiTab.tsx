"use client";

import * as React from "react";
import { CircleCheck, Plug } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type * as z from "zod";
import { revealApiKey, useTestLlmConnection } from "@/client/api/generated";
import { LlmProvider, type LlmConnectionTestResult } from "@/client/api/generated/model";
import type { UpdateSettingsBody } from "@/client/api/generated/zod/setting/setting.zod";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useFlash } from "@/client/hooks/use-flash";
import { Field } from "@/ui/molecules/field";
import { SecretInput } from "@/ui/molecules/secret-input";
import { Button } from "@/ui/primitives/button";
import { Combobox } from "@/ui/primitives/combobox";
import { Icon } from "@/ui/primitives/icon";
import { Input } from "@/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/primitives/select";
import { notify } from "@/ui/primitives/sonner";
import { Textarea } from "@/ui/primitives/textarea";
import { fieldError } from "@/ui/organisms/settings/form-errors";

export type SettingsForm = z.input<typeof UpdateSettingsBody>;

/**
 * Gợi ý Model ID theo provider (API chưa có endpoint liệt kê model) — vẫn tự nhập được tên model khác (`allowCustom`).
 */
const MODEL_SUGGESTIONS: Record<LlmProvider, string[]> = {
  GOOGLE: ["gemini-pro-latest", "gemini-flash-latest", "gemini-2.5-pro", "gemini-2.5-flash"],
  ANTHROPIC: ["claude-opus-4-1", "claude-sonnet-4-5", "claude-haiku-4-5"],
  OPENAI: ["gpt-5", "gpt-5-mini", "gpt-4.1", "o4-mini"],
  DEEPSEEK: ["deepseek-chat", "deepseek-reasoner"],
  OLLAMA: ["llama3.1", "qwen2.5", "mistral"],
};

const nullIfEmpty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const undefinedIfEmpty = (v: unknown) => (typeof v === "string" && v === "" ? undefined : v);

/** Tab 1 — Direct API (spec 4): Provider, API key chỉ ghi + Test, Model ID (chọn hoặc tự nhập), System Prompt. */
export function ApiTab({
  hasApiKey,
  apiKeyMasked,
  savedProvider,
  workspaceId,
}: {
  hasApiKey: boolean;
  /** Bản che API key đã lưu (từ getSettings). */
  apiKeyMasked?: string | null;
  savedProvider?: LlmProvider;
  workspaceId?: string;
}) {
  const t = useTranslations("settings.api");
  const errorMessage = useErrorMessage();
  const { control, register, setValue, getValues, formState } = useFormContext<SettingsForm>();
  const provider = useWatch({ control, name: "api.provider" });
  const apiKey = useWatch({ control, name: "api.apiKey" });
  const [result, setResult] = React.useState<LlmConnectionTestResult | null>(null);
  const [testError, setTestError] = React.useState<unknown>(null);
  const [ok, flashOk] = useFlash(2000);
  const test = useTestLlmConnection({
    mutation: {
      onSuccess: (res) => {
        setResult(res);
        setTestError(null);
        if (res.ok) flashOk();
      },
      onError: (err) => {
        setResult(null);
        setTestError(err);
      },
    },
  });

  // Key đã lưu thuộc provider cũ; đổi provider thì coi như chưa có key.
  const keySaved = hasApiKey && provider === savedProvider && apiKey !== null;

  const runTest = () => {
    const api = getValues("api");
    setResult(null);
    setTestError(null);
    test.mutate({
      data: {
        provider: api.provider,
        model: api.model,
        ...(api.baseUrl ? { baseUrl: api.baseUrl } : {}),
        ...(api.apiKey ? { apiKey: api.apiKey } : {}),
        ...(workspaceId ? { workspaceId } : {}),
      },
    });
  };

  return (
    <>
      <Field label={t("provider")} error={fieldError(formState.errors, "api.provider")}>
        <Controller
          control={control}
          name="api.provider"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(LlmProvider).map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`providers.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label={t("apiKey")}
        hint={testError ? undefined : result ? undefined : provider === "OLLAMA" ? t("apiKeyHintOllama") : t("apiKeyHint")}
        error={testError ? errorMessage(testError) : result && !result.ok ? t("testFailed") : fieldError(formState.errors, "api.apiKey")}
      >
        <SecretInput
          isSet={keySaved}
          masked={keySaved ? apiKeyMasked : null}
          onReveal={async () => (await revealApiKey()).value}
          onRevealError={(err) => notify.error(errorMessage(err))}
          placeholder={t("apiKeyPlaceholder")}
          {...register("api.apiKey", { setValueAs: undefinedIfEmpty })}
          trailing={
            <Button
              variant="secondary"
              size="sm"
              className="h-6"
              icon={Plug}
              loading={test.isPending}
              loadingText={t("testing")}
              success={ok}
              successText={t("testOk")}
              onClick={runTest}
            >
              {t("test")}
            </Button>
          }
        />
      </Field>
      {result?.ok ? (
        <p className="-mt-3 m-0 flex animate-scale-in items-center gap-1.5 text-xs text-primary">
          <Icon icon={CircleCheck} size="xs" />
          {t("testResult", { ms: result.latencyMs })}
        </p>
      ) : null}
      {keySaved ? (
        <div className="-mt-3">
          <Button variant="link" size="sm" className="h-auto text-xs" onClick={() => setValue("api.apiKey", null, { shouldDirty: true })}>
            {t("removeKey")}
          </Button>
        </div>
      ) : apiKey === null ? (
        <p className="-mt-3 m-0 text-xs text-muted-foreground">{t("keyWillBeRemoved")}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label={t("model")} hint={t("modelHint")} error={fieldError(formState.errors, "api.model")}>
          <Controller
            control={control}
            name="api.model"
            render={({ field }) => (
              <Combobox
                mono
                allowCustom
                options={MODEL_SUGGESTIONS[provider ?? "GOOGLE"]}
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldError(formState.errors, "api.model"))}
              />
            )}
          />
        </Field>
        <Field label={t("temperature")} error={fieldError(formState.errors, "api.temperature")}>
          <Input type="number" step={0.1} min={0} max={2} mono {...register("api.temperature", { valueAsNumber: true })} />
        </Field>
      </div>

      <Field label={t("baseUrl")} hint={provider === "OLLAMA" ? t("baseUrlHintOllama") : t("baseUrlHint")} error={fieldError(formState.errors, "api.baseUrl")}>
        <Input mono placeholder={provider === "OLLAMA" ? "http://localhost:11434/api" : "https://…"} {...register("api.baseUrl", { setValueAs: nullIfEmpty })} />
      </Field>

      <Field label={t("systemPrompt")} hint={t("systemPromptHint")} error={fieldError(formState.errors, "api.systemPrompt")}>
        <Textarea rows={7} {...register("api.systemPrompt")} />
      </Field>
    </>
  );
}
