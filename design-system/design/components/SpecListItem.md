# SpecListItem

Một dòng file spec trong Sidebar: checkbox → icon file → tên → trạng thái → menu 3 chấm.

- Click dòng = mở file trên editor (`selected` → nền `color-sidebar-accent` + vạch `color-primary` bên trái).
- Checkbox = thêm vào context, độc lập với `selected`.
- Menu 3 chấm chỉ hiện khi hover / đang chọn / focus; mở `ContextMenu`.

Người dùng cung cấp: `name`, `status`, `checked`, `selected` và các callback `onSelect`, `onCheck`, `onMenu`.
