# Technical Specification: Spec Studio & NotebookLM Sync Workbench

## 1. Tổng quan & Mục tiêu (Overview & Objectives)
* **Tên dự án:** Spec Studio (Local Workbench)
* **Mục tiêu:** Ứng dụng local chạy trên Next.js quản lý và chỉnh sửa tập trung các file đặc tả kỹ thuật (`.md`). Tích hợp AI Agent (Direct API hoặc Local CLI) tự động cập nhật spec và xử lý bài toán đồng bộ hóa (replace/update) lên Google NotebookLM (NBL).
* **Đơn vị làm việc:** mỗi bộ spec thuộc một **Workspace (Project)**. Một Workspace gồm: thư mục làm việc ở local, nơi lưu trữ gốc của file `.md` (chỉ local, Git repo hoặc Google Drive) và đích đồng bộ trên NotebookLM (Notebook ID). Người dùng có thể tạo nhiều Workspace và chuyển qua lại.
* **Vấn đề giải quyết:** NotebookLM xem source là immutable snapshot, không hỗ trợ sửa trực tiếp content của source ID có sẵn qua API công khai. Hệ thống này giải quyết vòng lặp: quản lý spec local $\to$ AI đề xuất/sửa spec $\to$ tự động trigger pipeline đồng bộ (Drive Sync hoặc RPC Xóa/Nạp lại).

---

## 2. Kiến trúc Kỹ thuật (Tech Stack & Architecture)

* **Framework:** **Next.js (App Router)** chạy full-stack trên môi trường Node.js local.
  * **Frontend (Client):** React, Tailwind CSS, Lucide React, Radix UI / shadcn/ui.
  * **Backend (Route Handlers):** Next.js API Routes (`app/api/*`) xử lý I/O với hệ thống file local (`node:fs/promises`) và tiến trình hệ điều hành (`node:child_process`).
* **Editor & Diff View:** `@monaco-editor/react` (sử dụng component `<DiffEditor />` có sẵn để review code/spec).
* **AI Orchestration:** **Vercel AI SDK** (`ai`, `@ai-sdk/react`, `@ai-sdk/google`, `@ai-sdk/anthropic`):
  * Dùng hook `useChat` và streaming UI component.
  * Hỗ trợ Tool / Function Calling native.
* **CLI Runner:** `spawn` / `execa` thực thi các terminal tool có sẵn trên máy (Claude Code, Codex CLI của OpenAI/ChatGPT, Antigravity CLI của Google, Aider, custom scripts) và stream output trực tiếp về client qua Server-Sent Events (SSE).

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
* Mọi route file I/O hiện có (`/api/specs/*`) nhận thêm `workspaceId` và chỉ được đọc/ghi bên trong `workspacePath` của Workspace đó (chặn path traversal).

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

-   [ ] **Phase 0: Workspace Manager**
    
    -   Registry `~/.spec-studio/workspaces.json`, `settings.json`, `secrets.json`.
    -   Màn hình Projects (3.0) + Wizard New Project (3.0.1) + Workspace Switcher trên Header.
    -   API `/api/workspaces/*` (CRUD, check, pull, push); storage adapter `local` / `git` (`simple-git`) / `drive` (Drive API v3).
    -   Connectors: dò & dùng CLI (`gh`, `glab`, `tea`), MCP client (`@modelcontextprotocol/sdk`, stdio + HTTP), Token, SSH; Tab 5 Integrations; publish dạng PR/MR.


-   [ ] **Phase 1: Next.js Foundation & File I/O**
    
    -   Khởi tạo project `create-next-app` (App Router, Tailwind CSS).
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