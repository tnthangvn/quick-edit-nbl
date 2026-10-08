# Technical Specification: Spec Studio & NotebookLM Sync Workbench

## 1. Tổng quan & Mục tiêu (Overview & Objectives)
* **Tên dự án:** Spec Studio (Local Workbench)
* **Mục tiêu:** Ứng dụng local chạy trên Next.js quản lý và chỉnh sửa tập trung các file đặc tả kỹ thuật (`.md`). Tích hợp AI Agent (Direct API hoặc Local CLI) tự động cập nhật spec và xử lý bài toán đồng bộ hóa (replace/update) lên Google NotebookLM (NBL).
* **Đơn vị làm việc:** mỗi bộ spec thuộc một **Workspace (Project)**. Một Workspace gồm: thư mục làm việc ở local, nơi lưu trữ gốc của file `.md` (chỉ local, Git repo hoặc Google Drive) và đích đồng bộ trên NotebookLM (Notebook ID). Người dùng có thể tạo nhiều Workspace và chuyển qua lại.
* **Vấn đề giải quyết:** NotebookLM xem source là immutable snapshot, không hỗ trợ sửa trực tiếp content của source ID có sẵn qua API công khai. Hệ thống này giải quyết vòng lặp: quản lý spec local $\to$ AI đề xuất/sửa spec $\to$ tự động trigger pipeline đồng bộ (Drive Sync hoặc RPC Xóa/Nạp lại).

---

## 2. Kiến trúc Kỹ thuật (Tech Stack & Architecture)

Quy tắc viết code chi tiết cho người và AI agent nằm ở `CLAUDE.md` (gốc repo, `AGENTS.md` / `GEMINI.md` là symlink). Mục này mô tả kiến trúc.

### 2.1. Tổng quan

* **Một app Next.js (App Router)** chạy full-stack trên Node.js local, làm cả FE và BE; không tách service backend riêng. Route handler chạy `runtime = "nodejs"`.
* **FE** tổ chức theo **Atomic Design** (`src/ui`), **BE** tổ chức theo **Porto** (`src/ship`, `src/containers`). Thư mục `app/` chỉ khai báo route.
* **Hợp đồng FE–BE là OpenAPI 3.1:** BE sinh `docs/api.json` từ schema zod, FE sinh toàn bộ client, type và enum từ file này.
* Muốn đóng gói thành app desktop về sau: bọc bằng Electron hoặc Tauri, giữ nguyên code FE/BE.

| Lớp | Công nghệ |
| --- | --- |
| UI | React, Tailwind CSS v4, shadcn/ui (Radix), `lucide-react`, `next-themes`, font Geist / Geist Mono (`next/font`) |
| Editor & Diff | `@monaco-editor/react` (`Editor`, `DiffEditor`) + theme `spec-studio-light/dark` |
| State & dữ liệu FE | zustand (trạng thái giao diện), TanStack Query (dữ liệu server), `react-hook-form` + `zod` (form) |
| i18n | `next-intl` (không đặt locale trên URL; `vi` mặc định, `en`) |
| Validate & OpenAPI | `zod` v4 + `zod-openapi` (BE), Orval (sinh client FE), `@redocly/cli` (lint spec) |
| AI (Direct API) | Vercel AI SDK: `ai`, `@ai-sdk/react` (`useChat`), `@ai-sdk/google`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, provider Ollama; tool calling native |
| CLI Runner | `execa` chạy Claude Code, Codex CLI, Antigravity CLI (`agy`), Aider, script tuỳ chỉnh; stream về client qua SSE |
| Data layer | Repository chạy trên driver chọn bằng `DATA_DRIVER`: `JSON` (mặc định, file trong `~/.spec-studio/data`) hoặc `POSTGRES` (Kysely + `pg`) |
| Git / Drive / MCP | `simple-git` + CLI `gh` / `glab` / `tea`; `googleapis` (Drive v3); `@modelcontextprotocol/sdk` |
| Secret | Keychain hệ điều hành (`@napi-rs/keyring`), dự phòng `~/.spec-studio/secrets.json` (quyền 600) |
| Theo dõi file | `chokidar` (phát hiện file bị sửa từ ngoài app) |
| Test | Vitest |

### 2.2. Môi trường & công cụ

* **Node.js 24 LTS** (khai trong `.nvmrc`), **pnpm** qua corepack (`packageManager` trong `package.json`, `engine-strict=true`).
* **Máy mới chỉ cần một lệnh:** `./setup.sh`. Script cài nvm, Node, pnpm, dependencies, tạo `~/.spec-studio` (quyền 700) và `.env.local`, chạy migration, sinh API, kiểm tra CLI tuỳ chọn.
* **Lệnh hằng ngày qua `Makefile`** (`make help`): `dev`, `build`, `migrate`, `migration`, `seed`, `db-reset`, `api`, `api-check`, `lint`, `typecheck`, `test`, `check`...

### 2.3. Cấu trúc thư mục

```
app/                     # route Next.js; app/api/**/route.ts chỉ re-export handler của container
src/
├── ui/                  # FE — Atomic Design
│   ├── primitives/      # shadcn/Radix sinh ra, không sửa tay
│   ├── atoms/           # Button, IconButton, Input, Checkbox, Switch, Kbd, Icon, StatusBadge...
│   ├── molecules/       # Field, Select, Tabs, ModeSwitch, SpecListItem, ChatMessage, Toast, ContextMenu...
│   ├── organisms/       # AppHeader, SpecSidebar, EditorPane, DiffView, Composer, SyncActivityPanel, SettingsDialog...
│   └── templates/       # ProjectsTemplate, WorkbenchTemplate
├── client/              # FE — stores (zustand), sse, api/generated (Orval: hook, type, enum)
├── ship/                # BE — Porto Ship layer
│   ├── parents/         # base class: Action, SubAction, Task, Controller, Request, Transformer, RepositoryBase, AppException
│   ├── contracts/       # schema, enum, event contract dùng chung (ErrorCode, ErrorResponse...)
│   ├── adapters/        # fs, process, git, drive, mcp, keyring, database, logger, sse
│   └── engine/          # defineRoute, DI, EventBus, chuyển lỗi thành response
└── containers/          # BE — Porto Containers layer
    ├── Studio/          # Section: Workspace, Spec, Setting, Connector, Storage, Notebook, Publish
    └── Agent/           # Section: Chat, CliRunner
messages/                # vi.json, en.json
docs/api.json            # OpenAPI 3.1 do BE sinh ra
scripts/                 # build-openapi.ts...
```

### 2.4. Frontend — Atomic Design

* Tầng phụ thuộc một chiều: page (`app/`) → template → organism → molecule → atom → primitive.
* Atom và molecule chỉ nhận props. Organism là tầng duy nhất dùng hook dữ liệu trong `src/client`. Template chỉ lo layout.
* Component bám `design-system/design/components/*.md`; màu, spacing, radius, motion chỉ lấy từ token trong `globals.css`.
* FE chỉ gọi API qua code Orval sinh ra; không tự khai type/enum trùng với schema API, không import code trong `src/ship` hay `src/containers`.

### 2.5. Backend — Porto

* **Ship layer** chứa hạ tầng dùng chung và giữ mỏng: base class, contract, adapter cho thư viện ngoài, engine.
* **Containers layer** chia theo nghiệp vụ. Mỗi container có cùng cấu trúc: `Actions/`, `Tasks/`, `Models/`, `Enums/`, `Events/`, `Exceptions/`, `Data/{Repositories,Migrations,Seeders}/`, `UI/API/{Routes,Controllers,Requests,Transformers}/`, `Tests/`.

| Section | Container | Trách nhiệm |
| --- | --- | --- |
| Studio | Workspace | Registry, tạo / mở / kiểm tra Workspace (3.0, 6.3) |
| Studio | Spec | Đọc / ghi / đổi tên / xoá file `.md`, chặn path traversal |
| Studio | Setting | Cấu hình app và Workspace, secret |
| Studio | Connector | CLI `gh`/`glab`/`tea`, MCP, Token, SSH (3.0.2) |
| Studio | Storage | Pull / publish cho Local, Git, Drive |
| Studio | Notebook | Đồng bộ NotebookLM (`drive_sync` / `rpc`) |
| Studio | Publish | Pipeline sau Approve (6.4), hàng đợi theo file |
| Agent | Chat | Direct API, tools 5.2 |
| Agent | CliRunner | Chạy CLI agent trong sandbox, parse output, đẩy đề xuất sang Diff Review |

* **Luồng gọi:** Route → Controller → Action → (SubAction) → Task → Repository / Adapter.
  * Controller chỉ validate Request, gọi một Action, trả kết quả qua Transformer.
  * Action là một use case (`run()`), không gọi Action khác. Task làm một việc (`run()`), chỉ được gọi từ Action/SubAction, không gọi Task khác.
  * Trong cùng Section, Action được gọi Task của container khác (vd Publish gọi Task của Storage và Notebook). Khác Section đi qua contract trong `ship/contracts` hoặc event (vd Agent đọc spec qua `SpecReader`, đề xuất sửa bằng `SpecProposedEvent`).
* **CLI agent không ghi thẳng vào spec:** CliRunner chạy CLI trong bản sao tạm (git worktree hoặc copy `specsDir`), so sánh với bản gốc rồi đẩy kết quả sang DiffEditor; chỉ Approve mới ghi vào file thật (đúng luồng 6.1).

### 2.6. Data layer

* **Chọn nguồn dữ liệu bằng cấu hình**, code nghiệp vụ không đổi:

| `DATA_DRIVER` | Lưu ở | Dùng khi |
| --- | --- | --- |
| `JSON` (mặc định) | Mỗi model một file `DATA_DIR/<model>.json` (mặc định `~/.spec-studio/data`) | App local một người dùng, không cần cài gì thêm |
| `POSTGRES` | Bảng trong database `DATABASE_URL` | Nhiều người dùng, cần truy vấn/lịch sử lớn, chạy trên server |

* **Kiến trúc:** Task → Repository → `RepositoryBase` → `DataDriver` (interface trong `ship/contracts`) → `JsonDataDriver` hoặc `PostgresDataDriver` (trong `ship/adapters/data`). Engine tạo driver một lần lúc khởi động theo env.
* Mọi repository kế thừa `RepositoryBase<"tên_model">` với `protected model = "tên_model"`. Các hàm `protected` chạy được trên cả hai driver: `findById`, `findOne`, `findMany`, `where`, `join`, `paginate`, `count`, `exists`, `insert`, `multipleInsert`, `upsert`, `update`, `updateById`, `delete` (bắt buộc có điều kiện), `withTransaction`. Repository con chỉ public hàm nghiệp vụ.
* Điều kiện lọc là object dùng chung cho mọi driver (`=`, `IN`, `IS NULL`, `ne/gt/gte/lt/lte/like`); không viết SQL trực tiếp trong repository.
* Model khai bằng zod: validate khi ghi file JSON, sinh kiểu cho Kysely. ID (UUID v7) và `created_at` / `updated_at` do app sinh để dữ liệu hai driver giống nhau.
* **JSON:** ghi file tạm rồi rename (không hỏng file khi tắt ngang), khoá theo model trong tiến trình, không cần migration. **POSTGRES:** migration theo từng container (`make migration`), chạy `make migrate`; môi trường dev có `docker-compose.yml` (`make db-up`).
* Seeder viết qua repository nên chạy được trên cả hai driver.
* Secret không lưu qua repository hay `config.json`.

### 2.7. Hợp đồng API (OpenAPI)

* Mỗi endpoint khai một lần bằng `defineRoute({ operationId, method, path, tags, request, responses, controller })`. Từ đó engine vừa tạo handler (validate request, xử lý lỗi), vừa sinh tài liệu.
* Response khai rõ theo status: thành công (200/201/204) và lỗi có thể xảy ra (403, 404, 409...). Engine tự thêm `500` cho mọi route và `422` cho route có input. Môi trường dev/test validate cả response thành công.
* **Enum:** mọi field có tập giá trị cố định (`status`, `type`, `mode`, `strategy`, `provider`...) khai bằng `z.enum([...]).meta({ id })`, giá trị viết HOA (`ACTIVE`, `INACTIVE`). Enum có tên vào `components/schemas`, FE sinh ra một enum dùng chung; cột DB dùng cùng enum (`CHECK ... IN (...)`).
* **Quy trình:** `make api` = sinh `docs/api.json` → lint bằng Redocly → Orval sinh `src/client/api/generated/`. Commit cả hai; CI chạy `make api-check` để chặn spec lệch code.
* Endpoint SSE (tiến trình sync, log CLI) khai `text/event-stream` với schema event; FE tự viết wrapper `EventSource` nhưng dùng type sinh ra.

### 2.8. Lỗi & đa ngôn ngữ

* BE **không trả câu thông báo**. Lỗi có dạng:

```json
{ "error": { "code": "SPEC.NOT_FOUND", "params": { "file": "sidebar.md" }, "traceId": "a1b2c3" } }
{ "error": { "code": "VALIDATION.FAILED", "fields": { "name": { "code": "FIELD.REQUIRED" } } } }
```

* Mã lỗi dạng `DOMAIN.REASON`, khai trong enum `ErrorCode`; mỗi lỗi nghiệp vụ là một class `AppException` có `code` và HTTP status. Lỗi không lường trước trả `INTERNAL.UNEXPECTED` + `traceId`, chi tiết chỉ ghi log.
* FE dịch theo `code` bằng `next-intl` (`messages/vi.json`, `messages/en.json`, khoá `errors.<DOMAIN>.<REASON>`); thông báo thành công cũng do FE dịch. Test bắt buộc mọi `ErrorCode` có bản dịch ở mọi locale.
* Lỗi trong pipeline sync và log CLI dùng cùng định dạng `{ code, params }`; stderr gốc (git, CLI) nếu cần hiện thì đặt trong `params.detail` và hiển thị nguyên văn.

---

## 3. Đặc tả Giao diện & Tính năng (UI/UX Specifications)

Thiết kế giao diện bám sát wireframe:

### 3.0. Màn hình Projects (Workspace Manager)

Màn hình đầu tiên khi mở app (route `/`); mở lại bất cứ lúc nào từ Workspace Switcher trên Header.

* **Danh sách Workspace đã tạo** (đọc từ registry `~/.spec-studio/workspaces.json`, mục 5.3), mỗi Workspace một thẻ/dòng:
  * Tên project, đường dẫn thư mục làm việc local.
  * Badge nơi lưu trữ: `Local`, `Git` (kèm `repo@branch`) hoặc `Drive` (kèm tên thư mục Drive).
  * Đích NotebookLM: tên/ID notebook rút gọn, hoặc `Chưa kết nối`.
  * Số file spec, thời điểm mở gần nhất, trạng thái tổng (`Synced` / `Có thay đổi chưa push` / `Lỗi`).
  * Click → mở Workspace (route `/w/[id]`). Menu 3 chấm: Mở thư mục, Đổi tên, Sửa cấu hình, Gỡ khỏi danh sách (không xoá file).
* **Thanh công cụ:** ô tìm kiếm theo tên/đường dẫn, lọc theo loại lưu trữ, sắp xếp (Mở gần nhất / Tên), nút **+ New Project**, nút **Mở thư mục có sẵn** (thêm thư mục đã có `.spec-studio/config.json`).
* **Trạng thái trống:** chưa có Workspace nào → hiển thị lời mời tạo project đầu tiên.
* **Workspace mất kết nối:** thư mục local không còn tồn tại → thẻ mờ, badge `Không tìm thấy thư mục`, hành động `Tìm lại` / `Gỡ khỏi danh sách`.

#### 3.0.1. Wizard **+ New Project** (Dialog nhiều bước)

1. **Thông tin:** Tên project (bắt buộc, duy nhất), mô tả ngắn (tuỳ chọn).
2. **Nơi lưu file `.md`** (chọn 1 trong 3):
   * **Chỉ Local:** chọn thư mục làm việc (`workspacePath`) và thư mục con chứa spec (`specsDir`, mặc định `./specs`). File chỉ nằm trên máy.
   * **Git repository:**
     * **Provider:** `GitHub` · `GitLab` · `Bitbucket` · `Gitea / Forgejo` · `Git thường (self-hosted, chỉ URL)`; GitHub/GitLab hỗ trợ cả bản self-hosted (nhập Host).
     * **Kết nối qua** (chọn 1, xem mục 3.0.2): `CLI có sẵn trên máy` (`gh`, `glab`, `tea`…), `MCP server`, `Personal Access Token`, hoặc `SSH key`.
     * Khi đã kết nối qua CLI/MCP/Token: **chọn repo từ danh sách** (có tìm kiếm, gõ `owner/repo`) thay vì dán URL; chọn Branch từ danh sách nhánh. Với `SSH key` / `Git thường`: dán Repo URL.
     * Thư mục con trong repo chứa spec, thư mục clone ở local (`workspacePath`).
     * **Cách đẩy thay đổi:** `Push thẳng lên branch` hoặc `Tạo branch + Pull/Merge Request` (tên branch theo mẫu `spec/{date}-{filename}`, PR/MR tạo qua CLI/MCP/API của provider; gộp nhiều lần Approve trong một phiên vào cùng một PR nếu PR còn mở).
     * Tuỳ chọn: `Tự commit sau khi Approve`, `Tự push / tạo PR sau khi commit`, mẫu commit message (vd `docs(spec): {action} {filename}`), `Pull khi mở Workspace`.
     * Nút **Kiểm tra**: xác thực provider, quyền đọc/ghi repo, `git ls-remote`.
   * **Google Drive:** Drive Folder ID/URL chứa file `.md`, thư mục làm việc local (bản sao để Agent đọc/ghi), chiều đồng bộ: `Tải về khi mở` + `Tải lên sau khi Approve`. Xác thực Google OAuth (dùng chung với NotebookLM Drive Sync nếu cùng tài khoản). Nút **Kiểm tra quyền** (đọc/ghi thư mục).
3. **Đích NotebookLM:** Notebook ID hoặc dán URL notebook (tự tách ID), Sync Strategy (`drive_sync` / `rpc`), quy tắc ánh xạ: mỗi file spec ↔ một source cùng tên (mặc định). Tuỳ chọn **Bỏ qua, kết nối sau**. Nút **Kiểm tra** (đọc danh sách source của notebook).
4. **Xem lại & Tạo:** tóm tắt cấu hình. Khi bấm **Tạo project**:
   * Tạo thư mục (Local) / clone repo (Git) / tải thư mục Drive về (Drive).
   * Ghi `.spec-studio/config.json` vào `workspacePath` (mục 5.1).
   * Thêm bản ghi vào registry `~/.spec-studio/workspaces.json`.
   * Mở Workspace vừa tạo; tiến trình từng bước hiển thị trong Dialog, lỗi ở bước nào thì dừng ở bước đó kèm nút Thử lại.

#### 3.0.2. Kết nối Git provider (Connectors)

Quản lý tập trung trong Settings › Tab 5 `Integrations`, dùng lại cho mọi Workspace; Wizard chỉ chọn connector đã có hoặc tạo nhanh connector mới.

| Loại connector | Cách hoạt động | Provider gợi ý |
| --- | --- | --- |
| **CLI có sẵn** | Dò binary trên máy (`which gh`, `which glab`…), đọc trạng thái đăng nhập (`gh auth status`, `glab auth status`), lấy token tạm (`gh auth token`) cho git qua HTTPS; liệt kê repo/branch, tạo PR/MR bằng chính CLI (`gh pr create`, `glab mr create`). Không lưu token vào app. | GitHub → `gh`, GitLab → `glab`, Gitea → `tea`; Bitbucket: CLI tuỳ chỉnh |
| **MCP server** | Khai báo MCP server (stdio: `command` + `args` + `env`; hoặc HTTP/SSE: `url` + header). App gọi các tool của server (liệt kê repo, branch, tạo PR/MR, đọc trạng thái CI). Tool MCP có thể được bật thêm cho AI Agent (mục 5.2). | GitHub MCP, GitLab MCP, Bitbucket MCP hoặc server tự viết |
| **Personal Access Token** | Lưu token trong `secrets.json` / keychain; gọi REST API của provider. Hiện phạm vi (scope) tối thiểu cần cấp. | Mọi provider |
| **SSH key** | Dùng ssh-agent / key có sẵn của máy; chỉ clone/pull/push, không liệt kê repo và không tạo PR. | Mọi Git remote |

* Mỗi connector có nút **Kiểm tra** (hiện tài khoản đang đăng nhập, host, phạm vi quyền) và trạng thái `Đã kết nối` / `Cần đăng nhập lại` / `Không tìm thấy CLI`.
* Nếu CLI có trên máy nhưng chưa đăng nhập: hiện lệnh gợi ý (`gh auth login`, `glab auth login`) và nút chạy lệnh trong terminal của CLI Runner.
* Thứ tự ưu tiên khi một Workspace có nhiều cách xác thực: CLI → MCP → Token → SSH.

Validation: thư mục local phải ghi được; `workspacePath` không trùng Workspace khác; Git/Drive phải qua bước Kiểm tra trước khi Tạo (hoặc người dùng xác nhận bỏ qua).

### 3.1. Header & Navigation
* **Workspace Switcher:** cạnh tên app, hiển thị tên Workspace hiện tại + badge nơi lưu trữ; mở dropdown danh sách Workspace gần đây, `+ New Project` và `Tất cả projects…` (về màn hình 3.0).
* **Storage Status:** với Workspace Git/Drive, hiển thị số thay đổi chưa push/upload và nút `Push` / `Pull` nhanh.
* **Logo / App Name:** Đặt tại góc trên bên trái[cite: 1].
* **Settings Action:** Icon bánh răng tại góc trên bên phải[cite: 1] để kích hoạt Settings Dialog toàn hệ thống.

### 3.2. Sidebar (Bên trái) - Quản lý Danh mục Spec
* **Toggle Sidebar Icon:** Nút thu gọn / mở rộng sidebar[cite: 1].
* **Danh sách file Spec:**
  * **Item Selection[cite: 1]:**
    * *Click chọn xem:* Mở file markdown tương ứng lên Monaco Editor ở vùng trung tâm.
    * *Checkbox (Multi-select)[cite: 1]:* Chọn một hoặc nhiều spec để đính kèm vào Context của AI Agent khi chat.
  * **Context Action Menu (3 chấm)[cite: 1]:**
    * Xóa file local (Delete spec)[cite: 1].
    * Đổi tên file (Rename).
    * Force Sync: Kích hoạt đồng bộ ngay lập tức file này lên NotebookLM.
  * **Sync Status Badge:** Hiển thị trạng thái của từng file (`Synced`, `Unsaved`, `Syncing...`, `Error`).

### 3.3. Workspace Trung tâm (Monaco Editor & Diff Review)
* **Editor Mode:** Soạn thảo Markdown với live syntax highlight, autosave xuống file local.
* **Diff Mode (Review AI Changes):**
  * Kích hoạt tự động khi Agent đề xuất sửa đổi spec.
  * Sử dụng Monaco `<DiffEditor />` chia 2 cột (Original vs Proposed) highlight xanh/đỏ.
  * Nút hành động nổi trên thanh bar: `Approve & Save` (ghi đè file) và `Reject`.

### 3.3.1. Bảng tiến trình đồng bộ (Sync Activity)

Hiện ở góc dưới phải ngay sau khi Approve & Save (thay cho toast đơn), theo dõi luồng 6.4 cho file vừa lưu:

* **Đầu bảng:** `Đang đồng bộ <file>` + `n/N nơi`, thanh tiến độ, nút Thu gọn / Đóng (Đóng bị khoá khi đang chạy).
* **Mỗi đích một dòng** (chỉ các đích Workspace đã cấu hình): icon, tên, chi tiết bước hiện tại (font mono), trạng thái `Chờ` / `Đang chạy` / `Xong` / `Lỗi`:
  * `Ghi file local` → `specs/<file> · <size>`.
  * `Git · Push` → `commit “docs(spec): …”` → `git push origin <branch>…` → `<branch> · <sha>`; hoặc `Git · Pull Request` → `push spec/<date>-<file>…` → `gh pr create…` → link `PR #12` (mở trình duyệt).
  * `Google Drive` → `Specs/<folder>/<file> · đã ghi đè`.
  * `NotebookLM` → `refresh source “<file>”` → `<notebook> · source <file>`.
* **Kết thúc:** tất cả xong → `Đã đồng bộ <file>` và tự thu gọn sau 5 giây; có lỗi → `Đồng bộ n/N nơi · 1 lỗi`, dòng lỗi nền đỏ nhạt kèm lý do (vd `push bị từ chối (403)`) và nút **Thử lại**; bảng không tự ẩn.
* **Header:** chip trạng thái cho từng đích đã cấu hình (`Git` · `Drive` · `NBL`) đổi màu theo tiến trình, kể cả khi bảng đã thu gọn.

### 3.4. Footer Toolbar & Chatbox
* **Quick Setting Toolbar (Nằm ngay trên Chatbox)[cite: 1]:**
  * Switcher chế độ: `[ API Key Mode ]` $\leftrightarrow$ `[ CLI Agent Mode ]`[cite: 1].
  * Dropdown chọn nhanh model hoặc CLI profile đang kích hoạt (ví dụ: `gemini-1.5-pro`, `claude-code`)[cite: 1].
  * Icon Setting mở nhanh tab cấu hình tương ứng[cite: 1].
* **Chatbox tương tác[cite: 1]:**
  * Textarea nhập prompt tự co giãn chiều cao (Hỗ trợ phím tắt `Ctrl/Cmd + Enter` để gửi)[cite: 1].
  * Button Send[cite: 1].
  * Hiển thị log stream từ Agent (khi dùng CLI runner hoặc LLM streaming API).

---

## 4. Đặc tả Cấu hình (Settings Dialog)

Modal cấu hình gồm 5 tab độc lập (tab 1, 2, 5 là cấu hình chung của app; tab 3–4 thuộc Workspace đang mở):

### Tab 1: Direct API (LLM Integration)
* **Provider:** Select (`Google Gemini`, `Anthropic`, `OpenAI`, `DeepSeek`, `Ollama / Local BaseURL`).
* **API Key:** Input masked có tính năng Test Connection.
* **Model ID:** Dropdown chọn model hoặc tự nhập custom model name.
* **System Prompt Preset:** Khai báo persona và quy tắc viết spec cho Agent.

### Tab 2: CLI Agent Runner
* **Active CLI:** chọn profile dạng thẻ: `Claude Code` (Anthropic), `Codex CLI` (OpenAI · đăng nhập bằng tài khoản ChatGPT hoặc API key), `Antigravity CLI` (Google · lệnh `agy`), `Aider`, `Custom Shell Script`. Mỗi thẻ hiện trạng thái tự dò (`which <binary>`): tìm thấy / không tìm thấy, kèm lệnh cài đặt gợi ý.
* **Profile mặc định đề xuất** (`{prompt}` = yêu cầu của người dùng kèm danh sách spec trong context; tiến trình luôn chạy với `cwd` = `workspacePath`):

| Profile | Binary | Default Arguments | Đăng nhập | Stream log |
| --- | --- | --- | --- | --- |
| Claude Code | `claude` | `-p {prompt} --output-format stream-json --dangerously-skip-permissions` | `claude` (lần đầu) | `stream-json` |
| Codex CLI (ChatGPT) | `codex` | `exec --sandbox workspace-write --json {prompt}` | `codex login` (tài khoản ChatGPT) hoặc biến `CODEX_API_KEY` | JSON Lines (`--json`) |
| Antigravity CLI | `agy` | `-p {prompt} --mode=accept-edits --output-format stream-json` | đăng nhập Google ở lần chạy đầu (lưu keyring); CI: `GEMINI_API_KEY` | `stream-json` |
| Aider | `aider` | `--yes --no-auto-commits --message {prompt}` | API key của model | text |
| Custom Shell Script | tuỳ ý | `--file {spec} --prompt {prompt}` | — | text |

  * Codex: `exec` mặc định chạy sandbox chỉ-đọc, nên cần `--sandbox workspace-write` để sửa file; `--full-auto` đã cũ, không dùng. Có thể thêm `-o <file>` để lấy riêng câu trả lời cuối.
  * Antigravity: `--mode=accept-edits` chỉ tự duyệt thao tác sửa file; muốn tự duyệt cả lệnh shell thì dùng `--dangerously-skip-permissions` (chỉ nên dùng trong thư mục/VM riêng). Lần chạy headless đầu tiên cần đã đăng nhập từ phiên tương tác, nếu không sẽ báo `authentication required`.
  * Runner đọc stdout theo `outputFormat` của profile (`stream-json` / `jsonl` / `text`) để hiện log, tool call và phát hiện đề xuất sửa file, rồi đưa vào luồng Diff Review (6.1) thay vì ghi thẳng.
* **Binary Path:** Đường dẫn thực thi (ví dụ: `/usr/local/bin/claude` hoặc `npx @anthropic-ai/claude-code`).
* **Default Arguments:** Flags truyền vào tiến trình (ví dụ: `--dangerously-skip-permissions`).
* **Workspace Path:** Thư mục gốc chứa các file `.md` local.
* **Stream Stdout:** Bật/tắt truyền log tiến trình terminal vào UI Chat.

### Tab 3: NotebookLM Synchronization
* **Notebook ID:** Target Notebook URL ID trên Google NotebookLM.
* **Sync Strategy:**
  1. *Google Drive Sync:* Cấu hình OAuth/Service Account và Google Drive Folder ID. Lưu spec dưới dạng Google Doc $\to$ Trigger lệnh refresh source trên NotebookLM.
  2. *Direct Cookie RPC:* Cấu hình Cookie (`SID`, `HSID`, `SSID`) và `SNlM0e` token để tự động hóa vòng lặp Delete Source cũ $\to$ Upload Source mới qua RPC endpoint.
* **Automation:**
  * Toggle: `Tự động sync lên NBL sau khi Approve Diff`.
  * Toggle: `Hiện hộp thoại xác nhận trước khi sync`.

### Tab 4: Workspace & Storage
* **Tên Workspace**, **Thư mục làm việc local** (chỉ đọc, nút `Mở thư mục`), **Specs Dir**.
* **Loại lưu trữ:** `Local` / `Git` / `Drive` (đổi loại sẽ chạy lại bước kiểm tra như Wizard 3.0.1).
* **Git:** Provider, connector đang dùng (đổi được), Repo, Branch, thư mục con, cách đẩy (`Push thẳng` / `Pull/Merge Request`), `Tự commit`, `Tự push / tạo PR`, mẫu commit message, `Pull khi mở`.
* **Drive:** Drive Folder ID, `Tải về khi mở`, `Tải lên sau khi Approve`.
* **Vùng nguy hiểm:** `Gỡ Workspace khỏi danh sách` (không xoá file).

### Tab 5: Integrations (Git providers & MCP)
* Danh sách connector (mục 3.0.2): tên, loại (`CLI` / `MCP` / `Token` / `SSH`), provider, tài khoản, trạng thái; nút `+ Thêm connector`, `Kiểm tra`, `Sửa`, `Xoá`.
* **Tự dò CLI:** quét `gh`, `glab`, `tea` và các CLI người dùng khai báo; hiện phiên bản và tài khoản đăng nhập.
* **MCP servers:** thêm server stdio (command, args, env) hoặc HTTP (url, headers); xem danh sách tool server cung cấp; bật/tắt từng tool cho AI Agent.

---

## 5. Cấu trúc Dữ liệu & Tool Calling

### 5.1. File cấu hình local (`.spec-studio/config.json`)
```json
{
  "activeMode": "api",
  "specsDir": "./specs",
  "api": {
    "provider": "gemini",
    "apiKey": "AIzaSy...",
    "model": "gemini-1.5-pro",
    "temperature": 0.2
  },
  "cli": {
    "activeProfile": "claude-code",
    "profiles": [
      {
        "id": "claude-code",
        "name": "Claude Code",
        "command": "/usr/local/bin/claude",
        "args": ["-p", "{prompt}", "--output-format", "stream-json", "--dangerously-skip-permissions"],
        "outputFormat": "stream-json"
      },
      {
        "id": "codex",
        "name": "Codex CLI (ChatGPT)",
        "command": "/usr/local/bin/codex",
        "args": ["exec", "--sandbox", "workspace-write", "--json", "{prompt}"],
        "outputFormat": "jsonl",
        "env": { "CODEX_API_KEY": "secret:codex_api_key" }
      },
      {
        "id": "antigravity",
        "name": "Antigravity CLI",
        "command": "~/.local/bin/agy",
        "args": ["-p", "{prompt}", "--mode=accept-edits", "--output-format", "stream-json"],
        "outputFormat": "stream-json"
      }
    ]
  },
  "nbl": {
    "notebookId": "xxxx-xxxx-xxxx",
    "syncStrategy": "drive_sync",
    "driveFolderId": "yyyy-yyyy-yyyy",
    "autoSyncOnApprove": false
  }
}
```

Từ khi có Workspace, `config.json` nằm trong `workspacePath/.spec-studio/` của từng Workspace và có thêm khối `workspace` + `storage`. Cấu hình `api` và `cli` dùng chung cho mọi Workspace, lưu ở `~/.spec-studio/settings.json` (Workspace có thể ghi đè).

```json
{
  "workspace": {
    "id": "ws_7f3a29c1",
    "name": "Quick Edit NBL",
    "specsDir": "./specs"
  },
  "storage": {
    "type": "git",
    "git": {
      "provider": "github",
      "host": "github.com",
      "connectorId": "conn_gh_cli",
      "repo": "tnthangvn/quick-edit-nbl",
      "remote": "git@github.com:tnthangvn/quick-edit-nbl.git",
      "branch": "main",
      "publishMode": "pull_request",
      "prBranchTemplate": "spec/{date}-{filename}",
      "subdir": "docs",
      "auth": "ssh",
      "autoCommit": true,
      "autoPush": false,
      "commitMessage": "docs(spec): {action} {filename}",
      "pullOnOpen": true
    },
    "drive": null
  },
  "nbl": {
    "notebookId": "xxxx-xxxx-xxxx",
    "syncStrategy": "drive_sync",
    "driveFolderId": "yyyy-yyyy-yyyy",
    "autoSyncOnApprove": true,
    "confirmBeforeSync": false
  }
}
```

* `storage.type`: `"local" | "git" | "drive"`.
* `storage.git.provider`: `"github" | "gitlab" | "bitbucket" | "gitea" | "generic"`; `publishMode`: `"push" | "pull_request"`.
* Connector khai báo trong `~/.spec-studio/settings.json` (dùng chung), Workspace chỉ tham chiếu `connectorId`:

```json
{
  "connectors": [
    { "id": "conn_gh_cli", "type": "cli", "provider": "github", "host": "github.com", "command": "gh" },
    { "id": "conn_gl_cli", "type": "cli", "provider": "gitlab", "host": "gitlab.company.vn", "command": "glab" },
    { "id": "conn_gh_mcp", "type": "mcp", "provider": "github", "transport": "stdio",
      "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "envFromSecrets": ["GITHUB_PERSONAL_ACCESS_TOKEN"],
      "agentTools": ["create_pull_request", "list_branches"] },
    { "id": "conn_bb_token", "type": "token", "provider": "bitbucket", "host": "bitbucket.org", "secretRef": "bb_app_password" },
    { "id": "conn_ssh", "type": "ssh", "provider": "generic" }
  ]
}
```
* Với `"drive"`: `"drive": { "folderId": "…", "pullOnOpen": true, "pushOnApprove": true }`, `git` = `null`.
* Token/secret (PAT, OAuth refresh token, cookie NotebookLM) **không** ghi vào `config.json` của Workspace (vì file có thể bị commit lên Git) mà lưu ở `~/.spec-studio/secrets.json` (hoặc keychain hệ điều hành), tham chiếu theo `workspace.id`. Thêm `.spec-studio/` vào `.gitignore` mẫu khi tạo Workspace Git, trừ khi người dùng chọn chia sẻ cấu hình.

### 5.2. Tools cấp cho AI Agent (Vercel AI SDK Tools)

-   `list_specs()`: Trả về danh sách file `.md` trong thư mục `specsDir`.
-   `read_spec({ filename })`: Đọc toàn bộ nội dung file spec được chọn.
-   `propose_spec_update({ filename, newContent })`: Đẩy nội dung mới lên giao diện Diff Editor để người dùng duyệt (chưa ghi đè file).
-   `apply_spec_update({ filename, content })`: Ghi đè trực tiếp xuống disk khi người dùng bấm Approve.
-   `delete_spec({ filename })`: Xóa file spec khỏi thư mục local.
-   `trigger_nbl_sync({ filename })`: Gọi module đồng bộ file tương ứng lên NotebookLM.
-   `publish_specs({ files?, message? })`: Commit + push hoặc tạo/cập nhật PR/MR theo `storage.git.publishMode` của Workspace (chỉ khi storage là Git; luôn hỏi xác nhận người dùng).
-   Tool từ MCP server của connector (vd `create_pull_request`, `list_branches`) chỉ được cấp cho Agent khi người dùng bật trong Tab 5; mặc định tắt.

### 5.3. Registry các Workspace (`~/.spec-studio/workspaces.json`)

```json
{
  "version": 1,
  "lastOpenedId": "ws_7f3a29c1",
  "workspaces": [
    {
      "id": "ws_7f3a29c1",
      "name": "Quick Edit NBL",
      "path": "/var/www/free-time/quick-edit-nbl",
      "storageType": "git",
      "storageLabel": "tnthangvn/quick-edit-nbl@main",
      "notebookId": "xxxx-xxxx-xxxx",
      "createdAt": "2026-10-08T06:40:00Z",
      "lastOpenedAt": "2026-10-08T06:52:00Z"
    }
  ]
}
```

Registry chỉ là danh bạ để hiển thị màn hình Projects; nguồn sự thật của từng Workspace là `config.json` trong thư mục của nó.

### 5.4. API Route Handlers cho Workspace

* `GET /api/workspaces` · `POST /api/workspaces` (tạo theo Wizard) · `PATCH /api/workspaces/[id]` · `DELETE /api/workspaces/[id]` (chỉ gỡ khỏi registry).
* `GET /api/connectors` · `POST /api/connectors` · `POST /api/connectors/[id]/check` · `GET /api/connectors/detect` (dò CLI trên máy) · `GET /api/connectors/[id]/repos?q=` · `GET /api/connectors/[id]/branches?repo=`.
* `POST /api/workspaces/[id]/check` — kiểm tra thư mục, Git remote, quyền Drive, Notebook ID; trả kết quả từng mục.
* `POST /api/workspaces/[id]/pull` · `POST /api/workspaces/[id]/push` — đồng bộ với nơi lưu trữ (Git: `pull --ff-only` / `add` + `commit` + `push`; Drive: tải về / tải lên).
* Route spec lồng dưới Workspace và chỉ được đọc/ghi bên trong `workspacePath` của Workspace đó (chặn path traversal): `GET · POST /api/workspaces/[id]/specs` · `GET · PUT (Approve) · PATCH (Rename) · DELETE /api/workspaces/[id]/specs/[file]`.
* `POST /api/workspaces/[id]/sync/[file]` (Force Sync, Thử lại từng đích) · `GET /api/workspaces/[id]/events` (SSE: tiến trình pipeline 3.3.1, file thay đổi).
* `GET · PUT /api/settings` · `POST /api/chat` (Direct API, stream) · `POST /api/agent/run` (CLI, SSE) · `DELETE /api/agent/[runId]` · `GET /api/agent/detect`.
* Mọi route khai bằng `defineRoute` (mục 2.7); danh sách đầy đủ, schema request/response và mã lỗi xem `docs/api.json`.

## 6\. Luồng Xử lý Dữ liệu Chính (Workflows)

### 6.1. Luồng Sửa Spec bằng AI Agent (Diff Review Loop)

Plaintext

```
1. User chọn checkbox các spec liên quan trên Sidebar[cite: 1] -> Nhập yêu cầu vào Chatbox[cite: 1].
2. Next.js Route Handler gom nội dung các file đã chọn đưa vào context của LLM.
3. LLM thực thi, gọi tool `propose_spec_update`.
4. Workspace chuyển từ chế độ Monaco thông thường sang Monaco DiffEditor.
5. User kiểm tra diff trực quan:
   ├── Reject -> Hủy bản nháp, giữ nguyên file cũ.
   └── Approve -> Backend ghi đè nội dung vào file .md local.
                  └── Nếu cấu hình autoSync: kích hoạt pipeline đẩy lên NBL.
```

### 6.2. Luồng Đồng bộ lên NotebookLM

Plaintext

```
[Kích hoạt Sync (Auto hoặc Force Sync)]
          │
          ├── [Chiến lược 1: Drive Sync]
          │     ├── Ghi đè nội dung file .md vào file Google Doc trên Drive API.
          │     └── Trigger lệnh Refresh Source trên NotebookLM.
          │
          └── [Chiến lược 2: RPC Delete & Replace]
                ├── Gọi RPC GetSources lấy ID của source trùng tên spec.
                ├── Gọi RPC DeleteSource(source_id).
                └── Gọi RPC AddSource(notebook_id, new_content).
```

### 6.3. Luồng Tạo & Mở Workspace

```
[Projects] → + New Project → Wizard (Thông tin → Nơi lưu → NotebookLM → Xem lại)
          │
          ├── Local : tạo workspacePath/specsDir (nếu chưa có)
          ├── Git   : git clone --branch <branch> <remote> <workspacePath>
          └── Drive : tải các file .md trong folderId về workspacePath/specsDir
          │
          ├── Ghi workspacePath/.spec-studio/config.json
          ├── Thêm bản ghi vào ~/.spec-studio/workspaces.json
          └── Mở /w/[id]
                ├── pullOnOpen? → Git pull / Drive download (xung đột → hỏi người dùng)
                └── Load danh sách spec vào Sidebar
```

### 6.4. Luồng Lưu trữ sau khi Approve

```
[Approve & Save] → ghi file .md vào workspacePath (luôn luôn)
          │
          ├── storage = local : xong
          ├── storage = git   : autoCommit? → git commit (message theo mẫu)
          │                     publishMode = push         → git push (lỗi → badge "Chưa push" + toast)
          │                     publishMode = pull_request → push branch spec/… → tạo/cập nhật PR/MR
          │                                                   qua connector (gh / glab / MCP / API) → toast kèm link PR
          └── storage = drive : pushOnApprove? → upload/ghi đè file trên Drive
          │
          └── nbl.autoSyncOnApprove? → Luồng 6.2 đồng bộ lên NotebookLM
```

**Nguyên tắc chạy pipeline:**
* Chỉ chạy các đích Workspace đã cấu hình (Git / Drive / NotebookLM); bước ghi file local luôn chạy trước và là điều kiện cho các bước sau.
* Các đích remote chạy lần lượt theo thứ tự Git → Drive → NotebookLM, **độc lập với nhau**: một đích lỗi không chặn đích khác. Spec chỉ chuyển `Synced` khi mọi đích thành công; có đích lỗi → `Error`, các đích còn lại vẫn giữ kết quả.
* Mỗi đích có nút **Thử lại** riêng; thử lại chỉ chạy đích đó.
* Không cho chạy hai pipeline cùng lúc cho một file; Approve tiếp theo trên cùng file được xếp hàng.

Nếu storage và NotebookLM Drive Sync cùng dùng một thư mục Drive, bước upload ở 6.4 và bước ghi Google Doc ở 6.2 được gộp làm một để tránh ghi hai lần.

## 7. Kế hoạch Triển khai (Checklist)

-   [ ] **Phase −1: Nền tảng**
    
    -   `package.json` (Node 24, pnpm), `setup.sh`, `Makefile`, `.nvmrc`, ESLint (chặn import sai tầng Atomic / Porto, chặn FE import BE), Prettier, Vitest.
    -   Ship layer: base class, `defineRoute`, `AppException` + xử lý lỗi, `RepositoryBase` + `DataDriver` (`JsonDataDriver`, `PostgresDataDriver`) + migrator cho POSTGRES, EventBus, logger.
    -   Pipeline OpenAPI: `scripts/build-openapi.ts` → `docs/api.json` → Redocly → Orval; `make api-check` trong CI.
    -   `next-intl` + `messages/vi.json`, `en.json` + test phủ `ErrorCode`.
    -   Container mẫu `Spec` đầy đủ các tầng; các atom đầu tiên theo design system.

-   [ ] **Phase 0: Workspace Manager**
    
    -   Registry `~/.spec-studio/workspaces.json`, `settings.json`, `secrets.json`.
    -   Màn hình Projects (3.0) + Wizard New Project (3.0.1) + Workspace Switcher trên Header.
    -   API `/api/workspaces/*` (CRUD, check, pull, push); storage adapter `local` / `git` (`simple-git`) / `drive` (Drive API v3).
    -   Connectors: dò & dùng CLI (`gh`, `glab`, `tea`), MCP client (`@modelcontextprotocol/sdk`, stdio + HTTP), Token, SSH; Tab 5 Integrations; publish dạng PR/MR.


-   [ ] **Phase 1: Next.js Foundation & File I/O**
    
    -   Khởi tạo project bằng `pnpm create next-app` (App Router, TypeScript, Tailwind CSS v4), cài shadcn/ui, chép `globals.css` và `monaco-theme.ts` từ design system.
    -   Viết API Route Handler đọc/ghi/xóa file `.md` từ thư mục local.
    -   Xây dựng layout theo wireframe: Sidebar, Workspace, Chatbox[cite: 1].
    -   Tích hợp `@monaco-editor/react` (cả Editor và DiffEditor).
-   [ ] **Phase 2: Settings Engine**
    
    -   Dựng UI Settings Dialog (Radix Dialog / shadcn) với 5 tab: API, CLI, NBL, Workspace & Storage, Integrations.
    -   Xây dựng API route đọc/ghi cấu hình vào file local `.spec-studio/config.json`.
-   [ ] **Phase 3: Agent Integration (API & CLI)**
    
    -   Tích hợp Vercel AI SDK (`useChat`) cho Direct API Mode kết hợp Function Calling.
    -   Xây dựng API Route chạy CLI qua `child_process.spawn`, stream stdout về giao diện chat.
    -   Profile CLI có sẵn: Claude Code, Codex CLI (OpenAI/ChatGPT), Antigravity CLI (`agy`), Aider, Custom; parser cho `stream-json` / `jsonl` / `text`; tự dò binary và trạng thái đăng nhập.
    -   Kết nối luồng Diff Approval giữa Chatbox và Monaco DiffEditor.
-   [ ] **Phase 4: NotebookLM Sync Engine**
    
    -   Xây dựng module đồng bộ qua Google Drive API v3.
    -   Xây dựng fallback sync bằng reverse-engineered RPC script.