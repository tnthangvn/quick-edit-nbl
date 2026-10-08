# Technical Specification: Spec Studio & NotebookLM Sync Workbench

## 1. Tổng quan & Mục tiêu (Overview & Objectives)
* **Tên dự án:** Spec Studio (Local Workbench)
* **Mục tiêu:** Ứng dụng local chạy trên Next.js quản lý và chỉnh sửa tập trung các file đặc tả kỹ thuật (`.md`). Tích hợp AI Agent (Direct API hoặc Local CLI) tự động cập nhật spec và xử lý bài toán đồng bộ hóa (replace/update) lên Google NotebookLM (NBL).
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
* **CLI Runner:** `spawn` / `execa` thực thi các terminal tool có sẵn trên máy (Claude Code, Aider, custom scripts) và stream output trực tiếp về client qua Server-Sent Events (SSE).

---

## 3. Đặc tả Giao diện & Tính năng (UI/UX Specifications)

Thiết kế giao diện bám sát wireframe:

### 3.1. Header & Navigation
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

Modal cấu hình gồm 3 tab độc lập:

### Tab 1: Direct API (LLM Integration)
* **Provider:** Select (`Google Gemini`, `Anthropic`, `OpenAI`, `DeepSeek`, `Ollama / Local BaseURL`).
* **API Key:** Input masked có tính năng Test Connection.
* **Model ID:** Dropdown chọn model hoặc tự nhập custom model name.
* **System Prompt Preset:** Khai báo persona và quy tắc viết spec cho Agent.

### Tab 2: CLI Agent Runner
* **Active CLI:** Select profile (`Claude Code`, `Aider`, `Custom Shell Script`).
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
        "args": ["--dangerously-skip-permissions"]
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
### 5.2. Tools cấp cho AI Agent (Vercel AI SDK Tools)

-   `list_specs()`: Trả về danh sách file `.md` trong thư mục `specsDir`.
-   `read_spec({ filename })`: Đọc toàn bộ nội dung file spec được chọn.
-   `propose_spec_update({ filename, newContent })`: Đẩy nội dung mới lên giao diện Diff Editor để người dùng duyệt (chưa ghi đè file).
-   `apply_spec_update({ filename, content })`: Ghi đè trực tiếp xuống disk khi người dùng bấm Approve.
-   `delete_spec({ filename })`: Xóa file spec khỏi thư mục local.
-   `trigger_nbl_sync({ filename })`: Gọi module đồng bộ file tương ứng lên NotebookLM.

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

## 7. Kế hoạch Triển khai (Checklist)

-   [ ] **Phase 1: Next.js Foundation & File I/O**
    
    -   Khởi tạo project `create-next-app` (App Router, Tailwind CSS).
    -   Viết API Route Handler đọc/ghi/xóa file `.md` từ thư mục local.
    -   Xây dựng layout theo wireframe: Sidebar, Workspace, Chatbox[cite: 1].
    -   Tích hợp `@monaco-editor/react` (cả Editor và DiffEditor).
-   [ ] **Phase 2: Settings Engine**
    
    -   Dựng UI Settings Dialog (Radix Dialog / shadcn) với 3 tab: API, CLI, NBL.
    -   Xây dựng API route đọc/ghi cấu hình vào file local `.spec-studio/config.json`.
-   [ ] **Phase 3: Agent Integration (API & CLI)**
    
    -   Tích hợp Vercel AI SDK (`useChat`) cho Direct API Mode kết hợp Function Calling.
    -   Xây dựng API Route chạy CLI qua `child_process.spawn`, stream stdout về giao diện chat.
    -   Kết nối luồng Diff Approval giữa Chatbox và Monaco DiffEditor.
-   [ ] **Phase 4: NotebookLM Sync Engine**
    
    -   Xây dựng module đồng bộ qua Google Drive API v3.
    -   Xây dựng fallback sync bằng reverse-engineered RPC script.