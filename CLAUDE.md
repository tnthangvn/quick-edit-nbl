# Spec Studio (quick-edit-nbl) — quy tắc cho AI agent

> Nguồn duy nhất là `CLAUDE.md`. `AGENTS.md` (Codex/ChatGPT, Antigravity, Cursor...) và `GEMINI.md` (Gemini CLI) là symlink tới file này: chỉ sửa `CLAUDE.md`.

**Luôn trả lời người dùng bằng tiếng Việt.** Code, tên biến, commit message, comment kỹ thuật trong code có thể dùng tiếng Anh.

Workbench chạy local để sửa spec Markdown cùng AI Agent (Direct API hoặc CLI), duyệt bằng Diff Editor, lưu ra Local / Git / Drive và đồng bộ lên Google NotebookLM.

- Đặc tả: [design-system/docs/spec.md](design-system/docs/spec.md)
- Design system: [design-system/design/README.md](design-system/design/README.md), component: `design-system/design/components/*.md`
- Wireframe: `design-system/wireframe/`
- **Không được sửa bất cứ file nào trong `design-system/`** (spec, tokens, component docs, wireframe, reference). Chỉ đọc. Cần dùng thì chép sang code app (vd `app/globals.css`, `src/client/monaco-theme.ts`). Thấy spec sai hoặc thiếu thì báo người dùng, không tự sửa.

## Môi trường

- **Node 24 LTS** (`.nvmrc`), **pnpm** qua corepack (`packageManager` trong `package.json`). Không dùng npm/yarn để cài package.
- Máy mới: `./setup.sh` (hoặc `make setup`). Lệnh hằng ngày đi qua `Makefile` (`make help`).
- Thêm pnpm script mới thì thêm target tương ứng trong `Makefile`.
- **Next.js 16.4 khác kiến thức cũ** (cacheComponents bật, request API đều async, `proxy` thay `middleware`...): đọc `node_modules/next/dist/docs/` trước khi viết code dính tới Next. Thư viện đều là major mới (zod 4, AI SDK 7, vitest 5, kysely 0.29, orval 8...): đọc `.d.ts` trong `node_modules`, không đoán API.
- Script chạy ngoài Next (`scripts/*.ts`) dùng `tsx --conditions=react-server` để import được module có `import "server-only"`; test dùng alias `server-only` → module rỗng (đã cấu hình trong `vitest.config.mts`).
- pnpm 12 chặn build script của dependency: thêm package cần build vào `allowBuilds` trong `pnpm-workspace.yaml`.
- Dữ liệu app ở `~/.spec-studio/` (đổi bằng `SPEC_STUDIO_HOME`). Nơi lưu dữ liệu repository chọn bằng `DATA_DRIVER` (`JSON` mặc định, `POSTGRES`), xem mục Data layer.

## Stack

- **Một app Next.js (App Router)**, làm cả FE và BE. Route handler chạy `runtime = "nodejs"`.
- FE: React, Tailwind CSS v4, shadcn/ui (Radix), `lucide-react`, `next-themes`, `@monaco-editor/react`, TanStack Query, zustand, `react-hook-form` + `zod`, `next-intl`, `sonner`.
- BE: `zod` + `zod-openapi`, Kysely + `pg` (driver POSTGRES), Vercel AI SDK, `execa`, `simple-git`, `googleapis`, `@modelcontextprotocol/sdk`, `@napi-rs/keyring`, `chokidar`.
- Test: Vitest. Lint OpenAPI: `@redocly/cli`. Sinh client: Orval.

## Cấu trúc thư mục

```
app/                 # chỉ khai báo route Next.js; app/api/**/route.ts chỉ re-export handler
src/ui/              # FE — Atomic Design (primitives = components/ui của shadcn)
src/client/          # FE — không phải component
├── api/generated/   # Orval sinh: hook TanStack Query, type, enum (model/), zod schema (zod/) — không sửa tay
├── hooks/           # custom hook dùng chung (use-xxx.ts)
├── stores/          # Zustand: client-state + realtime (SSE)
├── sse/             # wrapper EventSource
└── providers/       # provider phía client (Query, theme, i18n)
src/ship/            # BE — Porto Ship layer
src/containers/      # BE — Porto Containers layer (Section/Container)
messages/            # i18n: vi.json (mặc định), en.json
docs/api.json        # OpenAPI 3.1 do BE sinh ra
scripts/             # build-openapi.ts, ...
design-system/       # spec, tokens, wireframe — tài liệu, không import vào app (trừ globals.css, monaco-theme.ts đã chép sang)
```

## FE — Atomic Design (`src/ui`)

- Tầng: `primitives/` → `molecules/` → `organisms/` → `templates/`; page nằm ở `app/`.
- **`src/ui/primitives/` chính là `components/ui` của shadcn** (alias `ui` trong `components.json`) và là tầng atom: nơi duy nhất chứa UI base (Button, Input, Select, Checkbox, Switch, Dialog, Badge, Tabs, Tooltip, Kbd, Spinner...).
- Chỉ import theo chiều xuống: page → template → organism → molecule → primitive. Không import ngược hoặc ngang tầng trên.
- Primitive và molecule chỉ nhận props, không gọi hook dữ liệu, không biết API (được import type/enum từ `@/client/api/generated/model`).
- Organism là tầng duy nhất dùng hook trong `src/client`. Template chỉ lo layout và slot.
- Component bám đúng `design-system/design/components/*.md`; màu, spacing, radius, motion chỉ dùng token trong `globals.css`. Không hard-code màu.
- Nhãn hành động giữ tiếng Anh (`Approve & Save`, `Reject`...), mô tả và thông báo viết tiếng Việt (xem design README).

### Không sinh code rác — dùng lại UI base

- **Mọi UI base (input, select, checkbox, button, dialog, badge…) dùng lại từ `components/ui` (`src/ui/primitives`).** Không viết lại component đã có, không tự dựng `<button className="...">` / `<input className="...">` trong molecule, organism hay page.
- **Cần base mới** (vd Kbd, Spinner, SegmentedControl) → thêm một file vào `src/ui/primitives` (ưu tiên `pnpm dlx shadcn@latest add <name>` nếu shadcn có sẵn) để tái dùng, không inline mỗi nơi một kiểu.
- Base thiếu biến thể cần dùng → thêm variant vào chính base đó, không tạo bản sao (vd `ButtonPrimary`, `MyInput`).
- Trước khi tạo component mới, tìm trong `src/ui/primitives` và `src/ui/molecules` xem đã có chưa.

### Base component viết theo variant với CVA

- Base component định nghĩa variant / size / state bằng `cva()` của `class-variance-authority` (https://cva.style/), export kèm `xxxVariants` và nhận props qua `VariantProps<typeof xxxVariants>`.
- Không hard-code className rời rạc hay ghép chuỗi điều kiện (`cond ? "a" : "b"`) để tạo biến thể; biến thể nào cũng phải là một key trong `variants`, tổ hợp đặc biệt dùng `compoundVariants`, mặc định đặt ở `defaultVariants`.
- Trạng thái theo dữ liệu (vd `SpecSyncStatus`, `PublishStepStatus`) cũng là variant (`status: { SYNCED: ..., ERROR: ... }`), giá trị khớp enum sinh từ API.
- Gộp class bằng `cn()` trong `@/ui/utils` để `className` từ ngoài ghi đè được.

```tsx
const badgeVariants = cva("inline-flex items-center gap-1 rounded-sm px-1.5 text-xs font-medium", {
  variants: {
    status: {
      SYNCED: "text-muted-foreground",
      UNSAVED: "text-primary",
      SYNCING: "text-primary",
      ERROR: "text-destructive",
    },
    size: { sm: "h-4", md: "h-5" },
  },
  defaultVariants: { size: "md" },
});
```

## BE — Porto (`src/ship`, `src/containers`)

- `src/ship/`: `parents/` (base class: Action, SubAction, Task, Controller, Request, Transformer, RepositoryBase, AppException), `contracts/` (schema, enum, event contract dùng chung), `adapters/` (fs, process, git, drive, mcp, keyring, database, logger, sse), `engine/` (`defineRoute`, DI, EventBus, xử lý lỗi).
- `src/containers/<Section>/<Container>/`: `Actions/`, `Tasks/`, `Models/`, `Enums/`, `Events/`, `Exceptions/`, `Data/{Repositories,Migrations,Seeders}/`, `UI/API/{Routes,Controllers,Requests,Transformers}/`, `Tests/`.
- Section hiện có: `Studio` (Workspace, Spec, Setting, Connector, Storage, Notebook, Publish) và `Agent` (Chat, CliRunner).
- Luồng gọi: Route → Controller → Action → (SubAction) → Task → Repository / Adapter.
  - Controller: validate Request, gọi đúng một Action, trả qua Transformer. Không gọi Task, không có business logic.
  - Action: một use case, một hàm `run()`. Không gọi Action khác (tách SubAction). Không được gọi từ Task.
  - Task: một việc, một hàm `run()`. Không gọi Task hay Action khác. Chỉ được gọi từ Action/SubAction.
  - Trong cùng Section, Action được gọi Task của container khác. Khác Section: đi qua contract trong `ship/contracts` hoặc event, không import thẳng.
- Đặt tên có hậu tố: `ApproveSpecAction`, `WriteSpecFileTask`, `ApproveSpecController`, `ApproveSpecRequest`, `SpecTransformer`, `SpecNotFoundException`.
- Mọi file trong `src/ship` và `src/containers` có `import "server-only"`.

## Data layer (repository)

- Nguồn dữ liệu chọn bằng biến môi trường `DATA_DRIVER` (enum `DataDriver`): `JSON` (mặc định, file trong `DATA_DIR` = `~/.spec-studio/data`) hoặc `POSTGRES` (`DATABASE_URL`). Env validate bằng zod khi khởi động; thiếu biến bắt buộc thì dừng ngay.
- Code nghiệp vụ không biết đang chạy driver nào. Chỉ `src/ship/adapters/data/` (`JsonDataDriver`, `PostgresDataDriver`) phụ thuộc vào driver; cả hai implement interface `DataDriver` trong `ship/contracts/data.ts`.
- Mọi repository `extends RepositoryBase<"tên_model">` và khai `protected readonly model = "tên_model" as const`. Tên model = tên file JSON = tên bảng Postgres (snake_case, số nhiều: `workspaces`, `connectors`).
- Các hàm trong `RepositoryBase` (`findById`, `findOne`, `findMany`, `where`, `join`, `paginate`, `count`, `exists`, `insert`, `multipleInsert`, `upsert`, `update`, `updateById`, `delete`, `withTransaction`) đều `protected` và chạy được trên mọi driver. Repository con chỉ public hàm mang nghĩa nghiệp vụ (`findByPath`, `markOpened`).
- Điều kiện lọc dùng object portable: `{ col: value | value[] | null | { ne, gt, gte, lt, lte, like } }`. Không viết SQL hay Kysely trực tiếp trong repository; cần truy vấn đặc thù thì thêm khả năng vào `DataDriver` cho cả hai driver.
- Model khai bằng zod trong `Container/Models/` và đăng ký kiểu qua `declare module "@/ship/contracts/data" { interface DataModels { ... } }`. Schema này dùng để validate khi ghi (JSON) và sinh kiểu cho Kysely (POSTGRES).
- ID do app sinh (UUID v7), `created_at` / `updated_at` dạng ISO do `RepositoryBase` gán, để dữ liệu giống nhau giữa hai driver.
- Transaction mở ở Action, truyền `repo.withTransaction(trx)` xuống Task. JSON: ghi tạm rồi rename từng file khi commit, khoá theo model trong tiến trình.
- POSTGRES: thay đổi schema qua migration (`make migration name=... container=...`). JSON: không cần migration, `make migrate` bỏ qua. Seeder viết qua repository nên chạy được cả hai driver.
- Secret (token, cookie, API key) không lưu qua repository hay `config.json`: dùng keychain (`@napi-rs/keyring`), dự phòng `~/.spec-studio/secrets.json` quyền 600.

## Enum

- Mọi field có tập giá trị cố định (`status`, `type`, `mode`, `strategy`, `provider`...) phải khai bằng `z.enum([...]).meta({ id: "TênEnum" })`, giá trị viết HOA (`ACTIVE`, `INACTIVE`).
- Enum của một container ở `Container/Enums/`; dùng chung ở `ship/contracts/enums/`.
- Cột DB dùng đúng type enum đó; migration sinh `CHECK (... IN (...))` từ `Enum.options`.

## API — OpenAPI

- Mỗi endpoint gồm 3 phần, không vòng lặp type:
  1. `UI/API/Requests/<X>Request.ts`: `export const xContract = defineContract({ request: { params, query, body }, responses: { 200: XResponse, 404: ErrorResponse } })`.
  2. `UI/API/Controllers/<X>Controller.ts`: `class XController implements ContractController<typeof xContract>`; `handle(input: ContractInput<C>): Promise<ContractOutput<C>>` trả `{ status, body }` đúng status đã khai.
  3. `UI/API/Routes/<x>.route.ts`: `defineRoute({ ...xContract, operationId, method, path, tags, summary, controller })`, thêm vào `Routes/index.ts`; `app/api/.../route.ts` chỉ `export const GET = xRoute.handler;`.
- `operationId` camelCase theo use case (`approveSpec`). Tag = tên container, có mô tả trong `TAG_DESCRIPTIONS` (`src/ship/engine/openapi.ts`).
- SSE: response `{ 200: { eventStream: EventSchema } }`, Controller trả `sseResponse(schema, start, request)`.
- Schema request/response viết bằng zod, schema dùng lại phải có `.meta({ id })` để vào `components/schemas`.
- Response: khai rõ status thành công (200/201/204) và các lỗi có thể xảy ra (403, 404, 409...). `defineRoute` tự thêm 500 cho mọi route và 422 cho route có input.
- Dev/test validate cả response thành công theo schema.
- `path` trong `defineRoute` phải khớp thư mục `app/api` (`{workspaceId}` ↔ `[workspaceId]`).
- Sinh spec: `make api` → `docs/api.json` → Orval → `src/client/api/generated/`. Commit cả hai; CI chạy `make api-check`.

## Lỗi và i18n

- BE **không trả message** cho người dùng. Lỗi trả dạng `{ "error": { "code": "SPEC.NOT_FOUND", "params": {...}, "traceId": "..." } }`; lỗi validate trả `VALIDATION.FAILED` kèm `fields` mỗi field một `code`.
- Mã lỗi dạng `DOMAIN.REASON`, khai trong enum `ErrorCode` (`ship/contracts/errors.ts`). Mỗi lỗi nghiệp vụ là một class `extends AppException` có `code` và `status`.
- Lỗi không lường trước: trả `INTERNAL.UNEXPECTED` + `traceId`, chi tiết chỉ ghi log server.
- FE dịch theo `code` bằng `next-intl` (`messages/vi.json`, `en.json`, khoá `errors.<DOMAIN>.<REASON>`). Thông báo thành công cũng do FE dịch.
- Thêm mã lỗi mới phải thêm bản dịch ở mọi locale; test i18n coverage sẽ fail nếu thiếu.

## FE dùng API

- Chỉ dùng hàm, hook, type, enum và zod schema Orval sinh ra trong `src/client/api/generated/`. Không tự viết type/interface/enum/zod schema trùng với schema API.
- Form: `react-hook-form` + `zodResolver(<schema trong generated/zod>)`. Chỉ viết zod tay cho field thuần giao diện (không gửi lên API).
- `src/ui` và `src/client` không import `src/ship/*` hay `src/containers/*` (kể cả `ship/contracts`).
- SSE: tự viết wrapper `EventSource` trong `src/client/sse/` nhưng type của event lấy từ code sinh ra.

## FE state — tách rõ, không trộn

- **TanStack Query** = server-state qua REST (workspace, spec, settings, connector...): dùng hook Orval sinh ra; sau mutation thì `invalidateQueries` theo query key sinh ra, không tự sửa cache bằng tay khi không cần.
- **Zustand** (`src/client/stores/`) = client-state và realtime: file đang mở, spec được chọn làm context, chế độ Editor/Diff, bản đề xuất của Agent, tiến trình pipeline từ SSE, log CLI đang chạy, trạng thái kết nối SSE.
- **Không nhồi dữ liệu stream (SSE, log CLI, tiến trình sync) vào TanStack Query.** Event SSE cập nhật store Zustand; khi event báo dữ liệu server đổi (vd `SPEC_CHANGED`) thì chỉ `invalidateQueries` để Query tự tải lại.
- Chat với Agent ở chế độ API dùng `useChat` của `@ai-sdk/react` (state nằm trong hook), không chép vào Query hay store.
- Không lưu cùng một dữ liệu ở hai nơi. Store không giữ bản sao dữ liệu server; chỉ giữ id / lựa chọn rồi đọc dữ liệu qua hook Query.
- **Zod** dùng để validate lúc chạy và suy ra type (`z.infer`); ở FE ưu tiên schema sinh ra.

## Git

- Commit theo Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `chore`...).
- Dùng đúng author trong `.git/config`; không thêm `Co-Authored-By` hay dòng ghi công AI vào commit/PR.
- Không commit secret, `.env.local`, DB.
