Spec Studio là workbench chạy local để sửa spec Markdown cùng AI Agent rồi đồng bộ lên NotebookLM. Giao diện như một IDE gọn gàng, chỉ dùng hai màu: **gray** cho mọi bề mặt, chữ và viền; **blue** (`color-primary`) cho thứ cần chú ý: hành động chính, file đang mở, thay đổi chưa lưu, chế độ đang bật. Đỏ chỉ xuất hiện khi có lỗi hoặc xoá; amber chỉ trong thông báo cảnh báo.

## Nội dung và giọng văn

- **Nhãn hành động giữ tiếng Anh như trong spec/wireframe**: `Approve & Save`, `Reject`, `Send`, `Force Sync`, `Delete spec`, `Settings`, `Synced`, `Unsaved`, `Syncing…`, `Error`. Nhãn field trong Settings cũng giữ tiếng Anh (`Provider`, `Binary Path`, `Notebook ID`).
- **Mô tả, gợi ý, thông báo, trả lời của Agent viết bằng tiếng Việt**, câu ngắn, xưng "bạn": "Chọn một hoặc nhiều spec để đính kèm vào context.", "Lưu trong .spec-studio/config.json trên máy, không gửi đi đâu khác."
- Nhãn nút là động từ, Title Case, tối đa 3 từ. Không dùng dấu chấm than, không emoji.
- Tên file, đường dẫn, model ID, tên tool, phím tắt luôn đặt trong `font-mono`: `sidebar.md`, `gemini-1.5-pro`, `propose_spec_update`.
- Số liệu diff viết `+3 −2` (dấu trừ là ký tự `−`).

## Màu

Hai theme `light` và `dark`, mỗi token là một biến `--color-*` (theo đúng quy ước `@theme` của Tailwind v4 và tên biến của shadcn/ui), nên class `bg-background`, `text-muted-foreground`, `border-input`, `ring-ring` dùng được ngay.

- **Gray, bề mặt**: `color-background` (gray-50) cho nền app; `color-card` (trắng) cho editor, chatbox, ô nhập; `color-popover` cho menu, dialog; `color-sidebar` (gray-100) cho Sidebar và Header; `color-muted` cho tab bar, toolbar, bong bóng chat của user.
- **Gray, chữ**: `color-foreground` (gray-900) trên mọi bề mặt; `color-muted-foreground` (gray-600) cho metadata, placeholder, icon nghỉ. Cả hai đạt ≥4.5:1 trên mọi bề mặt ở cả hai theme.
- **Gray, tương tác**: `color-secondary` cho Reject/Test; `color-accent` chỉ là nền hover.
- **Blue** (`color-primary`, #1d5fd6 light / #5b9df8 dark): màu thương hiệu duy nhất. Nút chính (Approve & Save, Send, Save; chữ `color-primary-foreground`), checkbox đã chọn, Switch bật, vạch file đang chọn, gạch tab đang mở, chấm Unsaved, spinner Syncing, dòng thêm trong diff, heading Markdown trong editor. Nền nhạt là `color-primary-soft` (badge, avatar Agent, nút `tonal`). Mỗi vùng chỉ một nút blue đặc.
- **Đỏ** (`color-destructive`): ngoài blue/gray, chỉ cho Delete spec, trạng thái Error và dòng bị xoá trong diff.
- **Feedback (toast, banner, inline alert)**: mỗi loại có bộ ba chữ/icon – nền – viền.
  - `info` = blue (`color-info` → `color-primary`, `color-info-soft`, `color-info-border`): kết quả bình thường, tiến trình.
  - `warning` = amber (`color-warning`, `color-warning-soft`, `color-warning-border`): cần để ý nhưng chưa hỏng. Amber chỉ xuất hiện ở đây, không dùng cho nút hay trạng thái spec.
  - `error` = đỏ (`color-error` → `color-destructive`, `color-error-soft`, `color-error-border`): thao tác thất bại.
  - Tiêu đề và icon mang màu của loại; mô tả dùng `color-muted-foreground`. Mọi cặp chữ/nền đạt ≥4.5:1 ở cả hai theme.
- **Trạng thái sync**: Synced = gray (`color-muted-foreground`, dấu ✓: yên, không cần nhìn), Unsaved = blue (chấm), Syncing = blue (spinner), Error = đỏ (vòng cảnh báo). Mỗi trạng thái có icon riêng; blue và đỏ phân biệt được cả với người mù màu đỏ–lục.
- **Viền**: `color-border` cho đường chia mảnh (trang trí). `color-input` cho viền control (ô nhập, select, checkbox, switch tắt), đạt ≥3:1.
- **Focus**: viền 2px liền `color-ring` (alias của `color-primary`), offset 1px, cho mọi control. Đạt ≥3:1 trên mọi bề mặt.

## Chữ

- `font-sans` = **Geist**, `font-mono` = **Geist Mono**, khớp `next/font/google` mặc định của `create-next-app`. Không có file font, tải từ Google Fonts.
- Thang chữ: `display` 40/44 (chỉ màn trống), `title` 18/24 (tiêu đề Dialog), `heading` 14/20 semibold, `body` 14/20, `label` 13/18 medium (tên file, nhãn nút, nhãn field), `caption` 12/16, `overline` 11/16 viết HOA giãn chữ (tiêu đề nhóm Sidebar).
- Code: `editor` 13/20 cho Monaco, `log` 12/18 cho stdout của CLI, `kbd` 11/16.
- Giao diện dày đặc: chữ thân mặc định là 13–14px, không dùng cỡ lớn hơn 18px trong app.

## Khoảng cách, bo góc, bóng

- Lưới 4px: `space-1` 4 → `space-12` 48; `space-1.5` (6px) là khe icon–chữ trong nút.
- Kích thước cố định: `size-header` 48, `size-sidebar` 264 (thu gọn `size-sidebar-collapsed` 48), `size-row` 32 cho item Sidebar/menu, `size-control` 32 / `size-control-sm` 28, `size-icon` 16.
- Bo góc: `radius-sm` 4 (checkbox, badge), `radius-md` 6 (nút, ô nhập, item), `radius-lg` 8 (card, popover, chatbox, editor), `radius-xl` 12 (dialog), `radius-full` (switch, segmented, chấm).
- Phân lớp bằng viền là chính. Bóng chỉ dùng cho thứ nổi trên nội dung: `shadow-popover` (menu), `shadow-dialog` (Settings), `shadow-float` (thanh Approve/Reject).

## Bố cục

Grid hai cột `size-sidebar` + 1fr, hai hàng `size-header` + 1fr. Workspace chiếm phần trên của cột phải (Editor hoặc DiffEditor). Bên dưới là log chat, rồi Quick Setting Toolbar, rồi Composer. Khi Agent gọi `propose_spec_update`, Workspace tự chuyển sang DiffView; Approve hoặc Reject đưa về Editor.

## Chuyển động

Ngắn, ease-out, không nảy. Chuyển động chỉ để xác nhận thao tác, không để trang trí.

- **Thời lượng**: `--duration-fast` 100ms (nhấn, hover item), `--duration-base` 150ms (màu nền, switch, dropdown, menu), `--duration-slow` 220ms (icon, toast, dialog). **Easing**: `--ease-out` = `cubic-bezier(0.2, 0, 0, 1)`; `--ease-in-out` cho thứ chạy hai chiều.
- **Nút**: hover đổi màu 150ms; nhấn lún `scale(.97)`; icon diễn động từ khi hover (Send tiến, Refresh quay, Upload nhấc, X xoay); trạng thái `loading` → `success` thay cho toast khi kết quả nằm ngay tại nút (xem Button).
- **Xuất hiện**: dropdown và menu hiện bằng mờ + trượt 4px + `scale(.98)`; toast trượt vào 16px từ phải; Settings Dialog như dropdown nhưng 220ms. Không animate khi biến mất, ẩn ngay.
- **Control**: checkbox hiện dấu ✓ bằng scale-in; switch trượt núm 150ms.
- **Spinner** `loader-circle` cho mọi trạng thái đang chạy.
- `prefers-reduced-motion`: mọi transition/animation rút còn 1ms, bỏ hiệu ứng lún; spinner vẫn quay chậm (1.6s/vòng) để báo đang chạy.
- Không dùng: shine, ripple, nảy lò xo, gradient chuyển động, parallax, animation lặp vô hạn ngoài spinner.

## Iconography

- **Lucide** (`lucide-react` trong app), stroke 2, 16px mặc định, 14px trong toolbar/tab, 12px trong badge. Màu theo chữ (`currentColor`), nghỉ là `color-muted-foreground`, đang bật là `color-primary`.
- Bộ icon dùng trong app nằm ở nhóm asset **Icons** (bản sao SVG từ lucide-static 0.460.0, giấy phép ISC).
- Dự án chưa có logo. Header đặt dấu `§` (chữ Geist Mono) trên ô `color-primary` (blue) cạnh chữ "Spec Studio". Đây là chữ, không phải logo; thay khi có logo thật.
- Không dùng emoji trong giao diện.

## Monaco Editor

Đăng ký một theme cho mỗi theme màu, đọc giá trị từ token:

| Monaco key | Token |
| --- | --- |
| `editor.background` | `color-editor` |
| `editor.foreground` | `color-foreground` |
| `editorLineNumber.foreground` | `color-editor-gutter` |
| `editorLineNumber.activeForeground` | `color-foreground` |
| `editor.lineHighlightBackground` | `color-editor-line` |
| `editor.selectionBackground` | `color-editor-selection` |
| `editorCursor.foreground` | `color-primary` |
| `diffEditor.insertedLineBackground` | `color-diff-added` |
| `diffEditor.insertedTextBackground` | `color-diff-added-text` |
| `diffEditor.removedLineBackground` | `color-diff-removed` |
| `diffEditor.removedTextBackground` | `color-diff-removed-text` |
| token `keyword.md` / heading | `color-primary`, bold |
| token `variable.md` / inline code | `color-muted-foreground` |

Font `font-mono`, `fontSize: 13`, `lineHeight: 20`, `renderSideBySide: true` cho DiffEditor. Base theme: `vs` cho light, `vs-dark` cho dark.

## Dùng trong code

Trong `app/globals.css` (Tailwind v4): `@import "tailwindcss";`, khai báo giá trị light của các token màu ngay trong `@theme { --color-background: #fbfaf7; … }` (Tailwind sinh class `bg-background`… từ đó), rồi ghi đè giá trị dark trong `.dark { --color-background: #141413; … }` (hoặc `[data-theme="dark"]`). Spacing, radius, size, font khai báo một lần trong `@theme`. Component trong app là shadcn/ui (Radix) mặc class Tailwind theo các token này; bundle ở đây là bản tham chiếu trực quan, cùng tên và cùng trạng thái.
