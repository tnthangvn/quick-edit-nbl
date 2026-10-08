# ChatMessage

Một mục trong luồng chat.

- `user`: bong bóng `color-muted`, căn phải.
- `assistant`: avatar `bot` trên `color-primary-soft`, chữ thường.
- `tool`: một dòng `font-mono` tên tool + `StatusBadge` (ví dụ `propose_spec_update` → "Chờ duyệt").
- `log`: khối stdout của CLI Agent, `font-mono` 12/18, nền `color-editor`, `streaming` hiện spinner.
