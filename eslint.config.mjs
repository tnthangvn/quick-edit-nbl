import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const BE = [
  { group: ["@/ship/*", "@/ship/**", "@/containers/*", "@/containers/**"], message: "FE không import code BE. Dùng client sinh ra trong @/client/api/generated." },
];
const generatedOnly = {
  group: ["**/api/generated/**/*.ts", "!@/client/api/generated", "!@/client/api/generated/**"],
  message: "Import client API qua alias @/client/api/generated.",
};

const FE = { group: ["@/ui/*", "@/ui/**", "@/client/*", "@/client/**"], message: "BE không import code FE." };
const CONTAINERS = { group: ["@/containers/*", "@/containers/**"], message: "Ship layer không phụ thuộc container (trừ engine)." };
const section = (name) => ({ group: [`@/containers/${name}/*`, `@/containers/${name}/**`, `**/${name}/**`], message: `Khác Section: không import ${name}; đi qua contract trong @/ship/contracts hoặc eventBus.` });
const NO_DATA = (tier) => ({
  group: ["@/client/*", "@/client/**", "!@/client/api/", "@/client/api/**", "!@/client/api/generated/", "@/client/api/generated/**", "!@/client/api/generated/model", "!@/client/api/generated/model/**"],
  message: `${tier} chỉ nhận props, không gọi hook dữ liệu (được import type/enum từ @/client/api/generated/model).`,
});

/** Atomic Design: chỉ import xuống tầng thấp hơn. */
const atomic = (forbidden) =>
  forbidden.map((layer) => ({ group: [`@/ui/${layer}/*`, `@/ui/${layer}/**`, `../${layer}/*`, `../../${layer}/*`], message: `Atomic Design: tầng này không được import ${layer}.` }));

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "design-system/**", "src/client/api/generated/**", "docs/**"]),

  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },

  // Hai rule riêng để không ghi đè nhau trong flat config:
  //   @typescript-eslint/no-restricted-imports → ranh giới lớn (FE/BE, Ship/Container, Section)
  //   no-restricted-imports                    → quy tắc trong tầng (Atomic, Porto)

  // ---------- Ranh giới lớn ----------
  {
    files: ["src/ui/**", "src/client/**", "app/**/*.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns: [...BE, generatedOnly] }] },
  },
  {
    files: ["src/ship/**"],
    ignores: ["src/ship/engine/**"],
    rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns: [FE, CONTAINERS] }] },
  },
  {
    files: ["src/ship/engine/**", "scripts/**"],
    rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns: [FE] }] },
  },
  {
    files: ["src/containers/Studio/**"],
    rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns: [FE, section("Agent")] }] },
  },
  {
    files: ["src/containers/Agent/**"],
    rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns: [FE, section("Studio")] }] },
  },

  // ---------- FE: Atomic Design ----------
  {
    files: ["src/ui/primitives/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [...atomic(["molecules", "organisms", "templates"]), NO_DATA("Primitive")] }] },
  },
  {
    files: ["src/ui/molecules/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [...atomic(["organisms", "templates"]), NO_DATA("Molecule")] }] },
  },
  {
    files: ["src/ui/organisms/**"],
    rules: { "no-restricted-imports": ["error", { patterns: atomic(["templates"]) }] },
  },

  // ---------- BE: Porto ----------
  {
    files: ["src/containers/*/*/UI/API/Controllers/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["**/Tasks/**", "**/Data/**", "**/SubActions/**"], message: "Porto: Controller chỉ gọi Action." }] }] },
  },
  {
    files: ["src/containers/*/*/Actions/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["./*Action", "**/Actions/**", "**/UI/**"], message: "Porto: Action không gọi Action khác (tách SubAction) và không phụ thuộc UI." }] }] },
  },
  {
    files: ["src/containers/*/*/Tasks/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["./*Task", "**/Tasks/**", "**/Actions/**", "**/SubActions/**", "**/UI/**"], message: "Porto: Task không gọi Task / Action khác và không phụ thuộc UI." }] }] },
  },
  {
    files: ["app/api/**/route.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["**/Actions/**", "**/Tasks/**", "**/Controllers/**", "**/Data/**"], message: "route.ts chỉ re-export handler từ UI/API/Routes." }] }] },
  },

  // ---------- Enum ----------
  {
    files: ["src/containers/**", "src/ship/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name=/^(status|type|mode|strategy|provider|kind|state)$/] > CallExpression[callee.object.name='z'][callee.property.name='string']",
          message: "Field có tập giá trị cố định phải khai bằng z.enum([...]).meta({ id }), giá trị viết HOA.",
        },
      ],
    },
  },
]);
