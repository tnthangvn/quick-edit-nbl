# Workbench

Toàn bộ màn hình theo wireframe: Header, Sidebar, Workspace (Editor hoặc Diff), Chat log, Quick Setting Toolbar, Composer.

Grid: cột `size-sidebar` + 1fr, hàng `size-header` + 1fr. Workspace chuyển sang DiffView khi có đề xuất; Approve/Reject đưa về EditorPane. Dùng làm bản tham chiếu bố cục, không phải component để tái dùng nguyên khối.
