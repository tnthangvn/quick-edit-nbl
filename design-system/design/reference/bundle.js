/* @ds-bundle: {"format":4,"namespace":"SpecStudio","components":[{"name":"Icon"},{"name":"Button"},{"name":"IconButton"},{"name":"Kbd"},{"name":"StatusBadge"},{"name":"Checkbox"},{"name":"SpecListItem"},{"name":"ContextMenu"},{"name":"SpecSidebar"},{"name":"AppHeader"},{"name":"ModeSwitch"},{"name":"Select"},{"name":"Input"},{"name":"Field"},{"name":"Switch"},{"name":"Tabs"},{"name":"ChatToolbar"},{"name":"Composer"},{"name":"ChatMessage"},{"name":"EditorPane"},{"name":"DiffReviewBar"},{"name":"DiffView"},{"name":"Toast"},{"name":"SettingsDialog"},{"name":"Workbench"}]} */
(function () {
  "use strict";
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;
  var useRef = React.useRef;
  var useEffect = React.useEffect;
  var ICONS = {"settings": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/>", "panel-left": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/> <path d=\"M9 3v18\"/>", "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\"/> <circle cx=\"19\" cy=\"12\" r=\"1\"/> <circle cx=\"5\" cy=\"12\" r=\"1\"/>", "send-horizontal": "<path d=\"M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z\"/> <path d=\"M6 12h16\"/>", "check": "<path d=\"M20 6 9 17l-5-5\"/>", "x": "<path d=\"M18 6 6 18\"/> <path d=\"m6 6 12 12\"/>", "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/> <path d=\"M21 3v5h-5\"/> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/> <path d=\"M8 16H3v5\"/>", "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/> <path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/> <path d=\"M10 9H8\"/> <path d=\"M16 13H8\"/> <path d=\"M16 17H8\"/>", "terminal": "<polyline points=\"4 17 10 11 4 5\"/> <line x1=\"12\" x2=\"20\" y1=\"19\" y2=\"19\"/>", "key-round": "<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"/> <circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>", "loader-circle": "<path d=\"M21 12a9 9 0 1 1-6.219-8.56\"/>", "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"/> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"/>", "trash-2": "<path d=\"M3 6h18\"/> <path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\"/> <path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\"/> <line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\"/> <line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\"/>", "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/> <path d=\"m15 5 4 4\"/>", "plus": "<path d=\"M5 12h14\"/> <path d=\"M12 5v14\"/>", "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>", "bot": "<path d=\"M12 8V4H8\"/> <rect width=\"16\" height=\"12\" x=\"4\" y=\"8\" rx=\"2\"/> <path d=\"M2 14h2\"/> <path d=\"M20 14h2\"/> <path d=\"M15 13v2\"/> <path d=\"M9 13v2\"/>", "cloud-upload": "<path d=\"M12 13v8\"/> <path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\"/> <path d=\"m8 17 4-4 4 4\"/>", "git-compare": "<circle cx=\"18\" cy=\"18\" r=\"3\"/> <circle cx=\"6\" cy=\"6\" r=\"3\"/> <path d=\"M13 6h3a2 2 0 0 1 2 2v7\"/> <path d=\"M11 18H8a2 2 0 0 1-2-2V9\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/> <path d=\"m21 21-4.3-4.3\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M12 16v-4\"/> <path d=\"M12 8h.01\"/>", "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/> <path d=\"M12 9v4\"/> <path d=\"M12 17h.01\"/>"};

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(" ");
  }
  function rest(props, keys) {
    var o = {};
    for (var k in props) if (keys.indexOf(k) < 0) o[k] = props[k];
    return o;
  }

  /* ---------- Icon ---------- */
  function Icon(p) {
    var size = p.size || 16;
    return h("svg", {
      className: cx("ss-icon", p.spin && "ss-spin", p.className), "data-icon": p.name,
      width: size, height: size, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: p.strokeWidth || 2,
      strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: ICONS[p.name] || "" }
    });
  }

  /* ---------- Button ---------- */
  function Button(p) {
    var variant = p.variant || "secondary";
    var size = p.size || "md";
    var o = rest(p, ["variant", "size", "icon", "iconRight", "className", "children", "loading", "success"]);
    return h("button", Object.assign({ type: "button" }, o, {
      className: cx("ss-btn", "ss-btn--" + variant, "ss-btn--" + size, p.loading && "is-loading", p.success && "is-success", p.className), "aria-busy": p.loading || undefined,
      disabled: p.disabled || p.loading
    }),
      p.loading ? h(Icon, { name: "loader-circle", spin: true, key: "l" }) : p.success ? h(Icon, { name: "check", className: "ss-pop", key: "s" }) : (p.icon ? h(Icon, { name: p.icon, key: "i" }) : null),
      p.children != null ? h("span", null, p.children) : null,
      p.iconRight ? h(Icon, { name: p.iconRight }) : null
    );
  }

  function IconButton(p) {
    var o = rest(p, ["icon", "label", "active", "size", "className"]);
    return h("button", Object.assign({ type: "button" }, o, {
      className: cx("ss-iconbtn", p.size === "sm" && "ss-iconbtn--sm", p.active && "is-active", p.className),
      "aria-label": p.label, title: p.label, "aria-pressed": p.active == null ? undefined : !!p.active
    }), h(Icon, { name: p.icon }));
  }

  function Kbd(p) {
    return h("kbd", { className: "ss-kbd" }, p.children);
  }

  /* ---------- StatusBadge ---------- */
  var STATUS = {
    synced: { label: "Synced", icon: "check" },
    unsaved: { label: "Unsaved", icon: null },
    syncing: { label: "Syncing…", icon: "loader-circle" },
    error: { label: "Error", icon: "circle-alert" }
  };
  function StatusBadge(p) {
    var s = STATUS[p.status] || STATUS.synced;
    var label = p.label || s.label;
    var glyph = s.icon ? h(Icon, { name: s.icon, size: 12, spin: p.status === "syncing", strokeWidth: 2.5 }) : h("span", { className: "ss-dot" });
    if (p.compact) {
      return h("span", { className: cx("ss-status ss-status--compact", "ss-status--" + p.status), title: label, role: "img", "aria-label": label }, glyph);
    }
    return h("span", { className: cx("ss-status", "ss-status--" + p.status) }, glyph, h("span", null, label));
  }

  /* ---------- Checkbox ---------- */
  function Checkbox(p) {
    var ref = useRef(null);
    useEffect(function () { if (ref.current) ref.current.indeterminate = !!p.indeterminate && !p.checked; }, [p.indeterminate, p.checked]);
    var state = p.checked ? "checked" : p.indeterminate ? "mixed" : "off";
    return h("label", { className: cx("ss-check", p.disabled && "is-disabled", p.className), "data-state": state, onClick: function (e) { e.stopPropagation(); } },
      h("input", { ref: ref, type: "checkbox", checked: !!p.checked, disabled: p.disabled, onChange: function (e) { p.onChange && p.onChange(e.target.checked); }, "aria-label": p.children ? undefined : p.label }),
      h("span", { className: "ss-check__box", "aria-hidden": "true" },
        h("svg", { viewBox: "0 0 16 16", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
          state === "mixed"
            ? h("path", { className: "ss-check__mark", d: "M4.5 8h7", pathLength: 1 })
            : h("path", { className: "ss-check__mark", d: "M4 8.25 6.75 11 12 5.5", pathLength: 1 }))),
      p.children ? h("span", { className: "ss-check__label" }, p.children) : null);
  }

  /* ---------- SpecListItem ---------- */
  function SpecListItem(p) {
    return h("div", {
      className: cx("ss-spec", p.selected && "is-selected", p.checked && "is-checked"),
      role: "option", "aria-selected": !!p.selected, tabIndex: 0,
      onClick: function () { p.onSelect && p.onSelect(p.name); },
      onKeyDown: function (e) { if (e.key === "Enter") p.onSelect && p.onSelect(p.name); }
    },
      h(Checkbox, { checked: p.checked, onChange: function (v) { p.onCheck && p.onCheck(p.name, v); }, label: "Đính kèm " + p.name + " vào context" }),
      h(Icon, { name: "file-text", className: "ss-spec__icon" }),
      h("span", { className: "ss-spec__name" }, p.name),
      h(StatusBadge, { status: p.status || "synced", compact: true }),
      h(IconButton, { icon: "ellipsis", label: "Thao tác với " + p.name, size: "sm", className: "ss-spec__menu", onClick: function (e) { e.stopPropagation(); p.onMenu && p.onMenu(p.name, e); } })
    );
  }

  /* ---------- ContextMenu ---------- */
  var DEFAULT_MENU = [
    { id: "rename", label: "Rename", icon: "pencil", shortcut: "F2" },
    { id: "sync", label: "Force Sync lên NotebookLM", icon: "cloud-upload" },
    { divider: true },
    { id: "delete", label: "Delete spec", icon: "trash-2", tone: "destructive", shortcut: "⌫" }
  ];
  function ContextMenu(p) {
    var items = p.items || DEFAULT_MENU;
    return h("div", { className: cx("ss-menu", p.className), role: "menu", style: p.style },
      items.map(function (it, i) {
        if (it.divider) return h("div", { key: i, className: "ss-menu__sep", role: "separator" });
        return h("button", {
          key: it.id || i, type: "button", role: "menuitem",
          className: cx("ss-menu__item", it.tone === "destructive" && "is-destructive"),
          onClick: function () { p.onSelect && p.onSelect(it.id); }
        }, it.icon ? h(Icon, { name: it.icon }) : h("span", { className: "ss-icon" }), h("span", null, it.label), it.shortcut ? h("span", { className: "ss-menu__kbd" }, it.shortcut) : null);
      })
    );
  }

  /* ---------- SpecSidebar ---------- */
  function SpecSidebar(p) {
    var specs = p.specs || [];
    var checkedCount = specs.filter(function (s) { return s.checked; }).length;
    if (p.collapsed) {
      return h("aside", { className: "ss-sidebar is-collapsed" },
        h(IconButton, { icon: "panel-left", label: "Mở sidebar", onClick: p.onToggle }),
        h(IconButton, { icon: "file-text", label: specs.length + " spec" }));
    }
    return h("aside", { className: "ss-sidebar" },
      h("div", { className: "ss-sidebar__head" },
        p.onCheckAll ? h(Checkbox, { checked: specs.length > 0 && checkedCount === specs.length, indeterminate: checkedCount > 0 && checkedCount < specs.length, onChange: p.onCheckAll, label: "Chọn tất cả spec" }) : null,
        h("span", { className: "ss-overline" }, "Specs"),
        h("span", { className: "ss-sidebar__count" }, checkedCount ? checkedCount + " trong context" : specs.length + " file"),
        h("span", { style: { flex: 1 } }),
        h(IconButton, { icon: "plus", label: "Spec mới", size: "sm", onClick: p.onCreate }),
        h(IconButton, { icon: "panel-left", label: "Thu gọn sidebar", size: "sm", onClick: p.onToggle })),
      h("div", { className: "ss-sidebar__list", role: "listbox", "aria-label": "Danh sách spec" },
        specs.map(function (s) {
          return h(SpecListItem, Object.assign({ key: s.name }, s, {
            selected: s.name === p.selected,
            onSelect: p.onSelect, onCheck: p.onCheck, onMenu: p.onMenu
          }));
        })),
      p.footer ? h("div", { className: "ss-sidebar__foot" }, p.footer) : null
    );
  }

  /* ---------- AppHeader ---------- */
  function AppHeader(p) {
    return h("header", { className: "ss-header" },
      p.onToggleSidebar ? h(IconButton, { icon: "panel-left", label: "Bật/tắt sidebar", onClick: p.onToggleSidebar }) : null,
      h("span", { className: "ss-header__mark", "aria-hidden": "true" }, "§"),
      h("span", { className: "ss-header__name" }, p.title || "Spec Studio"),
      p.path ? h("span", { className: "ss-header__path" }, p.path) : null,
      h("span", { style: { flex: 1 } }),
      p.children,
      h(IconButton, { icon: "settings", label: "Settings", onClick: p.onSettings })
    );
  }

  /* ---------- ModeSwitch ---------- */
  function ModeSwitch(p) {
    var value = p.value || "api";
    var opts = [{ id: "api", label: "API Key", icon: "key-round" }, { id: "cli", label: "CLI Agent", icon: "terminal" }];
    return h("div", { className: "ss-seg", role: "radiogroup", "aria-label": "Chế độ Agent" },
      opts.map(function (o) {
        return h("button", {
          key: o.id, type: "button", role: "radio", "aria-checked": value === o.id,
          className: cx("ss-seg__opt", value === o.id && "is-on"),
          onClick: function () { p.onChange && p.onChange(o.id); }
        }, h(Icon, { name: o.icon, size: 14 }), o.label);
      }));
  }

  /* ---------- Select ---------- */
  var selectSeq = 0;
  function normOpt(op) {
    return typeof op === "string" ? { value: op, label: op } : op;
  }
  function Select(p) {
    var options = (p.options || []).map(normOpt);
    var threshold = p.searchThreshold || 8;
    var searchable = p.searchable === true || (p.searchable !== false && options.length >= threshold) || !!p.allowCustom;
    var multi = !!p.multiple;
    var vSt = useState(p.defaultValue != null ? p.defaultValue : (multi ? [] : (options[0] && options[0].value)));
    var value = p.value != null ? p.value : vSt[0];
    var values = multi ? (value || []) : [];
    function isSel(v) { return multi ? values.indexOf(v) >= 0 : v === value; }
    function labelOf(v) { var o = options.filter(function (x) { return x.value === v; })[0]; return o ? o.label : v; }
    var openSt = useState(!!p.defaultOpen); var open = openSt[0];
    var qSt = useState(""); var q = qSt[0];
    var actSt = useState(0); var act = actSt[0];
    var rootRef = useRef(null), searchRef = useRef(null), listRef = useRef(null);
    var idRef = useRef(null); if (!idRef.current) idRef.current = "ss-sel-" + (++selectSeq);
    var id = idRef.current;

    var ql = q.trim().toLowerCase();
    var shown = ql ? options.filter(function (o) { return (o.label + " " + o.value + " " + (o.hint || "")).toLowerCase().indexOf(ql) >= 0; }) : options;
    var custom = p.allowCustom && ql && !options.some(function (o) { return o.value.toLowerCase() === ql; });
    var total = shown.length + (custom ? 1 : 0);
    var current = options.filter(function (o) { return o.value === value; })[0];

    function setOpen(v) { openSt[1](v); if (!v) { qSt[1](""); } }
    function commit(v) { if (p.value == null) vSt[1](v); p.onChange && p.onChange(v); }
    function choose(v) {
      if (!multi) { commit(v); setOpen(false); return; }
      commit(isSel(v) ? values.filter(function (x) { return x !== v; }) : values.concat([v]));
      if (q) qSt[1]("");
    }
    function setAll(on) {
      var vis = shown.map(function (o) { return o.value; });
      commit(on ? values.concat(vis.filter(function (v) { return values.indexOf(v) < 0; })) : values.filter(function (v) { return vis.indexOf(v) < 0; }));
    }
    useEffect(function () {
      if (!open) return;
      var i = shown.findIndex(function (o) { return isSel(o.value); });
      actSt[1](i >= 0 ? i : 0);
      if (searchRef.current) searchRef.current.focus();
      function out(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); }
      document.addEventListener("mousedown", out);
      return function () { document.removeEventListener("mousedown", out); };
    }, [open]);
    useEffect(function () { actSt[1](0); }, [q]);
    useEffect(function () {
      var el = listRef.current && listRef.current.querySelector("[data-active='true']");
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }, [act, open]);

    function onKey(e) {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
      else if (e.key === "ArrowDown") { e.preventDefault(); actSt[1](Math.min(act + 1, total - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); actSt[1](Math.max(act - 1, 0)); }
      else if (e.key === "Backspace" && multi && !q && values.length) { commit(values.slice(0, -1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (act < shown.length) choose(shown[act].value); else if (custom) choose(q.trim());
      }
    }

    function renderTags() {
      if (!values.length) return h("span", { className: "ss-select__value is-placeholder" }, p.placeholder || "Chọn…");
      var max = p.maxTags != null ? p.maxTags : 2;
      var vis = values.slice(0, max), more = values.length - vis.length;
      return h("span", { className: "ss-select__tags" },
        vis.map(function (v) {
          return h("span", { key: v, className: "ss-tag" }, h("span", { className: "ss-tag__text" }, labelOf(v)),
            h("span", {
              className: "ss-tag__x", role: "button", tabIndex: -1, "aria-label": "Bỏ " + labelOf(v),
              onMouseDown: function (e) { e.preventDefault(); e.stopPropagation(); },
              onClick: function (e) { e.stopPropagation(); commit(values.filter(function (x) { return x !== v; })); }
            }, h(Icon, { name: "x", size: 12, strokeWidth: 2.5 })));
        }),
        more > 0 ? h("span", { className: "ss-tag ss-tag--more", title: values.slice(max).map(labelOf).join(", ") }, "+" + more) : null);
    }

    var lastGroup = null;
    var items = [];
    shown.forEach(function (o, i) {
      if (o.group && o.group !== lastGroup) { lastGroup = o.group; items.push(h("div", { key: "g-" + o.group, className: "ss-dd__group", role: "presentation" }, o.group)); }
      var sel = isSel(o.value);
      items.push(h("div", {
        key: o.value, id: id + "-o" + i, role: "option", "aria-selected": sel, "data-active": i === act,
        className: cx("ss-dd__opt", sel && "is-selected", i === act && "is-active"),
        onMouseEnter: function () { actSt[1](i); },
        onMouseDown: function (e) { e.preventDefault(); },
        onClick: function () { choose(o.value); }
      },
        multi
          ? h("span", { className: "ss-check", "data-state": sel ? "checked" : "off", "aria-hidden": "true" }, h("span", { className: "ss-check__box" }, h("svg", { viewBox: "0 0 16 16", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, h("path", { className: "ss-check__mark", d: "M4 8.25 6.75 11 12 5.5", pathLength: 1 }))))
          : h("span", { className: "ss-dd__check" }, sel ? h(Icon, { name: "check", size: 14 }) : null),
        h("span", { className: "ss-dd__label" }, o.label),
        o.hint ? h("span", { className: "ss-dd__hint" }, o.hint) : null));
    });
    if (custom) {
      items.push(h("div", {
        key: "__custom", id: id + "-o" + shown.length, role: "option", "aria-selected": false, "data-active": act === shown.length,
        className: cx("ss-dd__opt ss-dd__opt--custom", act === shown.length && "is-active"),
        onMouseEnter: function () { actSt[1](shown.length); },
        onMouseDown: function (e) { e.preventDefault(); },
        onClick: function () { choose(q.trim()); }
      }, h("span", { className: "ss-dd__check" }, h(Icon, { name: "plus", size: 14 })), h("span", { className: "ss-dd__label" }, "Dùng “", h("b", null, q.trim()), "”")));
    }
    if (!total) items.push(h("div", { key: "__empty", className: "ss-dd__empty" }, "Không tìm thấy “" + q.trim() + "”"));

    return h("div", {
      ref: rootRef,
      className: cx("ss-select", p.size === "sm" && "ss-select--sm", p.mono && "is-mono", multi && "is-multi", open && "is-open", p.className),
      style: p.width ? { width: p.width } : undefined,
      onKeyDown: onKey
    },
      h("button", {
        type: "button", className: "ss-select__trigger", disabled: p.disabled,
        "aria-haspopup": "listbox", "aria-expanded": open, "aria-controls": id + "-list", "aria-label": p["aria-label"],
        onClick: function () { setOpen(!open); }
      },
        multi ? renderTags() : h("span", { className: cx("ss-select__value", !current && !value && "is-placeholder") }, current ? current.label : (value || p.placeholder || "Chọn…")),
        h(Icon, { name: "chevron-down", size: 14 })),
      open ? h("div", { className: cx("ss-dd", p.align === "end" && "ss-dd--end", p.side === "top" && "ss-dd--top") },
        searchable ? h("div", { className: "ss-dd__search" },
          h(Icon, { name: "search", size: 14 }),
          h("input", {
            ref: searchRef, value: q, placeholder: p.searchPlaceholder || (p.allowCustom ? "Tìm hoặc nhập tên tuỳ chỉnh…" : "Tìm…"),
            role: "combobox", "aria-expanded": true, "aria-controls": id + "-list", "aria-activedescendant": total ? id + "-o" + act : undefined,
            onChange: function (e) { qSt[1](e.target.value); }
          }),
          q ? h("span", { className: "ss-dd__count" }, shown.length + "/" + options.length) : null) : null,
        h("div", { ref: listRef, id: id + "-list", className: "ss-dd__list", role: "listbox", "aria-multiselectable": multi || undefined, tabIndex: searchable ? -1 : 0 }, items),
        multi ? h("div", { className: "ss-dd__foot" },
          h("span", { className: "ss-dd__count" }, values.length + " đã chọn"),
          h("span", { style: { flex: 1 } }),
          h("button", { type: "button", className: "ss-dd__link", onMouseDown: function (e) { e.preventDefault(); }, onClick: function () { setAll(false); }, disabled: !values.length }, "Bỏ chọn"),
          h("button", { type: "button", className: "ss-dd__link", onMouseDown: function (e) { e.preventDefault(); }, onClick: function () { setAll(true); }, disabled: !shown.length }, q ? "Chọn kết quả" : "Chọn tất cả")) : null) : null);
  }

  /* ---------- Input ---------- */
  function Input(p) {
    var o = rest(p, ["className", "mono", "invalid"]);
    return h("input", Object.assign({ type: "text" }, o, {
      className: cx("ss-input", p.mono && "is-mono", p.invalid && "is-invalid", p.className),
      "aria-invalid": p.invalid || undefined
    }));
  }

  /* ---------- Field ---------- */
  function Field(p) {
    return h("div", { className: cx("ss-field", p.inline && "ss-field--inline") },
      h("div", { className: "ss-field__text" },
        h("label", { className: "ss-field__label", htmlFor: p.htmlFor }, p.label),
        p.hint ? h("p", { className: "ss-field__hint" }, p.hint) : null,
        p.error ? h("p", { className: "ss-field__error" }, h(Icon, { name: "circle-alert", size: 12 }), p.error) : null),
      h("div", { className: "ss-field__control" }, p.children));
  }

  /* ---------- Switch ---------- */
  function Switch(p) {
    return h("button", {
      type: "button", role: "switch", "aria-checked": !!p.checked, "aria-label": p.label,
      className: cx("ss-switch", p.checked && "is-on"),
      onClick: function () { p.onChange && p.onChange(!p.checked); }
    }, h("span", { className: "ss-switch__thumb" }));
  }

  /* ---------- Tabs ---------- */
  function Tabs(p) {
    return h("div", { className: cx("ss-tabs", p.variant === "pill" && "ss-tabs--pill"), role: "tablist" },
      (p.tabs || []).map(function (t) {
        return h("button", {
          key: t.id, type: "button", role: "tab", "aria-selected": p.value === t.id,
          className: cx("ss-tab", p.value === t.id && "is-on"),
          onClick: function () { p.onChange && p.onChange(t.id); }
        }, t.icon ? h(Icon, { name: t.icon, size: 14 }) : null, t.label);
      }));
  }

  /* ---------- ChatToolbar ---------- */
  var API_MODELS = [
    { value: "gemini-1.5-pro", label: "gemini-1.5-pro", group: "Google Gemini" },
    { value: "gemini-1.5-flash", label: "gemini-1.5-flash", group: "Google Gemini" },
    { value: "gemini-2.0-flash", label: "gemini-2.0-flash", group: "Google Gemini" },
    { value: "claude-sonnet-4", label: "claude-sonnet-4", group: "Anthropic" },
    { value: "claude-opus-4", label: "claude-opus-4", group: "Anthropic" },
    { value: "claude-haiku-3.5", label: "claude-haiku-3.5", group: "Anthropic" },
    { value: "gpt-4o", label: "gpt-4o", group: "OpenAI" },
    { value: "gpt-4o-mini", label: "gpt-4o-mini", group: "OpenAI" },
    { value: "o3-mini", label: "o3-mini", group: "OpenAI" },
    { value: "deepseek-chat", label: "deepseek-chat", group: "DeepSeek" },
    { value: "deepseek-reasoner", label: "deepseek-reasoner", group: "DeepSeek" },
    { value: "llama3.1:8b", label: "llama3.1:8b", group: "Ollama / Local", hint: "localhost:11434" },
    { value: "qwen2.5-coder:7b", label: "qwen2.5-coder:7b", group: "Ollama / Local", hint: "localhost:11434" }
  ];
  var CLI_PROFILES = [{ value: "claude-code", label: "Claude Code" }, { value: "aider", label: "Aider" }, { value: "custom", label: "Custom Shell Script" }];
  function ChatToolbar(p) {
    var mode = p.mode || "api";
    var options = p.options || (mode === "api" ? API_MODELS : CLI_PROFILES);
    return h("div", { className: "ss-toolbar" },
      h(ModeSwitch, { value: mode, onChange: p.onModeChange }),
      h(Select, { size: "sm", mono: true, width: 200, side: "top", value: p.model, options: options, onChange: p.onModelChange, allowCustom: mode === "api", "aria-label": mode === "api" ? "Model" : "CLI profile" }),
      h("span", { style: { flex: 1 } }),
      p.contextCount ? h("span", { className: "ss-toolbar__ctx" }, h(Icon, { name: "file-text", size: 14 }), p.contextCount + " spec trong context") : null,
      h(IconButton, { icon: "settings", size: "sm", label: mode === "api" ? "Cấu hình Direct API" : "Cấu hình CLI Agent", onClick: p.onSettings })
    );
  }

  /* ---------- Composer ---------- */
  function Composer(p) {
    var ref = useRef(null);
    var st = useState(p.defaultValue || "");
    var value = p.value != null ? p.value : st[0];
    function set(v) { if (p.value == null) st[1](v); p.onChange && p.onChange(v); }
    useEffect(function () {
      var el = ref.current; if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }, [value]);
    function send() { if (!value.trim() || p.busy) return; p.onSend && p.onSend(value); set(""); }
    return h("div", { className: cx("ss-composer", p.busy && "is-busy") },
      h("textarea", {
        ref: ref, rows: 1, value: value, placeholder: p.placeholder || "Yêu cầu Agent sửa spec…",
        onChange: function (e) { set(e.target.value); },
        onKeyDown: function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }
      }),
      h("div", { className: "ss-composer__bar" },
        h("span", { className: "ss-composer__hint" }, h(Kbd, null, "⌘"), h(Kbd, null, "Enter"), " để gửi"),
        h("span", { style: { flex: 1 } }),
        p.busy
          ? h(Button, { variant: "secondary", size: "sm", icon: "x", onClick: p.onStop }, "Dừng")
          : h(Button, { variant: "primary", size: "sm", icon: "send-horizontal", disabled: !value.trim(), onClick: send }, "Send"))
    );
  }

  /* ---------- ChatMessage ---------- */
  function ChatMessage(p) {
    var role = p.role || "assistant";
    if (role === "log") {
      return h("div", { className: "ss-msg ss-msg--log" },
        h("div", { className: "ss-msg__loghead" }, h(Icon, { name: "terminal", size: 14 }), h("span", null, p.title || "stdout"), p.streaming ? h(Icon, { name: "loader-circle", size: 12, spin: true }) : null),
        h("pre", { className: "ss-msg__log" }, p.children));
    }
    if (role === "tool") {
      return h("div", { className: "ss-msg ss-msg--tool" },
        h(Icon, { name: p.icon || "git-compare", size: 14 }),
        h("code", null, p.title),
        p.children ? h("span", { className: "ss-msg__toolnote" }, p.children) : null,
        p.status ? h(StatusBadge, { status: p.status, label: p.statusLabel }) : null);
    }
    return h("div", { className: cx("ss-msg", "ss-msg--" + role) },
      role === "assistant" ? h("span", { className: "ss-msg__avatar", "aria-hidden": "true" }, h(Icon, { name: "bot", size: 14 })) : null,
      h("div", { className: "ss-msg__body" }, p.children));
  }

  /* ---------- Markdown line tint (mock of the Monaco markdown theme) ---------- */
  function mdLine(text) {
    if (/^#{1,6}\s/.test(text)) return h("span", { className: "tk-h" }, text);
    var m = /^(\s*)([-*]|\d+\.)(\s.*)$/.exec(text);
    var parts = [];
    var body = text, lead = null;
    if (m) { lead = [m[1], h("span", { key: "b", className: "tk-li" }, m[2])]; body = m[3]; }
    var re = /(`[^`]+`|\*\*[^*]+\*\*)/g, last = 0, r, k = 0;
    while ((r = re.exec(body))) {
      if (r.index > last) parts.push(body.slice(last, r.index));
      parts.push(h("span", { key: k++, className: r[0][0] === "`" ? "tk-code" : "tk-b" }, r[0]));
      last = r.index + r[0].length;
    }
    parts.push(body.slice(last));
    return lead ? [lead[0], lead[1]].concat(parts) : parts;
  }

  /* ---------- EditorPane ---------- */
  function EditorPane(p) {
    var lines = p.lines || [];
    return h("section", { className: "ss-editor" },
      h("div", { className: "ss-editor__tabbar" },
        h("div", { className: "ss-editor__tab is-on" }, h(Icon, { name: "file-text", size: 14 }), h("span", null, p.filename || "untitled.md"), p.status === "unsaved" ? h("span", { className: "ss-dot ss-dot--primary", title: "Unsaved" }) : null),
        h("span", { style: { flex: 1 } }),
        p.status ? h(StatusBadge, { status: p.status }) : null,
        p.actions),
      h("div", { className: "ss-editor__body", role: "textbox", "aria-readonly": "true", "aria-label": "Monaco Editor (mô phỏng)" },
        lines.map(function (t, i) {
          return h("div", { key: i, className: cx("ss-line", p.cursorLine === i + 1 && "is-cursor") },
            h("span", { className: "ss-line__no" }, i + 1),
            h("span", { className: "ss-line__text" }, mdLine(t)));
        }))
    );
  }

  /* ---------- DiffReviewBar ---------- */
  function DiffReviewBar(p) {
    return h("div", { className: "ss-diffbar", role: "toolbar", "aria-label": "Duyệt thay đổi của Agent" },
      h(Icon, { name: "git-compare", size: 16 }),
      h("span", { className: "ss-diffbar__title" }, "Agent đề xuất sửa ", h("code", null, p.filename || "spec.md")),
      h("span", { className: "ss-diffbar__stat" }, h("span", { className: "is-add" }, "+" + (p.added || 0)), " ", h("span", { className: "is-del" }, "−" + (p.removed || 0))),
      h("span", { style: { flex: 1 } }),
      h(Button, { variant: "secondary", size: "sm", icon: "x", onClick: p.onReject }, "Reject"),
      h(Button, { variant: "primary", size: "sm", icon: "check", loading: p.saving, onClick: p.onApprove }, p.autoSync ? "Approve & Sync" : "Approve & Save"));
  }

  /* ---------- DiffView ---------- */
  function DiffView(p) {
    var rows = p.rows || [];
    var ln = 0, rn = 0;
    return h("section", { className: "ss-diff" },
      h(DiffReviewBar, { filename: p.filename, added: p.added, removed: p.removed, onApprove: p.onApprove, onReject: p.onReject, saving: p.saving, autoSync: p.autoSync }),
      h("div", { className: "ss-diff__heads" }, h("span", null, "Original"), h("span", null, "Proposed")),
      h("div", { className: "ss-diff__grid" },
        rows.map(function (r, i) {
          var kind = r.kind || "same";
          var hasL = r.left != null, hasR = r.right != null;
          if (hasL) ln++; if (hasR) rn++;
          var lk = kind === "same" ? "" : (hasL ? "is-del" : "is-empty");
          var rk = kind === "same" ? "" : (hasR ? "is-add" : "is-empty");
          return h(React.Fragment, { key: i },
            h("div", { className: cx("ss-dline", lk) }, h("span", { className: "ss-line__no" }, hasL ? ln : ""), h("span", { className: "ss-dline__sign" }, lk === "is-del" ? "−" : ""), h("span", { className: "ss-line__text" }, hasL ? (r.leftMark ? [r.left.slice(0, r.leftMark[0]), h("mark", { key: "m" }, r.left.slice(r.leftMark[0], r.leftMark[1])), r.left.slice(r.leftMark[1])] : r.left) : "")),
            h("div", { className: cx("ss-dline", rk) }, h("span", { className: "ss-line__no" }, hasR ? rn : ""), h("span", { className: "ss-dline__sign" }, rk === "is-add" ? "+" : ""), h("span", { className: "ss-line__text" }, hasR ? (r.rightMark ? [r.right.slice(0, r.rightMark[0]), h("mark", { key: "m" }, r.right.slice(r.rightMark[0], r.rightMark[1])), r.right.slice(r.rightMark[1])] : r.right) : "")));
        }))
    );
  }

  /* ---------- Toast ---------- */
  var TOAST_ICON = { info: "info", warning: "triangle-alert", error: "circle-alert" };
  function Toast(p) {
    var v = TOAST_ICON[p.variant] ? p.variant : "info";
    return h("div", {
      className: cx("ss-toast", "ss-toast--" + v, p.className),
      role: v === "error" ? "alert" : "status", "aria-live": v === "error" ? "assertive" : "polite"
    },
      h(Icon, { name: p.loading ? "loader-circle" : TOAST_ICON[v], spin: !!p.loading, className: "ss-toast__icon" }),
      h("div", { className: "ss-toast__text" },
        h("p", { className: "ss-toast__title" }, p.title),
        p.description ? h("p", { className: "ss-toast__desc" }, p.description) : null),
      p.action ? h(Button, { variant: "ghost", size: "sm", className: "ss-toast__action", onClick: p.action.onClick }, p.action.label) : null,
      p.onClose !== false ? h(IconButton, { icon: "x", size: "sm", label: "Đóng thông báo", className: "ss-toast__close", onClick: p.onClose }) : null);
  }

  /* ---------- SettingsDialog ---------- */
  function SettingsDialog(p) {
    var tabState = useState(p.tab || "api");
    var tab = tabState[0];
    var s = useState({ provider: "gemini", model: "gemini-1.5-pro", cli: "claude-code", stream: true, strategy: "drive_sync", autoSync: false, confirm: true });
    var v = s[0];
    function set(k) { return function (x) { var n = Object.assign({}, v); n[k] = x; s[1](n); }; }
    var body;
    if (tab === "api") {
      body = [
        h(Field, { key: 1, label: "Provider" }, h(Select, { value: v.provider, onChange: set("provider"), options: [{ value: "gemini", label: "Google Gemini" }, { value: "anthropic", label: "Anthropic" }, { value: "openai", label: "OpenAI" }, { value: "deepseek", label: "DeepSeek" }, { value: "ollama", label: "Ollama / Local BaseURL" }] })),
        h(Field, { key: 2, label: "API Key", hint: "Lưu trong .spec-studio/config.json trên máy, không gửi đi đâu khác." },
          h("div", { className: "ss-row" }, h(Input, { type: "password", mono: true, defaultValue: "AIzaSyD-example-key-0000", style: { flex: 1 } }), h(Button, { variant: "secondary", icon: "refresh-cw" }, "Test"))),
        h(Field, { key: 3, label: "Model ID", hint: "Chọn sẵn hoặc gõ tên model tuỳ chỉnh." }, h(Select, { mono: true, allowCustom: true, value: v.model, onChange: set("model"), options: API_MODELS })),
        h(Field, { key: 4, label: "System Prompt Preset" }, h("textarea", { className: "ss-input ss-textarea", rows: 3, defaultValue: "Bạn là technical writer. Giữ nguyên cấu trúc heading, chỉ sửa phần được yêu cầu." }))
      ];
    } else if (tab === "cli") {
      body = [
        h(Field, { key: 1, label: "Active CLI" }, h(Select, { value: v.cli, onChange: set("cli"), options: CLI_PROFILES })),
        h(Field, { key: 2, label: "Binary Path" }, h(Input, { mono: true, defaultValue: "/usr/local/bin/claude" })),
        h(Field, { key: 3, label: "Default Arguments" }, h(Input, { mono: true, defaultValue: "--dangerously-skip-permissions" })),
        h(Field, { key: 4, label: "Workspace Path", hint: "Thư mục gốc chứa các file .md." }, h(Input, { mono: true, defaultValue: "./specs" })),
        h(Field, { key: 5, inline: true, label: "Stream Stdout", hint: "Đẩy log tiến trình vào khung chat." }, h(Switch, { checked: v.stream, onChange: set("stream"), label: "Stream Stdout" }))
      ];
    } else {
      body = [
        h(Field, { key: 1, label: "Notebook ID" }, h(Input, { mono: true, defaultValue: "xxxx-xxxx-xxxx" })),
        h(Field, { key: 2, label: "Sync Strategy" }, h(Tabs, { variant: "pill", value: v.strategy, onChange: set("strategy"), tabs: [{ id: "drive_sync", label: "Google Drive Sync" }, { id: "rpc", label: "Direct Cookie RPC" }] })),
        v.strategy === "drive_sync"
          ? h(Field, { key: 3, label: "Drive Folder ID" }, h(Input, { mono: true, defaultValue: "yyyy-yyyy-yyyy" }))
          : h(Field, { key: 3, label: "Cookie (SID, HSID, SSID) + SNlM0e", hint: "Chỉ lưu local." }, h(Input, { type: "password", mono: true, defaultValue: "SID=…; HSID=…; SSID=…" })),
        h(Field, { key: 4, inline: true, label: "Tự động sync lên NBL sau khi Approve Diff" }, h(Switch, { checked: v.autoSync, onChange: set("autoSync"), label: "Tự động sync" })),
        h(Field, { key: 5, inline: true, label: "Hiện hộp thoại xác nhận trước khi sync" }, h(Switch, { checked: v.confirm, onChange: set("confirm"), label: "Xác nhận trước khi sync" }))
      ];
    }
    return h("div", { className: "ss-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Settings" },
      h("div", { className: "ss-dialog__head" }, h("h2", { className: "ss-dialog__title" }, "Settings"), h("span", { style: { flex: 1 } }), h(IconButton, { icon: "x", label: "Đóng", onClick: p.onClose })),
      h(Tabs, { value: tab, onChange: tabState[1], tabs: [{ id: "api", label: "Direct API", icon: "key-round" }, { id: "cli", label: "CLI Agent Runner", icon: "terminal" }, { id: "nbl", label: "NotebookLM Sync", icon: "cloud-upload" }] }),
      h("div", { className: "ss-dialog__body" }, body),
      h("div", { className: "ss-dialog__foot" }, h("span", { className: "ss-dialog__path" }, ".spec-studio/config.json"), h("span", { style: { flex: 1 } }), h(Button, { variant: "ghost", onClick: p.onClose }, "Cancel"), h(Button, { variant: "primary", onClick: p.onSave }, "Save")));
  }

  /* ---------- Workbench (page) ---------- */
  var DEMO_SPECS = [
    { name: "overview.md", status: "synced", checked: true },
    { name: "sidebar.md", status: "unsaved", checked: true },
    { name: "settings-dialog.md", status: "syncing" },
    { name: "nbl-sync.md", status: "error" },
    { name: "tool-calling.md", status: "synced" }
  ];
  var DEMO_LINES = [
    "## 3.2. Sidebar (Bên trái)",
    "",
    "* **Toggle Sidebar Icon:** Nút thu gọn / mở rộng sidebar.",
    "* **Danh sách file Spec:**",
    "  - *Click chọn xem:* Mở file trên Monaco Editor.",
    "  - *Checkbox:* Đính kèm spec vào context của Agent.",
    "* **Sync Status Badge:** `Synced`, `Unsaved`, `Syncing...`, `Error`."
  ];
  var DEMO_ROWS = [
    { kind: "same", left: "## 3.2. Sidebar (Bên trái)", right: "## 3.2. Sidebar (Bên trái)" },
    { kind: "same", left: "", right: "" },
    { kind: "change", left: "* **Toggle Sidebar Icon:** Nút thu gọn.", right: "* **Toggle Sidebar Icon:** Nút thu gọn / mở rộng sidebar.", rightMark: [38, 56] },
    { kind: "same", left: "* **Danh sách file Spec:**", right: "* **Danh sách file Spec:**" },
    { kind: "add", right: "  - *Kéo thả:* Sắp xếp lại thứ tự spec." },
    { kind: "remove", left: "* Badge trạng thái (TBD)" },
    { kind: "add", right: "* **Sync Status Badge:** `Synced`, `Unsaved`, `Syncing...`, `Error`." }
  ];
  function Workbench(p) {
    var specsSt = useState(p.specs || DEMO_SPECS);
    var selSt = useState(p.selected || "sidebar.md");
    var colSt = useState(false);
    var modeSt = useState("api");
    var modelSt = useState("gemini-1.5-pro");
    var diffSt = useState(p.diff != null ? p.diff : true);
    var specs = specsSt[0];
    function onCheck(name, v) { specsSt[1](specs.map(function (s) { return s.name === name ? Object.assign({}, s, { checked: v }) : s; })); }
    var count = specs.filter(function (s) { return s.checked; }).length;
    return h("div", { className: cx("ss-workbench", colSt[0] && "is-collapsed") },
      h(AppHeader, { path: "~/projects/quick-edit-nbl/specs" }),
      h(SpecSidebar, { specs: specs, selected: selSt[0], collapsed: colSt[0], onToggle: function () { colSt[1](!colSt[0]); }, onSelect: selSt[1], onCheck: onCheck, onCheckAll: function (v) { specsSt[1](specs.map(function (x) { return Object.assign({}, x, { checked: v }); })); } }),
      h("main", { className: "ss-workbench__main" },
        diffSt[0]
          ? h(DiffView, { filename: selSt[0], rows: DEMO_ROWS, added: 3, removed: 2, onApprove: function () { diffSt[1](false); }, onReject: function () { diffSt[1](false); } })
          : h(EditorPane, { filename: selSt[0], status: "unsaved", lines: DEMO_LINES, cursorLine: 3 }),
        h("div", { className: "ss-workbench__chat" },
          h("div", { className: "ss-workbench__log" },
            h(ChatMessage, { role: "user" }, "Bổ sung phần kéo thả và badge trạng thái cho sidebar.md"),
            h(ChatMessage, { role: "tool", title: "propose_spec_update(sidebar.md)", status: diffSt[0] ? "unsaved" : "synced", statusLabel: diffSt[0] ? "Chờ duyệt" : "Đã lưu" }),
            h(ChatMessage, { role: "assistant" }, "Mình đã đề xuất 3 dòng thêm và 2 dòng xoá. Kiểm tra diff ở trên rồi bấm Approve & Save.")),
          h(ChatToolbar, { mode: modeSt[0], model: modelSt[0], contextCount: count, onModeChange: function (m) { modeSt[1](m); modelSt[1](m === "api" ? "gemini-1.5-pro" : "claude-code"); }, onModelChange: modelSt[1] }),
          h(Composer, null)))
    );
  }

  window.SpecStudio = Object.assign(window.SpecStudio || {}, {
    Icon: Icon, Button: Button, IconButton: IconButton, Kbd: Kbd, StatusBadge: StatusBadge, Checkbox: Checkbox,
    SpecListItem: SpecListItem, ContextMenu: ContextMenu, SpecSidebar: SpecSidebar, AppHeader: AppHeader,
    ModeSwitch: ModeSwitch, Select: Select, Input: Input, Field: Field, Switch: Switch, Tabs: Tabs,
    ChatToolbar: ChatToolbar, Composer: Composer, ChatMessage: ChatMessage, EditorPane: EditorPane,
    DiffReviewBar: DiffReviewBar, DiffView: DiffView, Toast: Toast, SettingsDialog: SettingsDialog, Workbench: Workbench
  });
})();
