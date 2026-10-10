var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { reactive, ref, watch, computed, defineComponent, h, inject, openBlock, createElementBlock, normalizeStyle, Fragment, renderList, normalizeClass, createElementVNode, withModifiers, createTextVNode, toDisplayString, unref, createCommentVNode, createBlock, onMounted, nextTick, resolveDynamicComponent, withDirectives, withKeys, vModelText, vShow, mergeProps, toHandlers, onBeforeUnmount, vModelCheckbox, vModelSelect, vModelDynamic, resolveComponent, createVNode, useSlots, renderSlot, provide, isRef, createSlots, withCtx } from "vue";
function getValueByPath(obj, path) {
  if (!path)
    return void 0;
  if (obj == null)
    return void 0;
  if (!path.includes("."))
    return obj[path];
  let cur = obj;
  for (const p of path.split(".")) {
    if (cur == null)
      return void 0;
    cur = cur[p];
  }
  return cur;
}
function setValueByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== "object")
      return false;
    cur = cur[parts[i]];
  }
  if (cur == null || typeof cur !== "object")
    return false;
  cur[parts[parts.length - 1]] = value;
  return true;
}
function colIdOf(col) {
  if (!col)
    return "";
  return col.colId || col.field || "";
}
function collectLeaves(cols) {
  const out = [];
  const walk = (list) => {
    list.forEach((c) => {
      var _a;
      if ((_a = c.children) == null ? void 0 : _a.length)
        walk(c.children);
      else
        out.push(c);
    });
  };
  walk(cols);
  return out;
}
function formulaColumnContext(shown, declared, isHidden, pivot = false) {
  if (pivot)
    return shown;
  const known = new Set(shown.map(colIdOf));
  const extra = declared.filter((c) => {
    if (c.checkbox || c.rowDrag)
      return false;
    const id = colIdOf(c);
    return !known.has(id) && isHidden(id);
  });
  return extra.length ? [...shown, ...extra] : shown;
}
function resolveExportScope(scope, selCount) {
  if (!scope || scope === "auto")
    return selCount > 0 ? "selected" : "view";
  return scope;
}
function pickExportRows(scope, src, withGroups) {
  if (scope === "selected")
    return src.selected.slice();
  if (scope === "all")
    return src.source.slice();
  const out = [];
  src.display.forEach((d) => {
    if (d.type === "row")
      out.push(d.data);
    else if (withGroups && d.type === "group" && !d.isFooter)
      out.push(d.data);
  });
  return out;
}
let uidSeed = 0;
function uid(prefix = "rj") {
  return `${prefix}${++uidSeed}`;
}
function clampWidth(w, col) {
  const min = (col == null ? void 0 : col.minWidth) ?? 40;
  const max = (col == null ? void 0 : col.maxWidth) ?? 1e4;
  return Math.min(Math.max(Math.round(w), min), max);
}
const FULLWIDTH = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function textWidthUnits(s) {
  let u = 0;
  for (const ch of String(s == null ? "" : s))
    u += FULLWIDTH.test(ch) ? 2 : 1;
  return u;
}
function measureColWidth(title, texts, opt) {
  const unitW = 8;
  const padPx = 34;
  const min = 60;
  const max = 640;
  let maxU = textWidthUnits(title) || 4;
  for (const t of texts) {
    const w = textWidthUnits(t);
    if (w > maxU)
      maxU = w;
  }
  return Math.min(Math.max(maxU * unitW + padPx, min), max);
}
const thousands = (n, digits) => {
  var _a;
  const natural = ((_a = String(n).split(".")[1]) == null ? void 0 : _a.length) ?? 0;
  const d = Math.max(0, Math.min(digits ?? natural, 20));
  return n.toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });
};
const pad$1 = (n) => String(n).padStart(2, "0");
function formatDate(v, datetime) {
  if (v == null || v === "")
    return "";
  const d = v instanceof Date ? v : new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v);
  if (isNaN(d.getTime()))
    return String(v);
  const date = `${d.getFullYear()}-${pad$1(d.getMonth() + 1)}-${pad$1(d.getDate())}`;
  if (!datetime)
    return date;
  return `${date} ${pad$1(d.getHours())}:${pad$1(d.getMinutes())}:${pad$1(d.getSeconds())}`;
}
function imageText(value) {
  const list = Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
  const names = [];
  for (const v of list) {
    const s = typeof v === "string" ? v : String((v == null ? void 0 : v.src) ?? (v == null ? void 0 : v.url) ?? "");
    if (!s || s.startsWith("data:"))
      continue;
    const base = s.split(/[?#]/)[0].split("/").pop() || "";
    let name = base;
    try {
      name = decodeURIComponent(base);
    } catch {
    }
    if (name)
      names.push(name);
  }
  return names.join(", ");
}
function formatByType(col, value, boolLabels = ["是", "否"]) {
  if (value == null)
    return "";
  switch (col.type) {
    case "num":
      return typeof value === "number" ? thousands(value) : String(value);
    case "money":
      return typeof value === "number" ? "¥" + thousands(value, 2) : String(value);
    case "percent":
      return typeof value === "number" ? thousands(value * 100, 2) + "%" : String(value);
    case "date":
      return formatDate(value);
    case "datetime":
      return formatDate(value, true);
    case "boolean":
      return value ? boolLabels[0] : boolLabels[1];
    case "image":
      return imageText(value);
    default:
      return String(value);
  }
}
function parseNumericInput(raw) {
  if (raw == null)
    return null;
  if (typeof raw === "number")
    return isNaN(raw) ? null : raw;
  let s = String(raw).trim();
  if (s === "")
    return null;
  s = s.replace(/[¥$€£₹,\s_]/g, "");
  if (s === "")
    return null;
  let sign = 1;
  let changed = true;
  while (changed) {
    changed = false;
    if (s.length > 1 && s.startsWith("(") && s.endsWith(")")) {
      s = s.slice(1, -1);
      sign *= -1;
      changed = true;
    }
    if (s.startsWith("-")) {
      s = s.slice(1);
      sign *= -1;
      changed = true;
    } else if (s.startsWith("+")) {
      s = s.slice(1);
      changed = true;
    }
  }
  if (s === "" || !/^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s))
    return null;
  const n = Number(s);
  return isFinite(n) ? sign * n : null;
}
let zhCollator;
function getZhCollator() {
  if (zhCollator !== void 0)
    return zhCollator;
  const tags = ["zh-Hans-CN-u-co-pinyin", "zh-CN", "zh"];
  for (const tag of tags) {
    try {
      const c = new Intl.Collator(tag, { sensitivity: "variant", numeric: true });
      if (c.compare("a", "b") !== 0 || c.compare("阿", "装") !== 0) {
        zhCollator = c;
        return c;
      }
      zhCollator = c;
    } catch {
    }
  }
  zhCollator = zhCollator ?? null;
  return zhCollator;
}
function defaultComparator(a, b) {
  if (a == null && b == null)
    return 0;
  if (a == null)
    return -1;
  if (b == null)
    return 1;
  if (typeof a === "number" && typeof b === "number")
    return a - b;
  if (typeof a === "boolean" && typeof b === "boolean")
    return (a ? 1 : 0) - (b ? 1 : 0);
  if (a instanceof Date && b instanceof Date)
    return a.getTime() - b.getTime();
  const na = Number(a);
  const nb = Number(b);
  if (!isNaN(na) && !isNaN(nb) && a !== "" && b !== "")
    return na - nb;
  const sa = String(a);
  const sb = String(b);
  const col = getZhCollator();
  if (col)
    return col.compare(sa, sb);
  try {
    return sa.localeCompare(sb);
  } catch {
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }
}
const AGG_FUNCS = {
  sum: (_r, v) => v.reduce((s, x) => s + (Number(x) || 0), 0),
  avg: (_r, v) => {
    const nums = v.map(Number).filter((x) => !isNaN(x));
    return nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : null;
  },
  min: (_r, v) => {
    const nums = v.map(Number).filter((x) => !isNaN(x));
    return nums.length ? Math.min(...nums) : null;
  },
  max: (_r, v) => {
    const nums = v.map(Number).filter((x) => !isNaN(x));
    return nums.length ? Math.max(...nums) : null;
  },
  count: (rows) => rows.length,
  first: (_r, v) => v[0],
  last: (_r, v) => v[v.length - 1]
};
function runAgg(func, rows, values) {
  if (!func)
    return void 0;
  if (typeof func === "function")
    return func(rows);
  return AGG_FUNCS[func](rows, values);
}
const AGG_LABELS = {
  sum: "aggSum",
  avg: "aggAvg",
  min: "aggMin",
  max: "aggMax",
  count: "aggCount",
  first: "aggFirst",
  last: "aggLast"
};
function lowerBound(arr, target, key) {
  const get = key || ((i) => arr[i]);
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    if (get(mid) < target)
      lo = mid + 1;
    else
      hi = mid - 1;
  }
  return lo;
}
function rowMoveInsertIndex(rowCount, isData, isMoved, from, to) {
  let before = 0;
  for (let i = 0; i < rowCount; i++) {
    if (isData(i) && !isMoved(i) && i < to)
      before++;
  }
  return Math.max(0, from < to ? before + 1 : before);
}
function ghostCellCount(cells, maxW) {
  let used = 0;
  for (let i = 0; i < cells.length; i++) {
    used += cells[i].w;
    if (used >= maxW)
      return i + 1;
  }
  return cells.length;
}
function applyRowLimit(rows, limit) {
  if (!Number.isFinite(limit) || limit <= 0)
    return rows;
  return limit >= rows.length ? rows : rows.slice(0, limit);
}
function throttleRaf(fn) {
  let pending = false;
  let lastArgs = [];
  return function(...args) {
    lastArgs = args;
    if (pending)
      return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      fn.apply(this, lastArgs);
    });
  };
}
function debounce(fn, wait = 200) {
  let t = null;
  const wrapped = function(...args) {
    if (t)
      clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
  wrapped.cancel = () => t && clearTimeout(t);
  return wrapped;
}
const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function useColumnState(sourceColumns) {
  const widthMap = reactive(/* @__PURE__ */ new Map());
  const autoWidthMap = reactive(/* @__PURE__ */ new Map());
  const hideMap = reactive(/* @__PURE__ */ new Map());
  const pinMap = reactive(/* @__PURE__ */ new Map());
  const orderMap = reactive(/* @__PURE__ */ new Map());
  let viewportWidth = 0;
  let suppressVirtualCols = false;
  const allLeaves = () => collectLeaves(sourceColumns());
  function isHiddenCol(col) {
    const override = hideMap.get(colIdOf(col));
    if (override !== void 0)
      return override;
    return !!col.hidden || col.visible === false;
  }
  function isColumnHidden(colId) {
    const col = allLeaves().find((c) => colIdOf(c) === colId);
    if (col)
      return isHiddenCol(col);
    return !!hideMap.get(colId);
  }
  function setViewportWidth(w) {
    viewportWidth = w;
  }
  function setSuppressVirtual(v) {
    suppressVirtualCols = v;
  }
  function pinOf(col) {
    const override = pinMap.get(colIdOf(col));
    if (override !== void 0)
      return override;
    return col.fixed || null;
  }
  function listLeafColumns() {
    return allLeaves();
  }
  function listLeafUi() {
    return orderedIds().map((id) => {
      const col = allLeaves().find((c) => colIdOf(c) === id);
      return col ? {
        col,
        colId: id,
        hidden: isHiddenCol(col),
        // 面板必须报「生效冻结」而非「用户覆盖」：只读 pinMap 会把「定义里就 fixed」
        // 的列报成未冻结，与 computeLayout 摆的位置自相矛盾
        pinned: pinOf(col)
      } : null;
    }).filter(Boolean);
  }
  function computeLayout() {
    const visible = allLeaves().filter((c) => !isHiddenCol(c));
    const maxOrder = Math.max(0, ...Array.from(orderMap.values()));
    const ordered = visible.map((c, i) => {
      const id = colIdOf(c);
      const o = orderMap.get(id);
      return { c, key: o == null ? maxOrder + 1 + i : o };
    });
    ordered.sort((a, b) => a.key - b.key);
    const cols = ordered.map((l) => l.c);
    const baseW = (c) => {
      const id = colIdOf(c);
      return clampWidth(widthMap.get(id) ?? c.width ?? autoWidthMap.get(id) ?? 120, c);
    };
    const left = [];
    const normal = [];
    const right = [];
    cols.forEach((c) => {
      const p = pinOf(c);
      if (p === "left")
        left.push(c);
      else if (p === "right")
        right.push(c);
      else
        normal.push(c);
    });
    const toLeaf = (c, fixed) => ({
      col: c,
      colId: colIdOf(c),
      width: baseW(c),
      x: 0,
      fixed,
      idx: 0
    });
    const leftLeaves = left.map((c) => toLeaf(c, "left"));
    const rightLeaves = right.map((c) => toLeaf(c, "right"));
    const normalLeaves = normal.map((c, i) => ({ ...toLeaf(c, null), idx: i }));
    const leftW = leftLeaves.reduce((s, l) => s + l.width, 0);
    const rightW = rightLeaves.reduce((s, l) => s + l.width, 0);
    const flexCols = normalLeaves.filter((l) => l.col.flex);
    if (flexCols.length && viewportWidth > 0) {
      const fixedNormal = normalLeaves.reduce((s, l) => s + (l.col.flex ? 0 : l.width), 0);
      const remain = Math.max(viewportWidth - leftW - rightW - fixedNormal, 0);
      const totalFlex = flexCols.reduce((s, l) => s + (l.col.flex || 1), 0);
      flexCols.forEach((l) => {
        l.width = Math.max(
          Math.floor(remain * (l.col.flex || 1) / totalFlex),
          l.col.minWidth || 40
        );
      });
    }
    let x = 0;
    leftLeaves.forEach((l) => {
      l.x = x;
      x += l.width;
    });
    const normalStartX = x;
    normalLeaves.forEach((l, i) => {
      l.idx = i;
      l.x = x;
      x += l.width;
    });
    rightLeaves.forEach((l) => {
      l.x = x;
      x += l.width;
    });
    return {
      leftLeaves,
      normalLeaves,
      rightLeaves,
      totalWidth: x,
      leftWidth: leftW,
      rightWidth: rightW,
      /** 普通区起始 x（用于列虚拟滚动坐标换算） */
      normalStartX,
      /** 是否启用列虚拟滚动 */
      virtualCols: !suppressVirtualCols && normalLeaves.length > 40,
      allCols: cols
    };
  }
  function computeHeaderRows() {
    const cols = sourceColumns();
    const depth = function d(list) {
      let m = 1;
      list.forEach((c) => {
        var _a;
        if ((_a = c.children) == null ? void 0 : _a.length)
          m = Math.max(m, 1 + d(c.children));
      });
      return m;
    }(cols);
    const rows = Array.from({ length: depth }, () => []);
    const isHidden = (c) => isHiddenCol(c);
    const walk = (list, level) => {
      list.forEach((c) => {
        var _a;
        if (isHidden(c))
          return;
        if ((_a = c.children) == null ? void 0 : _a.length) {
          const visChildren = c.children.filter((ch) => !isHidden(ch));
          if (!visChildren.length)
            return;
          const leafCount = collectLeaves([c]).filter((l) => !isHidden(l)).length;
          const cell = {
            col: c,
            colId: colIdOf(c),
            colSpan: leafCount,
            rowSpan: 1,
            level,
            isGroup: true
          };
          rows[level].push(cell);
          walk(c.children, level + 1);
        } else {
          pinOf(c);
          rows[level].push({
            col: c,
            colId: colIdOf(c),
            colSpan: 1,
            rowSpan: depth - level,
            level,
            isGroup: false
          });
        }
      });
    };
    walk(cols, 0);
    return { rows, depth };
  }
  function resize(colId, width) {
    const col = allLeaves().find((c) => colIdOf(c) === colId);
    widthMap.set(colId, clampWidth(width, col || void 0));
  }
  function setAutoWidth(colId, width) {
    autoWidthMap.set(colId, width);
  }
  function hasSizedWidth(colId) {
    if (widthMap.has(colId))
      return true;
    const col = allLeaves().find((c) => colIdOf(c) === colId);
    return !!(col == null ? void 0 : col.width) || !!(col == null ? void 0 : col.flex);
  }
  function sizeToFit() {
    if (viewportWidth <= 0)
      return;
    const visible = allLeaves().filter((c) => !isHiddenCol(c));
    const pinnedW = visible.filter((c) => pinOf(c)).reduce((s, c) => s + clampWidth(widthMap.get(colIdOf(c)) ?? c.width ?? 120, c), 0);
    const normal = visible.filter((c) => !pinOf(c) && !c.flex);
    if (!normal.length)
      return;
    const avail = Math.max(viewportWidth - pinnedW, 0);
    const cur = normal.map((c) => clampWidth(widthMap.get(colIdOf(c)) ?? c.width ?? 120, c));
    const total = cur.reduce((s, w) => s + w, 0);
    if (total <= 0)
      return;
    const factor = avail / total;
    normal.forEach((c, i) => {
      widthMap.set(colIdOf(c), clampWidth(Math.round(cur[i] * factor), c));
    });
  }
  function clearWidths() {
    widthMap.clear();
  }
  function moveColumn(dragId, targetId) {
    if (dragId === targetId)
      return;
    const ordered = orderedIds();
    const from = ordered.indexOf(dragId);
    const to = ordered.indexOf(targetId);
    if (from < 0 || to < 0)
      return;
    ordered.splice(from, 1);
    ordered.splice(to, 0, dragId);
    ordered.forEach((id, i) => orderMap.set(id, i));
  }
  function orderedIds() {
    const leaves = allLeaves().map(colIdOf);
    const known = Array.from(orderMap.entries()).sort((a, b) => a[1] - b[1]).map(([id]) => id).filter((id) => leaves.includes(id));
    const rest = leaves.filter((id) => !known.includes(id));
    return [...known, ...rest];
  }
  function togglePin(colId, pin) {
    pinMap.set(colId, pin);
  }
  function toggleHide(colId, hide) {
    hideMap.set(colId, hide ?? !isColumnHidden(colId));
  }
  function getColumnState() {
    return orderedIds().map((id, i) => {
      const item = { colId: id, order: i };
      if (widthMap.has(id))
        item.width = widthMap.get(id);
      if (hideMap.has(id))
        item.hide = hideMap.get(id) === true;
      const p = pinMap.get(id);
      if (p !== void 0)
        item.pinned = p;
      return item;
    });
  }
  function applyColumnState(items) {
    if (!(items == null ? void 0 : items.length))
      return;
    widthMap.clear();
    hideMap.clear();
    pinMap.clear();
    orderMap.clear();
    items.forEach((it, i) => {
      if (it.width)
        widthMap.set(it.colId, it.width);
      if (it.hide !== void 0)
        hideMap.set(it.colId, !!it.hide);
      if (it.pinned !== void 0)
        pinMap.set(it.colId, it.pinned);
      orderMap.set(it.colId, it.order ?? i);
    });
  }
  function resetColumnState() {
    widthMap.clear();
    hideMap.clear();
    pinMap.clear();
    orderMap.clear();
  }
  return {
    setViewportWidth,
    setSuppressVirtual,
    listLeafColumns,
    listLeafUi,
    isColumnHidden,
    pinOf,
    computeLayout,
    computeHeaderRows,
    resize,
    setAutoWidth,
    hasSizedWidth,
    sizeToFit,
    clearWidths,
    moveColumn,
    togglePin,
    toggleHide,
    orderedIds,
    getColumnState,
    applyColumnState,
    resetColumnState
  };
}
function flagOf(v, ctx, def = false) {
  if (v == null)
    return def;
  return typeof v === "function" ? !!v(ctx) : !!v;
}
function buildCustomMenuItems(items, ctx, run) {
  var _a;
  const out = [];
  for (const it of items || []) {
    if (!flagOf(it.visible, ctx, true))
      continue;
    if (it.separator) {
      if (!out.length || out[out.length - 1].isSeparator)
        continue;
      out.push({ isSeparator: true });
      continue;
    }
    const children = ((_a = it.children) == null ? void 0 : _a.length) ? buildCustomMenuItems(it.children, ctx, run) : void 0;
    const hasSub = !!children && children.some((c) => !c.isSeparator);
    out.push({
      name: (it.icon ? it.icon + " " : "") + (it.label || it.name || ""),
      danger: it.danger,
      disabled: () => flagOf(it.disabled, ctx),
      children: hasSub ? children : void 0,
      action: hasSub ? void 0 : () => run(it, ctx)
    });
  }
  while (out.length && out[out.length - 1].isSeparator)
    out.pop();
  return out;
}
function joinMenuSections(builtIn, custom) {
  if (!custom.length)
    return builtIn;
  if (!builtIn.length)
    return custom;
  if (builtIn[builtIn.length - 1].isSeparator)
    return [...builtIn, ...custom];
  return [...builtIn, { isSeparator: true }, ...custom];
}
function isEditableContextTarget(target) {
  var _a;
  const el = target;
  return !!((_a = el == null ? void 0 : el.closest) == null ? void 0 : _a.call(el, 'input,textarea,[contenteditable]:not([contenteditable="false"])'));
}
function hasUserTextSelection(root, sel) {
  var _a;
  if (!root || !sel || sel.isCollapsed)
    return false;
  if (!String(((_a = sel.toString) == null ? void 0 : _a.call(sel)) ?? ""))
    return false;
  const inRoot = (n) => !!n && root.contains(n);
  return inRoot(sel.anchorNode) || inRoot(sel.focusNode);
}
const cache = /* @__PURE__ */ new Map();
function isExpression(v) {
  return typeof v === "string" && v.trim() !== "";
}
function compileExpression(expr) {
  if (cache.has(expr))
    return cache.get(expr) ?? null;
  let fn = null;
  try {
    const raw = new Function(
      "p",
      "var params=p,value=p&&p.value,data=p&&p.data,row=p&&p.row,node=p&&p.node,colId=p&&p.colId,column=p&&p.column;return (" + expr + ");"
    );
    fn = (scope) => {
      try {
        return raw(scope);
      } catch {
        return void 0;
      }
    };
  } catch {
    fn = null;
  }
  cache.set(expr, fn);
  return fn;
}
function isEmptyCondition(c) {
  return !c || c.op == null || c.op === "";
}
function evalConditions(conditions, operator, test) {
  const active = (conditions || []).filter((c) => !isEmptyCondition(c));
  if (!active.length)
    return true;
  return operator === "and" ? active.every(test) : active.some(test);
}
function isAdvGroup(node) {
  return node.items !== void 0 && "operator" in node;
}
function evalAdvancedFilter(node, testCond) {
  if (!node || !node.items || !node.items.length)
    return true;
  const results = node.items.map(
    (item) => isAdvGroup(item) ? evalAdvancedFilter(item, testCond) : testCond(item)
  );
  return node.operator === "and" ? results.every(Boolean) : results.some(Boolean);
}
function countAdvConditions(node) {
  if (!node || !node.items)
    return 0;
  return node.items.reduce((s, item) => s + (isAdvGroup(item) ? countAdvConditions(item) : 1), 0);
}
function isInternalField(f) {
  return !f || f.startsWith("__");
}
function kindOfColumn(col) {
  const t = col.type;
  if (t === "num" || t === "money" || t === "percent")
    return "number";
  if (t === "date" || t === "datetime")
    return "date";
  if (optionsOfColumn(col).length)
    return "select";
  if (typeof col.filter === "string") {
    if (col.filter === "number")
      return "number";
    if (col.filter === "date")
      return "date";
    if (col.filter === "select")
      return "select";
  }
  return "text";
}
function optionsOfColumn(col) {
  const ed = typeof col.editor === "string" ? { type: col.editor } : col.editor;
  if (ed && Array.isArray(ed.options) && ed.options.length) {
    return ed.options;
  }
  if (col.filterValueMap) {
    return Object.entries(col.filterValueMap).map(([v, label]) => ({
      value: coerceOptionValue(v),
      label: String(label)
    }));
  }
  return [];
}
function coerceOptionValue(v) {
  if (v !== "" && !Number.isNaN(Number(v)))
    return Number(v);
  return v;
}
function deriveQueryFields(columns, override) {
  var _a;
  const ov = new Map((override || []).map((f) => [f.field, f]));
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const col of collectLeaves(columns)) {
    const field = col.field;
    if (!field || isInternalField(field) || col.filter === false)
      continue;
    if (seen.has(field))
      continue;
    seen.add(field);
    const o = ov.get(field);
    out.push({
      field,
      title: (o == null ? void 0 : o.title) || col.title || field,
      kind: (o == null ? void 0 : o.kind) || kindOfColumn(col),
      options: ((_a = o == null ? void 0 : o.options) == null ? void 0 : _a.length) ? o.options : optionsOfColumn(col)
    });
  }
  return out;
}
function withCarrierOptions(fields, carrier) {
  if (!fields.length || !carrier || !carrier.size)
    return fields;
  return fields.map((f) => {
    if (f.options && f.options.length)
      return f;
    const hit = carrier.get(f.field);
    if (!hit || !hit.list || !hit.list.length)
      return f;
    return {
      ...f,
      kind: "select",
      // 直接透传载体列表（可能为树，带 children），供查询栏下拉按层级渲染 + 搜索
      options: hit.list
    };
  });
}
function queryOpsOfKind(kind) {
  if (kind === "number")
    return ["eq", "gt", "gte", "lt", "lte", "between"];
  if (kind === "date")
    return ["between", "gte", "lte"];
  if (kind === "select")
    return ["eq", "ne", "in"];
  return ["contains", "eq", "ne"];
}
function defaultQueryOperator(kind) {
  return queryOpsOfKind(kind)[0];
}
function hasOne(v) {
  return v !== void 0 && v !== null && v !== "";
}
function queryHasValue(c) {
  if (c.operator === "between") {
    if (Array.isArray(c.value))
      return c.value.some(hasOne);
    return hasOne(c.value1) || hasOne(c.value2);
  }
  if (Array.isArray(c.value))
    return c.value.length > 0;
  return hasOne(c.value);
}
function activeQueryConditions(list) {
  return (list || []).filter(queryHasValue);
}
const looseEq = (a, b) => a === b || String(a) === String(b);
const toNum$1 = (v) => {
  const n = Number(v);
  return Number.isNaN(n) ? void 0 : n;
};
const toTime$1 = (v) => {
  if (!hasOne(v))
    return void 0;
  if (typeof v === "number")
    return v;
  const t = new Date(String(v).replace(" ", "T")).getTime();
  return Number.isNaN(t) ? void 0 : t;
};
function matchQueryValue(rawValue, c, kind = "text") {
  const rv = rawValue;
  switch (c.operator) {
    case "contains":
      return String(rv ?? "").toLowerCase().includes(String(c.value ?? "").trim().toLowerCase());
    case "eq":
      return looseEq(rv, c.value);
    case "ne":
      return !looseEq(rv, c.value);
    case "in":
      return (Array.isArray(c.value) ? c.value : [c.value]).some((x) => looseEq(rv, x));
    case "gt":
      return numCmp(rv, c.value, (a, b) => a > b);
    case "gte":
      return numCmp(rv, c.value, (a, b) => a >= b);
    case "lt":
      return numCmp(rv, c.value, (a, b) => a < b);
    case "lte":
      return numCmp(rv, c.value, (a, b) => a <= b);
    case "between": {
      const isDate = kind === "date";
      const pair = Array.isArray(c.value) ? c.value : [];
      const lo = c.value1 ?? pair[0];
      const hi = c.value2 ?? pair[1];
      if (isDate) {
        const t = toTime$1(rv);
        if (t === void 0)
          return false;
        const loT = toTime$1(lo);
        const hiT = toTime$1(hi);
        if (loT !== void 0 && t < loT)
          return false;
        return !(hiT !== void 0 && t > hiT);
      }
      const v = toNum$1(rv);
      if (v === void 0)
        return false;
      const loN = toNum$1(lo);
      const hiN = toNum$1(hi);
      if (loN !== void 0 && v < loN)
        return false;
      return !(hiN !== void 0 && v > hiN);
    }
    default:
      return true;
  }
}
function numCmp(rv, cv, ok) {
  const a = toNum$1(rv);
  const b = toNum$1(cv);
  if (a === void 0 || b === void 0)
    return false;
  return ok(a, b);
}
function rowPassesQuery(row, conds, colOf) {
  for (const c of conds) {
    const col = colOf(c.field);
    const raw = (col == null ? void 0 : col.filterValueGetter) ? col.filterValueGetter(row) : getValueByPath(row, c.field);
    if (!matchQueryValue(raw, c, col ? kindOfColumn(col) : "text"))
      return false;
  }
  return true;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
class SsrmStore {
  constructor(opts) {
    /** 服务端总行数；-1 表示未知（尚未收到 total） */
    __publicField(this, "rowCount", -1);
    __publicField(this, "blockSize");
    __publicField(this, "maxBlocksInCache");
    __publicField(this, "cacheOverflow");
    __publicField(this, "keyOf");
    /** dense 行槽：长度 = max(rowCount,0)；undefined 表示未加载 */
    __publicField(this, "slots", []);
    /** 每个块的进行中标记（loading / error 重试） */
    __publicField(this, "inflight", /* @__PURE__ */ new Map());
    /** 每块的最近访问时间（LRU），仅在覆盖完整时有效 */
    __publicField(this, "touch", /* @__PURE__ */ new Map());
    __publicField(this, "clock", 0);
    __publicField(this, "seq", 0);
    this.blockSize = Math.max(1, Math.floor(opts.blockSize) || 100);
    this.maxBlocksInCache = opts.maxBlocksInCache ?? 0;
    this.cacheOverflow = Math.max(0, Math.floor(opts.cacheOverflow ?? 5));
    this.keyOf = opts.keyOf;
  }
  // ---------------- 块索引数学 ----------------
  blockIndexOf(row) {
    return row < 0 ? 0 : Math.floor(row / this.blockSize);
  }
  startRowOf(blockIndex) {
    return blockIndex * this.blockSize;
  }
  /** 块实际结束行（不含）；末块受 rowCount 截断 */
  endRowOf(blockIndex) {
    if (this.rowCount < 0)
      return this.startRowOf(blockIndex) + this.blockSize;
    return Math.min(this.startRowOf(blockIndex) + this.blockSize, this.rowCount);
  }
  blockCount() {
    return this.rowCount <= 0 ? 0 : Math.ceil(this.rowCount / this.blockSize);
  }
  /** 该块行区间是否被完全填充（= 已加载） */
  isBlockLoaded(blockIndex) {
    if (this.rowCount <= 0)
      return false;
    const s = this.startRowOf(blockIndex);
    const e = this.endRowOf(blockIndex);
    if (e <= s)
      return false;
    for (let i = s; i < e; i++)
      if (this.slots[i] === void 0)
        return false;
    return true;
  }
  // ---------------- 生命周期 ----------------
  /** 设定/更新总数并调整 slots 长度，保留已加载内容 */
  configure(total) {
    const next = Math.max(-1, Math.floor(total));
    this.rowCount = next;
    const len = Math.max(next, 0);
    if (this.slots.length < len)
      this.slots.length = len;
    else if (this.slots.length > len) {
      this.slots.length = len;
      const maxIdx = this.blockCount();
      for (const k of Array.from(this.inflight.keys()))
        if (k >= maxIdx)
          this.inflight.delete(k);
    }
  }
  reset() {
    this.slots = [];
    this.inflight.clear();
    this.touch.clear();
    this.rowCount = -1;
    this.clock++;
  }
  rowAt(i) {
    return this.slots[i];
  }
  loadedRowCount() {
    let n = 0;
    for (let i = 0; i < this.slots.length; i++)
      if (this.slots[i] !== void 0)
        n++;
    return n;
  }
  // ---------------- 取数调度 ----------------
  /**
   * 规划需要请求的块：覆盖 [first-prefetch, last+prefetch] 且未加载、非进行中的块，
   * 按「距视口中心由近及远」排序（优先补最可见处）。
   */
  planLoad(first, last, prefetch = 0) {
    const bc = this.blockCount();
    if (bc <= 0 || this.rowCount <= 0)
      return [];
    const lo = Math.max(0, this.blockIndexOf(Math.max(0, first - prefetch)));
    const hi = Math.min(bc - 1, this.blockIndexOf(Math.min(this.rowCount - 1, last + prefetch)));
    const center = (first + last) / 2;
    const need2 = [];
    for (let b = lo; b <= hi; b++) {
      const inf = this.inflight.get(b);
      if (inf && inf.status === "loading")
        continue;
      if (inf && inf.status === "error") {
        need2.push(b);
        continue;
      }
      if (!this.isBlockLoaded(b))
        need2.push(b);
    }
    need2.sort((a, c) => Math.abs(a - center) - Math.abs(c - center));
    return need2;
  }
  /** 标记块开始加载，返回本次请求的 seq（用于竞态守卫） */
  beginLoad(blockIndex) {
    const s = ++this.seq;
    this.inflight.set(blockIndex, { seq: s, status: "loading" });
    return s;
  }
  /** 提交块数据：seq 过期则丢弃；写入 slots；返回是否被应用 */
  commitLoad(blockIndex, seq, rows) {
    const inf = this.inflight.get(blockIndex);
    if (!inf || inf.seq !== seq)
      return false;
    this.inflight.delete(blockIndex);
    const start = this.startRowOf(blockIndex);
    for (let i = 0; i < rows.length; i++)
      this.slots[start + i] = rows[i];
    this.touch.set(blockIndex, ++this.clock);
    return true;
  }
  /** 标记块加载失败（可重试） */
  failLoad(blockIndex, seq) {
    const inf = this.inflight.get(blockIndex);
    if (inf && inf.seq === seq)
      this.inflight.set(blockIndex, { seq, status: "error" });
  }
  isLoadingAny() {
    for (const v of this.inflight.values())
      if (v.status === "loading")
        return true;
    return false;
  }
  /** 指定块是否正在加载中（用于 boot 块去重） */
  isBlockBusy(blockIndex) {
    var _a;
    return ((_a = this.inflight.get(blockIndex)) == null ? void 0 : _a.status) === "loading";
  }
  // ---------------- 淘汰（块缓存回收） ----------------
  /**
   * 依据保留集合淘汰「已加载且不在 keep 内」的块，按 LRU（touch 时钟）优先淘汰最久未用。
   * 进行中的块永不淘汰。返回被淘汰的块索引。
   */
  prune(keep) {
    var _a;
    const loaded = [];
    const bc = this.blockCount();
    for (let b = 0; b < bc; b++) {
      if (keep.has(b))
        continue;
      if (((_a = this.inflight.get(b)) == null ? void 0 : _a.status) === "loading")
        continue;
      if (this.isBlockLoaded(b))
        loaded.push(b);
    }
    let evict = loaded;
    if (this.maxBlocksInCache > 0) {
      let loadedTotal = 0;
      for (let b = 0; b < bc; b++)
        if (this.isBlockLoaded(b))
          loadedTotal++;
      const removable = Math.max(0, loadedTotal - this.maxBlocksInCache);
      if (removable < loaded.length) {
        evict = loaded.sort((a, c) => (this.touch.get(a) ?? 0) - (this.touch.get(c) ?? 0)).slice(0, removable);
      }
    }
    const out = [];
    for (const b of evict) {
      const s = this.startRowOf(b);
      const e = this.endRowOf(b);
      for (let i = s; i < e; i++)
        this.slots[i] = void 0;
      this.touch.delete(b);
      this.inflight.delete(b);
      out.push(b);
    }
    return out;
  }
  /** keep 集合：视口块 ± cacheOverflow */
  keepSet(first, last) {
    const bc = this.blockCount();
    const set = /* @__PURE__ */ new Set();
    const lo = clamp(this.blockIndexOf(first) - this.cacheOverflow, 0, bc - 1);
    const hi = clamp(this.blockIndexOf(last) + this.cacheOverflow, 0, bc - 1);
    for (let b = lo; b <= hi; b++)
      set.add(b);
    return set;
  }
  // ---------------- Delta（实时更新） ----------------
  /**
   * 对已加载内容应用增量：
   * - update：按 key 原地替换已加载行（不位移），闪烁；
   * - upsert：命中已加载则更新，否则忽略（服务端权威，避免破坏块区间）；
   * - add：追加到末尾（rowCount++），闪烁；
   * - remove：按 key 从已加载槽移除并左移尾块（structural）。
   */
  applyDelta(tx) {
    var _a, _b, _c, _d;
    const changed = [];
    const flash = [];
    let structural = false;
    const findIndex = (row) => {
      const k = this.keyOf(row);
      for (let i = 0; i < this.slots.length; i++) {
        const r = this.slots[i];
        if (r && this.keyOf(r) === k)
          return i;
      }
      return -1;
    };
    if ((_a = tx.update) == null ? void 0 : _a.length) {
      for (const u of tx.update) {
        const i = findIndex(u);
        if (i >= 0) {
          this.slots[i] = u;
          changed.push(i);
          flash.push(this.keyOf(u));
        }
      }
    }
    if ((_b = tx.upsert) == null ? void 0 : _b.length) {
      for (const u of tx.upsert) {
        const i = findIndex(u);
        if (i >= 0) {
          this.slots[i] = u;
          changed.push(i);
          flash.push(this.keyOf(u));
        }
      }
    }
    if ((_c = tx.remove) == null ? void 0 : _c.length) {
      const idxs = [];
      for (const r of tx.remove) {
        const i = findIndex(r);
        if (i >= 0)
          idxs.push(i);
      }
      const uniq = Array.from(new Set(idxs)).sort((a, b) => b - a);
      for (const i of uniq) {
        this.slots.splice(i, 1);
        if (this.rowCount > 0)
          this.rowCount--;
        structural = true;
      }
    }
    if ((_d = tx.add) == null ? void 0 : _d.length) {
      const rows = tx.add;
      if (tx.addIndex != null && tx.addIndex >= 0 && tx.addIndex <= this.slots.length) {
        this.slots.splice(tx.addIndex, 0, ...rows);
      } else {
        for (const r of rows)
          this.slots.push(r);
      }
      if (this.rowCount > 0)
        this.rowCount += rows.length;
      for (const r of rows)
        flash.push(this.keyOf(r));
      structural = true;
    }
    if (structural) {
      const len = Math.max(this.rowCount, 0);
      if (this.slots.length < len)
        this.slots.length = len;
      else if (this.slots.length > len)
        this.slots.length = len;
      this.touch.clear();
    }
    return { changed, flash, structural };
  }
}
class SsrmTxBatcher {
  constructor(apply, opts) {
    __publicField(this, "queue", []);
    __publicField(this, "scheduled", false);
    __publicField(this, "apply");
    __publicField(this, "defer");
    this.apply = apply;
    this.defer = (opts == null ? void 0 : opts.defer) ?? ((fn) => {
      setTimeout(fn, 0);
    });
  }
  push(tx) {
    this.queue.push(tx);
    if (!this.scheduled) {
      this.scheduled = true;
      this.defer(() => this.flush());
    }
  }
  /** 立即合并并应用队列（返回合并后的事务，便于测试/回调） */
  flush() {
    const merged = mergeTransactions(this.queue);
    this.queue = [];
    this.scheduled = false;
    if (merged.add || merged.update || merged.remove || merged.upsert)
      this.apply(merged);
    return merged;
  }
  get pending() {
    return this.queue.length;
  }
}
function mergeTransactions(list) {
  const removed = /* @__PURE__ */ new Set();
  const updateMap = /* @__PURE__ */ new Map();
  const upsertMap = /* @__PURE__ */ new Map();
  const addList = [];
  let addIndex;
  const keyOfAny = (r) => {
    const anyKey = r.id ?? r.key ?? r.uuid;
    return anyKey != null ? anyKey : r;
  };
  for (const tx of list) {
    if (tx.remove)
      for (const r of tx.remove) {
        const k = keyOfAny(r);
        removed.add(k);
        updateMap.delete(k);
        upsertMap.delete(k);
      }
    if (tx.upsert)
      for (const r of tx.upsert) {
        const k = keyOfAny(r);
        if (removed.has(k))
          removed.delete(k);
        upsertMap.set(k, r);
      }
    if (tx.update)
      for (const r of tx.update) {
        const k = keyOfAny(r);
        if (!removed.has(k))
          updateMap.set(k, r);
      }
    if (tx.add)
      for (const r of tx.add) {
        const k = keyOfAny(r);
        if (removed.has(k))
          removed.delete(k);
        addList.push(r);
      }
    if (tx.addIndex != null)
      addIndex = tx.addIndex;
  }
  for (const k of updateMap.keys())
    if (removed.has(k))
      updateMap.delete(k);
  const out = {};
  if (addList.length) {
    out.add = addList;
    if (addIndex != null)
      out.addIndex = addIndex;
  }
  if (updateMap.size)
    out.update = Array.from(updateMap.values());
  if (upsertMap.size)
    out.upsert = Array.from(upsertMap.values());
  if (removed.size)
    out.remove = Array.from(removed).map(
      (k) => typeof k === "object" ? k : { id: k }
    );
  return out;
}
const NO_COLLAPSE = /* @__PURE__ */ new Set();
const EMPTY_SET = /* @__PURE__ */ new Set();
const MAX_WALK_DEPTH = 64;
const FOOTER_SUFFIX = ":footer";
const decoCache = /* @__PURE__ */ new WeakMap();
const isGroupRow = (r) => !!r.__group;
const levelOf = (r) => typeof r.__level === "number" ? r.__level : 0;
function decorateGroupRow(row, path, level, field, value, labels) {
  if (row.__path === path && row.__groupValue !== void 0)
    return row;
  const hit = decoCache.get(row);
  if (hit && hit.path === path)
    return hit.row;
  const d = Object.assign({}, row, {
    __group: true,
    __path: path,
    __level: level,
    __groupField: row.__groupField || field,
    __groupValue: value,
    __groupLabels: labels.length ? labels.slice() : [value]
  });
  if (field && d[field] == null)
    d[field] = value;
  decoCache.set(row, { path, row: d });
  return d;
}
function flattenServerGroups(items, opts) {
  const fields = opts.fields;
  const collapsed = opts.collapsed || NO_COLLAPSE;
  const childMap = opts.childMap;
  const rh = opts.rowHeight;
  const rows = [];
  const absAt = [];
  const needLoad = [];
  const metas = /* @__PURE__ */ new Map();
  let holeSeq = 0;
  const emit = (row, abs) => {
    rows.push(row);
    absAt.push(abs);
  };
  const holeRow = (abs) => ({
    key: "sg:hole:" + abs + ":" + holeSeq++,
    type: "row",
    data: { __ssrmLoading: true },
    level: 0,
    height: rh
  });
  const pendingRow = (path) => ({
    key: "sg:loading:" + path,
    type: "row",
    data: { __ssrmLoading: true, __groupChildren: path },
    level: 0,
    height: rh
  });
  const dataRow = (r, parentKey) => ({
    key: opts.keyOf(r),
    type: "row",
    data: r,
    level: 0,
    parentKey,
    height: rh
  });
  function walk(list, baseAbs, ctx, seen = EMPTY_SET) {
    const pathAt = [];
    const keyAt = [];
    const valuesAt = [];
    let i = 0;
    let skipping = null;
    while (i < list.length) {
      const raw = list[i];
      const abs = baseAbs === null ? -1 : baseAbs + i;
      if (raw === void 0) {
        if (skipping === null)
          emit(holeRow(abs), abs);
        i++;
        continue;
      }
      if (!isGroupRow(raw)) {
        if (skipping === null) {
          const deep = keyAt.length ? keyAt[keyAt.length - 1] : ctx.parentKey;
          emit(dataRow(raw, deep), abs);
        }
        i++;
        continue;
      }
      const level = levelOf(raw);
      if (skipping !== null) {
        if (level > skipping) {
          i++;
          continue;
        }
        if (level === skipping && raw.__footer) {
          i++;
          continue;
        }
        skipping = null;
      }
      const field = fields[level] || raw.__groupField || "";
      const value = raw.__groupValue !== void 0 ? raw.__groupValue : field ? raw[field] : "";
      const parentPath = level > 0 ? pathAt[level - 1] ?? ctx.parentPath : ctx.parentPath;
      const parentValues = level > 0 ? valuesAt[level - 1] ?? ctx.parentValues : ctx.parentValues;
      const path = typeof raw.__path === "string" && raw.__path ? raw.__path : parentPath + "|" + level + "|" + encodeURIComponent(String(value ?? ""));
      const values = parentValues.concat([value]);
      const isFooter = !!raw.__footer;
      metas.set(path, { level, field, values });
      pathAt.length = level + 1;
      valuesAt.length = level + 1;
      keyAt.length = level + 1;
      pathAt[level] = path;
      valuesAt[level] = values;
      keyAt[level] = path;
      const expandable = isFooter ? false : opts.isExpandable ? !!opts.isExpandable(raw) : raw.__count === void 0 || raw.__count > 0;
      const expanded = !isFooter && expandable && !collapsed.has(path);
      const data = decorateGroupRow(
        raw,
        path,
        level,
        field,
        value,
        raw.__groupLabels && raw.__groupLabels.length ? raw.__groupLabels : values
      );
      emit(
        {
          key: isFooter ? path + FOOTER_SUFFIX : path,
          type: "group",
          data,
          level,
          parentKey: level > 0 ? keyAt[level - 1] ?? ctx.parentKey : ctx.parentKey,
          expanded,
          expandable,
          isFooter,
          height: rh
        },
        abs
      );
      i++;
      if (isFooter || !expanded || !expandable) {
        if (!expanded && !isFooter && expandable)
          skipping = level;
        continue;
      }
      const hasNextSlot = i < list.length;
      const next = hasNextSlot ? list[i] : void 0;
      if (hasNextSlot && next === void 0) {
        continue;
      }
      const inline = hasNextSlot ? !isGroupRow(next) || levelOf(next) > level : false;
      if (inline)
        continue;
      const st = childMap && childMap.get(path);
      if (st && st.kids) {
        if (seen.has(path) || seen.size >= MAX_WALK_DEPTH) {
          console.warn("[rj-grid] 服务端分组子项自引用，跳过递归：" + path);
        } else {
          const next2 = new Set(seen);
          next2.add(path);
          walk(st.kids, null, { parentKey: path, parentPath: path, parentValues: values }, next2);
        }
      } else if (st && st.error)
        ;
      else {
        if (!st || !st.loading)
          needLoad.push({ path, level, field, values });
        emit(pendingRow(path), -1);
      }
    }
  }
  walk(items, 0, { parentKey: "", parentPath: "", parentValues: [] });
  return { rows, needLoad, metas, absAt };
}
const ERR = {
  REF: "#REF!",
  VALUE: "#VALUE!",
  NAME: "#NAME?",
  DIV0: "#DIV/0!",
  NUM: "#NUM!"
};
class FError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function isFormula(v) {
  return typeof v === "string" && v.length > 1 && v[0] === "=";
}
function lettersToCol(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++)
    n = n * 26 + (s.charCodeAt(i) - 64);
  return n - 1;
}
const IDENT_CHARS = /[A-Za-z0-9_.$:]/;
const WS = /[ \t\r\n]/;
class Parser {
  constructor(input) {
    __publicField(this, "s");
    __publicField(this, "p", 0);
    this.s = input[0] === "=" ? input.slice(1) : input;
  }
  skip() {
    while (this.p < this.s.length && WS.test(this.s[this.p]))
      this.p++;
  }
  peek() {
    this.skip();
    return this.p < this.s.length ? this.s[this.p] : "";
  }
  eof() {
    this.skip();
    return this.p >= this.s.length;
  }
  readWhile(pred) {
    let out = "";
    while (this.p < this.s.length && pred(this.s[this.p]))
      out += this.s[this.p++];
    return out;
  }
  parse() {
    const node = this.parseExpr();
    if (!this.eof())
      throw new FError(ERR.NAME);
    return node;
  }
  parseExpr() {
    return this.parseCompare();
  }
  parseCompare() {
    let l = this.parseConcat();
    for (; ; ) {
      const c = this.peek();
      let op = "";
      if (c === "=" || c === "<" || c === ">") {
        const two = this.s.slice(this.p, this.p + 2);
        if (two === "<>" || two === ">=" || two === "<=")
          op = two;
        else if (c === "<" || c === ">")
          op = c;
        else if (c === "=")
          op = "=";
        else
          throw new FError(ERR.NAME);
        this.p += op.length;
      } else
        break;
      const r = this.parseConcat();
      l = { t: "bin", op, l, r };
    }
    return l;
  }
  parseConcat() {
    let l = this.parseAdd();
    while (this.peek() === "&") {
      this.p++;
      const r = this.parseAdd();
      l = { t: "bin", op: "&", l, r };
    }
    return l;
  }
  parseAdd() {
    let l = this.parseMul();
    for (; ; ) {
      const c = this.peek();
      if (c === "+" || c === "-") {
        this.p++;
        const r = this.parseMul();
        l = { t: "bin", op: c, l, r };
      } else
        break;
    }
    return l;
  }
  parseMul() {
    let l = this.parsePow();
    for (; ; ) {
      const c = this.peek();
      if (c === "*" || c === "/") {
        this.p++;
        const r = this.parsePow();
        l = { t: "bin", op: c, l, r };
      } else
        break;
    }
    return l;
  }
  parsePow() {
    const base = this.parseUnary();
    if (this.peek() === "^") {
      this.p++;
      const exp = this.parsePow();
      return { t: "bin", op: "^", l: base, r: exp };
    }
    return base;
  }
  parseUnary() {
    const c = this.peek();
    if (c === "-" || c === "+") {
      this.p++;
      return { t: "un", op: c, e: this.parseUnary() };
    }
    return this.parsePostfix();
  }
  parsePostfix() {
    let e = this.parsePrimary();
    while (this.peek() === "%") {
      this.p++;
      e = { t: "pct", e };
    }
    return e;
  }
  parsePrimary() {
    const c = this.peek();
    if (c === "")
      throw new FError(ERR.NAME);
    if (c === "(") {
      this.p++;
      const e = this.parseExpr();
      if (this.peek() !== ")")
        throw new FError(ERR.NAME);
      this.p++;
      return e;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      this.p++;
      const v = this.readWhile((ch) => ch !== quote);
      if (this.peek() !== quote)
        throw new FError(ERR.NAME);
      this.p++;
      return { t: "str", v };
    }
    if (/[0-9]/.test(c) || c === "." && /[0-9]/.test(this.s[this.p + 1] || "")) {
      const num = this.readWhile((ch) => /[0-9.]/.test(ch));
      const n = parseFloat(num);
      if (isNaN(n))
        throw new FError(ERR.VALUE);
      return { t: "num", v: n };
    }
    if (/[A-Za-z_$]/.test(c)) {
      const token = this.readWhile((ch) => IDENT_CHARS.test(ch));
      if (this.peek() === "(") {
        this.p++;
        const args = [];
        if (this.peek() !== ")") {
          for (; ; ) {
            args.push(this.parseExpr());
            if (this.peek() === ",") {
              this.p++;
              continue;
            }
            break;
          }
        }
        if (this.peek() !== ")")
          throw new FError(ERR.NAME);
        this.p++;
        return { t: "func", name: token.toUpperCase(), args };
      }
      const up = token.toUpperCase().replace(/\$/g, "");
      if (up === "TRUE")
        return { t: "bool", v: true };
      if (up === "FALSE")
        return { t: "bool", v: false };
      return { t: "ref", token };
    }
    throw new FError(ERR.NAME);
  }
}
function parseNode(input) {
  return new Parser(input).parse();
}
function parse(input) {
  try {
    return parseNode(input);
  } catch {
    return null;
  }
}
function findField(token, ctx) {
  const clean = token.replace(/\$/g, "").toLowerCase();
  return ctx.columns.findIndex((c) => String(c).toLowerCase() === clean);
}
function parseSide(side, ctx) {
  const clean = side.replace(/\$/g, "");
  const fi = findField(clean, ctx);
  if (fi >= 0)
    return { c: fi, r: null };
  const m = clean.match(/^([A-Za-z]{1,3})(\d+)?$/);
  if (m && m[1]) {
    const c = lettersToCol(m[1].toUpperCase());
    const r = m[2] ? parseInt(m[2], 10) - 1 : null;
    return { c, r };
  }
  throw new FError(ERR.NAME);
}
function evalRef(token, ctx, at) {
  const clean = token.replace(/\$/g, "");
  if (clean.indexOf(":") >= 0) {
    const [a, b] = clean.split(":");
    const s1 = parseSide(a, ctx);
    const s2 = parseSide(b, ctx);
    let c1 = s1.c;
    let c2 = s2.c;
    if (c1 > c2)
      [c1, c2] = [c2, c1];
    let r1 = s1.r ?? s2.r ?? 0;
    let r2 = s2.r ?? s1.r ?? 0;
    if (s1.r === null && s2.r === null) {
      r1 = 0;
      r2 = ctx.rowCount - 1;
    } else {
      if (s1.r === null)
        r1 = s2.r ?? 0;
      if (s2.r === null)
        r2 = s1.r ?? 0;
    }
    if (r1 > r2)
      [r1, r2] = [r2, r1];
    return readRange(ctx, c1, r1, c2, r2);
  }
  const s = parseSide(clean, ctx);
  const row = s.r ?? at.row;
  if (s.c < 0 || s.c >= ctx.columns.length)
    throw new FError(ERR.REF);
  if (row < 0 || row >= ctx.rowCount)
    throw new FError(ERR.REF);
  return ctx.getValue(s.c, row);
}
function readRange(ctx, c1, r1, c2, r2) {
  if (c1 < 0 || c2 >= ctx.columns.length || r1 < 0 || r2 >= ctx.rowCount) {
    c1 = Math.max(0, c1);
    c2 = Math.min(ctx.columns.length - 1, c2);
    r1 = Math.max(0, r1);
    r2 = Math.min(ctx.rowCount - 1, r2);
    if (c1 > c2 || r1 > r2)
      throw new FError(ERR.REF);
  }
  const out = [];
  for (let c = c1; c <= c2; c++)
    for (let r = r1; r <= r2; r++)
      out.push(ctx.getValue(c, r));
  return out;
}
function collectDeps(ast, ctx) {
  const deps = [];
  const push = (token) => {
    try {
      const clean = token.replace(/\$/g, "");
      if (clean.indexOf(":") >= 0) {
        const [a, b] = clean.split(":");
        const s1 = parseSide(a, ctx);
        const s2 = parseSide(b, ctx);
        const c1 = Math.min(s1.c, s2.c);
        const c2 = Math.max(s1.c, s2.c);
        const whole = s1.r === null && s2.r === null;
        let r1 = whole ? 0 : Math.min(s1.r ?? 0, s2.r ?? 0);
        let r2 = whole ? ctx.rowCount - 1 : Math.max(s1.r ?? 0, s2.r ?? 0);
        if (r1 > r2)
          [r1, r2] = [r2, r1];
        deps.push({ c1, c2, r1, r2, whole });
      } else {
        const s = parseSide(clean, ctx);
        const row = s.r;
        deps.push({ c1: s.c, c2: s.c, r1: row ?? 0, r2: row ?? 0, whole: row === null });
      }
    } catch {
    }
  };
  const walk = (n) => {
    if (n.t === "ref")
      push(n.token);
    else if (n.t === "func")
      n.args.forEach(walk);
    else if (n.t === "bin") {
      walk(n.l);
      walk(n.r);
    } else if (n.t === "un" || n.t === "pct")
      walk(n.e);
  };
  walk(ast);
  return deps;
}
function isBlank(v) {
  return v === null || v === void 0 || v === "";
}
function asNum(v) {
  if (typeof v === "number")
    return v;
  if (typeof v === "boolean")
    return v ? 1 : 0;
  if (v === null || v === void 0 || v === "")
    return null;
  const s = String(v).trim().replace(/,/g, "");
  if (s === "")
    return null;
  const pct = /%$/.test(s);
  const n = Number(pct ? s.slice(0, -1) : s);
  if (isNaN(n))
    return null;
  return pct ? n / 100 : n;
}
function toNum(v) {
  if (Array.isArray(v))
    throw new FError(ERR.VALUE);
  if (typeof v === "number")
    return v;
  if (typeof v === "boolean")
    return v ? 1 : 0;
  if (v === null || v === void 0 || v === "")
    return 0;
  const n = asNum(v);
  if (n === null)
    throw new FError(ERR.VALUE);
  return n;
}
function collectNumbers(v) {
  const out = [];
  const scan = (x) => {
    if (Array.isArray(x)) {
      x.forEach(scan);
      return;
    }
    const n = asNum(x);
    if (n !== null)
      out.push(n);
  };
  scan(v);
  return out;
}
function flatten(args) {
  const out = [];
  const scan = (x) => {
    if (Array.isArray(x))
      x.forEach(scan);
    else
      out.push(x);
  };
  args.forEach(scan);
  return out;
}
function toStr(v) {
  if (Array.isArray(v))
    throw new FError(ERR.VALUE);
  if (v === null || v === void 0)
    return "";
  if (typeof v === "boolean")
    return v ? "TRUE" : "FALSE";
  return String(v);
}
function cmpValues(a, b, op) {
  if (Array.isArray(a) || Array.isArray(b))
    throw new FError(ERR.VALUE);
  const na = asNum(a);
  const nb = asNum(b);
  let eq;
  if (na !== null && nb !== null)
    eq = na < nb ? -1 : na > nb ? 1 : 0;
  else
    eq = toStr(a).toLowerCase() < toStr(b).toLowerCase() ? -1 : toStr(a).toLowerCase() > toStr(b).toLowerCase() ? 1 : 0;
  switch (op) {
    case "=":
      return eq === 0;
    case "<>":
      return eq !== 0;
    case ">":
      return eq > 0;
    case "<":
      return eq < 0;
    case ">=":
      return eq >= 0;
    case "<=":
      return eq <= 0;
  }
  throw new FError(ERR.VALUE);
}
function matchCriteria(value, criteria) {
  if (typeof criteria === "number")
    return asNum(value) === criteria;
  if (typeof criteria === "boolean")
    return asNum(value) === (criteria ? 1 : 0);
  const cs = toStr(criteria);
  const m = cs.match(/^(<=|>=|<>|=|>|<)\s*([\s\S]*)$/);
  const op = m ? m[1] : "=";
  const rest = m ? m[2] : cs;
  const restNum = rest !== "" && !isNaN(Number(rest)) ? Number(rest) : null;
  const num = asNum(value);
  const numericCompare = restNum !== null || op === ">" || op === "<" || op === ">=" || op === "<=";
  if (numericCompare) {
    const rv = restNum;
    if (rv === null || num === null)
      return op === "<>";
    switch (op) {
      case ">":
        return num > rv;
      case "<":
        return num < rv;
      case ">=":
        return num >= rv;
      case "<=":
        return num <= rv;
      case "<>":
        return num !== rv;
      default:
        return num === rv;
    }
  }
  const vs = toStr(value).toLowerCase();
  let eq;
  if (/[*?]/.test(rest)) {
    const re = new RegExp(
      "^" + rest.toLowerCase().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    eq = re.test(vs);
  } else {
    eq = vs === rest.toLowerCase();
  }
  return op === "<>" ? !eq : eq;
}
function need(args, n) {
  if (args.length < n)
    throw new FError(ERR.VALUE);
}
const FUNCS = {
  // 聚合
  SUM: (a) => collectNumbers(a).reduce((s, x) => s + x, 0),
  PRODUCT: (a) => collectNumbers(a).reduce((s, x) => s * x, 1),
  AVERAGE: (a) => {
    const ns = collectNumbers(a);
    if (!ns.length)
      throw new FError(ERR.DIV0);
    return ns.reduce((s, x) => s + x, 0) / ns.length;
  },
  MIN: (a) => {
    const ns = collectNumbers(a);
    return ns.length ? Math.min(...ns) : 0;
  },
  MAX: (a) => {
    const ns = collectNumbers(a);
    return ns.length ? Math.max(...ns) : 0;
  },
  COUNT: (a) => collectNumbers(a).length,
  COUNTA: (a) => flatten(a).filter((v) => !isBlank(v)).length,
  MEDIAN: (a) => {
    const ns = collectNumbers(a).slice().sort((x, y) => x - y);
    if (!ns.length)
      throw new FError(ERR.NUM);
    const mid = Math.floor(ns.length / 2);
    return ns.length % 2 ? ns[mid] : (ns[mid - 1] + ns[mid]) / 2;
  },
  // 数学
  ABS: (a) => Math.abs(toNum(a[0])),
  ROUND: (a) => {
    need(a, 1);
    const d = a[1] === void 0 ? 0 : toNum(a[1]);
    const f = Math.pow(10, d);
    return Math.round(toNum(a[0]) * f) / f;
  },
  ROUNDUP: (a) => {
    need(a, 1);
    const d = a[1] === void 0 ? 0 : toNum(a[1]);
    const f = Math.pow(10, d);
    const x = toNum(a[0]) * f;
    return (x < 0 ? -Math.ceil(-x) : Math.ceil(x)) / f;
  },
  ROUNDDOWN: (a) => {
    need(a, 1);
    const d = a[1] === void 0 ? 0 : toNum(a[1]);
    const f = Math.pow(10, d);
    const x = toNum(a[0]) * f;
    return (x < 0 ? -Math.floor(-x) : Math.floor(x)) / f;
  },
  INT: (a) => Math.floor(toNum(a[0])),
  TRUNC: (a) => Math.trunc(toNum(a[0])),
  MOD: (a) => {
    need(a, 2);
    const d = toNum(a[1]);
    if (d === 0)
      throw new FError(ERR.DIV0);
    const n = toNum(a[0]);
    return n - Math.floor(n / d) * d;
  },
  POWER: (a) => Math.pow(toNum(a[0]), toNum(a[1])),
  SQRT: (a) => {
    const n = toNum(a[0]);
    if (n < 0)
      throw new FError(ERR.NUM);
    return Math.sqrt(n);
  },
  CEILING: (a) => {
    need(a, 1);
    const s = a[1] === void 0 ? 1 : toNum(a[1]);
    if (s === 0)
      return 0;
    return Math.ceil(toNum(a[0]) / s) * s;
  },
  FLOOR: (a) => {
    need(a, 1);
    const s = a[1] === void 0 ? 1 : toNum(a[1]);
    if (s === 0)
      throw new FError(ERR.DIV0);
    return Math.floor(toNum(a[0]) / s) * s;
  },
  SIGN: (a) => Math.sign(toNum(a[0])),
  // 逻辑
  AND: (a) => flatten(a).every((v) => truthy(v)),
  OR: (a) => flatten(a).some((v) => truthy(v)),
  NOT: (a) => !truthy(a[0]),
  TRUE: () => true,
  FALSE: () => false,
  ISNUMBER: (a) => typeof a[0] === "number" || typeof a[0] === "string" && asNum(a[0]) !== null,
  ISBLANK: (a) => isBlank(a[0]),
  ISTEXT: (a) => typeof a[0] === "string" && a[0] !== "",
  ISERROR: (a) => typeof a[0] === "string" && a[0].startsWith("#"),
  // 文本
  CONCAT: (a) => flatten(a).map(toStr).join(""),
  CONCATENATE: (a) => flatten(a).map(toStr).join(""),
  LEN: (a) => toStr(a[0]).length,
  UPPER: (a) => toStr(a[0]).toUpperCase(),
  LOWER: (a) => toStr(a[0]).toLowerCase(),
  TRIM: (a) => toStr(a[0]).trim().replace(/\s+/g, " "),
  LEFT: (a) => toStr(a[0]).slice(0, a[1] === void 0 ? 1 : toNum(a[1])),
  RIGHT: (a) => {
    const s = toStr(a[0]);
    const n = a[1] === void 0 ? 1 : toNum(a[1]);
    return n <= 0 ? "" : s.slice(-n);
  },
  MID: (a) => toStr(a[0]).substr(toNum(a[1]) - 1, toNum(a[2])),
  VALUE: (a) => {
    const n = asNum(a[0]);
    if (n === null)
      throw new FError(ERR.VALUE);
    return n;
  },
  REPT: (a) => toStr(a[0]).repeat(Math.max(0, toNum(a[1]))),
  // 条件聚合
  COUNTIF: (a) => flatten([a[0]]).filter((v) => matchCriteria(v, a[1])).length,
  SUMIF: (a) => {
    const range = flatten([a[0]]);
    const sumRange = a[2] !== void 0 ? flatten([a[2]]) : range;
    let s = 0;
    range.forEach((v, i) => {
      if (matchCriteria(v, a[1])) {
        const n = asNum(sumRange[i]);
        if (n !== null)
          s += n;
      }
    });
    return s;
  }
};
function truthy(v) {
  if (Array.isArray(v))
    throw new FError(ERR.VALUE);
  if (typeof v === "boolean")
    return v;
  if (typeof v === "number")
    return v !== 0;
  if (v === null || v === void 0 || v === "")
    return false;
  const n = asNum(v);
  if (n !== null)
    return n !== 0;
  return String(v).toUpperCase() === "TRUE";
}
function evaluateNode(node, ctx, at) {
  switch (node.t) {
    case "num":
      return node.v;
    case "str":
      return node.v;
    case "bool":
      return node.v;
    case "ref":
      return evalRef(node.token, ctx, at);
    case "pct":
      return toNum(evaluateNode(node.e, ctx, at)) / 100;
    case "un": {
      const v = evaluateNode(node.e, ctx, at);
      if (node.op === "-")
        return -toNum(v);
      return toNum(v);
    }
    case "bin": {
      const op = node.op;
      if (op === "&")
        return toStr(evaluateNode(node.l, ctx, at)) + toStr(evaluateNode(node.r, ctx, at));
      if (op === "=" || op === "<>" || op === ">" || op === "<" || op === ">=" || op === "<=") {
        return cmpValues(evaluateNode(node.l, ctx, at), evaluateNode(node.r, ctx, at), op);
      }
      const l = toNum(evaluateNode(node.l, ctx, at));
      const r = toNum(evaluateNode(node.r, ctx, at));
      switch (op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0)
            throw new FError(ERR.DIV0);
          return l / r;
        case "^":
          return Math.pow(l, r);
      }
      throw new FError(ERR.VALUE);
    }
    case "func": {
      if (node.name === "IF") {
        need(node.args, 2);
        const cond = truthy(evaluateNode(node.args[0], ctx, at));
        return cond ? evaluateNode(node.args[1], ctx, at) : node.args.length >= 3 ? evaluateNode(node.args[2], ctx, at) : false;
      }
      if (node.name === "IFERROR") {
        need(node.args, 2);
        try {
          const v = evaluateNode(node.args[0], ctx, at);
          if (isBlank(v) && v !== 0)
            return evaluateNode(node.args[1], ctx, at);
          return v;
        } catch (e) {
          if (e instanceof FError)
            return evaluateNode(node.args[1], ctx, at);
          throw e;
        }
      }
      const fn = FUNCS[node.name];
      if (!fn)
        throw new FError(ERR.NAME);
      const args = node.args.map((a) => evaluateNode(a, ctx, at));
      return fn(args, (n) => evaluateNode(n, ctx, at));
    }
  }
}
function evaluateAst(ast, ctx, at) {
  try {
    return normalizeResult(evaluateNode(ast, ctx, at));
  } catch (e) {
    if (e instanceof FError)
      return e.code;
    return ERR.VALUE;
  }
}
function normalizeResult(v) {
  if (typeof v === "number") {
    if (!isFinite(v))
      throw new FError(ERR.NUM);
    return v;
  }
  if (typeof v === "boolean")
    return v;
  if (v === null || v === void 0)
    return "";
  if (Array.isArray(v))
    throw new FError(ERR.VALUE);
  return v;
}
const keyMap = /* @__PURE__ */ new WeakMap();
function rowKeyOf(row, keyField) {
  if (keyField && row[keyField] != null)
    return row[keyField];
  let k = keyMap.get(row);
  if (k == null) {
    k = uid("row");
    keyMap.set(row, k);
  }
  return k;
}
const FILTER_OPS = {
  text: [
    { label: "包含", labelKey: "opContains", value: "contains" },
    { label: "不等于", labelKey: "opNe", value: "ne" },
    { label: "等于", labelKey: "opEq", value: "eq" },
    { label: "开头是", labelKey: "opStartsWith", value: "startsWith" },
    { label: "结尾是", labelKey: "opEndsWith", value: "endsWith" },
    { label: "为空", labelKey: "opBlank", value: "blank" },
    { label: "不为空", labelKey: "opNotBlank", value: "notBlank" }
  ],
  number: [
    { label: "等于", labelKey: "opEq", value: "eq" },
    { label: "不等于", labelKey: "opNe", value: "ne" },
    { label: "大于", labelKey: "opGt", value: "gt" },
    { label: "大于等于", labelKey: "opGte", value: "gte" },
    { label: "小于", labelKey: "opLt", value: "lt" },
    { label: "小于等于", labelKey: "opLte", value: "lte" },
    { label: "介于", labelKey: "opInRange", value: "inRange", v2: true }
  ],
  date: [
    { label: "等于", labelKey: "opEq", value: "eq" },
    { label: "早于", labelKey: "opBefore", value: "lt" },
    { label: "晚于", labelKey: "opAfter", value: "gt" },
    { label: "介于", labelKey: "opInRange", value: "inRange", v2: true }
  ],
  select: [
    { label: "包括（多选）", labelKey: "opInMulti", value: "in" },
    { label: "不包含（多选）", labelKey: "opNotInMulti", value: "notIn" }
  ]
};
const toTime = (v) => {
  if (v == null || v === "")
    return NaN;
  if (typeof v === "number")
    return v;
  if (v instanceof Date)
    return v.getTime();
  const s = String(v);
  const t = new Date(/^\d+$/.test(s) ? Number(s) : s.replace(/-/g, "/")).getTime();
  return isNaN(t) ? new Date(s).getTime() : t;
};
const dayTime = (v) => {
  const d = new Date(v);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
function matchCondition(cellVal, op, v1, v2, filterType) {
  const empty = cellVal == null || cellVal === "";
  switch (op) {
    case "blank":
      return empty;
    case "notBlank":
      return !empty;
    case "contains":
      return !empty && String(cellVal).toLowerCase().includes(String(v1).toLowerCase());
    case "startsWith":
      return !empty && String(cellVal).toLowerCase().startsWith(String(v1).toLowerCase());
    case "endsWith":
      return !empty && String(cellVal).toLowerCase().endsWith(String(v1).toLowerCase());
    case "eq":
      if (filterType === "date")
        return !empty && dayTime(toTime(cellVal)) === dayTime(toTime(v1));
      if (filterType === "number")
        return Number(cellVal) === Number(v1);
      return String(cellVal ?? "") === String(v1 ?? "");
    case "ne":
      return !matchCondition(cellVal, "eq", v1, v2, filterType);
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (empty || v1 == null || v1 === "")
        return false;
      if (filterType === "date") {
        const a2 = toTime(cellVal);
        const b2 = toTime(v1);
        if (op === "gt")
          return a2 > b2;
        if (op === "gte")
          return a2 >= b2;
        if (op === "lt")
          return a2 < b2;
        return a2 <= b2;
      }
      const a = Number(cellVal);
      const b = Number(v1);
      if (op === "gt")
        return a > b;
      if (op === "gte")
        return a >= b;
      if (op === "lt")
        return a < b;
      return a <= b;
    }
    case "inRange": {
      if (empty)
        return false;
      if (filterType === "date") {
        const a2 = toTime(cellVal);
        return a2 >= toTime(v1) && a2 <= dayTime(toTime(v2)) + 86399999;
      }
      const a = Number(cellVal);
      return a >= Number(v1) && a <= Number(v2);
    }
    case "in":
      return Array.isArray(v1) ? v1.map(String).includes(String(cellVal)) : false;
    case "notIn":
      return Array.isArray(v1) ? !v1.map(String).includes(String(cellVal)) : false;
    default:
      return true;
  }
}
function filterTypeOf(col) {
  if (typeof col.filter === "string")
    return col.filter;
  if (col.type === "num" || col.type === "money" || col.type === "percent")
    return "number";
  if (col.type === "date" || col.type === "datetime")
    return "date";
  return "text";
}
function matchFloatFilter(cellVal, raw, type) {
  const s = (raw || "").trim();
  if (!s)
    return true;
  if (type === "select") {
    const tokens = s.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tokens.length)
      return true;
    return tokens.map(String).includes(String(cellVal ?? ""));
  }
  if (cellVal == null || cellVal === "")
    return false;
  if (type === "number") {
    const range = s.split(/~|\.\.|\u2013/);
    if (range.length === 2) {
      const a = Number(range[0]);
      const b = Number(range[1]);
      const v2 = Number(cellVal);
      return (!isNaN(a) ? v2 >= a : true) && (!isNaN(b) ? v2 <= b : true);
    }
    const m = s.match(/^(>=|<=|>|<|=)?\s*(-?[\d.]+)$/);
    if (!m)
      return String(cellVal).toLowerCase().includes(s.toLowerCase());
    const v = Number(cellVal);
    const n = Number(m[2]);
    switch (m[1] || "=") {
      case ">":
        return v > n;
      case "<":
        return v < n;
      case ">=":
        return v >= n;
      case "<=":
        return v <= n;
      default:
        return v === n;
    }
  }
  if (type === "date") {
    const parts = s.split(/~|\uff5e/).map((x) => x.trim()).filter(Boolean);
    if (parts.length === 2) {
      const a2 = toTime(parts[0]);
      const b2 = dayTime(toTime(parts[1])) + 86399999;
      const t = toTime(cellVal);
      return t >= a2 && t <= b2;
    }
    const m = s.match(/^(>=|<=|>|<|=)?\s*(.+)$/);
    const op = (m == null ? void 0 : m[1]) || "=";
    const a = dayTime(toTime(cellVal));
    const b = dayTime(toTime(m ? m[2] : s));
    if (isNaN(a) || isNaN(b))
      return false;
    switch (op) {
      case ">":
        return a > b;
      case "<":
        return a < b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
      default:
        return a === b;
    }
  }
  return String(cellVal).toLowerCase().includes(s.toLowerCase());
}
const fxMap = /* @__PURE__ */ new WeakMap();
function rawCellValue(col, row) {
  if (!col || !row)
    return void 0;
  if (row.__group)
    return void 0;
  const vg = col.valueGetter;
  if (!vg)
    return getValueByPath(row, col.field);
  if (typeof vg === "function")
    return vg(row);
  if (isExpression(vg)) {
    const fn = compileExpression(vg);
    if (fn)
      return fn({
        value: getValueByPath(row, col.field),
        data: row,
        row,
        node: row,
        colId: colIdOf(col),
        column: col
      });
  }
  return void 0;
}
function cellRawValue(col, row) {
  if (!col)
    return void 0;
  if (row.__group) {
    const agg = row.__agg;
    const id = colIdOf(col);
    if (agg && id in agg)
      return agg[id];
    if (col.field && col.field in row && !col.__isGroupValue)
      return row[col.field];
    return void 0;
  }
  const fx = fxMap.get(row);
  if (fx) {
    const id = colIdOf(col);
    if (id in fx)
      return fx[id];
  }
  const vg = col.valueGetter;
  if (!vg)
    return getValueByPath(row, col.field);
  if (typeof vg === "function")
    return vg(row);
  if (isExpression(vg)) {
    const fn = compileExpression(vg);
    if (fn)
      return fn({
        value: getValueByPath(row, col.field),
        data: row,
        row,
        node: row,
        colId: colIdOf(col),
        column: col
      });
  }
  return void 0;
}
function isPivotValueCol(c) {
  if (!c.aggFunc)
    return false;
  if (c.type === "num" || c.type === "money" || c.type === "percent")
    return true;
  const key = c.field || colIdOf(c);
  return !!key && !/name|code|no$/i.test(key);
}
function pivotValueKey(c) {
  return c.field || colIdOf(c);
}
const ROW_MODEL_LABELS_ZH = {
  total: "合计",
  grandTotal: "总计",
  totalOf: (title) => `总${title}`
};
function useRowModel(userRows, opts) {
  let internalRows = null;
  const L = () => {
    var _a;
    return ((_a = opts.labels) == null ? void 0 : _a.call(opts)) ?? ROW_MODEL_LABELS_ZH;
  };
  const rev = ref(0);
  const serverRev = ref(0);
  const serverRows = ref([]);
  const serverTotal = ref(0);
  const loadingMore = ref(false);
  const serverLoading = ref(false);
  let serverLoadedCount = 0;
  watch(
    userRows,
    (v) => {
      if (opts.dataMode() === "client") {
        internalRows = null;
        serverRows.value = [];
        rev.value++;
      } else {
        reloadServer();
      }
    },
    { flush: "post" }
  );
  const sourceRows = () => {
    const mode = opts.dataMode();
    if (mode === "serverSide")
      return ssrmStore().slots.filter(Boolean);
    if (mode !== "client")
      return serverRows.value;
    if (!internalRows)
      internalRows = userRows().slice();
    return internalRows;
  };
  function touch() {
    rev.value++;
  }
  const orderRev = ref(0);
  function touchOrder() {
    orderRev.value++;
  }
  const flashRows = ref(/* @__PURE__ */ new Set());
  function applyTransaction(tx) {
    var _a, _b, _c, _d, _e, _f;
    if (opts.dataMode() === "serverSide") {
      const s = ssrmStore();
      const res = s.applyDelta(tx);
      if (res.flash.length) {
        res.flash.forEach((k) => flashRows.value.add(k));
        setTimeout(() => flashRows.value = /* @__PURE__ */ new Set(), 900);
      }
      serverTotal.value = s.rowCount > 0 ? s.rowCount : serverTotal.value;
      serverRev.value++;
      return;
    }
    if (opts.dataMode() !== "client") {
      if ((_a = tx.add) == null ? void 0 : _a.length)
        serverRows.value.push(...tx.add);
      if ((_b = tx.update) == null ? void 0 : _b.length) {
        const key2 = opts.rowKey();
        tx.update.forEach((u) => {
          const i = serverRows.value.findIndex((r) => r[key2] === u[key2]);
          if (i >= 0)
            serverRows.value[i] = u;
        });
      }
      serverRev.value++;
      return;
    }
    const rows = sourceRows();
    const key = opts.rowKey();
    const keyOf = (r) => key ? r[key] : rowKeyOf(r);
    if ((_c = tx.remove) == null ? void 0 : _c.length) {
      const del = new Set(tx.remove.map(keyOf));
      const kept = rows.filter((r) => !del.has(keyOf(r)));
      rows.length = 0;
      rows.push(...kept);
    }
    if ((_d = tx.update) == null ? void 0 : _d.length) {
      tx.update.forEach((u) => {
        const i = rows.findIndex((r) => keyOf(r) === keyOf(u));
        if (i >= 0) {
          rows[i] = u;
          flashRows.value.add(keyOf(u));
        }
      });
    }
    if ((_e = tx.upsert) == null ? void 0 : _e.length) {
      tx.upsert.forEach((u) => {
        const i = rows.findIndex((r) => keyOf(r) === keyOf(u));
        if (i >= 0)
          rows[i] = u;
        else
          rows.unshift(u);
      });
    }
    if ((_f = tx.add) == null ? void 0 : _f.length) {
      if (tx.addIndex != null && tx.addIndex >= 0)
        rows.splice(tx.addIndex, 0, ...tx.add);
      else
        rows.push(...tx.add);
      tx.add.forEach((r) => flashRows.value.add(keyOf(r)));
    }
    rev.value++;
    setTimeout(() => {
      flashRows.value = /* @__PURE__ */ new Set();
    }, 900);
  }
  function setRowValue(row, col, value) {
    if (col.valueGetter || !col.field)
      return false;
    const ok = setValueByPath(row, col.field, value === "" ? null : value);
    flashRows.value.add(rowKeyOf(row, opts.rowKey()));
    setTimeout(() => flashRows.value = /* @__PURE__ */ new Set(), 900);
    touch();
    return ok;
  }
  function setRowData(rows) {
    internalRows = rows.slice();
    serverRows.value = [];
    touch();
  }
  let loadCtx = { sort: [], filters: [], quickFilterText: "", floatFilters: [] };
  let loadSeq = 0;
  function setLoadCtx(ctx) {
    loadCtx = ctx;
  }
  async function fetchServer(reset, startOverride) {
    const mode = opts.dataMode();
    if (mode === "client" || !opts.loadData)
      return;
    const seq = ++loadSeq;
    const pageSize = mode === "pagination" ? opts.pageSize() : Math.max(opts.pageSize(), 100);
    const start = startOverride ?? (reset ? 0 : serverLoadedCount);
    serverLoading.value = !reset || start === 0;
    loadingMore.value = reset || start > 0;
    try {
      const page = Math.floor(start / pageSize) + 1;
      const res = await opts.loadData({
        start,
        end: start + pageSize - 1,
        page,
        pageSize,
        sort: loadCtx.sort,
        filters: loadCtx.filters,
        quickFilterText: loadCtx.quickFilterText,
        floatFilters: loadCtx.floatFilters || [],
        rowGroup: loadCtx.rowGroup || [],
        advancedFilter: loadCtx.advancedFilter || null,
        queryConditions: queryConditions.value.slice()
      });
      if (seq !== loadSeq)
        return;
      const list = res.rows || res.list || [];
      serverTotal.value = res.total ?? list.length;
      if (reset) {
        serverRows.value = list;
        if (serverGroupKids.value.size || serverGroupLoading.value.size)
          resetServerGroupView(false);
      } else {
        serverRows.value = serverRows.value.concat(list);
      }
      serverLoadedCount = start + list.length;
      serverRev.value++;
    } finally {
      if (seq === loadSeq) {
        serverLoading.value = false;
        loadingMore.value = false;
      }
    }
  }
  function fetchPage(page, size) {
    return fetchServer(true, (page - 1) * size);
  }
  function reloadServer() {
    if (opts.dataMode() === "serverSide") {
      purgeServerSideCache();
      return;
    }
    serverLoadedCount = 0;
    fetchServer(true);
  }
  function fetchMore() {
    const mode = opts.dataMode();
    if (mode === "client" || !opts.loadData)
      return;
    if (loadingMore.value || serverLoading.value)
      return;
    if (mode === "infinite" && serverLoadedCount >= serverTotal.value && serverTotal.value > 0)
      return;
    fetchServer(false);
  }
  function allServerLoaded() {
    return opts.dataMode() !== "infinite" || serverTotal.value > 0 && serverLoadedCount >= serverTotal.value;
  }
  let ssrm = null;
  function ssrmStore() {
    if (!ssrm) {
      ssrm = new SsrmStore({
        blockSize: opts.ssrmBlockSize ? opts.ssrmBlockSize() : 100,
        maxBlocksInCache: opts.ssrmMaxBlocks ? opts.ssrmMaxBlocks() : 10,
        cacheOverflow: opts.ssrmOverflow ? opts.ssrmOverflow() : 4,
        keyOf: (r) => {
          const k = opts.rowKey();
          return k && r[k] != null ? r[k] : rowKeyOf(r);
        }
      });
    }
    return ssrm;
  }
  let ssrmBusy = false;
  const ssrmBatcher = new SsrmTxBatcher((tx) => {
    const s = ssrmStore();
    const res = s.applyDelta(tx);
    if (res.flash.length) {
      res.flash.forEach((k) => flashRows.value.add(k));
      setTimeout(() => flashRows.value = /* @__PURE__ */ new Set(), 900);
    }
    serverTotal.value = s.rowCount > 0 ? s.rowCount : serverTotal.value;
    serverRev.value++;
  });
  async function ssrmLoadBlock(s, b) {
    if (!opts.loadData || s.isBlockBusy(b))
      return false;
    const start = s.startRowOf(b);
    const end = start + s.blockSize - 1;
    const seq = s.beginLoad(b);
    try {
      const res = await opts.loadData({
        start,
        end,
        page: Math.floor(start / s.blockSize) + 1,
        pageSize: s.blockSize,
        sort: loadCtx.sort,
        filters: loadCtx.filters,
        quickFilterText: loadCtx.quickFilterText,
        floatFilters: loadCtx.floatFilters || [],
        rowGroup: loadCtx.rowGroup || [],
        advancedFilter: loadCtx.advancedFilter || null,
        queryConditions: queryConditions.value.slice(),
        type: "select"
      });
      const list = res.rows || res.list || [];
      const total = res.total != null ? res.total : res.lastRow;
      if (typeof total === "number" && total >= 0) {
        s.configure(total);
        serverTotal.value = total;
      }
      const applied = s.commitLoad(b, seq, list);
      if (applied)
        serverRev.value++;
      return applied;
    } catch {
      s.failLoad(b, seq);
      return false;
    }
  }
  async function ensureServerBlocks(first, last) {
    var _a;
    if (opts.dataMode() !== "serverSide" || !opts.loadData)
      return;
    const s0 = ssrmStore();
    if (s0.rowCount <= 0) {
      serverLoading.value = true;
      await ssrmLoadBlock(s0, 0);
      serverLoading.value = false;
      serverRev.value++;
    }
    if (((_a = opts.serverGrouping) == null ? void 0 : _a.call(opts)) && rowGroupFields.value.length) {
      let lo = -1;
      let hi = -1;
      for (let i = first; i <= last; i++) {
        const a = sgAbsAt[i];
        if (a == null || a < 0)
          continue;
        if (lo < 0 || a < lo)
          lo = a;
        if (a > hi)
          hi = a;
      }
      if (lo < 0)
        return;
      first = lo;
      last = hi;
    }
    const s = ssrmStore();
    if (ssrmBusy)
      return;
    const need2 = s.planLoad(first, last, s.blockSize);
    if (!need2.length)
      return;
    ssrmBusy = true;
    try {
      await Promise.all(need2.map((b) => ssrmLoadBlock(s, b)));
      const evicted = s.prune(s.keepSet(first, last));
      serverRev.value++;
    } finally {
      ssrmBusy = false;
    }
  }
  function purgeServerSideCache() {
    if (ssrm)
      ssrm.reset();
    serverTotal.value = 0;
    resetServerGroupView(false);
    serverRev.value++;
  }
  async function refreshServerSide(purge = true) {
    if (purge)
      purgeServerSideCache();
    await ensureServerBlocks(0, ssrmStore().blockSize - 1);
  }
  const quickFilter = ref("");
  const filterModels = reactive(/* @__PURE__ */ new Map());
  const queryConditions = ref([]);
  const floatFilters = reactive(/* @__PURE__ */ new Map());
  const advancedFilter = ref(null);
  const sortStates = ref([]);
  const rowGroupFields = ref([]);
  const rowLimit = ref(0);
  const pivotState = ref({ cols: [], values: [], active: false });
  const expandedGroups = ref(/* @__PURE__ */ new Set());
  const expandedTree = ref(/* @__PURE__ */ new Set());
  const expandedDetails = ref(/* @__PURE__ */ new Set());
  const defaultExpandAll = ref(false);
  const firstExpansionDone = ref(false);
  function passFilter(rows, cols) {
    const queryConds = activeQueryConditions(queryConditions.value);
    const queryColOf = queryConds.length ? (f) => cols.find((c) => c.field === f || colIdOf(c) === f) : void 0;
    if (queryConds.length && queryColOf) {
      rows = rows.filter(
        (row) => queryConds.every((c) => {
          const col = queryColOf(c.field);
          const raw = (col == null ? void 0 : col.filterValueGetter) ? col.filterValueGetter(row) : col ? cellRawValue(col, row) : getValueByPath(row, c.field);
          return matchQueryValue(raw, c, col ? kindOfColumn(col) : "text");
        })
      );
    }
    const active = cols.filter((c) => filterModels.has(colIdOf(c))).map((c) => ({ col: c, model: filterModels.get(colIdOf(c)), type: filterTypeOf(c) }));
    const floats = Array.from(floatFilters.entries()).filter(([, v]) => v && v.trim());
    const colById = new Map(cols.map((c) => [colIdOf(c), c]));
    const quick = quickFilter.value.trim().toLowerCase();
    const quickCols = quick ? cols.filter(
      (c) => c.field && c.filter !== false && !c.checkbox && !c.rowDrag && c.type !== "link" && c.type !== "image"
    ) : [];
    if (!active.length && !quick && !floats.length && !advancedFilter.value)
      return rows;
    const adv = advancedFilter.value;
    return rows.filter((row) => {
      for (const { col, model, type } of active) {
        const val = col.filterValueGetter ? col.filterValueGetter(row) : cellRawValue(col, row);
        const ok = evalConditions(
          model.conditions,
          model.operator,
          (cond) => matchCondition(val, cond.op, cond.value1, cond.value2, type)
        );
        if (!ok)
          return false;
      }
      if (adv) {
        const okAdv = evalAdvancedFilter(adv, (ac) => {
          const col = colById.get(ac.colId);
          if (!col)
            return true;
          const val = col.filterValueGetter ? col.filterValueGetter(row) : cellRawValue(col, row);
          return matchCondition(
            val,
            ac.condition.op,
            ac.condition.value1,
            ac.condition.value2,
            ac.filterType || filterTypeOf(col)
          );
        });
        if (!okAdv)
          return false;
      }
      for (const [id, raw] of floats) {
        const col = colById.get(id);
        if (!col)
          continue;
        const val = col.filterValueGetter ? col.filterValueGetter(row) : cellRawValue(col, row);
        if (!matchFloatFilter(val, raw, filterTypeOf(col)))
          return false;
      }
      if (quick) {
        const hit = quickCols.some((c) => {
          const v = cellRawValue(c, row);
          return v != null && String(v).toLowerCase().includes(quick);
        });
        if (!hit)
          return false;
      }
      return true;
    });
  }
  function comparatorOf(col, dir) {
    const sign = dir === "asc" ? 1 : -1;
    return (a, b) => {
      var _a, _b;
      const va = col ? cellRawValue(col, a) : (_a = a.__group) == null ? void 0 : _a.v;
      const vb = col ? cellRawValue(col, b) : (_b = b.__group) == null ? void 0 : _b.v;
      if (col == null ? void 0 : col.comparator)
        return col.comparator(va, vb, a, b) * sign;
      return defaultComparator(va, vb) * sign;
    };
  }
  function sortRows(rows, cols) {
    if (!sortStates.value.length)
      return rows;
    const accessors = sortStates.value.map((s) => {
      const col = cols.find((c) => c.field === s.field || colIdOf(c) === s.field);
      return { col, sign: s.dir === "asc" ? 1 : -1 };
    });
    const decorated = rows.map((r) => ({
      r,
      vals: accessors.map((a) => a.col ? cellRawValue(a.col, r) : void 0)
    }));
    decorated.sort((x, y) => {
      for (let i = 0; i < accessors.length; i++) {
        const { col, sign } = accessors[i];
        const va = x.vals[i];
        const vb = y.vals[i];
        const cmp = (col == null ? void 0 : col.comparator) ? col.comparator(va, vb, x.r, y.r) : defaultComparator(va, vb);
        if (cmp !== 0)
          return cmp * sign;
      }
      return 0;
    });
    return decorated.map((d) => d.r);
  }
  function buildGroupTree(rows, fields, cols) {
    const groupCols = fields.map((f) => cols.find((c) => c.field === f || colIdOf(c) === f));
    const build = (level, list, parentPath) => {
      if (level >= fields.length)
        return [];
      const map = /* @__PURE__ */ new Map();
      list.forEach((r) => {
        const v = cellRawValue(groupCols[level], r) ?? "";
        if (!map.has(v))
          map.set(v, []);
        map.get(v).push(r);
      });
      const nodes = [];
      Array.from(map.entries()).sort((a, b) => defaultComparator(a[0], b[0])).forEach(([value, bucket]) => {
        const path = `${parentPath}|${level}|${String(value)}`;
        const node = {
          value,
          rows: bucket,
          children: build(level + 1, bucket, path),
          depth: level,
          path
        };
        nodes.push(node);
      });
      return nodes;
    };
    return build(0, rows, "");
  }
  function makeGroupRow(node, cols, fields, labels = []) {
    const agg = {};
    cols.forEach((c) => {
      if (!c.aggFunc)
        return;
      const vals = node.rows.map((r) => cellRawValue(c, r));
      agg[colIdOf(c)] = runAgg(c.aggFunc, node.rows, vals);
    });
    const data = {
      __group: true,
      __agg: agg,
      __count: node.rows.length,
      __path: node.path,
      __level: node.depth,
      __groupField: fields[node.depth],
      __groupValue: node.value,
      __groupLabels: labels.length ? labels : [node.value]
    };
    data[fields[node.depth]] = node.value;
    if (opts.groupLabelOf) {
      const colOfField = (f) => cols.find((c) => f && c.field === f || !!f && colIdOf(c) === f);
      data.__groupLabels = data.__groupLabels.map(
        (v, i) => opts.groupLabelOf(colOfField(fields[i]), v, data)
      );
    }
    return data;
  }
  function flattenGroups(nodes, out, cols, fields, parentKey, parentLabels = []) {
    var _a;
    const dir = ((_a = sortStates.value.find((s) => fields.includes(s.field))) == null ? void 0 : _a.dir) || "asc";
    const ordered = dir === "desc" ? nodes.slice().reverse() : nodes;
    ordered.forEach((node) => {
      var _a2;
      const labels = [...parentLabels, node.value];
      const groupRow = makeGroupRow(node, cols, fields, labels);
      const key = node.path;
      const expanded = defaultExpandAll.value ? true : expandedGroups.value.has(key) || !firstExpansionDone.value && true;
      out.push({
        key,
        type: "group",
        data: groupRow,
        level: node.depth,
        parentKey,
        expanded,
        height: opts.rowHeight()
      });
      if (expanded) {
        if (node.children.length)
          flattenGroups(node.children, out, cols, fields, key, labels);
        else
          node.rows.forEach((r) => pushDataRow(out, r, node.depth + 1, key));
        if ((_a2 = opts.groupFooter) == null ? void 0 : _a2.call(opts))
          out.push({
            key: key + ":footer",
            type: "group",
            data: groupRow,
            level: node.depth,
            parentKey: key,
            expanded: true,
            isFooter: true,
            height: opts.rowHeight()
          });
      }
    });
  }
  function pushDataRow(out, r, level, parentKey) {
    const key = rowKeyOf(r, opts.rowKey());
    out.push({ key, type: "row", data: r, level: 0, parentKey, height: opts.rowHeight() });
    if (level > 0)
      out[out.length - 1].level = 0;
    if (opts.hasDetailSlot() && expandedDetails.value.has(key))
      out.push({
        key: `detail:${key}`,
        type: "detail",
        data: r,
        level,
        parentKey: key,
        height: opts.detailHeight()
      });
    else if (opts.isFullWidthRow(r))
      out.push({
        key: `fw:${key}`,
        type: "fullwidth",
        data: r,
        level,
        parentKey: key,
        height: opts.fullWidthHeight()
      });
  }
  function buildTreeRows(rows) {
    const childrenField = opts.childrenField();
    const parentField = opts.parentField();
    const childrenMap = /* @__PURE__ */ new Map();
    let roots;
    if (parentField) {
      const byKey = /* @__PURE__ */ new Map();
      rows.forEach((r) => byKey.set(r[opts.rowKey() || "id"], r));
      roots = [];
      rows.forEach((r) => {
        const p = byKey.get(r[parentField]);
        if (p && p !== r) {
          if (!childrenMap.has(p))
            childrenMap.set(p, []);
          childrenMap.get(p).push(r);
        } else
          roots.push(r);
      });
    } else {
      roots = rows;
    }
    if (!parentField) {
      const walk = (list) => {
        for (const r of list) {
          const kids = r[childrenField];
          if (Array.isArray(kids) && kids.length) {
            childrenMap.set(r, kids);
            walk(kids);
          }
        }
      };
      walk(rows);
    }
    return { roots, childrenMap };
  }
  function flattenTree(rows, cols, out, childrenMap, level) {
    const sorted = sortRows(rows, cols);
    sorted.forEach((r) => {
      const key = rowKeyOf(r, opts.rowKey());
      const kids = childrenMap.get(r);
      out.push({
        key,
        type: "row",
        data: r,
        level,
        expanded: (kids == null ? void 0 : kids.length) ? defaultExpandAll.value ? true : expandedTree.value.has(String(key)) : void 0,
        height: opts.rowHeight()
      });
      if ((kids == null ? void 0 : kids.length) && out[out.length - 1].expanded)
        flattenTree(kids, cols, out, childrenMap, level + 1);
    });
  }
  function collectTreeKeys(rows, childrenMap, out) {
    rows.forEach((r) => {
      out.add(String(rowKeyOf(r, opts.rowKey())));
      const kids = childrenMap.get(r) || r[opts.childrenField()];
      if (Array.isArray(kids) && kids.length)
        collectTreeKeys(kids, childrenMap, out);
    });
  }
  const PIVOT_MAX_COMBOS = 200;
  function buildPivotCols(cols) {
    const { cols: pivotFields, values: valueFields, active } = pivotState.value;
    if (!active || !pivotFields.length)
      return [];
    const src = pivotDimCols(cols, pivotFields);
    if (!src.length)
      return [];
    const combos = [[]];
    src.forEach((c) => {
      const vals = Array.from(
        new Set(
          sourceRows().slice(0, 2e4).map((r) => cellRawValue(c, r)).filter((v) => v != null && v !== "").map(String)
        )
      ).sort();
      for (let i = combos.length - 1; i >= 0; i--) {
        const base = combos.splice(i, 1)[0];
        vals.forEach((v) => combos.push([...base, v]));
      }
    });
    if (combos.length > PIVOT_MAX_COMBOS)
      combos.length = PIVOT_MAX_COMBOS;
    const valueCols = pivotValueCols(cols, valueFields);
    if (!valueCols.length)
      return [];
    const rowDimFields = rowGroupFields.value;
    const out = rowDimFields.map((f, i) => {
      const c = cols.find((x) => x.field === f || colIdOf(x) === f);
      return {
        field: `__pvrow${i}:${f}`,
        colId: `__pvrow${i}:${f}`,
        title: (c == null ? void 0 : c.title) || f,
        width: 120,
        rowGroup: true
      };
    });
    combos.forEach((combo) => {
      const comboTitle = combo.join(" / ");
      const group = {
        colId: `__pv:${combo.join("_")}`,
        title: comboTitle,
        children: valueCols.map((vc) => ({
          field: `__pvv:${combo.join("_")}:${pivotValueKey(vc)}`,
          colId: `__pvv:${combo.join("_")}:${pivotValueKey(vc)}`,
          title: vc.title || pivotValueKey(vc),
          width: 100,
          // percent / money 必须原样透传：压成 num 会让透视格露出裸浮点（0.5072135976828828 而不是 50.72%）
          type: vc.type === "money" || vc.type === "percent" ? vc.type : "num",
          // 源度量列的 formatter 一并继承：否则同一列在透视前后口径不一致（普通格 7,878.04 / 透视格 ¥7,878.04）
          formatter: vc.formatter,
          align: "right",
          aggFunc: vc.aggFunc || "sum"
        }))
      };
      out.push(group);
    });
    if (combos.length > 1 && valueCols.length) {
      const totalGroup = {
        colId: "__pvtotal",
        title: L().total,
        children: valueCols.map((vc) => ({
          field: `__pvt:${pivotValueKey(vc)}`,
          colId: `__pvt:${pivotValueKey(vc)}`,
          title: L().totalOf(vc.title || pivotValueKey(vc) || ""),
          width: 110,
          type: vc.type === "money" || vc.type === "percent" ? vc.type : "num",
          formatter: vc.formatter,
          align: "right",
          aggFunc: vc.aggFunc || "sum"
        }))
      };
      out.push(totalGroup);
    }
    return out;
  }
  function buildPivotRows(rows, cols) {
    const out = [];
    const { cols: pivotFields, values: valueFields, active } = pivotState.value;
    if (!active || !pivotFields.length)
      return out;
    const srcCols = pivotDimCols(cols, pivotFields);
    const valueCols = pivotValueCols(cols, valueFields);
    const combos = Array.from(
      new Set(rows.map((r) => srcCols.map((c) => String(cellRawValue(c, r) ?? "")).join("")))
    ).sort().slice(0, PIVOT_MAX_COMBOS);
    const rowDims = rowGroupFields.value;
    const hasTotalCol = combos.length > 1 && valueCols.length > 0;
    const aggRowSet = (rowSet) => {
      const agg = {};
      const buckets = /* @__PURE__ */ new Map();
      rowSet.forEach((r) => {
        const k = srcCols.map((c) => String(cellRawValue(c, r) ?? "")).join("");
        const b = buckets.get(k);
        if (b)
          b.push(r);
        else
          buckets.set(k, [r]);
      });
      combos.forEach((comboKey) => {
        const subset = buckets.get(comboKey) || [];
        valueCols.forEach((vc) => {
          const id = `__pvv:${comboKey.replace(/\u0001/g, "_")}:${pivotValueKey(vc)}`;
          agg[id] = runAgg(
            vc.aggFunc || "sum",
            subset,
            subset.map((r) => cellRawValue(vc, r))
          );
        });
      });
      if (hasTotalCol)
        valueCols.forEach((vc) => {
          agg[`__pvt:${pivotValueKey(vc)}`] = runAgg(
            vc.aggFunc || "sum",
            rowSet,
            rowSet.map((r) => cellRawValue(vc, r))
          );
        });
      return agg;
    };
    const renderRow = (dimRows, labelVals, path) => {
      const agg = aggRowSet(dimRows);
      const data = {
        __group: true,
        __agg: agg,
        __pivot: true,
        __path: path,
        __level: 0,
        __count: dimRows.length,
        __groupValue: labelVals.length ? labelVals[labelVals.length - 1] : L().grandTotal,
        __groupLabels: labelVals.length ? labelVals : [L().grandTotal]
      };
      srcCols.forEach((c) => {
        data[c.field] = void 0;
      });
      labelVals.forEach((v, i) => {
        data[`__pvrow${i}:${rowDims[i]}`] = v;
      });
      out.push({ key: path, type: "group", data, level: 0, height: opts.rowHeight() });
    };
    if (rowDims.length) {
      const tree = buildGroupTree(rows, rowDims, cols);
      const walk = (nodes, labels, path) => {
        nodes.forEach((n) => {
          const np = `${path}|${n.depth}|${String(n.value)}`;
          const nl = [...labels, n.value];
          if (!n.children.length)
            renderRow(n.rows, nl, np);
          else {
            renderRow(n.rows, nl, np);
            walk(n.children, nl, np);
          }
        });
      };
      walk(tree, [], "");
      if (out.length > 1) {
        const totalAgg = aggRowSet(rows);
        const totalData = {
          __group: true,
          __agg: totalAgg,
          __pivot: true,
          __pivotTotal: true,
          __path: "__grandtotal",
          __level: 0,
          __count: rows.length,
          __groupValue: L().grandTotal
        };
        srcCols.forEach((c) => {
          totalData[c.field] = void 0;
        });
        if (rowDims[0])
          totalData[`__pvrow0:${rowDims[0]}`] = L().grandTotal;
        out.push({
          key: "__grandtotal",
          type: "group",
          data: totalData,
          level: 0,
          height: opts.rowHeight()
        });
      }
    } else {
      renderRow(rows, [], "__total");
    }
    return out;
  }
  function collectLeaf(cols) {
    const out = [];
    cols.forEach((c) => {
      var _a;
      if ((_a = c.children) == null ? void 0 : _a.length)
        out.push(...collectLeaf(c.children));
      else
        out.push(c);
    });
    return out;
  }
  function pivotDimCols(source, fields) {
    return collectLeaf(source).filter(
      (c) => fields.includes(c.field) || fields.includes(colIdOf(c))
    );
  }
  function pivotValueCols(source, valueFields) {
    const leaves = collectLeaf(source);
    if (valueFields.length) {
      const picked = leaves.filter(
        (c) => valueFields.includes(c.field) || valueFields.includes(colIdOf(c))
      );
      if (picked.length)
        return picked;
    }
    return leaves.filter(isPivotValueCol);
  }
  const sourceColsRef = ref([]);
  const pivotCols = (allCols) => {
    sourceColsRef.value = allCols;
    if (!pivotState.value.active)
      return [];
    return buildPivotCols(allCols);
  };
  let fxApplied = [];
  function clearFx() {
    for (let i = 0; i < fxApplied.length; i++)
      fxMap.delete(fxApplied[i]);
    fxApplied = [];
  }
  function applyFormulas(rows, cols) {
    const n = rows.length;
    const kf = opts.rowKey();
    const idxOf = /* @__PURE__ */ new Map();
    cols.forEach((c, i) => idxOf.set(colIdOf(c), i));
    const cfs = opts.cellFormulas ? opts.cellFormulas() : null;
    const defaultFormula = cols.map((c) => c.formula || null);
    const cellTextMap = /* @__PURE__ */ new Map();
    if (cfs && cfs.size) {
      const keyToRi = /* @__PURE__ */ new Map();
      rows.forEach((r, ri) => keyToRi.set(String(rowKeyOf(r, kf)), ri));
      cfs.forEach((text, k) => {
        const sep = k.indexOf("::");
        if (sep < 0)
          return;
        const ri = keyToRi.get(k.slice(0, sep));
        const ci = idxOf.get(k.slice(sep + 2));
        if (ri != null && ci != null)
          cellTextMap.set(ri + ":" + ci, text);
      });
    }
    const hasCell = /* @__PURE__ */ new Set();
    cellTextMap.forEach((_t, key) => hasCell.add(parseInt(key.slice(key.indexOf(":") + 1), 10)));
    const computedCols = [];
    cols.forEach((_c, i) => {
      if (defaultFormula[i] || hasCell.has(i))
        computedCols.push(i);
    });
    if (!computedCols.length) {
      clearFx();
      return;
    }
    const depCtx = {
      columns: cols.map(colIdOf),
      rowCount: n,
      getValue: () => void 0
    };
    const astCache = /* @__PURE__ */ new Map();
    const getAst = (t) => {
      if (!astCache.has(t))
        astCache.set(t, parse(t));
      return astCache.get(t);
    };
    const textsOfCol = (i) => {
      const out = [];
      if (defaultFormula[i])
        out.push(defaultFormula[i]);
      cellTextMap.forEach((t, key) => {
        if (parseInt(key.slice(key.indexOf(":") + 1), 10) === i)
          out.push(t);
      });
      return out;
    };
    const compSet = new Set(computedCols);
    const edgesFrom = /* @__PURE__ */ new Map();
    const inDeg = /* @__PURE__ */ new Map();
    computedCols.forEach((i) => {
      edgesFrom.set(i, []);
      inDeg.set(i, 0);
    });
    computedCols.forEach((i) => {
      const deps = /* @__PURE__ */ new Set();
      textsOfCol(i).forEach((t) => {
        const a = getAst(t);
        if (a)
          collectDeps(a, depCtx).forEach((d) => {
            for (let c = d.c1; c <= d.c2; c++)
              if (c >= 0 && c < cols.length)
                deps.add(c);
          });
      });
      let cnt = 0;
      deps.forEach((j) => {
        if (compSet.has(j)) {
          cnt++;
          edgesFrom.get(j).push(i);
        }
      });
      inDeg.set(i, cnt);
    });
    const order = [];
    const indeg = new Map(inDeg);
    const queue = computedCols.filter((i) => indeg.get(i) === 0);
    while (queue.length) {
      const i = queue.shift();
      order.push(i);
      edgesFrom.get(i).forEach((k) => {
        const v = indeg.get(k) - 1;
        indeg.set(k, v);
        if (v === 0)
          queue.push(k);
      });
    }
    const inOrder = new Set(order);
    const cyclic = computedCols.filter((i) => !inOrder.has(i));
    const res = {};
    const ok = {};
    computedCols.forEach((i) => {
      res[i] = new Array(n).fill(void 0);
      ok[i] = new Array(n).fill(false);
    });
    const evalCtx = {
      columns: cols.map(colIdOf),
      rowCount: n,
      getValue: (ci, ri) => {
        if (ci < 0 || ci >= cols.length || ri < 0 || ri >= n)
          return void 0;
        if (ok[ci] && ok[ci][ri])
          return res[ci][ri];
        return rawCellValue(cols[ci], rows[ri]);
      }
    };
    const at = { col: 0, row: 0 };
    order.forEach((i) => {
      at.col = i;
      const def = defaultFormula[i];
      for (let r = 0; r < n; r++) {
        const text = cellTextMap.get(r + ":" + i) ?? def;
        if (!text)
          continue;
        const ast = getAst(text);
        ok[i][r] = true;
        if (!ast) {
          res[i][r] = "#NAME?";
          continue;
        }
        at.row = r;
        res[i][r] = evaluateAst(ast, evalCtx, at);
      }
    });
    cyclic.forEach((i) => {
      const def = defaultFormula[i];
      for (let r = 0; r < n; r++) {
        const text = cellTextMap.get(r + ":" + i) ?? def;
        if (!text)
          continue;
        ok[i][r] = true;
        res[i][r] = "#CIRCULAR!";
      }
    });
    clearFx();
    rows.forEach((r, ri) => {
      let fx;
      for (let k = 0; k < computedCols.length; k++) {
        const i = computedCols[k];
        if (ok[i][ri]) {
          if (!fx)
            fx = {};
          fx[colIdOf(cols[i])] = res[i][ri];
        }
      }
      if (fx) {
        fxMap.set(r, fx);
        fxApplied.push(r);
      }
    });
  }
  const processed = computed(() => {
    var _a, _b;
    if (typeof window !== "undefined" && window.__RJGRID_DRAG_DEBUG)
      console.log("[rj-drag] processed-run", { rev: rev.value, orderRev: orderRev.value });
    try {
      rev.value;
      orderRev.value;
      serverRev.value;
      void quickFilter.value;
      void [...filterModels.keys()];
      void [...floatFilters.keys()];
      void sortStates.value;
      void rowGroupFields.value;
      void rowLimit.value;
      void pivotState.value;
      void expandedGroups.value;
      void serverGroupCollapsed.value;
      void serverGroupKids.value;
      void serverGroupLoading.value;
      void serverGroupFailed.value;
      void expandedTree.value;
      void expandedDetails.value;
      const cols = collectLeaf(leafColsRef.value);
      const mode = opts.dataMode();
      if (mode !== "serverSide")
        applyFormulas(sourceRows(), opts.formulaColumns ? opts.formulaColumns() : cols);
      if (mode === "serverSide") {
        const s = ssrmStore();
        const total = s.rowCount > 0 ? s.rowCount : 0;
        if (((_a = opts.serverGrouping) == null ? void 0 : _a.call(opts)) && rowGroupFields.value.length) {
          const items = new Array(total);
          for (let i = 0; i < total; i++)
            items[i] = s.slots[i];
          return { displayRows: serverGroupRows(items), filteredCount: total };
        }
        const outSsr = new Array(total);
        const slots = s.slots;
        const rh = opts.rowHeight();
        const kf = opts.rowKey();
        for (let i = 0; i < total; i++) {
          const r = slots[i];
          outSsr[i] = r ? {
            key: kf && r[kf] != null ? r[kf] : rowKeyOf(r),
            type: "row",
            data: r,
            level: 0,
            height: rh
          } : {
            key: "ssrm:loading:" + i,
            type: "row",
            data: { __ssrmLoading: true },
            level: 0,
            height: rh
          };
        }
        return { displayRows: outSsr, filteredCount: total };
      }
      let rows = mode === "client" ? passFilter(sourceRows(), cols) : sourceRows();
      if (mode === "client")
        rows = sortRows(rows, cols);
      rows = applyRowLimit(rows, rowLimit.value);
      const out = [];
      if (pivotState.value.active && pivotState.value.cols.length) {
        return {
          displayRows: buildPivotRows(rows, sourceColsRef.value),
          filteredCount: rows.length
        };
      }
      if (opts.treeData()) {
        const { roots, childrenMap } = buildTreeRows(rows);
        flattenTree(roots, cols, out, childrenMap, 0);
      } else if (rowGroupFields.value.length) {
        if (mode !== "client" && ((_b = opts.serverGrouping) == null ? void 0 : _b.call(opts))) {
          out.push(...serverGroupRows(rows));
        } else {
          const tree = buildGroupTree(rows, rowGroupFields.value, cols);
          if (!firstExpansionDone.value)
            firstExpansionDone.value = true;
          flattenGroups(tree, out, cols, rowGroupFields.value, "root");
        }
      } else {
        const kf = opts.rowKey();
        const rh = opts.rowHeight();
        const hasDetail = opts.hasDetailSlot();
        const dh = opts.detailHeight();
        const fwh = opts.fullWidthHeight();
        const expDet = expandedDetails.value;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const key = rowKeyOf(r, kf);
          out.push({ key, type: "row", data: r, level: 0, parentKey: void 0, height: rh });
          if (hasDetail && expDet.has(key))
            out.push({
              key: `detail:${key}`,
              type: "detail",
              data: r,
              level: 0,
              parentKey: key,
              height: dh
            });
          else if (opts.isFullWidthRow(r))
            out.push({
              key: `fw:${key}`,
              type: "fullwidth",
              data: r,
              level: 0,
              parentKey: key,
              height: fwh
            });
        }
      }
      return { displayRows: out, filteredCount: out.length };
    } catch (e) {
      console.error("[rj-drag] processed-throw", e);
      throw e;
    }
  });
  const leafColsRef = ref([]);
  function setPipelineColumns(cols) {
    leafColsRef.value = cols;
  }
  const offsets = computed(() => {
    const dr = processed.value.displayRows;
    const n = dr.length;
    const offs = new Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      offs[i] = acc;
      acc += dr[i].height;
    }
    return offs;
  });
  const totalHeight = computed(() => {
    const offs = offsets.value;
    const dr = processed.value.displayRows;
    const n = dr.length;
    return n ? offs[n - 1] + dr[n - 1].height : 0;
  });
  const summaryRow = computed(() => {
    rev.value;
    void [...filterModels.keys()];
    void [...floatFilters.keys()];
    void quickFilter.value;
    void sortStates.value;
    const cols = collectLeaf(leafColsRef.value);
    const rows = passFilter(sourceRows(), cols);
    const data = { __summary: true };
    let has = false;
    cols.forEach((c) => {
      if (!c.aggFunc)
        return;
      has = true;
      data[colIdOf(c)] = runAgg(
        c.aggFunc,
        rows,
        rows.map((r) => cellRawValue(c, r))
      );
    });
    return has ? data : null;
  });
  const serverGroupCollapsed = ref(/* @__PURE__ */ new Set());
  const serverGroupKids = ref(/* @__PURE__ */ new Map());
  const serverGroupLoading = ref(/* @__PURE__ */ new Set());
  const serverGroupFailed = ref(/* @__PURE__ */ new Set());
  const sgAttempts = /* @__PURE__ */ new Map();
  const SG_MAX_ATTEMPTS = 3;
  let sgEpoch = 0;
  let sgNeedLoad = [];
  const sgNeedTick = ref(0);
  let sgAbsAt = [];
  function isServerGroupView() {
    var _a;
    return opts.dataMode() !== "client" && !!((_a = opts.serverGrouping) == null ? void 0 : _a.call(opts)) && !!rowGroupFields.value.length;
  }
  function sgChildMap() {
    const m = /* @__PURE__ */ new Map();
    serverGroupKids.value.forEach((kids, p) => m.set(p, { kids }));
    serverGroupFailed.value.forEach((p) => {
      const s = m.get(p);
      if (s)
        s.error = true;
      else
        m.set(p, { error: true });
    });
    serverGroupLoading.value.forEach((p) => {
      const s = m.get(p);
      if (s)
        s.loading = true;
      else
        m.set(p, { loading: true });
    });
    return m;
  }
  function serverGroupRows(items) {
    const k = opts.rowKey();
    const r = flattenServerGroups(items, {
      fields: rowGroupFields.value.slice(),
      keyOf: (row) => k && row[k] != null ? row[k] : rowKeyOf(row),
      rowHeight: opts.rowHeight(),
      collapsed: serverGroupCollapsed.value,
      childMap: sgChildMap(),
      isExpandable: opts.isServerSideGroup ? (row) => !!opts.isServerSideGroup(row) : void 0
    });
    sgNeedLoad = r.needLoad;
    sgAbsAt = r.absAt;
    if (sgNeedLoad.length)
      sgNeedTick.value++;
    return r.rows;
  }
  async function loadServerGroupChildren(info) {
    if (!opts.loadData)
      return;
    const path = info.path;
    if (serverGroupKids.value.has(path) || serverGroupLoading.value.has(path) || serverGroupFailed.value.has(path))
      return;
    const attempt = (sgAttempts.get(path) || 0) + 1;
    sgAttempts.set(path, attempt);
    const epoch = sgEpoch;
    serverGroupLoading.value = new Set(serverGroupLoading.value).add(path);
    serverRev.value++;
    const pageSize = Math.max(
      opts.ssrmBlockSize ? opts.ssrmBlockSize() : 0,
      opts.pageSize() || 0,
      100
    );
    const loadOpts = {
      start: 0,
      end: pageSize - 1,
      page: 1,
      pageSize,
      sort: loadCtx.sort,
      filters: loadCtx.filters,
      quickFilterText: loadCtx.quickFilterText,
      floatFilters: loadCtx.floatFilters || [],
      rowGroup: loadCtx.rowGroup || [],
      advancedFilter: loadCtx.advancedFilter || null,
      queryConditions: queryConditions.value.slice(),
      type: "group",
      group: { rowGroupKey: info.field, level: info.level, path: info.values.slice() }
    };
    let list;
    let failed = false;
    try {
      const res = await opts.loadData(loadOpts);
      list = res.rows || res.list || [];
    } catch {
      failed = true;
    }
    if (epoch !== sgEpoch)
      return;
    const l = new Set(serverGroupLoading.value);
    l.delete(path);
    serverGroupLoading.value = l;
    if (failed) {
      if (attempt >= SG_MAX_ATTEMPTS) {
        serverGroupFailed.value = new Set(serverGroupFailed.value).add(path);
        console.warn("[rj-grid] 服务端分组子块取数失败，本代放弃：" + path);
      }
    } else {
      const next = new Map(serverGroupKids.value);
      next.set(path, list || []);
      serverGroupKids.value = next;
    }
    serverRev.value++;
  }
  function setServerGroupCollapsed(path, isCollapsed) {
    const s = new Set(serverGroupCollapsed.value);
    if (isCollapsed)
      s.add(path);
    else
      s.delete(path);
    serverGroupCollapsed.value = s;
  }
  function resetServerGroupView(clearCollapsed = true) {
    sgEpoch++;
    sgAttempts.clear();
    serverGroupKids.value = /* @__PURE__ */ new Map();
    serverGroupLoading.value = /* @__PURE__ */ new Set();
    serverGroupFailed.value = /* @__PURE__ */ new Set();
    sgNeedLoad = [];
    if (clearCollapsed)
      serverGroupCollapsed.value = /* @__PURE__ */ new Set();
  }
  watch(
    sgNeedTick,
    () => {
      if (!sgNeedLoad.length)
        return;
      const list = sgNeedLoad;
      sgNeedLoad = [];
      list.forEach((info) => void loadServerGroupChildren(info));
    },
    { flush: "post" }
  );
  watch(rowGroupFields, () => resetServerGroupView());
  function expandGroup(path, expand) {
    const s = new Set(expandedGroups.value);
    if (expand)
      s.add(path);
    else {
      s.delete(path);
      Array.from(s).forEach((k) => {
        if (k.startsWith(path + "|"))
          s.delete(k);
      });
    }
    expandedGroups.value = s;
  }
  function toggleTree(key) {
    const s = new Set(expandedTree.value);
    if (s.has(key))
      s.delete(key);
    else
      s.add(key);
    expandedTree.value = s;
  }
  function toggleDetail(key) {
    const s = new Set(expandedDetails.value);
    if (s.has(key))
      s.delete(key);
    else
      s.add(key);
    expandedDetails.value = s;
  }
  function expandAll() {
    defaultExpandAll.value = true;
    expandedGroups.value = /* @__PURE__ */ new Set();
    expandedTree.value = /* @__PURE__ */ new Set();
    serverGroupCollapsed.value = /* @__PURE__ */ new Set();
  }
  function collapseAll() {
    defaultExpandAll.value = false;
    const allKeys = /* @__PURE__ */ new Set();
    processed.value.displayRows.forEach((r) => {
      if (r.type === "group")
        allKeys.add(String(r.key));
    });
    const treeKeys = /* @__PURE__ */ new Set();
    if (opts.treeData()) {
      const { roots, childrenMap } = buildTreeRows(sourceRows());
      collectTreeKeys(roots, childrenMap, treeKeys);
    }
    if (isServerGroupView()) {
      const sg = /* @__PURE__ */ new Set();
      processed.value.displayRows.forEach((r) => {
        if (r.type === "group" && !r.isFooter)
          sg.add(String(r.key));
      });
      serverGroupCollapsed.value = sg;
    }
    firstExpansionDone.value = true;
    expandedGroups.value = /* @__PURE__ */ new Set();
    expandedTree.value = /* @__PURE__ */ new Set();
    defaultExpandAll.value = false;
  }
  return {
    rev,
    // 状态
    quickFilter,
    filterModels,
    floatFilters,
    advancedFilter,
    queryConditions,
    sortStates,
    rowGroupFields,
    rowLimit,
    pivotState,
    expandedGroups,
    expandedTree,
    expandedDetails,
    serverGroupCollapsed,
    defaultExpandAll,
    flashRows,
    // 派生
    processed,
    offsets,
    totalHeight,
    summaryRow,
    pivotCols,
    setPipelineColumns,
    sourceRows,
    // 操作
    applyTransaction,
    setRowValue,
    setRowData,
    touch,
    touchOrder,
    expandGroup,
    toggleTree,
    toggleDetail,
    expandAll,
    collapseAll,
    // 服务端权威分组
    isServerGroupView,
    setServerGroupCollapsed,
    resetServerGroupView,
    loadServerGroupChildren,
    filterTypeOf,
    comparatorOf,
    // 服务端
    serverRows,
    serverTotal,
    serverLoading,
    loadingMore,
    fetchMore,
    fetchPage,
    reloadServer,
    setLoadCtx,
    allServerLoaded,
    firstExpansionDone,
    // SSRM
    ssrmStore,
    ensureServerBlocks,
    refreshServerSide,
    purgeServerSideCache,
    ssrmBatcher
  };
}
const RJ_DEFAULT_ICONS = {
  // 排序
  sortAscending: "▲",
  sortDescending: "▼",
  sortUnSort: "⇅",
  // 表头按钮
  filter: "▼",
  columnMenu: "⋮",
  rowDrag: "⠿",
  // 列菜单页签
  menuGeneral: "☰",
  menuFilter: "⏷",
  menuColumns: "▤",
  // 复选框
  checked: "✓",
  indeterminate: "–",
  // 分组/树展开
  rowGroupOpen: "▾",
  rowGroupClose: "▸",
  expand: "▸",
  collapse: "▾",
  // 面板操作
  pin: "📌",
  visible: "👁",
  hidden: "🚫",
  remove: "✕",
  /** 浮层/对话框关闭按钮（与 remove 同字形，语义分开便于单独覆盖） */
  close: "✕",
  add: "+",
  // 子菜单箭头
  submenuRight: "▸"
};
function mergeIcons(overrides) {
  const out = { ...RJ_DEFAULT_ICONS };
  if (!overrides)
    return out;
  for (const k of Object.keys(overrides)) {
    const v = overrides[k];
    if (v != null && v !== "")
      out[k] = v;
  }
  return out;
}
const RJ_ICONS_KEY = Symbol("rj-icons");
const RJ_CELL_ACTIONS_KEY = Symbol("rj-cell-actions");
function filterVisibleActions(actions, ctxOf) {
  return actions.filter((a) => {
    const v = a.visible;
    if (v == null)
      return true;
    return typeof v === "function" ? !!v(ctxOf(a)) : !!v;
  });
}
function resolveColActions(actions, opts) {
  return opts.overridden || opts.pinned ? [] : actions || [];
}
function computeInlineCount(btnW, moreW, gap, avail) {
  const n = btnW.length;
  if (n <= 1)
    return n;
  const total = btnW.reduce((s, w) => s + w, 0) + gap * (n - 1);
  if (total <= avail)
    return n;
  const budget = avail - moreW - gap;
  let used = 0;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const add = btnW[i] + (k > 0 ? gap : 0);
    if (used + add <= budget) {
      used += add;
      k++;
    } else
      break;
  }
  return k;
}
const LIGHT_DEFAULT_BG = "#ffffff";
const DARK_DEFAULT_BG = "#1e222a";
const PRESETS = {
  alpine: {
    light: {
      border: "#d3d3d8",
      borderStrong: "#c0c0c8",
      bg: "#ffffff",
      bgAlt: "#f9f9fb",
      headerBg: "#f3f4f6",
      headerHover: "#e9eaee",
      text: "#333a45",
      textSecondary: "#8a94a2",
      radius: "2px",
      fontSize: "13px"
    },
    dark: {
      border: "#3a4150",
      borderStrong: "#4a5262",
      bg: "#20242c",
      bgAlt: "#252a33",
      headerBg: "#2a2f39",
      headerHover: "#333a46",
      text: "#e6e9ef",
      textSecondary: "#8a919f",
      radius: "2px",
      fontSize: "13px"
    }
  },
  quartz: {
    light: {
      border: "#e5e7eb",
      borderStrong: "#d1d5db",
      bg: "#ffffff",
      bgAlt: "#fafafa",
      headerBg: "#f8fafc",
      headerHover: "#eef2f7",
      text: "#374151",
      textSecondary: "#94a3b8",
      radius: "8px",
      fontSize: "13px"
    },
    dark: {
      border: "#333a45",
      borderStrong: "#414956",
      bg: "#1c2128",
      bgAlt: "#222831",
      headerBg: "#232a33",
      headerHover: "#2b323d",
      text: "#e5e7eb",
      textSecondary: "#8b96a5",
      radius: "8px",
      fontSize: "13px"
    }
  },
  material: {
    light: {
      border: "#e0e0e0",
      borderStrong: "#c4c4c4",
      bg: "#ffffff",
      bgAlt: "#fafafa",
      headerBg: "#ffffff",
      headerHover: "#f0f0f0",
      text: "#212121",
      textSecondary: "#757575",
      radius: "4px",
      fontSize: "14px"
    },
    dark: {
      border: "#424242",
      borderStrong: "#5a5a5a",
      bg: "#303030",
      bgAlt: "#3a3a3a",
      headerBg: "#373737",
      headerHover: "#454545",
      text: "#f5f5f5",
      textSecondary: "#a8a8a8",
      radius: "4px",
      fontSize: "14px"
    }
  }
};
function parseColor(c) {
  if (!c || typeof c !== "string")
    return null;
  let s = c.trim();
  if (s[0] === "#") {
    s = s.slice(1);
    if (s.length === 3)
      s = s.split("").map((x) => x + x).join("");
    if (s.length !== 6)
      return null;
    const n = parseInt(s, 16);
    if (isNaN(n))
      return null;
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x.trim()));
    if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]))
      return [p[0], p[1], p[2]];
  }
  return null;
}
function toHex(r, g, b) {
  return "#" + [r, g, b].map(
    (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
  ).join("");
}
function mix(a, b, w) {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb)
    return b;
  return toHex(
    ca[0] + (cb[0] - ca[0]) * w,
    ca[1] + (cb[1] - ca[1]) * w,
    ca[2] + (cb[2] - ca[2]) * w
  );
}
function rgbaStr(c, al) {
  const p = parseColor(c);
  if (!p)
    return c;
  return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${al})`;
}
const toSize = (v) => typeof v === "number" ? v + "px" : String(v);
function buildThemeVars(params = {}) {
  const vars = {};
  const mode = params.mode === "dark" ? "dark" : "light";
  const preset = params.preset;
  if (preset && preset !== "legacy") {
    const p = PRESETS[preset][mode];
    vars["--rj-border"] = p.border;
    vars["--rj-border-strong"] = p.borderStrong;
    vars["--rj-bg"] = p.bg;
    vars["--rj-bg-alt"] = p.bgAlt;
    vars["--rj-header-bg"] = p.headerBg;
    vars["--rj-header-hover"] = p.headerHover;
    vars["--rj-text"] = p.text;
    vars["--rj-text-secondary"] = p.textSecondary;
    vars["--rj-radius"] = p.radius;
    vars["--rj-font-size"] = p.fontSize;
  }
  const named = [
    ["backgroundColor", "--rj-bg"],
    ["oddRowBackgroundColor", "--rj-bg-alt"],
    ["headerBackgroundColor", "--rj-header-bg"],
    ["borderColor", "--rj-border"],
    ["foregroundColor", "--rj-text"],
    ["secondaryForegroundColor", "--rj-text-secondary"],
    ["radius", "--rj-radius"],
    ["fontSize", "--rj-font-size"]
  ];
  for (const [k, v] of named) {
    const val = params[k];
    if (val == null)
      continue;
    vars[v] = typeof val === "number" || k === "fontSize" || k === "radius" ? toSize(val) : String(val);
  }
  if (params.accentColor) {
    const accent = params.accentColor;
    const bg = vars["--rj-bg"] || (mode === "dark" ? DARK_DEFAULT_BG : LIGHT_DEFAULT_BG);
    vars["--rj-primary"] = accent;
    vars["--rj-primary-bg"] = mix(bg, accent, mode === "dark" ? 0.28 : 0.12);
    vars["--rj-hover-bg"] = mix(bg, accent, mode === "dark" ? 0.14 : 0.06);
    vars["--rj-selected-bg"] = mix(bg, accent, mode === "dark" ? 0.38 : 0.2);
    vars["--rj-range-bg"] = rgbaStr(accent, 0.1);
    vars["--rj-fill-bg"] = rgbaStr(accent, 0.16);
  }
  if (params.vars) {
    for (const k of Object.keys(params.vars)) {
      const val = params.vars[k];
      if (val == null)
        continue;
      vars[k.startsWith("--") ? k : "--" + k] = String(val);
    }
  }
  return vars;
}
function resolveMode(mode, prefersDark, hostDark = null) {
  if (mode === "dark")
    return "dark";
  if (mode === "light")
    return "light";
  if (hostDark !== null)
    return hostDark ? "dark" : "light";
  return prefersDark ? "dark" : "light";
}
const zhCN = {
  // 工具条 / 通用
  quickSearch: "🔍 快速搜索…",
  selRows: "已选 {n} 行",
  expandAll: "全部展开",
  collapseAll: "全部折叠",
  quickBtn: "快速搜索",
  viewBtn: "视图",
  viewNone: "暂无已保存视图",
  chart: "📊 图表",
  density: "密度切换",
  densSmall: "小",
  densMedium: "中",
  densLarge: "大",
  toLight: "亮色",
  toDark: "暗色",
  panel: "⚙ 面板",
  pdfTip: "导出 PDF（浏览器打印→另存为 PDF）",
  print: "打印",
  printBtn: "🖨 打印",
  // 导出 / 打印范围菜单（auto / selected / view / all / server）
  exportBtn: "⬇ 导出",
  exportTip: "导出 / 打印：可选数据范围（选中 / 当前视图 / 全部 / 后端）与格式",
  printTip: "打印（可选范围：选中行 / 当前视图）",
  csvTip: "导出 CSV（可选范围）",
  excelTip: "导出 Excel（可选范围）",
  scopeAuto: "自动",
  scopeSelected: "导出选中行",
  scopeView: "当前视图",
  scopeAll: "全部数据",
  scopeServer: "后端导出",
  expCnt: "{n} 行",
  expLoadedHint: "分页 / 服务端模式仅导出已加载行，需要全量请用「后端导出」",
  expServerNoPdf: "后端导出不含 PDF（浏览器打印属前端渲染），已改用前端范围",
  expServerMissing: "未接入后端导出：请设置 serverExport 回调",
  expFailed: "导出失败",
  printCap: "数据量较大：仅打印前 {n} 行（共 {total} 行）。请缩小范围或走后端导出获取全量",
  resetState: "重置列状态",
  groupBanner: "⬇ 将列标题拖到此处进行行分组（或点面板“分组”页签）",
  // 加载 / 空态
  loading: "加载中…",
  exporting: "正在导出，请稍候…",
  empty: "暂无数据",
  loadMore: "加载更多…",
  dragRow: "拖拽行",
  rowDragNoSort: "已按列排序，行序由排序决定；请先取消排序再拖拽",
  rowDragNoGroup: "分组 / 透视下行序由引擎决定，请先取消分组或透视",
  rowDragNoTree: "树形数据下不支持拖拽行排序",
  rowDragNoServer: "服务端模式（SSRM）下行序由块缓存与后端决定，不支持拖拽重排；分页 / 无限滚动可重排已加载行",
  pivotDupDim: "该字段已是行分组维度，不能再同时作透视列维度",
  groupDupDim: "该字段已是透视列维度，不能再同时作行分组",
  groupInternalCol: "引擎生成列不能用于分组，请拖原始列",
  pivotInternalCol: "引擎生成列不能作为透视维度，请选原始列",
  pivotAllRestored: "已取消全部指标：透视回到默认「全部指标」",
  totalRows: "共 {n} 行",
  dirtyPending: "未保存 {n} 处修改",
  rangeSel: "选区 {r} × {c}",
  ssrmCache: "块缓存 {b} 块 / 已加载 {r} 行",
  findPlaceholder: "查找内容，Enter 下一个",
  // 分页
  pagerTotal: "共 {n} 条",
  perPage: "{n} 条/页",
  first: "首页",
  prev: "上一页",
  next: "下一页",
  last: "末页",
  // 列菜单
  sortAsc: "升序排序",
  sortDesc: "降序排序",
  sortUnsort: "取消排序",
  selectColumn: "选择整列",
  autosize: "自动列宽",
  pinLeft: "冻结到左侧",
  pinRight: "冻结到右侧",
  unpin: "取消冻结",
  hideColumn: "隐藏列",
  groupBy: "按此列分组",
  columnsCount: "列（{n}）",
  colDragHint: "拖动条目可调整列顺序",
  show: "显示",
  hide: "隐藏",
  pinnedLeft: "已冻结左",
  pinnedRight: "已冻结右",
  pinTagLeft: "左",
  pinTagRight: "右",
  pin: "冻结",
  pinColumn: "冻结列",
  showAll: "全部显示",
  hideAll: "全部隐藏",
  tabGeneral: "通用",
  tabFilter: "筛选",
  tabColumns: "列",
  // 筛选菜单
  selectAll: "全选",
  invertHint: "反选：隐藏已勾选项，显示其余",
  excludeSelected: "排除已选",
  searchOptions: "搜索选项...",
  noOptions: "无选项",
  deleteCondition: "删除该条件",
  addCondition: "+ 添加条件",
  clear: "清空",
  advancedFilterLink: "⚙ 高级过滤…",
  apply: "应用",
  filter: "筛选",
  colMenu: "列菜单",
  phNumber: "如 >=10 / 1~20",
  phDate: "如 2024-01-01 / a~b",
  phFilter: "筛选…",
  // 面板
  panelColsHint: "拖拽调整顺序 · 点击眼睛显隐 · 📌 切换冻结",
  groupHere: "将列拖入此处或点击添加分组",
  dragToGroup: "拖列到此处分组",
  groupAddMore: "可添加的分组字段",
  aggMode: "聚合方式",
  remove: "移除",
  enablePivot: "启用数据透视",
  pivotCols: "透视列（维度展开为列）",
  dragHere: "拖列到此",
  pivotVals: "透视值（聚合指标）",
  pivotRowDims: "行分组字段作为透视行维",
  globalSearch: "全局搜索：{v}",
  clearShort: "清除",
  noFilters: "当前无已应用的筛选",
  clearAllFilters: "清除全部筛选",
  tabGroup: "分组",
  tabPivot: "透视",
  kindFloat: "浮动",
  kindAdvanced: "高级",
  kindColumn: "列",
  // 高级过滤
  advFilterTitle: "高级过滤",
  advConditions: "{n} 个条件 ({op})",
  advDelGroup: "删除此组",
  advDelCond: "删除条件",
  advAddCond: "+ 条件",
  advAddGroup: "+ 组",
  // 聚合
  aggSum: "求和",
  aggAvg: "平均",
  aggCount: "计数",
  aggMin: "最小",
  aggMax: "最大",
  aggFirst: "首值",
  aggLast: "末值",
  // 右键菜单
  cmCopyCell: "复制单元格",
  cmCopyRange: "复制选区",
  cmEdit: "编辑单元格",
  cmSelectRow: "选择整行",
  cmRowJson: "查看该行 JSON",
  // 内置行 JSON 查看器（右键菜单项配套弹层）
  jsonTitle: "该行 JSON（可复制）",
  jsonCopy: "复制",
  jsonCopied: "已复制",
  jsonCopyFail: "复制失败，请手动选择文本",
  jsonClose: "关闭",
  // 导出工作表名
  sheetData: "数据",
  sheetGroup: "分组",
  subtotal: "小计",
  emptyVal: "(空)",
  noMatches: "无匹配项",
  ariaLabel: "数据表格",
  // 布尔单元格 / 状态栏溢出 / 打印页码 / 总计行
  yesVal: "是",
  noVal: "否",
  moreCols: "+{n} 列",
  pageNumber: "第 {p} 页 / 共 {t} 页",
  summaryTotal: "合计",
  summaryOf: "总{title}",
  grandTotal: "总计",
  // 筛选算子（FILTER_OPS 以 labelKey 取词，保证语言切换时筛选面板/高级过滤同步）
  opContains: "包含",
  opNe: "不等于",
  opEq: "等于",
  opStartsWith: "开头是",
  opEndsWith: "结尾是",
  opBlank: "为空",
  opNotBlank: "不为空",
  opGt: "大于",
  opGte: "大于等于",
  opLt: "小于",
  opLte: "小于等于",
  opInRange: "介于",
  opBefore: "早于",
  opAfter: "晚于",
  opInMulti: "包括（多选）",
  opNotInMulti: "不包含（多选）",
  andOp: " 且 ",
  orOp: " 或 ",
  // 图片预览
  imgPreview: "图片预览",
  // 集成图表对话框
  chartTitle: "集成图表",
  chartBar: "柱状",
  chartLine: "折线",
  chartPie: "饼图",
  chartArea: "面积",
  chartPickX: "选择维度(X)",
  chartPickY: "选择指标(Y)",
  chartNoSeries: "不系列分组",
  chartNoEcharts: "未加载到 echarts：集成图表需要宿主安装可选依赖 echarts",
  // 查询条件栏
  queryAddField: "添加查询字段",
  queryAllAdded: "全部字段已添加",
  querySearch: "查询",
  queryReset: "重置",
  querySaveView: "存为视图",
  queryRemove: "移除该条件",
  queryInput: "请输入",
  // 行编辑弹窗与内置确认框（查询栏操作按钮）
  rowFormTitle: "编辑行",
  rowFormAddTitle: "新增",
  rowFormSave: "保存",
  rowFormApply: "应用变更",
  rowFormMultiHint: "已选中多行：勾选的字段将批量写入所有选中行，未勾选保持不变",
  rowFormEmpty: "没有可编辑的字段",
  rowFormKeepValue: "（保持不变）",
  rowFormChangeTag: "改",
  confirmTitle: "操作确认",
  confirmOk: "确定",
  confirmCancel: "取消",
  querySelect: "请选择",
  queryFrom: "起",
  queryTo: "止",
  queryKindText: "文本",
  queryKindNumber: "数值",
  queryKindDate: "日期",
  queryKindSelect: "下拉",
  opBetween: "介于",
  opIn: "属于",
  // 自定义视图
  viewUnnamed: "未命名视图",
  viewSaveNew: "存为新视图",
  viewUpdate: "更新当前视图",
  viewDelete: "删除",
  viewScopeBuiltin: "内置视图（只读，可存为新视图后修改）",
  viewScopeCustom: "自定义视图已保存在本地",
  viewName: "视图名称",
  viewNamePh: "如：华东仓高占用库位",
  viewDlgTip: "将保存：查询字段 {q} 项 · 可见列 {c} 列 · 排序与分组设置",
  viewSaved: "视图「{name}」已保存",
  viewDeleteConfirm: "确定删除视图「{name}」？",
  viewCancel: "取消",
  viewOk: "保存",
  viewActiveConds: "生效条件 {n} 项"
};
const enUS = {
  quickSearch: "🔍 Quick search…",
  selRows: "{n} selected",
  expandAll: "Expand All",
  collapseAll: "Collapse All",
  quickBtn: "Quick search",
  viewBtn: "View",
  viewNone: "No saved views",
  chart: "📊 Chart",
  density: "Toggle density",
  densSmall: "Small",
  densMedium: "Medium",
  densLarge: "Large",
  toLight: "Light",
  toDark: "Dark",
  panel: "⚙ Panel",
  pdfTip: "Export PDF (print → save as PDF)",
  print: "Print",
  printBtn: "🖨 Print",
  exportBtn: "⬇ Export",
  exportTip: "Export / Print: pick a data range (selection / view / all / server) and a format",
  printTip: "Print (range: selection / current view)",
  csvTip: "Export CSV (pick a range)",
  excelTip: "Export Excel (pick a range)",
  scopeAuto: "Auto",
  scopeSelected: "Selected rows",
  scopeView: "Current view",
  scopeAll: "All data",
  scopeServer: "Server export",
  expCnt: "{n} rows",
  expLoadedHint: "Pagination / server mode exports loaded rows only; use Server export for the full set",
  expServerNoPdf: "Server export has no PDF (browser printing is front-end); fell back to a front-end range",
  expServerMissing: "No server export wired up: provide a serverExport callback",
  expFailed: "Export failed",
  printCap: "Large data set: printing the first {n} of {total} rows only. Narrow the range or use Server export for the full set",
  resetState: "Reset column state",
  groupBanner: "⬇ Drag column headers here to group rows (or Panel → Group)",
  loading: "Loading…",
  exporting: "Exporting, please wait…",
  empty: "No rows",
  loadMore: "Load more…",
  dragRow: "Drag row",
  rowDragNoSort: "Row order follows the column sort; clear the sort before dragging rows",
  rowDragNoGroup: "Row order is fixed while grouping or pivoting; clear it first",
  rowDragNoTree: "Row drag sorting is not supported in tree data",
  rowDragNoServer: "Server-side (SSRM) row order belongs to the block cache and the backend; pagination / infinite scroll allow reordering loaded rows",
  pivotDupDim: "This field is already a row group; it cannot also be a pivot column",
  groupDupDim: "This field is already a pivot column; it cannot also be a row group",
  groupInternalCol: "Engine-generated columns cannot be grouped; drag an original column",
  pivotInternalCol: "Engine-generated columns cannot be pivot dimensions; pick an original column",
  pivotAllRestored: 'All metrics cleared: pivot restored to the default "all metrics" set',
  totalRows: "{n} rows",
  dirtyPending: "{n} unsaved changes",
  rangeSel: "Range {r} × {c}",
  ssrmCache: "Cache {b} blocks / {r} rows loaded",
  findPlaceholder: "Find, Enter for next",
  pagerTotal: "{n} in total",
  perPage: "{n} / page",
  first: "First",
  prev: "Prev",
  next: "Next",
  last: "Last",
  sortAsc: "Sort Ascending",
  sortDesc: "Sort Descending",
  sortUnsort: "Reset Sort",
  selectColumn: "Select Column",
  autosize: "Auto-size Column",
  pinLeft: "Pin Left",
  pinRight: "Pin Right",
  unpin: "Unpin",
  hideColumn: "Hide",
  groupBy: "Group By This Field",
  columnsCount: "Columns ({n})",
  colDragHint: "Drag rows to reorder columns",
  show: "Show",
  hide: "Hide",
  pinnedLeft: "Pinned left",
  pinnedRight: "Pinned right",
  pinTagLeft: "L",
  pinTagRight: "R",
  pin: "Pin",
  pinColumn: "Pin column",
  showAll: "Show All",
  hideAll: "Hide All",
  tabGeneral: "General",
  tabFilter: "Filter",
  tabColumns: "Columns",
  selectAll: "Select All",
  invertHint: "Invert: hide checked, show the rest",
  excludeSelected: "Exclude Selected",
  searchOptions: "Search options...",
  noOptions: "No options",
  deleteCondition: "Delete condition",
  addCondition: "+ Add Condition",
  clear: "Clear",
  advancedFilterLink: "⚙ Advanced Filter…",
  apply: "Apply",
  filter: "Filter",
  colMenu: "Column Menu",
  phNumber: "e.g. >=10 / 1~20",
  phDate: "e.g. 2024-01-01 / a~b",
  phFilter: "Filter…",
  panelColsHint: "Drag to reorder · click eye to toggle · 📌 pin",
  groupHere: "Drag columns here or click to add grouping",
  dragToGroup: "Drag columns here to group",
  groupAddMore: "Fields available for grouping",
  aggMode: "Aggregation",
  remove: "Remove",
  enablePivot: "Enable Pivot",
  pivotCols: "Pivot Columns (dimensions expand to columns)",
  dragHere: "Drag columns here",
  pivotVals: "Pivot Values (aggregated metrics)",
  pivotRowDims: "Row group fields act as pivot row dimensions",
  globalSearch: "Global search: {v}",
  clearShort: "Clear",
  noFilters: "No filters applied",
  clearAllFilters: "Clear All Filters",
  tabGroup: "Group",
  tabPivot: "Pivot",
  kindFloat: "Floating",
  kindAdvanced: "Advanced",
  kindColumn: "Column",
  advFilterTitle: "Advanced Filter",
  advConditions: "{n} conditions ({op})",
  advDelGroup: "Delete group",
  advDelCond: "Delete condition",
  advAddCond: "+ Condition",
  advAddGroup: "+ Group",
  aggSum: "Sum",
  aggAvg: "Avg",
  aggCount: "Count",
  aggMin: "Min",
  aggMax: "Max",
  aggFirst: "First",
  aggLast: "Last",
  cmCopyCell: "Copy Cells",
  cmCopyRange: "Copy Range",
  cmEdit: "Edit Cell",
  cmSelectRow: "Select Row",
  cmRowJson: "View Row JSON",
  jsonTitle: "Row JSON (copyable)",
  jsonCopy: "Copy",
  jsonCopied: "Copied",
  jsonCopyFail: "Copy failed; select the text manually",
  jsonClose: "Close",
  sheetData: "Data",
  sheetGroup: "Group",
  subtotal: "Subtotal",
  emptyVal: "(blank)",
  noMatches: "No matches",
  ariaLabel: "data grid",
  yesVal: "Yes",
  noVal: "No",
  moreCols: "+{n} cols",
  pageNumber: "Page {p} of {t}",
  summaryTotal: "Total",
  summaryOf: "Total {title}",
  grandTotal: "Grand Total",
  opContains: "contains",
  opNe: "doesn't equal",
  opEq: "equals",
  opStartsWith: "starts with",
  opEndsWith: "ends with",
  opBlank: "is blank",
  opNotBlank: "is not blank",
  opGt: "greater than",
  opGte: "greater than or equal",
  opLt: "less than",
  opLte: "less than or equal",
  opInRange: "between",
  opBefore: "before",
  opAfter: "after",
  opInMulti: "is one of (multi)",
  opNotInMulti: "is not one of (multi)",
  andOp: " AND ",
  orOp: " OR ",
  imgPreview: "Image preview",
  chartTitle: "Chart",
  chartBar: "Bar",
  chartLine: "Line",
  chartPie: "Pie",
  chartArea: "Area",
  chartPickX: "Category (X)",
  chartPickY: "Value (Y)",
  chartNoSeries: "No series grouping",
  chartNoEcharts: "echarts not available: the chart dialog needs the optional echarts dependency",
  queryAddField: "Add query field",
  queryAllAdded: "All fields added",
  querySearch: "Search",
  queryReset: "Reset",
  querySaveView: "Save as view",
  queryRemove: "Remove this condition",
  queryInput: "Enter",
  // Row edit dialog & built-in confirm (query bar action buttons)
  rowFormTitle: "Edit Row",
  rowFormAddTitle: "Add Row",
  rowFormSave: "Save",
  rowFormApply: "Apply Changes",
  rowFormMultiHint: "Multiple rows selected: checked fields are applied to all selected rows, unchecked stay unchanged",
  rowFormEmpty: "No editable fields",
  rowFormKeepValue: "(keep unchanged)",
  rowFormChangeTag: "edit",
  confirmTitle: "Confirm",
  confirmOk: "OK",
  confirmCancel: "Cancel",
  querySelect: "Select",
  queryFrom: "From",
  queryTo: "To",
  queryKindText: "Text",
  queryKindNumber: "Number",
  queryKindDate: "Date",
  queryKindSelect: "Select",
  opBetween: "between",
  opIn: "in",
  viewUnnamed: "Unnamed view",
  viewSaveNew: "Save as new view",
  viewUpdate: "Update current view",
  viewDelete: "Delete",
  viewScopeBuiltin: "Built-in view (read-only; save as new view to modify)",
  viewScopeCustom: "Custom view saved locally",
  viewName: "View name",
  viewNamePh: "e.g. East warehouse high-load slots",
  viewDlgTip: "Will save: query fields {q} | visible columns {c} | sort and grouping",
  viewSaved: 'View "{name}" saved',
  viewDeleteConfirm: 'Delete view "{name}"?',
  viewCancel: "Cancel",
  viewOk: "Save",
  viewActiveConds: "{n} active conditions"
};
const RJ_PRESETS = { zh: zhCN, en: { ...zhCN, ...enUS } };
function normalizeLang(lang) {
  if (!lang)
    return "zh";
  const l = String(lang).toLowerCase();
  return l.startsWith("en") ? "en" : "zh";
}
function resolveMessages(lang, override) {
  const base = RJ_PRESETS[normalizeLang(lang)];
  if (!override)
    return base;
  return { ...base, ...override };
}
function interpolate(str, params) {
  if (!params)
    return str;
  let out = str;
  for (const k of Object.keys(params))
    out = out.split("{" + k + "}").join(String(params[k]));
  return out;
}
function translate(messages, key, params) {
  const s = messages[key] != null ? messages[key] : key;
  return interpolate(s, params);
}
const RJ_LOCALE_KEY = Symbol("rj-locale");
const defaultTranslate = (key, params) => interpolate(zhCN[key] != null ? zhCN[key] : key, params);
const RJ_OPTIONS_KEY = Symbol("rj-options");
const defaultOptionsAccessor = {
  list: () => void 0,
  label: () => void 0
};
function pickValue(item, valueKey) {
  if (valueKey)
    return item[valueKey];
  if (item.value !== void 0)
    return item.value;
  if (item.id !== void 0)
    return item.id;
  if (item.code !== void 0)
    return item.code;
  if (item.key !== void 0)
    return item.key;
  return void 0;
}
function pickLabel(item, labelKey, value) {
  if (labelKey)
    return String(item[labelKey] ?? value);
  if (item.label !== void 0)
    return String(item.label);
  if (item.name !== void 0)
    return String(item.name);
  if (item.text !== void 0)
    return String(item.text);
  return String(value);
}
function normalizeOptions(raw, shape = {}) {
  if (!Array.isArray(raw))
    return [];
  const ck = shape.childrenKey ?? "children";
  const walk = (arr) => {
    const res = [];
    for (const it of arr) {
      if (it == null || typeof it !== "object") {
        if (it !== null && it !== void 0)
          res.push({ label: String(it), value: it });
        continue;
      }
      const item = it;
      let opt;
      if (shape.map) {
        opt = shape.map(item);
      } else {
        const value = pickValue(item, shape.valueKey);
        const label = pickLabel(item, shape.labelKey, value);
        opt = { label, value };
      }
      const kids = Array.isArray(item[ck]) ? walk(item[ck]) : void 0;
      if (kids && kids.length)
        opt.children = kids;
      res.push(opt);
    }
    return res;
  };
  return walk(raw);
}
function flattenOptions(options) {
  const out = [];
  const walk = (arr) => {
    for (const o of arr || []) {
      out.push({ label: o.label, value: o.value });
      if (o.children && o.children.length)
        walk(o.children);
    }
  };
  walk(options || []);
  return out;
}
function filterOptionTree(options, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q)
    return options;
  const walk = (arr) => {
    const res = [];
    for (const o of arr || []) {
      const kids = o.children && o.children.length ? walk(o.children) : [];
      const self = String(o.label ?? o.value ?? "").toLowerCase().includes(q);
      if (self)
        res.push({ ...o });
      else if (kids.length)
        res.push({ label: o.label, value: o.value, children: kids });
    }
    return res;
  };
  return walk(options);
}
function flattenTreeForRender(options, expanded) {
  const rows = [];
  const walk = (arr, depth) => {
    for (const o of arr || []) {
      const hasChildren = !!(o.children && o.children.length);
      const exp = hasChildren && expanded.has(String(o.value));
      rows.push({ option: o, depth, hasChildren, expanded: exp });
      if (hasChildren && exp)
        walk(o.children, depth + 1);
    }
  };
  walk(options || [], 0);
  return rows;
}
function collectParentKeys(options, acc = /* @__PURE__ */ new Set()) {
  for (const o of options || []) {
    if (o.children && o.children.length) {
      acc.add(String(o.value));
      collectParentKeys(o.children, acc);
    }
  }
  return acc;
}
async function resolveOptions(source, dict, loaders) {
  var _a, _b, _c;
  try {
    if (dict)
      return normalizeOptions(await ((_a = loaders.dictLoader) == null ? void 0 : _a.call(loaders, dict)));
    if (!source)
      return [];
    if (Array.isArray(source))
      return normalizeOptions(source);
    if (typeof source === "function")
      return normalizeOptions(await source());
    const shape = source;
    if (source.items)
      return normalizeOptions(source.items, shape);
    if (source.dict)
      return normalizeOptions(await ((_b = loaders.dictLoader) == null ? void 0 : _b.call(loaders, source.dict)), shape);
    if (source.ref)
      return normalizeOptions(await ((_c = loaders.optionsLoader) == null ? void 0 : _c.call(loaders, source.ref)), shape);
    if (source.load)
      return normalizeOptions(await source.load(), shape);
  } catch {
  }
  return [];
}
let _fnSeq = 0;
const fnKeys = /* @__PURE__ */ new WeakMap();
function fnKey(fn, prefix) {
  let k = fnKeys.get(fn);
  if (!k) {
    k = `${prefix}:${++_fnSeq}`;
    fnKeys.set(fn, k);
  }
  return k;
}
function sourceCacheKey(col) {
  if (col.dict)
    return "dict:" + col.dict;
  const s = col.options;
  if (!s)
    return null;
  if (Array.isArray(s))
    return "static:" + colIdOf(col);
  if (typeof s === "function")
    return fnKey(s, "fn");
  if (s.dict)
    return "dict:" + s.dict;
  if (s.ref)
    return "ref:" + s.ref;
  if (s.load)
    return fnKey(s.load, "load");
  if (s.items)
    return "static:" + colIdOf(col);
  return null;
}
function collectOptionCols(cols, out = []) {
  for (const c of cols || []) {
    if (c.dict || c.options)
      out.push(c);
    if (c.children && c.children.length)
      collectOptionCols(c.children, out);
  }
  return out;
}
const NUM_OPS = [
  { k: "greater than or equal to", op: "gte" },
  { k: "more than or equal to", op: "gte" },
  { k: "less than or equal to", op: "lte" },
  { k: "fewer than or equal to", op: "lte" },
  { k: "not equal to", op: "ne" },
  { k: "not equals to", op: "ne" },
  { k: "greater than", op: "gt" },
  { k: "more than", op: "gt" },
  { k: "higher than", op: "gt" },
  { k: "less than", op: "lt" },
  { k: "fewer than", op: "lt" },
  { k: "lower than", op: "lt" },
  { k: "no less than", op: "gte" },
  { k: "no more than", op: "lte" },
  { k: "at least", op: "gte" },
  { k: "at most", op: "lte" },
  { k: "equal to", op: "eq" },
  { k: "equals to", op: "eq" },
  { k: "above", op: "gt" },
  { k: "over", op: "gt" },
  { k: "below", op: "lt" },
  { k: "under", op: "lt" },
  { k: "大于等于", op: "gte" },
  { k: "不低于", op: "gte" },
  { k: "不少于", op: "gte" },
  { k: "至少", op: "gte" },
  { k: ">=", op: "gte" },
  { k: "小于等于", op: "lte" },
  { k: "不超过", op: "lte" },
  { k: "不大于", op: "lte" },
  { k: "最多", op: "lte" },
  { k: "<=", op: "lte" },
  { k: "大于", op: "gt" },
  { k: "高于", op: "gt" },
  { k: "超过", op: "gt" },
  { k: "多于", op: "gt" },
  { k: ">", op: "gt" },
  { k: "gte", op: "gte" },
  { k: "gt", op: "gt" },
  { k: "小于", op: "lt" },
  { k: "低于", op: "lt" },
  { k: "少于", op: "lt" },
  { k: "不足", op: "lt" },
  { k: "<", op: "lt" },
  { k: "lte", op: "lte" },
  { k: "lt", op: "lt" },
  { k: "不等于", op: "ne" },
  { k: "!=", op: "ne" },
  { k: "<>", op: "ne" },
  { k: "ne", op: "ne" },
  { k: "等于", op: "eq" },
  { k: "=", op: "eq" },
  { k: "eq", op: "eq" }
];
const DATE_OPS = [
  { k: "earlier than", op: "lt" },
  { k: "later than", op: "gt" },
  { k: "on or before", op: "lte" },
  { k: "on or after", op: "gte" },
  { k: "not before", op: "gte" },
  { k: "not after", op: "lte" },
  { k: "before", op: "lt" },
  { k: "after", op: "gt" },
  { k: "早于", op: "lt" },
  { k: "之前", op: "lt" },
  { k: "不晚于", op: "lte" },
  { k: "<", op: "lt" },
  { k: "晚于", op: "gt" },
  { k: "之后", op: "gt" },
  { k: "不早于", op: "gte" },
  { k: ">", op: "gt" },
  { k: "不等于", op: "ne" },
  { k: "等于", op: "eq" },
  { k: "是", op: "eq" },
  { k: "为", op: "eq" },
  { k: "=", op: "eq" }
];
const TEXT_OPS = [
  { k: "does not contain", op: "ne" },
  { k: "does not include", op: "ne" },
  { k: "is not equal to", op: "ne" },
  { k: "is not", op: "ne" },
  { k: "is equal to", op: "eq" },
  { k: "is", op: "eq" },
  { k: "不包含", op: "ne" },
  { k: "不含", op: "ne" },
  { k: "not contains", op: "ne" },
  { k: "not equals", op: "ne" },
  { k: "开头是", op: "startsWith" },
  { k: "开头为", op: "startsWith" },
  { k: "结尾是", op: "endsWith" },
  { k: "结尾为", op: "endsWith" },
  { k: "不为空", op: "notBlank" },
  { k: "非空", op: "notBlank" },
  { k: "为空", op: "blank" },
  { k: "startsWith", op: "startsWith" },
  { k: "endsWith", op: "endsWith" },
  { k: "notBlank", op: "notBlank" },
  { k: "blank", op: "blank" },
  { k: "starts with", op: "startsWith" },
  { k: "ends with", op: "endsWith" },
  { k: "包含", op: "contains" },
  { k: "含有", op: "contains" },
  { k: "包括", op: "contains" },
  { k: "contains", op: "contains" },
  { k: "includes", op: "contains" },
  { k: "like", op: "contains" },
  { k: "不等于", op: "ne" },
  { k: "不是", op: "ne" },
  { k: "不为", op: "ne" },
  { k: "ne", op: "ne" },
  { k: "等于", op: "eq" },
  { k: "equals", op: "eq" },
  { k: "是", op: "eq" },
  { k: "为", op: "eq" },
  { k: "eq", op: "eq" }
];
const SELECT_OPS = [
  { k: "does not contain", op: "notIn" },
  { k: "does not include", op: "notIn" },
  { k: "is not equal to", op: "notIn" },
  { k: "is not", op: "notIn" },
  { k: "is one of", op: "in" },
  { k: "equal to", op: "in" },
  { k: "contains", op: "in" },
  { k: "includes", op: "in" },
  { k: "不包含", op: "notIn" },
  { k: "不含", op: "notIn" },
  { k: "不属于", op: "notIn" },
  { k: "排除", op: "notIn" },
  { k: "不是", op: "notIn" },
  { k: "不为", op: "notIn" },
  { k: "不等于", op: "notIn" },
  { k: "not in", op: "notIn" },
  { k: "包括", op: "in" },
  { k: "包含", op: "in" },
  { k: "属于", op: "in" },
  { k: "is", op: "in" },
  { k: "是", op: "in" },
  { k: "为", op: "in" },
  { k: "等于", op: "in" }
];
const NIL_OPS = /* @__PURE__ */ new Set(["blank", "notBlank"]);
function opList(type) {
  if (type === "number")
    return NUM_OPS;
  if (type === "date")
    return DATE_OPS;
  if (type === "select")
    return SELECT_OPS;
  return TEXT_OPS;
}
const CONJ_EDGE = /^[\s，,、;；]*(?:或|或者|且|并且|和|与|及|or|and)[\s，,、;；]*|[\s，,、;；]*(?:或|或者|且|并且|和|与|及|or|and)[\s，,、;；]*$/gi;
const SEP = /[，,、;；\s]+/;
const NUM_RE = /(-?\d[\d,]*(?:\.\d+)?)\s*(万|亿|%)?/g;
const DATE_RE = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?|(\d{4})[-/](\d{1,2})|(\d{1,2})[-/月](\d{1,2})日?/g;
function toNumber(raw, unit) {
  let n = parseFloat(raw.replace(/,/g, ""));
  if (unit === "万")
    n *= 1e4;
  else if (unit === "亿")
    n *= 1e8;
  return n;
}
function extractNumbers(s) {
  const out = [];
  let m;
  NUM_RE.lastIndex = 0;
  while (m = NUM_RE.exec(s))
    out.push(toNumber(m[1], m[2]));
  return out;
}
function extractDates(s) {
  const out = [];
  let m;
  DATE_RE.lastIndex = 0;
  while (m = DATE_RE.exec(s)) {
    if (m[1])
      out.push(`${m[1]}-${pad(m[2])}-${pad(m[3])}`);
    else if (m[4])
      out.push(`${m[4]}-${pad(m[5])}`);
    else if (m[6])
      out.push(`${(/* @__PURE__ */ new Date()).getFullYear()}-${pad(m[6])}-${pad(m[7])}`);
  }
  return out;
}
const pad = (n) => n.length < 2 ? "0" + n : n;
const stripQuotes = (s) => s.replace(/^["'“「『]|["'」』”]$/g, "").trim();
function parseNLQ(text, columns) {
  const raw = (text || "").trim();
  const empty = { ok: false, filters: [], clauses: [] };
  if (!raw)
    return { ...empty, message: "empty" };
  const result = { ok: false, filters: [], clauses: [] };
  let buf = raw;
  const lim = buf.match(
    /(?:前|取|返回|最多|top|first|limit|show(?:\s+me)?|give\s+me)\s*(?:the\s+)?(\d+)\s*(?:行|条|个|名|件|rows?|records?|items?|results?)?/i
  );
  if (lim) {
    result.limit = parseInt(lim[1], 10);
    buf = blank(buf, lim.index, lim[0].length);
  }
  const sr = buf.match(
    /(?:搜索|检索|查找|查找到|find|search)\s*[：:]?\s*["'“「]?([^"'”」]+?)["'」”]?(?=$|[，,、;；\s])/i
  );
  if (sr && sr.index != null) {
    const kw = sr[1].trim();
    if (kw) {
      result.search = stripQuotes(kw);
      buf = blank(buf, sr.index, sr[0].length);
    }
  }
  const g = matchColumnPhrase(buf, [
    /按([^，,、;；]+?)(?:分组|归类|group\s*by)/i,
    /(?:分组|归类|group\s*by)[：:]?\s*([^，,、;；]+?)(?=$|[，,、;；\s])/i
  ]);
  if (g) {
    const col = resolveColumn(g.name, columns);
    if (col) {
      result.groupBy = col.field || col.title || col.colId;
      result.groupColId = col.colId;
      result.groupTitle = col.title || col.field || col.colId;
      buf = blank(buf, g.start, g.len);
    }
  }
  const s = matchColumnPhrase(buf, [
    /按([^，,、;；]+?)(?:升序|降序|倒序|从大到小|从小到大|排序|sort)/i,
    /sort\s*by\s+([^，,、;；]+)/i,
    /([^，,、;；\s]+?)(?:升序|降序|倒序|从大到小|从小到大)/i,
    // 比较级：X最高/最低/最大/最小/最贵/最便宜/最多/最少（可带尾随「的」一并消费，避免泄漏进相邻筛选值）
    /([^，,、;；\s]+?)最(?:高|低|大|小|贵|便宜|多|少)的?/i,
    // 英文比较级（后缀式）：X highest / X most expensive / X cheapest（不含裸 most/least，以免吞掉 at most/at least）
    /([a-z][a-z ]*?)\s+(?:the\s+)?(?:highest|lowest|largest|biggest|smallest|most expensive|least expensive|cheapest)\b/i,
    // 英文比较级（前缀式）：highest X / cheapest X
    /\b(?:highest|lowest|largest|biggest|smallest|most expensive|cheapest|least expensive)\s+(?:the\s+)?([a-z][a-z ]*?)(?=$|[，,、;；.]|\s+(?:and|by|of)\b)/i
  ]);
  if (s) {
    const col = resolveColumn(s.name, columns);
    if (col) {
      const dirWord = (s.word || "").toLowerCase();
      const desc = /降序|倒序|从大到小|desc|最高|最大|最贵|最多|highest|largest|biggest|most expensive/.test(
        dirWord
      );
      result.sort = { field: col.field || col.colId, dir: desc ? "desc" : "asc" };
      result.sortTitle = col.title || col.field || col.colId;
      buf = blank(buf, s.start, s.len);
    }
  }
  const anchors = findAnchors(buf, columns);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const regionEnd = i + 1 < anchors.length ? anchors[i + 1].start : buf.length;
    let region = buf.slice(a.end, regionEnd);
    region = region.replace(CONJ_EDGE, "").replace(SEP, " ").trim();
    const clause = parseClause(region, a.col);
    if (clause) {
      clause.or = i > 0 && /或|\bor\b/i.test(buf.slice(anchors[i - 1].end, a.start));
      result.clauses.push(clause);
    }
  }
  const quoted = raw.match(/["'“「](.+?)["'」”]/);
  if (!anchors.length && !result.clauses.length && !result.search && !quoted) {
    for (const t of splitValues(buf)) {
      const hit = pickSelectColumn(t, columns);
      if (hit)
        result.clauses.push({
          colId: hit.col.colId,
          field: hit.col.field,
          title: hit.col.title,
          filterType: "select",
          op: "in",
          value1: [hit.opt],
          or: false,
          raw: t
        });
    }
  }
  result.filters = mergeClauses(result.clauses, columns);
  if (!result.search && quoted && !result.clauses.length)
    result.search = quoted[1];
  result.ok = !!(result.filters.length || result.sort || result.groupBy || result.limit || result.search);
  if (!result.ok)
    result.message = "unrecognized";
  return result;
}
function blank(s, start, len) {
  return s.slice(0, start) + " ".repeat(len) + s.slice(start + len);
}
function matchColumnPhrase(buf, regexes) {
  for (const re of regexes) {
    const m = buf.match(re);
    if (m && m.index != null) {
      return { name: m[1], start: m.index, len: m[0].length, word: m[0] };
    }
  }
  return null;
}
function resolveColumn(name, columns) {
  const key = (name || "").trim().toLowerCase();
  if (!key)
    return null;
  for (const c of columns) {
    const keys = [c.title, c.field, ...c.aliases || []].filter(Boolean);
    for (const k of keys) {
      const kk = k.toLowerCase();
      if (key === kk || key.includes(kk) || kk.includes(key))
        return c;
    }
  }
  return null;
}
function findAnchors(buf, columns) {
  const cands = [];
  for (const c of columns) {
    const keys = [c.title, c.field, ...c.aliases || []].filter(Boolean);
    for (const k of keys)
      cands.push({ k, col: c });
  }
  cands.sort((a, b) => b.k.length - a.k.length);
  const found = [];
  const low = buf.toLowerCase();
  const taken = new Array(buf.length).fill(false);
  for (const { k, col } of cands) {
    const kk = k.toLowerCase();
    let idx = low.indexOf(kk);
    while (idx >= 0) {
      let overlap = false;
      for (let p = idx; p < idx + kk.length; p++)
        if (taken[p])
          overlap = true;
      if (!overlap) {
        for (let p = idx; p < idx + kk.length; p++)
          taken[p] = true;
        found.push({ start: idx, end: idx + kk.length, col });
      }
      idx = low.indexOf(kk, idx + 1);
    }
  }
  found.sort((a, b) => a.start - b.start);
  return found;
}
function parseClause(region, col) {
  if (!region)
    return null;
  const base = {
    colId: col.colId,
    field: col.field,
    title: col.title,
    filterType: col.filterType,
    raw: region
  };
  const nil = matchOp(region, NIL_CANDS);
  if (nil && NIL_OPS.has(nil.op)) {
    return { ...base, op: nil.op, or: false, value1: void 0 };
  }
  const o = matchOp(region, opList(col.filterType));
  let op = o.op;
  const rest = o.rest;
  const rangeWords = /介于|之间|区间|范围|到|至|~|～|—|－|through|\bto\b/i.test(region);
  if (rangeWords) {
    if (col.filterType === "number") {
      const nums = extractNumbers(rest || region);
      if (nums.length >= 2)
        return { ...base, op: "inRange", value1: nums[0], value2: nums[1], or: false };
    } else if (col.filterType === "date") {
      const ds = extractDates(region);
      if (ds.length >= 2)
        return { ...base, op: "inRange", value1: ds[0], value2: ds[1], or: false };
    }
  }
  if (!op) {
    if (col.filterType === "select")
      op = "in";
    else if (col.filterType === "number")
      op = "eq";
    else if (col.filterType === "date")
      op = "eq";
    else
      op = "contains";
  }
  if (col.filterType === "number") {
    const nums = extractNumbers(rest);
    if (!nums.length)
      return null;
    if (op === "inRange") {
      if (nums.length < 2)
        return null;
      return { ...base, op, value1: nums[0], value2: nums[1], or: false };
    }
    return { ...base, op, value1: nums[0], or: false };
  }
  if (col.filterType === "date") {
    const ds = extractDates(rest);
    if (!ds.length)
      return null;
    return { ...base, op, value1: ds[0], or: false };
  }
  if (col.filterType === "select") {
    const vals = splitValues(rest).map((v) => matchOption(v, col)).filter(Boolean);
    if (!vals.length)
      return null;
    return { ...base, op, value1: vals, or: false };
  }
  const val = stripQuotes(rest.replace(/^(?:是|为|包含|含有|等于)\s*/, "")).trim();
  if (!val)
    return null;
  return { ...base, op, value1: val, or: false };
}
const NIL_CANDS = [
  { k: "is not empty", op: "notBlank" },
  { k: "not empty", op: "notBlank" },
  { k: "is empty", op: "blank" },
  { k: "不为空", op: "notBlank" },
  { k: "非空", op: "notBlank" },
  { k: "为空", op: "blank" },
  { k: "notBlank", op: "notBlank" },
  { k: "blank", op: "blank" }
];
function matchOp(region, list) {
  let bestPos = -1;
  let best = null;
  const low = region.toLowerCase();
  for (const c of list) {
    if (!c.k)
      continue;
    const idx = low.indexOf(c.k.toLowerCase());
    if (idx >= 0 && (bestPos === -1 || idx < bestPos || idx === bestPos && c.k.length > best.k.length)) {
      bestPos = idx;
      best = c;
    }
  }
  if (best && bestPos >= 0)
    return { op: best.op, rest: region.slice(bestPos + best.k.length) };
  return { op: "", rest: region };
}
function splitValues(s) {
  return stripQuotes(s).split(/[、,，\/\s]|或|和|与|及/).map((x) => x.trim()).filter(Boolean);
}
function matchOption(v, col) {
  if (!v)
    return null;
  if (!col.options || !col.options.length)
    return v;
  const hit = col.options.find((o) => o === v || o.includes(v) || v.includes(o));
  if (hit)
    return hit;
  return col.strictOptions ? null : v;
}
function pickSelectColumn(token, columns) {
  const t = (token || "").trim().toLowerCase();
  if (!t)
    return null;
  for (const col of columns) {
    if (col.filterType !== "select" || !col.options)
      continue;
    const opt = col.options.find((o) => o.toLowerCase() === t);
    if (opt)
      return { col, opt };
  }
  return null;
}
function mergeClauses(clauses, columns) {
  const byCol = /* @__PURE__ */ new Map();
  for (const c of clauses) {
    const arr = byCol.get(c.colId) || [];
    arr.push(c);
    byCol.set(c.colId, arr);
  }
  const out = [];
  for (const [colId, cs] of byCol) {
    const col = columns.find((c) => c.colId === colId);
    const model = {
      type: col.filterType,
      operator: cs.some((c) => c.or) ? "or" : "and",
      conditions: cs.map((c) => ({ op: c.op, value1: c.value1, value2: c.value2 }))
    };
    out.push({ colId, field: col.field, title: col.title, model });
  }
  return out;
}
const OP_LABEL = {
  zh: {
    eq: "=",
    ne: "≠",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    contains: "包含",
    notContains: "不包含",
    startsWith: "开头是",
    endsWith: "结尾为",
    blank: "为空",
    notBlank: "非空",
    in: "属于",
    notIn: "不属于",
    inRange: "介于"
  },
  en: {
    eq: "=",
    ne: "≠",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    contains: "contains",
    notContains: "not contains",
    startsWith: "starts with",
    endsWith: "ends with",
    blank: "is empty",
    notBlank: "is not empty",
    in: "is",
    notIn: "not",
    inRange: "between"
  }
};
function explainNLQ(r, lang = "zh") {
  const en = lang === "en";
  const labels = OP_LABEL[lang];
  const parts = [];
  for (const c of r.clauses) {
    const opLabel = labels[c.op] || c.op;
    const name = c.title || c.field || c.colId;
    let val;
    if (c.op === "blank" || c.op === "notBlank")
      val = "";
    else if (c.value2 != null)
      val = `${c.value1}~${c.value2}`;
    else if (Array.isArray(c.value1))
      val = c.value1.join(en ? " / " : "、");
    else
      val = String(c.value1 ?? "");
    const glue = en || /^[=<>≤≥≠]/.test(opLabel) ? " " : "";
    parts.push(`${name} ${opLabel}${glue}${val}`.trim());
  }
  if (r.sort)
    parts.push(
      en ? `sort by ${r.sortTitle || r.sort.field} ${r.sort.dir}` : `按${r.sortTitle || r.sort.field} ${r.sort.dir === "desc" ? "降序" : "升序"}`
    );
  if (r.groupBy)
    parts.push(en ? `group by ${r.groupTitle || r.groupBy}` : `按${r.groupTitle || r.groupBy}分组`);
  if (r.limit)
    parts.push(en ? `top ${r.limit}` : `前${r.limit}`);
  if (r.search)
    parts.push(en ? `search "${r.search}"` : `搜索“${r.search}”`);
  return parts.join(" · ");
}
const csvCell = (v) => {
  if (v == null)
    return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function toCsvText(matrix) {
  return matrix.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
function downloadCsv(matrix, fileName) {
  const blob = new Blob(["\uFEFF" + toCsvText(matrix)], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, fileName.endsWith(".csv") ? fileName : fileName + ".csv");
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++)
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 4294967295;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
function zipStore(files) {
  const enc2 = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const u16 = (n) => new Uint8Array([n & 255, n >>> 8 & 255]);
  const u32 = (n) => new Uint8Array([n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255]);
  const concat = (...parts) => {
    const total = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    parts.forEach((p) => {
      out.set(p, pos);
      pos += p.length;
    });
    return out;
  };
  const dosDateTime = () => {
    const d = /* @__PURE__ */ new Date();
    const time = d.getHours() << 11 | d.getMinutes() << 5 | d.getSeconds() >> 1;
    const date = d.getFullYear() - 1980 << 9 | d.getMonth() + 1 << 5 | d.getDate();
    return { time, date };
  };
  const { time: dosTime, date: dosDate } = dosDateTime();
  for (const f of files) {
    const nameBytes = enc2.encode(f.name);
    const crc = crc32(f.data);
    const local = concat(
      u32(67324752),
      u16(20),
      u16(2048),
      // UTF-8 名称标志
      u16(0),
      // store
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(f.data.length),
      u32(f.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    );
    chunks.push(local, f.data);
    central.push(
      concat(
        u32(33639248),
        u16(20),
        u16(20),
        u16(2048),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(f.data.length),
        u32(f.data.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
      )
    );
    offset += local.length + f.data.length;
  }
  const centralBuf = concat(...central);
  const eocd = concat(
    u32(101010256),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBuf.length),
    u32(offset),
    u16(0)
  );
  return concat(...chunks, centralBuf, eocd);
}
const xmlEsc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colLetter = (idx) => {
  let s = "";
  let n = idx + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = (n - m - 1) / 26;
  }
  return s;
};
const enc = new TextEncoder();
const contentTypes = (n) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` + Array.from(
  { length: n },
  (_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
).join("") + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const workbookXml = (names) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` + names.map(
  (nm, i) => `<sheet name="${xmlEsc(nm || "Sheet" + (i + 1))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
).join("") + `</sheets></workbook>`;
const workbookRels = (n) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + Array.from(
  { length: n },
  (_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
).join("") + `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="宋体"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="宋体"/></font><font><b/><sz val="11"/><name val="宋体"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4472C4"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFB0B0B0"/></left><right style="thin"><color rgb="FFB0B0B0"/></right><top style="thin"><color rgb="FFB0B0B0"/></top><bottom style="thin"><color rgb="FFB0B0B0"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs></styleSheet>`;
function sheetXml(s) {
  var _a;
  const headerRows = s.headerRows ?? 1;
  const rows = [];
  s.matrix.forEach((row, r) => {
    var _a2;
    const styleId = ((_a2 = s.rowStyles) == null ? void 0 : _a2[r]) ?? (r < headerRows ? 1 : headerRows > 0 && r === headerRows ? 0 : 0);
    const attr = styleId ? ` s="${styleId}"` : "";
    const cells = [];
    row.forEach((v, c) => {
      const ref2 = `${colLetter(c)}${r + 1}`;
      if (typeof v === "number" && isFinite(v)) {
        cells.push(`<c r="${ref2}"${attr || ' s="3"'}><v>${v}</v></c>`);
      } else if (v == null || v === "") {
        cells.push(`<c r="${ref2}"${attr}/>`);
      } else {
        cells.push(
          `<c r="${ref2}"${attr} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`
        );
      }
    });
    rows.push(`<row r="${r + 1}">${cells.join("")}</row>`);
  });
  const widthXml = ((_a = s.colWidths) == null ? void 0 : _a.length) ? `<cols>${s.colWidths.map(
    (w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(w, 8), 60)}" customWidth="1"/>`
  ).join("")}</cols>` : "";
  const maxCols = s.matrix.length ? Math.max(...s.matrix.map((r) => r.length)) : 1;
  const dimension = s.matrix.length ? `A1:${colLetter(Math.max(maxCols - 1, 0))}${s.matrix.length}` : "A1";
  const pane = headerRows > 0 ? `<pane ySplit="${headerRows}" topLeftCell="A${headerRows + 1}" activePane="bottomLeft" state="frozen"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>${widthXml}<sheetData>${rows.join("")}</sheetData></worksheet>`;
}
function buildXlsxWorkbook(sheets) {
  const list = sheets.length ? sheets : [{ name: "Sheet1", matrix: [] }];
  const files = [
    { name: "[Content_Types].xml", data: enc.encode(contentTypes(list.length)) },
    { name: "_rels/.rels", data: enc.encode(ROOT_RELS) },
    { name: "xl/workbook.xml", data: enc.encode(workbookXml(list.map((s) => s.name))) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(workbookRels(list.length)) },
    { name: "xl/styles.xml", data: enc.encode(STYLES) },
    ...list.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: enc.encode(sheetXml(s))
    }))
  ];
  return new Blob([zipStore(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
function buildXlsxBlob(matrix, colWidths = []) {
  return buildXlsxWorkbook([{ name: "Sheet1", matrix, colWidths }]);
}
function downloadXlsx(matrix, fileName, colWidths = []) {
  downloadBlob(
    buildXlsxBlob(matrix, colWidths),
    fileName.endsWith(".xlsx") ? fileName : fileName + ".xlsx"
  );
}
function downloadXlsxWorkbook(sheets, fileName) {
  downloadBlob(
    buildXlsxWorkbook(sheets),
    fileName.endsWith(".xlsx") ? fileName : fileName + ".xlsx"
  );
}
const tsvCell = (v) => {
  if (v == null)
    return "";
  return String(v).replace(/[\t\r\n]/g, " ");
};
function toTsv(matrix) {
  return matrix.map((row) => row.map(tsvCell).join("	")).join("\r\n");
}
function parseTsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else
          inQuote = false;
      } else
        cur += ch;
    } else if (ch === '"')
      inQuote = true;
    else if (ch === "	") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (ch !== "\r")
      cur += ch;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}
async function writeClipboard(text) {
  var _a;
  try {
    if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
const norm$1 = (rp) => ({
  r1: Math.min(rp.start.r, rp.end.r),
  r2: Math.max(rp.start.r, rp.end.r),
  c1: Math.min(rp.start.c, rp.end.c),
  c2: Math.max(rp.start.c, rp.end.c)
});
function useInteraction(ctx) {
  const active = ref(null);
  const range = ref(null);
  const cutting = ref(false);
  const draggingRange = ref(false);
  const draggingFill = ref(false);
  const fillPreview = ref(null);
  const extraRanges = ref([]);
  function commitRange() {
    const rp = range.value;
    if (!rp)
      return;
    const dup = extraRanges.value.some(
      (x) => x.start.r === rp.start.r && x.start.c === rp.start.c && x.end.r === rp.end.r && x.end.c === rp.end.c
    );
    if (!dup)
      extraRanges.value = [...extraRanges.value, { start: { ...rp.start }, end: { ...rp.end } }];
  }
  function allRanges() {
    const out = [...extraRanges.value];
    if (range.value)
      out.push(range.value);
    return out;
  }
  const findOpen = ref(false);
  const findQuery = ref("");
  const findMatches = ref([]);
  const findActive = ref(0);
  const cellCopyText = (row, colIndex) => ctx.getCellText ? ctx.getCellText(row, colIndex) : ctx.getCellValue(row, colIndex);
  const cellText2 = (row, colIndex) => {
    const cols = ctx.gridCols();
    const col = cols[colIndex];
    if (!col)
      return "";
    const v = ctx.getCellText ? ctx.getCellText(row.data, colIndex) : ctx.getCellValue(row.data, colIndex);
    return v == null ? "" : String(v);
  };
  function applyFind() {
    findMatches.value = [];
    findActive.value = 0;
    const q = findQuery.value.toLowerCase();
    if (!q)
      return;
    const rows = ctx.displayRows();
    const cols = ctx.gridCols();
    const limit = Math.min(rows.length, 3e3);
    outer:
      for (let r = 0; r < limit; r++) {
        const row = rows[r];
        if (row.type !== "row")
          continue;
        for (let c = 0; c < cols.length; c++) {
          if (cols[c].col.checkbox || cols[c].col.rowDrag)
            continue;
          const text = cellText2(row, c).toLowerCase();
          let idx = text.indexOf(q);
          while (idx >= 0) {
            findMatches.value.push({
              rowIndex: r,
              colId: cols[c].colId,
              start: idx,
              end: idx + q.length
            });
            if (findMatches.value.length >= 5e3)
              break outer;
            idx = text.indexOf(q, idx + q.length);
          }
        }
      }
  }
  watch(findQuery, () => applyFind());
  function gotoMatch(i) {
    if (!findMatches.value.length)
      return;
    findActive.value = (i + findMatches.value.length) % findMatches.value.length;
    const m = findMatches.value[findActive.value];
    const c = ctx.gridCols().findIndex((cc) => cc.colId === m.colId);
    if (c >= 0) {
      active.value = { r: m.rowIndex, c };
      ctx.scrollToCell(m.rowIndex, c);
    }
  }
  function matchOf(rowIndex, colId) {
    if (!findOpen.value || !findMatches.value.length)
      return null;
    const list = findMatches.value.filter((m) => m.rowIndex === rowIndex && m.colId === colId);
    return list.length ? list : null;
  }
  function activeMatchOf(rowIndex, colId) {
    const m = findMatches.value[findActive.value];
    return m && m.rowIndex === rowIndex && m.colId === colId ? m : null;
  }
  function cellFromPoint(x, y) {
    const rows = ctx.displayRows();
    if (!rows.length)
      return null;
    const offs = ctx.offsets();
    const accY = y + scrollTop();
    let r = lowerBound(offs.length ? offs : [0], accY, (i) => offs[i]) - 1;
    if (r >= rows.length)
      r = rows.length - 1;
    if (r < 0)
      r = 0;
    const cols = ctx.gridCols();
    const accX = x + scrollLeft();
    let c = 0;
    let acc = 0;
    for (let i = 0; i < cols.length; i++) {
      if (accX < acc + cols[i].width) {
        c = i;
        break;
      }
      acc += cols[i].width;
      c = i;
    }
    return { r, c };
  }
  let getScroll = () => ({ top: 0, left: 0 });
  function bindScroll(fn) {
    getScroll = fn;
  }
  const scrollTop = () => getScroll().top;
  const scrollLeft = () => getScroll().left;
  function onPointerDown(pos, e) {
    var _a, _b, _c;
    const ctrl = isMac() ? e.metaKey : e.ctrlKey;
    if (ctrl) {
      commitRange();
      active.value = pos;
      range.value = { start: { ...pos }, end: { ...pos } };
      draggingRange.value = true;
      fillPreview.value = null;
      (_a = ctx.rangeChanged) == null ? void 0 : _a.call(ctx, range.value);
      return;
    }
    extraRanges.value = [];
    active.value = pos;
    if (e.shiftKey) {
      range.value = { start: ((_b = range.value) == null ? void 0 : _b.start) || { ...pos }, end: { ...pos } };
    } else {
      range.value = { start: { ...pos }, end: { ...pos } };
      draggingRange.value = true;
      fillPreview.value = null;
    }
    (_c = ctx.rangeChanged) == null ? void 0 : _c.call(ctx, range.value);
  }
  function onPointerMove(pos, e) {
    var _a;
    if (!pos)
      return;
    if (draggingRange.value) {
      range.value = range.value ? { start: range.value.start, end: { ...pos } } : null;
      (_a = ctx.rangeChanged) == null ? void 0 : _a.call(ctx, range.value);
    } else if (draggingFill.value && range.value) {
      fillPreview.value = { start: range.value.start, end: { ...pos } };
    }
  }
  function onPointerUp() {
    if (draggingFill.value && fillPreview.value && range.value) {
      applyFill(fillPreview.value);
    }
    draggingRange.value = false;
    draggingFill.value = false;
    fillPreview.value = null;
  }
  function startFill() {
    if (!range.value)
      return;
    draggingFill.value = true;
  }
  function applyFill(target) {
    const src = norm$1(range.value || target);
    const tgt = norm$1(target);
    const rows = ctx.displayRows();
    const cols = ctx.gridCols();
    const changes = [];
    const srcRowCount = src.r2 - src.r1 + 1;
    for (let c = src.c1; c <= Math.min(src.c2, tgt.c2 >= src.c2 ? tgt.c2 : src.c2); c++) {
      const col = cols[c];
      if (!col || col.col.checkbox || col.col.rowDrag)
        continue;
      for (let r = Math.max(src.r1, tgt.r1); r <= tgt.r2; r++) {
        const rowIdx = r;
        if (rowIdx > src.r2) {
          const dr = rows[rowIdx];
          const sr = rows[src.r1 + (rowIdx - src.r1) % srcRowCount];
          if (!dr || !sr || dr.type !== "row" || sr.type !== "row")
            continue;
          if (!ctx.isCellEditable(dr.data, c))
            continue;
          const nv = ctx.getCellValue(sr.data, c);
          const ov = ctx.getCellValue(dr.data, c);
          if (nv !== ov) {
            ctx.setCellValue(dr.data, col.colId, nv);
            changes.push({ row: dr.data, colId: col.colId, newValue: nv, oldValue: ov });
          }
        }
      }
    }
    if (changes.length) {
      range.value = { start: { r: tgt.r1, c: tgt.c1 }, end: { r: tgt.r2, c: tgt.c2 } };
      ctx.onCellsChanged(changes);
    }
  }
  function matrixOf(rp, withHeader = false) {
    var _a, _b, _c;
    const { r1, r2, c1, c2 } = norm$1(rp);
    const rows = ctx.displayRows();
    const out = [];
    if (withHeader) {
      const cols = ctx.gridCols();
      const head = [];
      for (let c = c1; c <= c2; c++)
        head.push(((_b = (_a = cols[c]) == null ? void 0 : _a.col) == null ? void 0 : _b.title) ?? ((_c = cols[c]) == null ? void 0 : _c.colId) ?? "");
      out.push(head);
    }
    for (let r = r1; r <= r2; r++) {
      const row = rows[r];
      if (!row)
        continue;
      const line = [];
      for (let c = c1; c <= c2; c++)
        line.push(row.type === "row" ? cellCopyText(row.data, c) : "");
      out.push(line);
    }
    return out;
  }
  function rangeMatrix() {
    if (!range.value)
      return null;
    return matrixOf(range.value);
  }
  async function copyRange(cut = false) {
    var _a;
    const list = allRanges();
    if (!list.length)
      return false;
    cutting.value = cut;
    const withHead = !!((_a = ctx.copyHeaders) == null ? void 0 : _a.call(ctx));
    const blocks = list.map((rp) => matrixOf(rp, withHead)).filter((m) => m && m.length);
    if (!blocks.length)
      return false;
    return writeClipboard(blocks.map((m) => toTsv(m)).join("\r\n\r\n"));
  }
  async function pasteFromText(text) {
    var _a;
    if (!range.value && !active.value)
      return false;
    const anchor = ((_a = range.value) == null ? void 0 : _a.start) || active.value;
    if (ctx.pasteTransformer)
      text = ctx.pasteTransformer(text);
    const matrix = parseTsv(text);
    if (!matrix.length || matrix.length === 1 && !matrix[0][0])
      return false;
    const rows = ctx.displayRows();
    const cols = ctx.gridCols();
    const changes = [];
    matrix.forEach((line, dr) => {
      line.forEach((v, dc) => {
        const r = anchor.r + dr;
        const c = anchor.c + dc;
        const row = rows[r];
        const col = cols[c];
        if (!row || !col || row.type !== "row")
          return;
        if (!ctx.isCellEditable(row.data, c))
          return;
        const ov = ctx.getCellValue(row.data, c);
        const nv = typeof ov === "number" && v !== "" && !isNaN(Number(v)) ? Number(v) : v;
        if (nv !== ov) {
          ctx.setCellValue(row.data, col.colId, nv);
          changes.push({ row: row.data, colId: col.colId, newValue: nv, oldValue: ov });
        }
      });
    });
    if (cutting.value && range.value) {
      const { r1, r2, c1, c2 } = norm$1(range.value);
      for (let r = r1; r <= r2; r++) {
        const row = rows[r];
        if (!row || row.type !== "row")
          continue;
        for (let c = c1; c <= c2; c++) {
          const col = cols[c];
          if (!col || !ctx.isCellEditable(row.data, c))
            continue;
          const ov = ctx.getCellValue(row.data, c);
          if (ov !== null) {
            ctx.setCellValue(row.data, col.colId, null);
            changes.push({ row: row.data, colId: col.colId, newValue: null, oldValue: ov });
          }
        }
      }
      cutting.value = false;
    }
    if (changes.length)
      ctx.onCellsChanged(changes);
    return changes.length > 0;
  }
  function moveActive(dr, dc, extend = false) {
    var _a;
    const curActive = active.value;
    const base = extend && range.value ? range.value.end : curActive;
    if (!base) {
      active.value = { r: 0, c: 0 };
      return;
    }
    const rows = ctx.displayRows();
    const cols = ctx.gridCols();
    const r = Math.min(Math.max(base.r + dr, 0), Math.max(rows.length - 1, 0));
    const c = Math.min(Math.max(base.c + dc, 0), Math.max(cols.length - 1, 0));
    active.value = { r, c };
    if (extend) {
      const start = range.value ? range.value.start : curActive || { r, c };
      range.value = { start: { ...start }, end: { r, c } };
      (_a = ctx.rangeChanged) == null ? void 0 : _a.call(ctx, range.value);
    }
    ctx.scrollToCell(r, c);
  }
  function onKeydown(e, editing) {
    var _a, _b;
    const ctrl = isMac() ? e.metaKey : e.ctrlKey;
    if (editing)
      return false;
    switch (e.key) {
      case "ArrowUp":
        moveActive(-1, 0, e.shiftKey);
        e.preventDefault();
        return true;
      case "ArrowDown":
        if (e.shiftKey)
          moveActive(1, 0, true);
        else
          moveActive(1, 0);
        e.preventDefault();
        return true;
      case "ArrowLeft":
        if (e.shiftKey)
          moveActive(0, -1, true);
        else
          moveActive(0, -1);
        e.preventDefault();
        return true;
      case "ArrowRight":
        if (e.shiftKey)
          moveActive(0, 1, true);
        else
          moveActive(0, 1);
        e.preventDefault();
        return true;
      case "Tab": {
        if (active.value)
          moveActive(0, e.shiftKey ? -1 : 1);
        e.preventDefault();
        return true;
      }
      case "Enter": {
        if (active.value) {
          const rows = ctx.displayRows();
          const cols = ctx.gridCols();
          const row = rows[active.value.r];
          const col = cols[active.value.c];
          if ((row == null ? void 0 : row.type) === "row" && col && ctx.isCellEditable(row.data, active.value.c)) {
            ctx.startEdit(active.value.r, active.value.c);
          } else
            moveActive(1, 0);
        }
        e.preventDefault();
        return true;
      }
      case "F2": {
        if (active.value)
          ctx.startEdit(active.value.r, active.value.c);
        e.preventDefault();
        return true;
      }
      case "Escape":
        range.value = null;
        extraRanges.value = [];
        fillPreview.value = null;
        (_a = ctx.rangeChanged) == null ? void 0 : _a.call(ctx, null);
        return true;
      case " ": {
        if (ctrl && active.value) {
          selectColumn(active.value.c);
          e.preventDefault();
          return true;
        }
        if (e.shiftKey && active.value) {
          selectRow(active.value.r);
          e.preventDefault();
          return true;
        }
        return false;
      }
      case "Home":
        if (active.value) {
          active.value = { ...active.value, c: 0 };
          ctx.scrollToCell(active.value.r, 0);
        }
        e.preventDefault();
        return true;
      case "End":
        if (active.value) {
          const c = ctx.gridCols().length - 1;
          active.value = { ...active.value, c };
          ctx.scrollToCell(active.value.r, c);
        }
        e.preventDefault();
        return true;
      case "PageDown":
      case "PageUp": {
        const { h: h2 } = ctx.viewportSize();
        const step = Math.max(Math.round(h2 / ctx.rowHeight()) - 1, 1);
        moveActive(e.key === "PageDown" ? step : -step, 0);
        e.preventDefault();
        return true;
      }
    }
    if (ctrl && (e.key === "c" || e.key === "C")) {
      copyRange(false);
      e.preventDefault();
      return true;
    }
    if (ctrl && (e.key === "x" || e.key === "X")) {
      copyRange(true);
      e.preventDefault();
      return true;
    }
    if (ctrl && (e.key === "f" || e.key === "F")) {
      findOpen.value = true;
      e.preventDefault();
      return true;
    }
    if (ctrl && (e.key === "a" || e.key === "A")) {
      const rows = ctx.displayRows();
      const cols = ctx.gridCols();
      if (rows.length && cols.length) {
        range.value = { start: { r: 0, c: 0 }, end: { r: rows.length - 1, c: cols.length - 1 } };
        (_b = ctx.rangeChanged) == null ? void 0 : _b.call(ctx, range.value);
      }
      e.preventDefault();
      return true;
    }
    return false;
  }
  function onPaste(e) {
    var _a;
    if (editingRef.value)
      return false;
    const text = (_a = e.clipboardData) == null ? void 0 : _a.getData("text/plain");
    if (text && (range.value || active.value)) {
      pasteFromText(text);
      e.preventDefault();
      return true;
    }
    return false;
  }
  const editingRef = ref(false);
  function clearSelection() {
    var _a;
    active.value = null;
    range.value = null;
    extraRanges.value = [];
    fillPreview.value = null;
    (_a = ctx.rangeChanged) == null ? void 0 : _a.call(ctx, null);
  }
  function selectColumn(colIndex, additive = false) {
    var _a;
    const rows = ctx.displayRows();
    const cols = ctx.gridCols();
    if (!rows.length || !cols[colIndex])
      return;
    if (additive)
      commitRange();
    else
      extraRanges.value = [];
    active.value = { r: 0, c: colIndex };
    range.value = { start: { r: 0, c: colIndex }, end: { r: rows.length - 1, c: colIndex } };
    (_a = ctx.rangeChanged) == null ? void 0 : _a.call(ctx, range.value);
  }
  function selectRow(rowIndex, additive = false) {
    var _a;
    const rows = ctx.displayRows();
    const cols = ctx.gridCols();
    if (!cols.length || !rows[rowIndex])
      return;
    if (additive)
      commitRange();
    else
      extraRanges.value = [];
    active.value = { r: rowIndex, c: 0 };
    range.value = { start: { r: rowIndex, c: 0 }, end: { r: rowIndex, c: cols.length - 1 } };
    (_a = ctx.rangeChanged) == null ? void 0 : _a.call(ctx, range.value);
  }
  function rangeRectOf(rp) {
    var _a;
    const { r1, r2, c1, c2 } = norm$1(rp);
    const cols = ctx.gridCols();
    const offs = ctx.offsets();
    const rows = ctx.displayRows();
    if (!cols[c1] || !cols[c2] || !rows[r1])
      return null;
    const left = cols[c1].x;
    const right = cols[c2].x + cols[c2].width;
    const top = offs[r1] ?? 0;
    const last = Math.min(r2, rows.length - 1);
    const bottom = (offs[last] ?? 0) + (((_a = rows[last]) == null ? void 0 : _a.height) ?? ctx.rowHeight());
    return { left, top, width: right - left, height: bottom - top };
  }
  const rangeRect = computed(() => {
    var _a;
    const rp = fillPreview.value || range.value;
    if (!rp)
      return null;
    const { r1, r2, c1, c2 } = norm$1(rp);
    const cols = ctx.gridCols();
    const offs = ctx.offsets();
    const rows = ctx.displayRows();
    if (!rows.length || !cols.length)
      return null;
    let x = 0;
    for (let i = 0; i < c1 && i < cols.length; i++)
      x += cols[i].width;
    let w = 0;
    for (let i = c1; i <= c2 && i < cols.length; i++)
      w += cols[i].width;
    const top = offs[r1] ?? 0;
    const lastH = ((_a = rows[r2]) == null ? void 0 : _a.height) ?? ctx.rowHeight();
    const bottom = (offs[r2] ?? 0) + lastH;
    return { left: x, top, width: w, height: bottom - top };
  });
  const activeRect = computed(() => {
    const a = active.value;
    if (!a)
      return null;
    const cols = ctx.gridCols();
    const offs = ctx.offsets();
    const rows = ctx.displayRows();
    const col = cols[a.c];
    const row = rows[a.r];
    if (!col || !row)
      return null;
    let x = 0;
    for (let i = 0; i < a.c && i < cols.length; i++)
      x += cols[i].width;
    return { left: x, top: offs[a.r] ?? 0, width: col.width, height: row.height };
  });
  return {
    active,
    range,
    extraRanges,
    allRanges,
    rangeRectOf,
    selectColumn,
    selectRow,
    commitRange,
    draggingRange,
    draggingFill,
    startFill,
    rangeRect,
    activeRect,
    cellFromPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeydown,
    onPaste,
    editingRef,
    copyRange,
    pasteFromText,
    rangeMatrix,
    clearSelection,
    moveActive,
    // find
    findOpen,
    findQuery,
    findMatches,
    findActive,
    gotoMatch,
    matchOf,
    activeMatchOf,
    bindScroll
  };
}
const RjSlotRender = defineComponent({
  name: "RjSlotRender",
  props: {
    slots: { type: Object, required: true },
    name: { type: String, required: true },
    params: { type: [Object, Function], default: void 0 }
  },
  setup(props) {
    return () => {
      const fn = props.slots[props.name];
      return fn ? fn(typeof props.params === "function" ? props.params() : props.params) : null;
    };
  }
});
const RjFnRender = defineComponent({
  name: "RjFnRender",
  props: {
    render: { type: Function, default: void 0 },
    params: { type: Object, required: true }
  },
  setup(props) {
    return () => {
      if (!props.render)
        return null;
      const out = props.render(props.params);
      if (out == null)
        return null;
      return Array.isArray(out) ? h("span", null, out) : out;
    };
  }
});
const _hoisted_1$k = ["aria-sort", "draggable", "onClick", "onDragstart", "onDragover", "onDrop"];
const _hoisted_2$k = ["title"];
const _hoisted_3$h = { class: "rj-hcell-icons" };
const _hoisted_4$f = ["title", "onClick"];
const _hoisted_5$f = ["title", "onClick"];
const _hoisted_6$e = ["onMousedown", "onDblclick"];
const _hoisted_7$d = ["value", "placeholder", "onCompositionend", "onInput"];
const _sfc_main$k = /* @__PURE__ */ defineComponent({
  ...{ name: "RjHeader" },
  __name: "RjHeader",
  props: {
    levelCells: {},
    totalWidth: {},
    scrollLeft: {},
    headerRowHeight: {},
    sortStates: {},
    activeFilters: {},
    reorderable: { type: Boolean },
    gridSlots: {},
    allLeaves: {},
    headerChecked: { type: Boolean },
    headerIndeterminate: { type: Boolean },
    floating: { type: Boolean },
    floatValues: {},
    filterRowHeight: {}
  },
  emits: ["sort", "open-filter", "header-menu", "resize", "col-drop", "col-draggroup", "auto-width", "toggle-check-all", "float-filter"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const dragCol = ref("");
    const dragOverCol = ref("");
    const icons = inject(
      RJ_ICONS_KEY,
      computed(() => mergeIcons())
    );
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    function cellSortable(cell) {
      return !cell.isGroup && cell.col.sortable !== false && !cell.col.suppressSort && !!cell.col.field;
    }
    function filterable(cell) {
      return !cell.isGroup && cell.col.filter !== false && !!cell.col.field && !cell.col.checkbox && !cell.col.rowDrag;
    }
    function filterActive(cell) {
      return props.activeFilters.includes(cell.colId);
    }
    function floatType(col) {
      if (typeof col.filter === "string")
        return col.filter;
      if (col.type === "num" || col.type === "money" || col.type === "percent")
        return "number";
      if (col.type === "date" || col.type === "datetime")
        return "date";
      return "text";
    }
    function floatFilterable(col) {
      var _a;
      return col.filter !== false && !!col.field && !col.checkbox && !col.rowDrag && !((_a = col.children) == null ? void 0 : _a.length) && col.type !== "image";
    }
    function floatPh(col) {
      const t2 = floatType(col);
      if (t2 === "number")
        return t("phNumber");
      if (t2 === "date")
        return t("phDate");
      return t("phFilter");
    }
    function onFloatInput(colId, value) {
      emit("float-filter", colId, value);
    }
    const composing = ref(false);
    function onFloatInputGuarded(colId, value) {
      if (composing.value)
        return;
      onFloatInput(colId, value);
    }
    function onFloatCompositionEnd(colId, e) {
      composing.value = false;
      onFloatInput(colId, e.target.value);
    }
    function sortDir(cell) {
      if (!cell.col.field)
        return "";
      const s = props.sortStates.find((x) => x.field === cell.colId || x.field === cell.col.field);
      return (s == null ? void 0 : s.dir) || "";
    }
    function headerAlignOf(cell) {
      const a = cell.col.headerAlign || cell.col.align;
      return a === "center" ? "center" : a === "right" ? "flex-end" : "flex-start";
    }
    function headerTip(cell) {
      const c = cell.col;
      if (c.headerTooltip !== void 0)
        return c.headerTooltip;
      if (c.checkbox || c.rowDrag)
        return "";
      return String(c.title ?? "");
    }
    function ariaSortOf(cell) {
      if (!cellSortable(cell))
        return void 0;
      const d = sortDir(cell);
      return d === "asc" ? "ascending" : d === "desc" ? "descending" : "none";
    }
    let lastResizeEnd = 0;
    function onCellClick(cell, e) {
      if (Date.now() - lastResizeEnd < 250)
        return;
      if (!cellSortable(cell))
        return;
      emit("sort", cell.colId, cell.col.field, e.shiftKey);
    }
    function startResize(cell, e) {
      const startX = e.clientX;
      const startW = cell.width;
      const move = (ev) => {
        emit("resize", cell.colId, startW + ev.clientX - startX, false);
      };
      const up = (ev) => {
        emit("resize", cell.colId, startW + ev.clientX - startX, true);
        lastResizeEnd = Date.now();
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    }
    function autoWidth(cell) {
      emit("auto-width", cell.colId);
    }
    function onDragStart(cell, e) {
      if (cell.isGroup)
        return;
      dragCol.value = cell.colId;
      e.dataTransfer.effectAllowed = "copyMove";
      e.dataTransfer.setData("text/x-rj-col", cell.colId);
    }
    function onDragOver(cell, e) {
      if (!dragCol.value || dragCol.value === cell.colId || cell.isGroup)
        return;
      dragOverCol.value = cell.colId;
      e.preventDefault();
    }
    function onDrop(cell, e) {
      e.preventDefault();
      if (dragCol.value && !cell.isGroup)
        emit("col-drop", dragCol.value, cell.colId);
      dragCol.value = "";
      dragOverCol.value = "";
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "rj-header-main",
        style: normalizeStyle({ width: _ctx.totalWidth + "px", transform: `translateX(${-_ctx.scrollLeft}px)` })
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.levelCells, (level, li) => {
          return openBlock(), createElementBlock("div", {
            key: li,
            class: "rj-hrow",
            role: "row",
            style: normalizeStyle({ height: _ctx.headerRowHeight + "px", position: "relative" })
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(level, (cell) => {
              var _a;
              return openBlock(), createElementBlock("div", {
                key: cell.colId,
                class: normalizeClass(["rj-hcell", {
                  "is-sortable": cellSortable(cell),
                  "is-dragging": !!dragCol.value && dragCol.value === cell.colId,
                  "is-dragover": !!dragOverCol.value && dragOverCol.value === cell.colId,
                  [cell.col.headerClass || ""]: !!cell.col.headerClass
                }]),
                role: "columnheader",
                "aria-sort": ariaSortOf(cell),
                style: normalizeStyle({
                  left: cell.x + "px",
                  width: cell.width + "px",
                  top: 0,
                  bottom: 0,
                  position: "absolute",
                  justifyContent: headerAlignOf(cell)
                }),
                draggable: !cell.isGroup && _ctx.reorderable,
                onClick: ($event) => onCellClick(cell, $event),
                onDragstart: ($event) => onDragStart(cell, $event),
                onDragover: ($event) => onDragOver(cell, $event),
                onDragleave: _cache[3] || (_cache[3] = ($event) => dragOverCol.value = ""),
                onDrop: ($event) => onDrop(cell, $event),
                onDragend: _cache[4] || (_cache[4] = ($event) => dragCol.value = "")
              }, [
                createElementVNode("span", {
                  class: "rj-hcell-title",
                  title: headerTip(cell)
                }, [
                  cell.col.checkbox ? (openBlock(), createElementBlock("span", {
                    key: 0,
                    class: normalizeClass(["rj-checkbox", { "is-checked": _ctx.headerChecked, "is-indeterminate": _ctx.headerIndeterminate }]),
                    onClick: _cache[0] || (_cache[0] = withModifiers(($event) => _ctx.$emit("toggle-check-all"), ["stop"]))
                  }, [
                    _ctx.headerChecked ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      createTextVNode(toDisplayString(unref(icons).checked), 1)
                    ], 64)) : _ctx.headerIndeterminate ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                      createTextVNode(toDisplayString(unref(icons).indeterminate), 1)
                    ], 64)) : createCommentVNode("", true)
                  ], 2)) : cell.col.rowDrag ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createTextVNode(toDisplayString(unref(icons).rowDrag), 1)
                  ], 64)) : ((_a = _ctx.gridSlots) == null ? void 0 : _a["header-" + cell.colId]) ? (openBlock(), createBlock(unref(RjSlotRender), {
                    key: 2,
                    slots: _ctx.gridSlots,
                    name: "header-" + cell.colId,
                    params: { column: cell.col }
                  }, null, 8, ["slots", "name", "params"])) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                    createTextVNode(toDisplayString(cell.col.title || cell.colId), 1)
                  ], 64))
                ], 8, _hoisted_2$k),
                createElementVNode("span", _hoisted_3$h, [
                  cellSortable(cell) ? (openBlock(), createElementBlock("span", {
                    key: 0,
                    class: normalizeClass(["rj-sort-icon", { "is-active": !!sortDir(cell) }])
                  }, toDisplayString(sortDir(cell) === "asc" ? unref(icons).sortAscending : sortDir(cell) === "desc" ? unref(icons).sortDescending : unref(icons).sortUnSort), 3)) : createCommentVNode("", true),
                  filterable(cell) ? (openBlock(), createElementBlock("span", {
                    key: 1,
                    class: normalizeClass(["rj-filter-icon", { "is-active": filterActive(cell) }]),
                    title: unref(t)("filter"),
                    onClick: withModifiers(($event) => _ctx.$emit("open-filter", cell, $event), ["stop"])
                  }, toDisplayString(unref(icons).filter), 11, _hoisted_4$f)) : createCommentVNode("", true),
                  !cell.isGroup && !cell.col.suppressMenu ? (openBlock(), createElementBlock("span", {
                    key: 2,
                    class: "rj-menu-btn",
                    title: unref(t)("colMenu"),
                    onClick: withModifiers(($event) => _ctx.$emit("header-menu", cell, $event), ["stop"])
                  }, toDisplayString(unref(icons).columnMenu), 9, _hoisted_5$f)) : createCommentVNode("", true)
                ]),
                !cell.isGroup && _ctx.reorderable ? (openBlock(), createElementBlock("span", {
                  key: 0,
                  class: "rj-resize-handle",
                  onPointerdown: _cache[1] || (_cache[1] = withModifiers(() => {
                  }, ["stop"])),
                  onClick: _cache[2] || (_cache[2] = withModifiers(() => {
                  }, ["stop"])),
                  onMousedown: withModifiers(($event) => startResize(cell, $event), ["stop", "prevent"]),
                  onDblclick: withModifiers(($event) => autoWidth(cell), ["stop"])
                }, null, 40, _hoisted_6$e)) : createCommentVNode("", true)
              ], 46, _hoisted_1$k);
            }), 128))
          ], 4);
        }), 128)),
        _ctx.floating ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: "rj-hrow rj-frow",
          style: normalizeStyle({ height: _ctx.filterRowHeight + "px", position: "relative" })
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.allLeaves, (leaf) => {
            var _a;
            return openBlock(), createElementBlock("div", {
              key: "f" + leaf.colId,
              class: "rj-fcell",
              style: normalizeStyle({ left: leaf.x + "px", width: leaf.width + "px" })
            }, [
              floatFilterable(leaf.col) ? (openBlock(), createElementBlock("input", {
                key: 0,
                class: "rj-input rj-finput",
                value: ((_a = _ctx.floatValues) == null ? void 0 : _a[leaf.colId]) || "",
                placeholder: floatPh(leaf.col),
                onClick: _cache[5] || (_cache[5] = withModifiers(() => {
                }, ["stop"])),
                onPointerdown: _cache[6] || (_cache[6] = withModifiers(() => {
                }, ["stop"])),
                onKeydown: _cache[7] || (_cache[7] = withModifiers(() => {
                }, ["stop"])),
                onCompositionstart: _cache[8] || (_cache[8] = ($event) => composing.value = true),
                onCompositionend: ($event) => onFloatCompositionEnd(leaf.colId, $event),
                onInput: ($event) => onFloatInputGuarded(leaf.colId, $event.target.value)
              }, null, 40, _hoisted_7$d)) : createCommentVNode("", true)
            ], 4);
          }), 128))
        ], 4)) : createCommentVNode("", true)
      ], 4);
    };
  }
});
const _hoisted_1$j = {
  key: 1,
  class: "rj-editor-select"
};
const _hoisted_2$j = ["placeholder", "aria-expanded"];
const _hoisted_3$g = ["onMouseenter", "onClick"];
const _hoisted_4$e = ["onClick"];
const _hoisted_5$e = {
  key: 1,
  class: "rj-option-caret is-leaf"
};
const _hoisted_6$d = { class: "rj-option-label" };
const _hoisted_7$c = {
  key: 0,
  class: "rj-editor-option",
  style: { "color": "#999" }
};
const _hoisted_8$b = ["rows", "placeholder"];
const _hoisted_9$8 = ["checked"];
const _hoisted_10$8 = ["placeholder"];
const _hoisted_11$8 = ["placeholder"];
const _hoisted_12$8 = {
  key: 7,
  class: "rj-editor-error"
};
const _sfc_main$j = /* @__PURE__ */ defineComponent({
  ...{ name: "RjEditor" },
  __name: "RjEditor",
  props: {
    column: {},
    row: {},
    value: {},
    rowIndex: {}
  },
  emits: ["commit", "cancel"],
  setup(__props, { emit: __emit }) {
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const optionsAccessor = inject(RJ_OPTIONS_KEY, defaultOptionsAccessor);
    const props = __props;
    const emit = __emit;
    const cfg = computed(() => {
      const ed = props.column.editor;
      if (!ed)
        return {};
      return typeof ed === "string" ? { type: ed } : ed;
    });
    const editorType = computed(() => {
      if (cfg.value.type)
        return cfg.value.type;
      const t2 = props.column.type;
      if (t2 === "boolean")
        return "checkbox";
      if (t2 === "num" || t2 === "money" || t2 === "percent")
        return "number";
      if (t2 === "date" || t2 === "datetime")
        return "date";
      if (cfg.value.options)
        return "select";
      return "input";
    });
    const isSelectLike = computed(
      () => editorType.value === "select" || editorType.value === "richSelect"
    );
    const customComp = computed(() => cfg.value.component);
    const placeholder = computed(() => {
      var _a;
      return ((_a = cfg.value.props) == null ? void 0 : _a.placeholder) ?? "";
    });
    const extraProps = computed(() => {
      const p = { ...cfg.value.props };
      delete p.placeholder;
      return p;
    });
    const model = ref(props.value);
    const text = ref(
      editorType.value === "date" ? formatDate(props.value).split(" ")[0] : props.value == null ? "" : String(props.value)
    );
    const options = computed(() => {
      const o = cfg.value.options;
      if (typeof o === "function") {
        const r = o(props.row);
        if (Array.isArray(r) && r.length)
          return r;
      } else if (Array.isArray(o) && o.length) {
        return o;
      }
      if (isSelectLike.value)
        return optionsAccessor.list(props.column) || [];
      return Array.isArray(o) ? o : [];
    });
    const expanded = ref(/* @__PURE__ */ new Set());
    watch(
      options,
      (opts) => {
        expanded.value = collectParentKeys(opts);
      },
      { immediate: true }
    );
    const filteredTree = computed(
      () => isSelectLike.value ? filterOptionTree(options.value, query.value) : options.value
    );
    const visibleRows = computed(() => {
      const q = (query.value || "").trim();
      const tree = filteredTree.value;
      const exp = isSelectLike.value && q ? collectParentKeys(tree) : expanded.value;
      return flattenTreeForRender(tree, exp);
    });
    function toggleExpand(opt) {
      const k = String(opt.value);
      const next = new Set(expanded.value);
      if (next.has(k))
        next.delete(k);
      else
        next.add(k);
      expanded.value = next;
    }
    const open = ref(false);
    const error = ref(null);
    const inputRef = ref();
    const taRef = ref();
    const listRef = ref();
    const activeIdx = ref(-1);
    const query = ref("");
    const committed = ref(false);
    function scrollToActive() {
      nextTick(() => {
        var _a, _b, _c;
        const el = (_b = (_a = listRef.value) == null ? void 0 : _a.children) == null ? void 0 : _b[activeIdx.value];
        (_c = el == null ? void 0 : el.scrollIntoView) == null ? void 0 : _c.call(el, { block: "nearest" });
      });
    }
    function openList() {
      if (!isSelectLike.value)
        return;
      open.value = true;
      query.value = "";
      const i = visibleRows.value.findIndex((r) => r.option.value === model.value);
      activeIdx.value = i >= 0 ? i : visibleRows.value.length ? 0 : -1;
      scrollToActive();
    }
    function move(dir) {
      if (!open.value)
        return openList();
      const len = visibleRows.value.length;
      if (!len)
        return;
      activeIdx.value = Math.min(len - 1, Math.max(0, activeIdx.value + dir));
      scrollToActive();
    }
    function confirmPick() {
      const row = visibleRows.value[activeIdx.value];
      if (open.value && row)
        pick(row.option);
      else
        pickText();
    }
    function pick(opt) {
      model.value = opt.value;
      text.value = String(opt.label);
      open.value = false;
      commit(opt.value);
    }
    function pickText() {
      const exact = flattenOptions(options.value).find((o) => String(o.label) === text.value);
      if (exact)
        return pick(exact);
      const first = visibleRows.value[0];
      if (first && text.value.trim())
        return pick(first.option);
      commit(text.value);
    }
    function onSelectBlur() {
      setTimeout(() => {
        open.value = false;
        commit(text.value);
      }, 150);
    }
    async function commit(v) {
      if (committed.value)
        return;
      const isFx = typeof v === "string" && isFormula(v.trim());
      const val = editorType.value === "number" && !isFx ? parseNumericInput(v) : v;
      if (cfg.value.validator) {
        const err = await cfg.value.validator(val, props.row, props.column);
        if (err) {
          error.value = err;
          committed.value = false;
          nextTick(() => {
            var _a;
            return (_a = inputRef.value) == null ? void 0 : _a.focus();
          });
          return;
        }
      }
      committed.value = true;
      emit("commit", val);
    }
    function cancel() {
      committed.value = true;
      emit("cancel");
    }
    onMounted(() => {
      nextTick(() => {
        var _a, _b, _c;
        if (editorType.value === "largeText") {
          (_a = taRef.value) == null ? void 0 : _a.focus();
          return;
        }
        (_b = inputRef.value) == null ? void 0 : _b.focus();
        if (((_c = inputRef.value) == null ? void 0 : _c.select) && editorType.value !== "checkbox")
          inputRef.value.select();
      });
    });
    watch(query, () => {
      if (isSelectLike.value && open.value)
        activeIdx.value = visibleRows.value.length ? 0 : -1;
    });
    return (_ctx, _cache) => {
      var _a;
      return openBlock(), createElementBlock("div", {
        class: "rj-editor",
        onKeydown: _cache[24] || (_cache[24] = withModifiers(() => {
        }, ["stop"]))
      }, [
        editorType.value === "custom" && customComp.value ? (openBlock(), createBlock(resolveDynamicComponent(customComp.value), {
          key: 0,
          value: model.value,
          row: _ctx.row,
          column: _ctx.column,
          onCommit: commit,
          onCancel: cancel
        }, null, 40, ["value", "row", "column"])) : editorType.value === "select" || editorType.value === "richSelect" ? (openBlock(), createElementBlock("div", _hoisted_1$j, [
          withDirectives(createElementVNode("input", {
            ref_key: "inputRef",
            ref: inputRef,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => text.value = $event),
            class: "rj-editor-combo",
            placeholder: placeholder.value,
            role: "combobox",
            "aria-expanded": open.value,
            onFocus: _cache[1] || (_cache[1] = ($event) => openList()),
            onInput: _cache[2] || (_cache[2] = ($event) => query.value = text.value),
            onBlur: onSelectBlur,
            onKeydown: [
              _cache[3] || (_cache[3] = withKeys(withModifiers(($event) => move(1), ["prevent"]), ["down"])),
              _cache[4] || (_cache[4] = withKeys(withModifiers(($event) => move(-1), ["prevent"]), ["up"])),
              _cache[5] || (_cache[5] = withKeys(withModifiers(($event) => confirmPick(), ["prevent"]), ["enter"])),
              _cache[6] || (_cache[6] = withKeys(withModifiers(($event) => cancel(), ["prevent"]), ["esc"]))
            ]
          }, null, 40, _hoisted_2$j), [
            [vModelText, text.value]
          ]),
          withDirectives(createElementVNode("div", {
            ref_key: "listRef",
            ref: listRef,
            class: "rj-editor-dropdown rj-option-tree",
            onMousedown: _cache[7] || (_cache[7] = withModifiers(() => {
            }, ["prevent"]))
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(visibleRows.value, (node, i) => {
              return openBlock(), createElementBlock("div", {
                key: String(node.option.value) + ":" + i,
                class: normalizeClass(["rj-editor-option rj-option-row", { "is-active": i === activeIdx.value, "is-selected": node.option.value === model.value }]),
                style: normalizeStyle({ paddingLeft: 8 + node.depth * 16 + "px" }),
                onMouseenter: ($event) => activeIdx.value = i,
                onClick: ($event) => pick(node.option)
              }, [
                node.hasChildren ? (openBlock(), createElementBlock("span", {
                  key: 0,
                  class: "rj-option-caret",
                  onClick: withModifiers(($event) => toggleExpand(node.option), ["stop"])
                }, toDisplayString(node.expanded ? "▾" : "▸"), 9, _hoisted_4$e)) : (openBlock(), createElementBlock("span", _hoisted_5$e)),
                createElementVNode("span", _hoisted_6$d, toDisplayString(node.option.label), 1)
              ], 46, _hoisted_3$g);
            }), 128)),
            !visibleRows.value.length ? (openBlock(), createElementBlock("div", _hoisted_7$c, toDisplayString(unref(t)("noMatches")), 1)) : createCommentVNode("", true)
          ], 544), [
            [vShow, open.value]
          ])
        ])) : editorType.value === "largeText" ? withDirectives((openBlock(), createElementBlock("textarea", {
          key: 2,
          ref_key: "taRef",
          ref: taRef,
          class: "rj-editor-textarea",
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => text.value = $event),
          rows: ((_a = cfg.value.props) == null ? void 0 : _a.rows) || 4,
          placeholder: placeholder.value,
          onKeydown: [
            _cache[9] || (_cache[9] = withKeys(withModifiers(($event) => cancel(), ["prevent"]), ["esc"])),
            _cache[10] || (_cache[10] = withKeys(withModifiers(($event) => commit(text.value), ["ctrl", "prevent"]), ["enter"]))
          ],
          onBlur: _cache[11] || (_cache[11] = ($event) => commit(text.value))
        }, null, 40, _hoisted_8$b)), [
          [vModelText, text.value]
        ]) : editorType.value === "checkbox" ? (openBlock(), createElementBlock("input", {
          key: 3,
          ref_key: "inputRef",
          ref: inputRef,
          type: "checkbox",
          checked: !!model.value,
          onChange: _cache[12] || (_cache[12] = ($event) => commit($event.target.checked))
        }, null, 40, _hoisted_9$8)) : editorType.value === "date" ? withDirectives((openBlock(), createElementBlock("input", {
          key: 4,
          ref_key: "inputRef",
          ref: inputRef,
          type: "date",
          "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => text.value = $event),
          onChange: _cache[14] || (_cache[14] = ($event) => commit(text.value)),
          onKeydown: _cache[15] || (_cache[15] = withKeys(withModifiers(($event) => cancel(), ["prevent"]), ["esc"]))
        }, null, 544)), [
          [vModelText, text.value]
        ]) : editorType.value === "number" ? withDirectives((openBlock(), createElementBlock("input", mergeProps({
          key: 5,
          ref_key: "inputRef",
          ref: inputRef,
          type: "text",
          inputmode: "decimal",
          "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => text.value = $event),
          placeholder: placeholder.value
        }, toHandlers(extraProps.value, true), {
          onKeydown: [
            _cache[17] || (_cache[17] = withKeys(withModifiers(($event) => commit(text.value), ["prevent"]), ["enter"])),
            _cache[18] || (_cache[18] = withKeys(withModifiers(($event) => cancel(), ["prevent"]), ["esc"]))
          ],
          onBlur: _cache[19] || (_cache[19] = ($event) => commit(text.value))
        }), null, 16, _hoisted_10$8)), [
          [vModelText, text.value]
        ]) : withDirectives((openBlock(), createElementBlock("input", mergeProps({
          key: 6,
          ref_key: "inputRef",
          ref: inputRef,
          type: "text",
          "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => text.value = $event),
          placeholder: placeholder.value
        }, toHandlers(extraProps.value, true), {
          onKeydown: [
            _cache[21] || (_cache[21] = withKeys(withModifiers(($event) => commit(text.value), ["prevent"]), ["enter"])),
            _cache[22] || (_cache[22] = withKeys(withModifiers(($event) => cancel(), ["prevent"]), ["esc"]))
          ],
          onBlur: _cache[23] || (_cache[23] = ($event) => commit(text.value))
        }), null, 16, _hoisted_11$8)), [
          [vModelText, text.value]
        ]),
        error.value ? (openBlock(), createElementBlock("div", _hoisted_12$8, toDisplayString(error.value), 1)) : createCommentVNode("", true)
      ], 32);
    };
  }
});
const _hoisted_1$i = ["src", "alt", "loading", "onClick"];
const _hoisted_2$i = {
  key: 1,
  class: "rj-cell-inner rj-cell-img-fallback"
};
const _sfc_main$i = /* @__PURE__ */ defineComponent({
  ...{ name: "RjImgList" },
  __name: "RjImgList",
  props: {
    urls: {},
    style: {},
    shape: {},
    lazy: { type: Boolean },
    alt: {},
    fallback: {}
  },
  emits: ["preview"],
  setup(__props) {
    const props = __props;
    const failed = ref(false);
    watch(
      () => props.urls.join("\n"),
      () => failed.value = false
    );
    return (_ctx, _cache) => {
      return !failed.value ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(_ctx.urls, (u, ui) => {
        return openBlock(), createElementBlock("img", {
          key: ui,
          class: normalizeClass(["rj-cell-img-el", "rj-img--" + _ctx.shape]),
          style: normalizeStyle(_ctx.style),
          src: u,
          alt: _ctx.alt,
          loading: _ctx.lazy ? "lazy" : "eager",
          decoding: "async",
          draggable: "false",
          onError: _cache[0] || (_cache[0] = ($event) => failed.value = true),
          onClick: withModifiers(($event) => _ctx.$emit("preview", u), ["stop"])
        }, null, 46, _hoisted_1$i);
      }), 128)) : (openBlock(), createElementBlock("span", _hoisted_2$i, toDisplayString(_ctx.fallback), 1));
    };
  }
});
const _hoisted_1$h = { class: "rj-sparkline" };
const _hoisted_2$h = ["width", "height"];
const _sfc_main$h = /* @__PURE__ */ defineComponent({
  ...{ name: "RjSparkline" },
  __name: "RjSparkline",
  props: {
    data: {},
    style: {},
    color: { default: "" },
    w: { default: 60 },
    h: { default: 22 }
  },
  setup(__props) {
    const props = __props;
    const cv = ref();
    const dpr = window.devicePixelRatio || 1;
    function draw() {
      const el = cv.value;
      if (!el)
        return;
      const ctx = el.getContext("2d");
      if (!ctx)
        return;
      ctx.scale(dpr, dpr);
      const { w, h: h2 } = props;
      ctx.clearRect(0, 0, w, h2);
      const data = (props.data || []).filter((v) => typeof v === "number" && isFinite(v));
      if (!data.length)
        return;
      const max = Math.max(...data, 0);
      const min = Math.min(...data, 0);
      const span = max - min || 1;
      const css = getComputedStyle(el.parentElement || el);
      const color = props.color || css.getPropertyValue("--rj-primary") || "#3b76f6";
      ctx.lineWidth = 1.2;
      if (props.style === "bar") {
        const bw = Math.max((w - data.length + 1) / data.length, 1);
        data.forEach((v, i) => {
          const bh = Math.max((v - min) / span * (h2 - 2), 1);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(i * (bw + 1), h2 - bh, bw, bh);
        });
      } else if (props.style === "spider") {
        const cx = w / 2;
        const cy = h2 / 2;
        const r = Math.min(w, h2) / 2 - 1;
        const n = Math.max(data.length, 3);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = Math.PI * 2 * i / n - Math.PI / 2;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        data.forEach((v, i) => {
          const a = Math.PI * 2 * i / n - Math.PI / 2;
          const rr = (v - min) / span * r;
          const x = cx + rr * Math.cos(a);
          const y = cy + rr * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
      } else {
        ctx.strokeStyle = color;
        ctx.beginPath();
        data.forEach((v, i) => {
          const x = i / Math.max(data.length - 1, 1) * (w - 2) + 1;
          const y = h2 - 1 - (v - min) / span * (h2 - 2);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        const last = data[data.length - 1];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          (data.length - 1) / Math.max(data.length - 1, 1) * (w - 2) + 1,
          h2 - 1 - (last - min) / span * (h2 - 2),
          1.8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    watch(
      () => [props.data, props.style],
      () => nextTick(draw),
      { deep: true }
    );
    onMounted(draw);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("span", _hoisted_1$h, [
        createElementVNode("canvas", {
          ref_key: "cv",
          ref: cv,
          width: _ctx.w * unref(dpr),
          height: _ctx.h * unref(dpr),
          style: normalizeStyle(`width:${_ctx.w}px;height:${_ctx.h}px`)
        }, null, 12, _hoisted_2$h)
      ]);
    };
  }
});
const _hoisted_1$g = ["disabled", "onClick"];
const _hoisted_2$g = {
  key: 0,
  class: "rj-act-ico"
};
const _hoisted_3$f = { key: 1 };
const _hoisted_4$d = {
  key: 0,
  class: "rj-act-ico"
};
const _hoisted_5$d = { key: 1 };
const _sfc_main$g = /* @__PURE__ */ defineComponent({
  ...{ name: "RjCellActions", inheritAttrs: false },
  __name: "RjCellActions",
  props: {
    actions: {},
    params: {},
    width: {},
    border: { type: Boolean },
    gap: {}
  },
  setup(__props) {
    const props = __props;
    const host = inject(RJ_CELL_ACTIONS_KEY, null);
    const gap = computed(() => props.gap == null ? 4 : props.gap);
    const shownActions = computed(() => filterVisibleActions(props.actions, ctxOf));
    function ctxOf(a) {
      return { ...props.params, action: a };
    }
    function evalFlag(v, a, def = false) {
      if (v == null)
        return def;
      return typeof v === "function" ? !!v(ctxOf(a)) : !!v;
    }
    function borderOf(a) {
      return a.border == null ? props.border !== false : a.border;
    }
    const containerRef = ref(null);
    const moreRef = ref(null);
    const measureRef = ref(null);
    const inlineCount = ref(shownActions.value.length);
    const inlineActions = computed(() => shownActions.value.slice(0, inlineCount.value));
    const overflowActions = computed(() => shownActions.value.slice(inlineCount.value));
    function computeFit() {
      const cont = containerRef.value;
      const measure = measureRef.value;
      const n = shownActions.value.length;
      if (!cont || !measure) {
        inlineCount.value = n;
        return;
      }
      const kids = Array.from(measure.children);
      const moreW = kids.length ? kids[kids.length - 1].offsetWidth : 0;
      const btnW = kids.slice(0, n).map((el) => el.offsetWidth);
      inlineCount.value = computeInlineCount(btnW, moreW, gap.value, cont.clientWidth);
    }
    function remeasure() {
      nextTick(() => computeFit());
    }
    let ro = null;
    onMounted(() => {
      remeasure();
      if (typeof ResizeObserver !== "undefined" && containerRef.value) {
        ro = new ResizeObserver(remeasure);
        ro.observe(containerRef.value);
      }
    });
    onBeforeUnmount(() => {
      ro == null ? void 0 : ro.disconnect();
      ro = null;
    });
    watch(
      () => [props.width, shownActions.value.length],
      remeasure
    );
    function run(a) {
      if (evalFlag(a.disabled, a))
        return;
      host == null ? void 0 : host.run(a, props.params);
    }
    function openMore() {
      const el = moreRef.value;
      if (el && host)
        host.openOverflow(el, overflowActions.value, props.params);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "containerRef",
        ref: containerRef,
        class: "rj-cell-actions",
        style: normalizeStyle({ gap: gap.value + "px" })
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(inlineActions.value, (a, i) => {
          return openBlock(), createElementBlock("button", {
            key: a.name + "@" + i,
            type: "button",
            class: normalizeClass(["rj-act-btn", {
              "is-danger": a.danger,
              "is-text": !borderOf(a),
              "is-disabled": evalFlag(a.disabled, a)
            }]),
            disabled: evalFlag(a.disabled, a),
            onPointerdown: _cache[0] || (_cache[0] = withModifiers(() => {
            }, ["stop"])),
            onClick: withModifiers(($event) => run(a), ["stop"])
          }, [
            a.icon ? (openBlock(), createElementBlock("span", _hoisted_2$g, toDisplayString(a.icon), 1)) : createCommentVNode("", true),
            a.label ? (openBlock(), createElementBlock("span", _hoisted_3$f, toDisplayString(a.label), 1)) : createCommentVNode("", true)
          ], 42, _hoisted_1$g);
        }), 128)),
        overflowActions.value.length ? (openBlock(), createElementBlock("button", {
          key: 0,
          ref_key: "moreRef",
          ref: moreRef,
          type: "button",
          class: "rj-act-btn rj-act-more",
          title: "更多",
          onPointerdown: _cache[1] || (_cache[1] = withModifiers(() => {
          }, ["stop"])),
          onClick: withModifiers(openMore, ["stop"])
        }, " ⋯ ", 544)) : createCommentVNode("", true),
        createElementVNode("div", {
          ref_key: "measureRef",
          ref: measureRef,
          class: "rj-act-measure",
          "aria-hidden": "true"
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(shownActions.value, (a, i) => {
            return openBlock(), createElementBlock("button", {
              key: "m" + a.name + "@" + i,
              type: "button",
              class: normalizeClass(["rj-act-btn", { "is-danger": a.danger, "is-text": !borderOf(a) }])
            }, [
              a.icon ? (openBlock(), createElementBlock("span", _hoisted_4$d, toDisplayString(a.icon), 1)) : createCommentVNode("", true),
              a.label ? (openBlock(), createElementBlock("span", _hoisted_5$d, toDisplayString(a.label), 1)) : createCommentVNode("", true)
            ], 2);
          }), 128)),
          _cache[2] || (_cache[2] = createElementVNode("button", {
            type: "button",
            class: "rj-act-btn rj-act-more"
          }, "⋯", -1))
        ], 512)
      ], 4);
    };
  }
});
const _hoisted_1$f = ["data-r", "data-c", "role", "aria-colindex", "aria-selected", "title"];
const _hoisted_2$f = {
  key: 1,
  class: "rj-expand-icon",
  style: { "opacity": "0" }
};
const _hoisted_3$e = { class: "rj-cell-inner" };
const _hoisted_4$c = { style: { "color": "var(--rj-text-secondary)", "margin-left": "6px" } };
const _hoisted_5$c = {
  key: 2,
  style: { "width": "18px", "display": "inline-block", "flex-shrink": "0" }
};
const _hoisted_6$c = ["innerHTML"];
const _hoisted_7$b = ["innerHTML"];
const _sfc_main$f = /* @__PURE__ */ defineComponent({
  ...{ name: "RjCell", inheritAttrs: false },
  __name: "RjCell",
  props: {
    leaf: {},
    drow: {},
    rowIndex: {},
    colIndex: {},
    x: {},
    width: {},
    height: {},
    z: {},
    value: {},
    checked: { type: Boolean },
    indeterminate: { type: Boolean },
    editing: { type: Boolean },
    flash: { type: Boolean },
    dirty: { type: Boolean },
    treeExpandable: { type: Boolean },
    hasDetail: { type: Boolean },
    detailOpen: { type: Boolean },
    isAnchor: { type: Boolean },
    isGroupAnchor: { type: Boolean },
    groupDisplay: {},
    matches: {},
    activeMatch: {},
    gridSlots: {},
    display: {}
  },
  emits: ["edit-commit", "edit-cancel", "toggle-check", "toggle-expand", "toggle-detail", "row-drag-start", "img-preview"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const cellParams = computed(() => ({
      value: props.value,
      row: props.drow.data,
      rowIndex: props.rowIndex,
      column: props.leaf.col,
      colIndex: props.colIndex
    }));
    const icons = inject(
      RJ_ICONS_KEY,
      computed(() => mergeIcons())
    );
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const sparkData = computed(() => {
      const cfg = props.leaf.col.sparkline;
      if (!cfg || props.drow.type !== "row")
        return null;
      const raw = cfg.valueField ? props.drow.data[cfg.valueField] : props.value;
      if (!Array.isArray(raw) || !raw.length)
        return null;
      return raw.map((v) => Number(v) || 0);
    });
    const groupLabel = computed(() => {
      const labels = props.drow.data.__groupLabels;
      if (props.groupDisplay === "singleColumn") {
        if (labels == null ? void 0 : labels.length)
          return labels.map((v) => v === "" || v == null ? t("emptyVal") : String(v)).join(" / ");
      }
      const last = (labels == null ? void 0 : labels.length) ? labels[labels.length - 1] : props.drow.data.__groupValue;
      return last === "" || last == null ? t("emptyVal") : String(last);
    });
    const isPivot = computed(() => !!props.drow.data.__pivot);
    const FX_ERRORS = ["#CIRCULAR!", "#REF!", "#VALUE!", "#NAME?", "#DIV/0!", "#NUM!", "#N/A"];
    const isFxError = computed(
      () => props.drow.type === "row" && FX_ERRORS.includes(String(props.display ?? "").trim())
    );
    const baseStyle = computed(() => ({
      left: props.x + "px",
      width: props.width + "px",
      height: props.height + "px",
      lineHeight: props.height + "px",
      zIndex: props.z
    }));
    const align = computed(() => {
      const c = props.leaf.col;
      if (c.align)
        return c.align;
      if (c.type === "num" || c.type === "money" || c.type === "percent")
        return "right";
      if (c.type === "boolean")
        return "center";
      return "left";
    });
    const dynStyle = computed(() => {
      const c = props.leaf.col;
      const st = {};
      if (typeof c.cellStyle === "function")
        Object.assign(st, c.cellStyle(cellParams.value) || {});
      else if (c.cellStyle)
        Object.assign(st, c.cellStyle);
      return st;
    });
    const cellClass = computed(() => {
      const c = props.leaf.col;
      const cls = {
        ["rj-cell-" + align.value]: true,
        "is-editing": !!props.editing,
        "is-dirty": !!props.dirty,
        "rj-cell-link": c.type === "link",
        "rj-cell-img": c.type === "image",
        // 公式错误格（含循环引用）标红
        "is-fx-err": isFxError.value,
        // 拖拽列：手柄撑满整格作 grab 热区（否则字形仅占列宽一小部分，点列中央拖不动）
        "rj-cell-drag": !!c.rowDrag && !props.drow.noDrag
      };
      if (typeof c.cellClass === "function") {
        String(c.cellClass(cellParams.value) || "").split(" ").filter(Boolean).forEach((x) => cls[x] = true);
      } else if (typeof c.cellClass === "string") {
        c.cellClass.split(" ").filter(Boolean).forEach((x) => cls[x] = true);
      }
      return cls;
    });
    const tooltipText = computed(() => {
      const t2 = props.leaf.col.tooltip;
      if (!t2)
        return imgUrls.value.length ? props.display || void 0 : void 0;
      return typeof t2 === "function" ? t2(cellParams.value) : t2;
    });
    const slotName = computed(() => "cell-" + props.leaf.colId);
    const cellSlot = computed(() => {
      var _a;
      return ((_a = props.gridSlots) == null ? void 0 : _a[slotName.value]) ? slotName.value : "";
    });
    const cellRendererFn = computed(() => cellSlot.value ? void 0 : props.leaf.col.cellRenderer);
    const colActions = computed(
      () => resolveColActions(props.leaf.col.actions, {
        overridden: !!cellSlot.value || !!props.leaf.col.cellRenderer,
        pinned: props.drow.pinned
      })
    );
    function esc(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const richContent = computed(() => {
      var _a;
      const text = props.display ?? "";
      if (text === "")
        return "";
      let html = esc(String(text));
      if ((_a = props.matches) == null ? void 0 : _a.length) {
        const segs = [];
        let last = 0;
        props.matches.forEach((m) => {
          segs.push(html.slice(last, m.start));
          const isCur = props.activeMatch && props.activeMatch.start === m.start;
          segs.push(
            `<span class="${isCur ? "rj-find-current" : "rj-find-hit"}">${html.slice(m.start, m.end)}</span>`
          );
          last = m.end;
        });
        segs.push(html.slice(last));
        html = segs.join("");
      }
      const c = props.leaf.col;
      if (c.type === "link")
        html = `<a href="javascript:void(0)">${html}</a>`;
      return html;
    });
    const imgUrls = computed(() => {
      const c = props.leaf.col;
      if (c.type !== "image")
        return [];
      const cfg = c.image || {};
      if (cellSlot.value || c.cellRenderer)
        return [];
      const raw = cfg.src ? cfg.src(cellParams.value) : props.value;
      if (raw == null || raw === "")
        return [];
      const list = Array.isArray(raw) ? raw : String(raw).split(/[|\n]/);
      const limit = cfg.max && cfg.max > 0 ? cfg.max : Array.isArray(raw) ? 3 : 1;
      return list.map((s) => String(s).trim()).filter(Boolean).slice(0, limit);
    });
    const imgBind = computed(() => {
      const cfg = props.leaf.col.image || {};
      const size = cfg.size && cfg.size > 0 ? cfg.size : 24;
      const title = props.leaf.col.title;
      return {
        urls: imgUrls.value,
        style: {
          width: (cfg.width && cfg.width > 0 ? cfg.width : size) + "px",
          height: (cfg.height && cfg.height > 0 ? cfg.height : size) + "px"
        },
        shape: cfg.shape || "rounded",
        lazy: cfg.lazy !== false,
        alt: cfg.alt ?? (typeof title === "string" ? title : ""),
        fallback: cfg.fallback !== void 0 ? cfg.fallback : props.display || ""
      };
    });
    function onImgPreview(url) {
      if ((props.leaf.col.image || {}).preview === false)
        return;
      emit("img-preview", url);
    }
    return (_ctx, _cache) => {
      var _a, _b, _c, _d, _e;
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["rj-cell", cellClass.value]),
        style: normalizeStyle([baseStyle.value, dynStyle.value]),
        "data-r": _ctx.rowIndex,
        "data-c": _ctx.colIndex,
        role: _ctx.drow.type === "group" && _ctx.isGroupAnchor ? "rowheader" : "gridcell",
        "aria-colindex": _ctx.colIndex + 1,
        "aria-selected": _ctx.checked || void 0,
        title: tooltipText.value
      }, [
        _ctx.editing ? (openBlock(), createBlock(_sfc_main$j, {
          key: 0,
          column: _ctx.leaf.col,
          row: _ctx.drow.data,
          value: _ctx.value,
          "row-index": _ctx.rowIndex,
          onCommit: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("edit-commit", $event)),
          onCancel: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("edit-cancel"))
        }, null, 8, ["column", "row", "value", "row-index"])) : _ctx.leaf.col.checkbox && !_ctx.drow.noDrag ? (openBlock(), createElementBlock("span", {
          key: 1,
          class: normalizeClass(["rj-checkbox", { "is-checked": _ctx.checked, "is-indeterminate": _ctx.indeterminate }]),
          onClick: _cache[2] || (_cache[2] = withModifiers(($event) => _ctx.$emit("toggle-check"), ["stop"]))
        }, [
          _ctx.checked ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createTextVNode(toDisplayString(unref(icons).checked), 1)
          ], 64)) : _ctx.indeterminate ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
            createTextVNode(toDisplayString(unref(icons).indeterminate), 1)
          ], 64)) : createCommentVNode("", true)
        ], 2)) : _ctx.leaf.col.rowDrag && !_ctx.drow.noDrag ? (openBlock(), createElementBlock("span", {
          key: 2,
          class: "rj-row-drag-handle",
          onPointerdown: _cache[3] || (_cache[3] = withModifiers(($event) => _ctx.$emit("row-drag-start", $event), ["stop"]))
        }, toDisplayString(unref(icons).rowDrag), 33)) : _ctx.drow.type === "group" && _ctx.isGroupAnchor ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
          createElementVNode("span", {
            class: "rj-indent",
            style: normalizeStyle({ width: _ctx.drow.level * 18 + "px" })
          }, null, 4),
          !isPivot.value && !_ctx.drow.isFooter && _ctx.drow.expandable !== false ? (openBlock(), createElementBlock("span", {
            key: 0,
            class: "rj-expand-icon",
            onClick: _cache[4] || (_cache[4] = withModifiers(($event) => _ctx.$emit("toggle-expand", _ctx.drow.key), ["stop"]))
          }, toDisplayString(_ctx.drow.expanded ? unref(icons).collapse : unref(icons).expand), 1)) : !isPivot.value ? (openBlock(), createElementBlock("span", _hoisted_2$f, toDisplayString(unref(icons).collapse), 1)) : createCommentVNode("", true),
          createElementVNode("span", _hoisted_3$e, [
            _ctx.drow.isFooter ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createTextVNode(toDisplayString(unref(t)("subtotal")), 1)
            ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              ((_a = _ctx.gridSlots) == null ? void 0 : _a["cell-" + _ctx.leaf.colId]) ? (openBlock(), createBlock(unref(RjSlotRender), {
                key: 0,
                slots: _ctx.gridSlots,
                name: "cell-" + _ctx.leaf.colId,
                params: cellParams.value
              }, null, 8, ["slots", "name", "params"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createTextVNode(toDisplayString(groupLabel.value), 1)
              ], 64)),
              createElementVNode("span", _hoisted_4$c, "(" + toDisplayString(_ctx.drow.data.__count) + ")", 1)
            ], 64))
          ])
        ], 64)) : _ctx.isAnchor ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
          createElementVNode("span", {
            class: "rj-indent",
            style: normalizeStyle({ width: _ctx.drow.level * 18 + "px" })
          }, null, 4),
          _ctx.treeExpandable ? (openBlock(), createElementBlock("span", {
            key: 0,
            class: "rj-expand-icon",
            onClick: _cache[5] || (_cache[5] = withModifiers(($event) => _ctx.$emit("toggle-expand", _ctx.drow.key), ["stop"]))
          }, toDisplayString(_ctx.drow.expanded ? unref(icons).collapse : unref(icons).expand), 1)) : _ctx.hasDetail ? (openBlock(), createElementBlock("span", {
            key: 1,
            class: "rj-expand-icon",
            onClick: _cache[6] || (_cache[6] = withModifiers(($event) => _ctx.$emit("toggle-detail", _ctx.drow.key), ["stop"]))
          }, toDisplayString(_ctx.detailOpen ? unref(icons).collapse : unref(icons).expand), 1)) : (openBlock(), createElementBlock("span", _hoisted_5$c)),
          imgUrls.value.length ? (openBlock(), createBlock(_sfc_main$i, mergeProps({ key: 3 }, imgBind.value, { onPreview: onImgPreview }), null, 16)) : cellSlot.value || cellRendererFn.value ? (openBlock(), createElementBlock("span", {
            key: 4,
            class: normalizeClass(["rj-cell-inner rj-cell-custom", { wrap: _ctx.leaf.col.wrapText }])
          }, [
            ((_b = _ctx.gridSlots) == null ? void 0 : _b[cellSlot.value]) ? (openBlock(), createBlock(unref(RjSlotRender), {
              key: 0,
              slots: _ctx.gridSlots,
              name: cellSlot.value,
              params: cellParams.value
            }, null, 8, ["slots", "name", "params"])) : (openBlock(), createBlock(unref(RjFnRender), {
              key: 1,
              render: cellRendererFn.value,
              params: cellParams.value
            }, null, 8, ["render", "params"]))
          ], 2)) : (openBlock(), createElementBlock("span", {
            key: 5,
            class: normalizeClass(["rj-cell-inner", { wrap: _ctx.leaf.col.wrapText }]),
            innerHTML: richContent.value
          }, null, 10, _hoisted_6$c))
        ], 64)) : imgUrls.value.length ? (openBlock(), createBlock(_sfc_main$i, mergeProps({ key: 5 }, imgBind.value, { onPreview: onImgPreview }), null, 16)) : cellSlot.value || cellRendererFn.value ? (openBlock(), createElementBlock("span", {
          key: 6,
          class: normalizeClass(["rj-cell-inner rj-cell-custom", { wrap: _ctx.leaf.col.wrapText }])
        }, [
          ((_c = _ctx.gridSlots) == null ? void 0 : _c[cellSlot.value]) ? (openBlock(), createBlock(unref(RjSlotRender), {
            key: 0,
            slots: _ctx.gridSlots,
            name: cellSlot.value,
            params: cellParams.value
          }, null, 8, ["slots", "name", "params"])) : (openBlock(), createBlock(unref(RjFnRender), {
            key: 1,
            render: cellRendererFn.value,
            params: cellParams.value
          }, null, 8, ["render", "params"]))
        ], 2)) : colActions.value.length ? (openBlock(), createBlock(_sfc_main$g, {
          key: 7,
          actions: colActions.value,
          params: cellParams.value,
          width: _ctx.width,
          border: _ctx.leaf.col.actionsBorder,
          gap: _ctx.leaf.col.actionsGap
        }, null, 8, ["actions", "params", "width", "border", "gap"])) : sparkData.value ? (openBlock(), createBlock(_sfc_main$h, {
          key: 8,
          data: sparkData.value,
          style: normalizeStyle(((_d = _ctx.leaf.col.sparkline) == null ? void 0 : _d.style) || "bar"),
          color: (_e = _ctx.leaf.col.sparkline) == null ? void 0 : _e.color
        }, null, 8, ["data", "style", "color"])) : (openBlock(), createElementBlock("span", {
          key: 9,
          class: normalizeClass(["rj-cell-inner", { wrap: _ctx.leaf.col.wrapText }]),
          innerHTML: richContent.value
        }, null, 10, _hoisted_7$b))
      ], 14, _hoisted_1$f);
    };
  }
});
const _hoisted_1$e = {
  class: "rj-popup-row",
  style: { "justify-content": "space-between", "font-size": "12px", "margin-bottom": "4px" }
};
const _hoisted_2$e = { class: "rj-check-item" };
const _hoisted_3$d = ["checked"];
const _hoisted_4$b = ["title"];
const _hoisted_5$b = ["placeholder"];
const _hoisted_6$b = { class: "rj-check-list" };
const _hoisted_7$a = ["value"];
const _hoisted_8$a = {
  key: 0,
  style: { "padding": "6px", "color": "#999" }
};
const _hoisted_9$7 = { class: "rj-popup-row" };
const _hoisted_10$7 = { class: "rj-radio-tabs" };
const _hoisted_11$7 = ["onUpdate:modelValue"];
const _hoisted_12$7 = ["value"];
const _hoisted_13$6 = ["onUpdate:modelValue", "type"];
const _hoisted_14$6 = ["onUpdate:modelValue", "type"];
const _hoisted_15$5 = ["title", "onClick"];
const _hoisted_16$5 = { class: "rj-popup-row" };
const _hoisted_17$4 = { class: "rj-popup-footer" };
const _sfc_main$e = /* @__PURE__ */ defineComponent({
  ...{ name: "RjFilterMenu" },
  __name: "RjFilterMenu",
  props: {
    column: {},
    filterType: {},
    model: {},
    x: { default: 0 },
    y: { default: 0 },
    uniqueValues: {},
    inline: { type: Boolean, default: false }
  },
  emits: ["apply", "clear", "advanced"],
  setup(__props, { emit: __emit }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const optionsAccessor = inject(RJ_OPTIONS_KEY, defaultOptionsAccessor);
    const props = __props;
    const emit = __emit;
    const ops = computed(() => FILTER_OPS[props.filterType] || []);
    function opLabel(o) {
      const s = t(o.labelKey);
      return s === o.labelKey ? o.label : s;
    }
    const hasV2 = (op) => {
      var _a2;
      return !!((_a2 = ops.value.find((o) => o.value === op)) == null ? void 0 : _a2.v2);
    };
    const noValue = (op) => op === "blank" || op === "notBlank";
    const inputType = computed(
      () => props.filterType === "date" ? "date" : props.filterType === "number" ? "number" : "text"
    );
    const operator = ref(((_a = props.model) == null ? void 0 : _a.operator) || "or");
    const conds = ref(
      ((_c = (_b = props.model) == null ? void 0 : _b.conditions) == null ? void 0 : _c.length) ? props.model.conditions.map((c) => ({ ...c })) : [{ op: ((_d = ops.value[0]) == null ? void 0 : _d.value) || "contains", value1: "", value2: "" }]
    );
    const values = ref(
      ((_e = props.model) == null ? void 0 : _e.type) === "select" && (((_f = props.model.conditions[0]) == null ? void 0 : _f.op) === "in" || ((_g = props.model.conditions[0]) == null ? void 0 : _g.op) === "notIn") ? (props.model.conditions[0].value1 || []).map(String) : []
    );
    const exclude = ref(((_h = props.model) == null ? void 0 : _h.type) === "select" && ((_i = props.model.conditions[0]) == null ? void 0 : _i.op) === "notIn");
    const options = computed(() => (props.uniqueValues || []).map(String).sort());
    const search = ref("");
    const filteredOptions = computed(() => {
      const q = search.value.toLowerCase();
      return q ? options.value.filter((v) => v.toLowerCase().includes(q)) : options.value;
    });
    const displayOf = (v) => {
      var _a2;
      return optionsAccessor.label(props.column, v) ?? ((_a2 = props.column.filterValueMap) == null ? void 0 : _a2[v]) ?? v;
    };
    const allChecked = computed(
      () => options.value.length > 0 && values.value.length >= options.value.length
    );
    function toggleAll() {
      values.value = allChecked.value ? [] : [...options.value];
    }
    function addCond() {
      var _a2;
      conds.value.push({ op: ((_a2 = ops.value[0]) == null ? void 0 : _a2.value) || "contains", value1: "", value2: "" });
    }
    function apply() {
      if (props.filterType === "select") {
        if (!values.value.length && !exclude.value)
          return emit("clear");
        if (exclude.value && !values.value.length)
          return emit("clear");
        return emit("apply", {
          type: "select",
          operator: "or",
          conditions: [{ op: exclude.value ? "notIn" : "in", value1: values.value }]
        });
      }
      const valid = conds.value.filter((c) => noValue(c.op) || c.value1 !== "" && c.value1 != null);
      if (!valid.length)
        return emit("clear");
      emit("apply", {
        type: props.filterType,
        operator: operator.value,
        conditions: valid.map((c) => ({ op: c.op, value1: c.value1, value2: c.value2 }))
      });
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["rj-popup", { "is-inline": _ctx.inline }]),
        style: normalizeStyle(_ctx.inline ? {} : { left: _ctx.x + "px", top: _ctx.y + "px", minWidth: "240px" }),
        onClick: _cache[10] || (_cache[10] = withModifiers(() => {
        }, ["stop"]))
      }, [
        _ctx.filterType === "select" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createElementVNode("div", _hoisted_1$e, [
            createElementVNode("label", _hoisted_2$e, [
              createElementVNode("input", {
                type: "checkbox",
                checked: allChecked.value,
                onChange: _cache[0] || (_cache[0] = ($event) => toggleAll())
              }, null, 40, _hoisted_3$d),
              createTextVNode(" " + toDisplayString(unref(t)("selectAll")), 1)
            ]),
            createElementVNode("label", {
              class: "rj-check-item",
              title: unref(t)("invertHint")
            }, [
              withDirectives(createElementVNode("input", {
                type: "checkbox",
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => exclude.value = $event)
              }, null, 512), [
                [vModelCheckbox, exclude.value]
              ]),
              createTextVNode(" " + toDisplayString(unref(t)("excludeSelected")), 1)
            ], 8, _hoisted_4$b)
          ]),
          withDirectives(createElementVNode("input", {
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => search.value = $event),
            class: "rj-input",
            style: { "width": "100%", "margin-bottom": "6px" },
            placeholder: unref(t)("searchOptions")
          }, null, 8, _hoisted_5$b), [
            [vModelText, search.value]
          ]),
          createElementVNode("div", _hoisted_6$b, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(filteredOptions.value, (opt) => {
              return openBlock(), createElementBlock("label", {
                key: String(opt),
                class: "rj-check-item"
              }, [
                withDirectives(createElementVNode("input", {
                  type: "checkbox",
                  value: opt,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => values.value = $event)
                }, null, 8, _hoisted_7$a), [
                  [vModelCheckbox, values.value]
                ]),
                createElementVNode("span", null, toDisplayString(displayOf(opt)), 1)
              ]);
            }), 128)),
            !filteredOptions.value.length ? (openBlock(), createElementBlock("div", _hoisted_8$a, toDisplayString(unref(t)("noOptions")), 1)) : createCommentVNode("", true)
          ])
        ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createElementVNode("div", _hoisted_9$7, [
            createElementVNode("div", _hoisted_10$7, [
              createElementVNode("span", {
                class: normalizeClass({ "is-active": operator.value === "and" }),
                onClick: _cache[4] || (_cache[4] = ($event) => operator.value = "and")
              }, "AND", 2),
              createElementVNode("span", {
                class: normalizeClass({ "is-active": operator.value === "or" }),
                onClick: _cache[5] || (_cache[5] = ($event) => operator.value = "or")
              }, "OR", 2)
            ])
          ]),
          (openBlock(true), createElementBlock(Fragment, null, renderList(conds.value, (cond, i) => {
            return openBlock(), createElementBlock("div", {
              key: i,
              class: "rj-popup-row"
            }, [
              withDirectives(createElementVNode("select", {
                "onUpdate:modelValue": ($event) => cond.op = $event,
                class: "rj-input",
                style: { "width": "auto", "min-width": "92px", "max-width": "168px", "padding": "0 4px" }
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(ops.value, (op) => {
                  return openBlock(), createElementBlock("option", {
                    key: op.value,
                    value: op.value
                  }, toDisplayString(opLabel(op)), 9, _hoisted_12$7);
                }), 128))
              ], 8, _hoisted_11$7), [
                [vModelSelect, cond.op]
              ]),
              !noValue(cond.op) ? withDirectives((openBlock(), createElementBlock("input", {
                key: 0,
                "onUpdate:modelValue": ($event) => cond.value1 = $event,
                class: "rj-input",
                style: { "flex": "1", "min-width": "0" },
                type: inputType.value,
                onKeyup: _cache[6] || (_cache[6] = withKeys(($event) => apply(), ["enter"]))
              }, null, 40, _hoisted_13$6)), [
                [vModelDynamic, cond.value1]
              ]) : createCommentVNode("", true),
              hasV2(cond.op) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                _cache[11] || (_cache[11] = createElementVNode("span", null, "~", -1)),
                withDirectives(createElementVNode("input", {
                  "onUpdate:modelValue": ($event) => cond.value2 = $event,
                  class: "rj-input",
                  style: { "flex": "1", "min-width": "0" },
                  type: inputType.value
                }, null, 8, _hoisted_14$6), [
                  [vModelDynamic, cond.value2]
                ])
              ], 64)) : createCommentVNode("", true),
              conds.value.length > 1 ? (openBlock(), createElementBlock("span", {
                key: 2,
                class: "rj-cond-del",
                title: unref(t)("deleteCondition"),
                onClick: ($event) => conds.value.splice(i, 1)
              }, "×", 8, _hoisted_15$5)) : createCommentVNode("", true)
            ]);
          }), 128)),
          createElementVNode("div", _hoisted_16$5, [
            createElementVNode("a", {
              style: { "font-size": "12px", "color": "var(--rj-primary)", "cursor": "pointer" },
              onClick: addCond
            }, toDisplayString(unref(t)("addCondition")), 1)
          ])
        ], 64)),
        createElementVNode("div", _hoisted_17$4, [
          createElementVNode("button", {
            class: "rj-btn",
            onClick: _cache[7] || (_cache[7] = ($event) => _ctx.$emit("clear"))
          }, toDisplayString(unref(t)("clear")), 1),
          createElementVNode("span", {
            class: "rj-adv-link",
            onClick: _cache[8] || (_cache[8] = ($event) => _ctx.$emit("advanced"))
          }, toDisplayString(unref(t)("advancedFilterLink")), 1),
          createElementVNode("button", {
            class: "rj-btn is-active",
            onClick: _cache[9] || (_cache[9] = ($event) => apply())
          }, toDisplayString(unref(t)("apply")), 1)
        ])
      ], 6);
    };
  }
});
const _hoisted_1$d = { class: "rj-adv-head" };
const _hoisted_2$d = { class: "rj-radio-tabs" };
const _hoisted_3$c = ["title"];
const _hoisted_4$a = {
  key: 1,
  class: "rj-adv-cond"
};
const _hoisted_5$a = ["value", "onChange"];
const _hoisted_6$a = ["value"];
const _hoisted_7$9 = ["onUpdate:modelValue", "onChange"];
const _hoisted_8$9 = ["value"];
const _hoisted_9$6 = ["onUpdate:modelValue", "type"];
const _hoisted_10$6 = ["onUpdate:modelValue", "type"];
const _hoisted_11$6 = ["title", "onClick"];
const _hoisted_12$6 = { class: "rj-adv-actions" };
const _sfc_main$d = /* @__PURE__ */ defineComponent({
  ...{ name: "RjAdvGroup" },
  __name: "RjAdvGroup",
  props: {
    group: {},
    columns: {},
    depth: {}
  },
  emits: ["remove"],
  setup(__props) {
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const props = __props;
    const g = props.group;
    function setOp(op) {
      g.operator = op;
    }
    const ac = (item) => item;
    const noValue = (op) => op === "blank" || op === "notBlank";
    function opLabel(o) {
      const s = t(o.labelKey);
      return s === o.labelKey ? o.label : s;
    }
    function opsFor(c) {
      return FILTER_OPS[c.filterType || "text"] || FILTER_OPS.text;
    }
    function hasV2(c) {
      var _a;
      return !!((_a = opsFor(c).find((o) => o.value === c.condition.op)) == null ? void 0 : _a.v2);
    }
    function inputType(c) {
      const ft = c.filterType;
      return ft === "date" ? "date" : ft === "number" ? "number" : "text";
    }
    function addCondition() {
      var _a;
      const col = props.columns[0];
      if (!col)
        return;
      const ft = col.filterType;
      const firstOp = ((_a = (FILTER_OPS[ft] || FILTER_OPS.text)[0]) == null ? void 0 : _a.value) || "contains";
      g.items.push({
        colId: col.colId,
        filterType: ft,
        condition: { op: firstOp, value1: "", value2: "" }
      });
    }
    function addGroup() {
      g.items.push({ operator: "or", items: [] });
    }
    function removeAt(i) {
      g.items.splice(i, 1);
    }
    function onColChange(item, e) {
      var _a;
      const colId = e.target.value;
      item.colId = colId;
      const col = props.columns.find((c) => c.colId === colId);
      item.filterType = (col == null ? void 0 : col.filterType) || "text";
      item.condition.op = ((_a = (FILTER_OPS[item.filterType] || FILTER_OPS.text)[0]) == null ? void 0 : _a.value) || "contains";
      item.condition.value1 = "";
      item.condition.value2 = "";
    }
    function onOpChange(item) {
      if (noValue(item.condition.op)) {
        item.condition.value1 = "";
        item.condition.value2 = "";
      }
    }
    return (_ctx, _cache) => {
      const _component_RjAdvGroup = resolveComponent("RjAdvGroup", true);
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["rj-adv-group", { "is-nested": _ctx.depth > 0 }])
      }, [
        createElementVNode("div", _hoisted_1$d, [
          createElementVNode("div", _hoisted_2$d, [
            createElementVNode("span", {
              class: normalizeClass({ "is-active": _ctx.group.operator === "and" }),
              onClick: _cache[0] || (_cache[0] = ($event) => setOp("and"))
            }, "AND", 2),
            createElementVNode("span", {
              class: normalizeClass({ "is-active": _ctx.group.operator === "or" }),
              onClick: _cache[1] || (_cache[1] = ($event) => setOp("or"))
            }, "OR", 2)
          ]),
          _ctx.depth > 0 ? (openBlock(), createElementBlock("span", {
            key: 0,
            class: "rj-adv-remove",
            title: unref(t)("advDelGroup"),
            onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$emit("remove"))
          }, "✕", 8, _hoisted_3$c)) : createCommentVNode("", true)
        ]),
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.group.items, (item, i) => {
          return openBlock(), createElementBlock("div", {
            key: i,
            class: "rj-adv-item"
          }, [
            unref(isAdvGroup)(item) ? (openBlock(), createBlock(_component_RjAdvGroup, {
              key: 0,
              group: item,
              columns: _ctx.columns,
              depth: _ctx.depth + 1,
              onRemove: ($event) => removeAt(i)
            }, null, 8, ["group", "columns", "depth", "onRemove"])) : (openBlock(), createElementBlock("div", _hoisted_4$a, [
              createElementVNode("select", {
                class: "rj-input",
                value: ac(item).colId,
                onChange: ($event) => onColChange(item, $event)
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.columns, (c) => {
                  return openBlock(), createElementBlock("option", {
                    key: c.colId,
                    value: c.colId
                  }, toDisplayString(c.title || c.colId), 9, _hoisted_6$a);
                }), 128))
              ], 40, _hoisted_5$a),
              withDirectives(createElementVNode("select", {
                "onUpdate:modelValue": ($event) => ac(item).condition.op = $event,
                class: "rj-input",
                style: { "width": "auto", "min-width": "96px", "max-width": "170px" },
                onChange: ($event) => onOpChange(item)
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(opsFor(ac(item)), (op) => {
                  return openBlock(), createElementBlock("option", {
                    key: op.value,
                    value: op.value
                  }, toDisplayString(opLabel(op)), 9, _hoisted_8$9);
                }), 128))
              ], 40, _hoisted_7$9), [
                [vModelSelect, ac(item).condition.op]
              ]),
              !noValue(ac(item).condition.op) ? withDirectives((openBlock(), createElementBlock("input", {
                key: 0,
                "onUpdate:modelValue": ($event) => ac(item).condition.value1 = $event,
                class: "rj-input",
                style: { "flex": "1", "min-width": "0" },
                type: inputType(ac(item))
              }, null, 8, _hoisted_9$6)), [
                [vModelDynamic, ac(item).condition.value1]
              ]) : createCommentVNode("", true),
              hasV2(ac(item)) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                _cache[3] || (_cache[3] = createElementVNode("span", null, "~", -1)),
                withDirectives(createElementVNode("input", {
                  "onUpdate:modelValue": ($event) => ac(item).condition.value2 = $event,
                  class: "rj-input",
                  style: { "flex": "1", "min-width": "0" },
                  type: inputType(ac(item))
                }, null, 8, _hoisted_10$6), [
                  [vModelDynamic, ac(item).condition.value2]
                ])
              ], 64)) : createCommentVNode("", true),
              createElementVNode("span", {
                class: "rj-adv-remove",
                title: unref(t)("advDelCond"),
                onClick: ($event) => removeAt(i)
              }, "×", 8, _hoisted_11$6)
            ]))
          ]);
        }), 128)),
        createElementVNode("div", _hoisted_12$6, [
          createElementVNode("a", { onClick: addCondition }, toDisplayString(unref(t)("advAddCond")), 1),
          _ctx.depth < 2 ? (openBlock(), createElementBlock("a", {
            key: 0,
            onClick: addGroup
          }, toDisplayString(unref(t)("advAddGroup")), 1)) : createCommentVNode("", true)
        ])
      ], 2);
    };
  }
});
const _hoisted_1$c = { class: "rj-adv-title" };
const _hoisted_2$c = { class: "rj-popup-footer" };
const _sfc_main$c = /* @__PURE__ */ defineComponent({
  ...{ name: "RjAdvancedFilterDialog" },
  __name: "RjAdvancedFilterDialog",
  props: {
    model: {},
    columns: {},
    x: {},
    y: {}
  },
  emits: ["apply", "clear", "close"],
  setup(__props, { emit: __emit }) {
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const props = __props;
    const emit = __emit;
    const tree = reactive(
      props.model ? JSON.parse(JSON.stringify(props.model)) : { operator: "and", items: [] }
    );
    const noValue = (op) => op === "blank" || op === "notBlank";
    function normalize(node) {
      const items = [];
      node.items.forEach((it) => {
        if (isAdvGroup(it)) {
          const sub = normalize(it);
          if (sub.items.length)
            items.push(sub);
          return;
        }
        const cond = { ...it.condition };
        if (cond.op === "in" || cond.op === "notIn") {
          const arr = String(cond.value1 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
          if (!arr.length)
            return;
          items.push({
            colId: it.colId,
            filterType: it.filterType,
            condition: { ...cond, value1: arr }
          });
        } else {
          if (!noValue(cond.op) && (cond.value1 === "" || cond.value1 == null))
            return;
          items.push({ ...it, condition: cond });
        }
      });
      return { operator: node.operator, items };
    }
    function apply() {
      const normalized = normalize(JSON.parse(JSON.stringify(tree)));
      if (!normalized.items.length)
        return emit("clear");
      emit("apply", normalized);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "rj-popup rj-adv-dialog",
        style: normalizeStyle({ left: _ctx.x + "px", top: _ctx.y + "px" }),
        onClick: _cache[3] || (_cache[3] = withModifiers(() => {
        }, ["stop"]))
      }, [
        createElementVNode("div", _hoisted_1$c, [
          createTextVNode(toDisplayString(unref(t)("advFilterTitle")) + " ", 1),
          createElementVNode("span", {
            class: "rj-adv-remove",
            onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("close"))
          }, "✕")
        ]),
        createVNode(_sfc_main$d, {
          group: tree,
          columns: _ctx.columns,
          depth: 0
        }, null, 8, ["group", "columns"]),
        createElementVNode("div", _hoisted_2$c, [
          createElementVNode("button", {
            class: "rj-btn",
            onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("clear"))
          }, toDisplayString(unref(t)("clear")), 1),
          createElementVNode("button", {
            class: "rj-btn is-active",
            onClick: _cache[2] || (_cache[2] = ($event) => apply())
          }, toDisplayString(unref(t)("apply")), 1)
        ])
      ], 4);
    };
  }
});
const _hoisted_1$b = {
  key: 0,
  class: "rj-menu-divider"
};
const _hoisted_2$b = ["onMouseenter", "onClick"];
const _hoisted_3$b = { class: "rj-menu-item-label" };
const _hoisted_4$9 = {
  key: 0,
  class: "rj-menu-sub-arrow"
};
const _hoisted_5$9 = {
  key: 1,
  class: "rj-menu rj-menu-sub"
};
const _hoisted_6$9 = {
  key: 0,
  class: "rj-menu-divider"
};
const _hoisted_7$8 = ["onClick"];
const _hoisted_8$8 = { class: "rj-menu-item-label" };
const _sfc_main$b = /* @__PURE__ */ defineComponent({
  ...{ name: "RjContextMenu" },
  __name: "RjContextMenu",
  props: {
    items: {},
    x: {},
    y: {}
  },
  emits: ["select", "reposition"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const menuRef = ref();
    onMounted(() => {
      const el = menuRef.value;
      if (el)
        emit("reposition", el.offsetHeight, el.offsetWidth);
    });
    const hoverIdx = ref(-1);
    function onClick(item) {
      var _a, _b;
      if (((_a = item.children) == null ? void 0 : _a.length) || item.isSeparator || ((_b = item.disabled) == null ? void 0 : _b.call(item)))
        return;
      emit("select", item);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "menuRef",
        ref: menuRef,
        class: "rj-menu",
        style: normalizeStyle({ left: _ctx.x + "px", top: _ctx.y + "px" }),
        onClick: _cache[0] || (_cache[0] = withModifiers(() => {
        }, ["stop"]))
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.items, (item, i) => {
          var _a, _b, _c, _d;
          return openBlock(), createElementBlock(Fragment, { key: i }, [
            item.isSeparator ? (openBlock(), createElementBlock("div", _hoisted_1$b)) : (openBlock(), createElementBlock("div", {
              key: 1,
              class: normalizeClass(["rj-menu-item", { "is-disabled": (_a = item.disabled) == null ? void 0 : _a.call(item), "is-danger": item.danger, "has-sub": (_b = item.children) == null ? void 0 : _b.length }]),
              onMouseenter: ($event) => {
                var _a2;
                return hoverIdx.value = ((_a2 = item.children) == null ? void 0 : _a2.length) ? i : -1;
              },
              onClick: ($event) => onClick(item)
            }, [
              createElementVNode("span", _hoisted_3$b, toDisplayString(item.name), 1),
              ((_c = item.children) == null ? void 0 : _c.length) ? (openBlock(), createElementBlock("span", _hoisted_4$9, "▸")) : createCommentVNode("", true),
              ((_d = item.children) == null ? void 0 : _d.length) && hoverIdx.value === i ? (openBlock(), createElementBlock("div", _hoisted_5$9, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(item.children, (sub) => {
                  var _a2;
                  return openBlock(), createElementBlock(Fragment, {
                    key: sub.name || String(sub.isSeparator)
                  }, [
                    sub.isSeparator ? (openBlock(), createElementBlock("div", _hoisted_6$9)) : (openBlock(), createElementBlock("div", {
                      key: 1,
                      class: normalizeClass(["rj-menu-item", { "is-disabled": (_a2 = sub.disabled) == null ? void 0 : _a2.call(sub), "is-danger": sub.danger }]),
                      onClick: withModifiers(($event) => onClick(sub), ["stop"])
                    }, [
                      createElementVNode("span", _hoisted_8$8, toDisplayString(sub.name), 1)
                    ], 10, _hoisted_7$8))
                  ], 64);
                }), 128))
              ])) : createCommentVNode("", true)
            ], 42, _hoisted_2$b))
          ], 64);
        }), 128))
      ], 4);
    };
  }
});
const _hoisted_1$a = { class: "rj-colmenu-tabs" };
const _hoisted_2$a = ["onClick"];
const _hoisted_3$a = { class: "rj-colmenu-tab-ic" };
const _hoisted_4$8 = { class: "rj-colmenu-body" };
const _hoisted_5$8 = { class: "rj-colmenu-title" };
const _hoisted_6$8 = { class: "rj-colmenu-ic" };
const _hoisted_7$7 = {
  key: 0,
  class: "rj-colmenu-cur"
};
const _hoisted_8$7 = { class: "rj-colmenu-ic" };
const _hoisted_9$5 = {
  key: 0,
  class: "rj-colmenu-cur"
};
const _hoisted_10$5 = { class: "rj-colmenu-ic" };
const _hoisted_11$5 = ["title"];
const _hoisted_12$5 = { class: "rj-colmenu-ic" };
const _hoisted_13$5 = {
  key: 0,
  class: "rj-colmenu-cur"
};
const _hoisted_14$5 = ["title"];
const _hoisted_15$4 = { class: "rj-colmenu-ic" };
const _hoisted_16$4 = {
  key: 0,
  class: "rj-colmenu-cur"
};
const _hoisted_17$3 = { class: "rj-colmenu-ic" };
const _hoisted_18$3 = { class: "rj-colmenu-title" };
const _hoisted_19$2 = { class: "rj-colmenu-draghint" };
const _hoisted_20$2 = { class: "rj-colmenu-list" };
const _hoisted_21$2 = ["onDragstart", "onDragover", "onDragleave", "onDrop"];
const _hoisted_22$2 = {
  class: "rj-colmenu-grip",
  title: ""
};
const _hoisted_23$2 = ["title", "onClick"];
const _hoisted_24$2 = ["title", "onClick"];
const _hoisted_25$2 = { class: "rj-colmenu-foot" };
const _sfc_main$a = /* @__PURE__ */ defineComponent({
  ...{ name: "RjColumnMenu" },
  __name: "RjColumnMenu",
  props: {
    col: {},
    colId: {},
    x: {},
    y: {},
    canSort: { type: Boolean, default: false },
    canFilter: { type: Boolean, default: false },
    canGroup: { type: Boolean, default: false },
    sortDir: { default: null },
    pinned: { default: null },
    filterType: { default: "text" },
    filterModel: { default: null },
    uniqueValues: { default: () => [] },
    columns: {}
  },
  emits: ["sort", "select", "autosize", "pin", "hide", "group", "apply-filter", "clear-filter", "advanced", "toggle-col-hide", "toggle-col-pin", "col-drop"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const icons = inject(
      RJ_ICONS_KEY,
      computed(() => mergeIcons())
    );
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const tab = ref("general");
    const tabs = computed(() => {
      const list = [
        { k: "general", label: t("tabGeneral"), icon: icons.value.menuGeneral }
      ];
      if (props.canFilter)
        list.push({ k: "filter", label: t("tabFilter"), icon: icons.value.menuFilter });
      list.push({ k: "columns", label: t("tabColumns"), icon: icons.value.menuColumns });
      return list;
    });
    const visibleTabs = tabs;
    const clampX = computed(() => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1024;
      return Math.max(8, Math.min(props.x, w - 300));
    });
    const clampY = computed(() => {
      const h2 = typeof window !== "undefined" ? window.innerHeight : 768;
      return Math.max(8, Math.min(props.y, h2 - 420));
    });
    function pick(fn) {
      fn();
    }
    function toggleColPin(c) {
      emit("toggle-col-pin", c.colId, c.pinned ? null : "left");
    }
    function toggleGeneralPin(side) {
      emit("pin", props.pinned === side ? null : side);
    }
    const dragId = ref("");
    const dragOverId = ref("");
    function onColDragStart(colId, e) {
      dragId.value = colId;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/x-rj-col", colId);
      }
    }
    function onColDrop(toId) {
      if (dragId.value && dragId.value !== toId)
        emit("col-drop", dragId.value, toId);
      dragId.value = "";
      dragOverId.value = "";
    }
    function onColDragEnd() {
      dragId.value = "";
      dragOverId.value = "";
    }
    function setAll(visible) {
      props.columns.forEach((c) => {
        if (!!c.hidden === visible)
          emit("toggle-col-hide", c.colId);
      });
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "rj-colmenu",
        style: normalizeStyle({ left: clampX.value + "px", top: clampY.value + "px" }),
        onClick: _cache[15] || (_cache[15] = withModifiers(() => {
        }, ["stop"])),
        onMousedown: _cache[16] || (_cache[16] = withModifiers(() => {
        }, ["stop"]))
      }, [
        createElementVNode("div", _hoisted_1$a, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(visibleTabs), (tb) => {
            return openBlock(), createElementBlock("div", {
              key: tb.k,
              class: normalizeClass(["rj-colmenu-tab", { "is-active": tab.value === tb.k }]),
              onClick: ($event) => tab.value = tb.k
            }, [
              createElementVNode("span", _hoisted_3$a, toDisplayString(tb.icon), 1),
              createTextVNode(toDisplayString(tb.label), 1)
            ], 10, _hoisted_2$a);
          }), 128))
        ]),
        createElementVNode("div", _hoisted_4$8, [
          tab.value === "general" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createElementVNode("div", _hoisted_5$8, toDisplayString(_ctx.col.title || _ctx.colId), 1),
            _ctx.canSort ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createElementVNode("div", {
                class: "rj-colmenu-item",
                onClick: _cache[0] || (_cache[0] = ($event) => pick(() => _ctx.$emit("sort", "asc")))
              }, [
                createElementVNode("span", _hoisted_6$8, toDisplayString(unref(icons).sortAscending), 1),
                createTextVNode(toDisplayString(unref(t)("sortAsc")) + " ", 1),
                _ctx.sortDir === "asc" ? (openBlock(), createElementBlock("span", _hoisted_7$7, toDisplayString(unref(icons).checked), 1)) : createCommentVNode("", true)
              ]),
              createElementVNode("div", {
                class: "rj-colmenu-item",
                onClick: _cache[1] || (_cache[1] = ($event) => pick(() => _ctx.$emit("sort", "desc")))
              }, [
                createElementVNode("span", _hoisted_8$7, toDisplayString(unref(icons).sortDescending), 1),
                createTextVNode(toDisplayString(unref(t)("sortDesc")) + " ", 1),
                _ctx.sortDir === "desc" ? (openBlock(), createElementBlock("span", _hoisted_9$5, toDisplayString(unref(icons).checked), 1)) : createCommentVNode("", true)
              ]),
              createElementVNode("div", {
                class: "rj-colmenu-item",
                onClick: _cache[2] || (_cache[2] = ($event) => pick(() => _ctx.$emit("sort", null)))
              }, [
                createElementVNode("span", _hoisted_10$5, toDisplayString(unref(icons).sortUnSort), 1),
                createTextVNode(toDisplayString(unref(t)("sortUnsort")), 1)
              ]),
              _cache[17] || (_cache[17] = createElementVNode("div", { class: "rj-colmenu-divider" }, null, -1))
            ], 64)) : createCommentVNode("", true),
            createElementVNode("div", {
              class: "rj-colmenu-item",
              onClick: _cache[3] || (_cache[3] = ($event) => pick(() => _ctx.$emit("select")))
            }, toDisplayString(unref(t)("selectColumn")), 1),
            createElementVNode("div", {
              class: "rj-colmenu-item",
              onClick: _cache[4] || (_cache[4] = ($event) => pick(() => _ctx.$emit("autosize")))
            }, toDisplayString(unref(t)("autosize")), 1),
            _cache[19] || (_cache[19] = createElementVNode("div", { class: "rj-colmenu-divider" }, null, -1)),
            createElementVNode("div", {
              class: normalizeClass(["rj-colmenu-item", { "is-active": _ctx.pinned === "left" }]),
              title: _ctx.pinned === "left" ? unref(t)("pinnedLeft") + " · " + unref(t)("unpin") : "",
              onClick: _cache[5] || (_cache[5] = ($event) => pick(() => toggleGeneralPin("left")))
            }, [
              createElementVNode("span", _hoisted_12$5, toDisplayString(unref(icons).pin), 1),
              createTextVNode(toDisplayString(unref(t)("pinLeft")) + " ", 1),
              _ctx.pinned === "left" ? (openBlock(), createElementBlock("span", _hoisted_13$5, toDisplayString(unref(icons).checked), 1)) : createCommentVNode("", true)
            ], 10, _hoisted_11$5),
            createElementVNode("div", {
              class: normalizeClass(["rj-colmenu-item", { "is-active": _ctx.pinned === "right" }]),
              title: _ctx.pinned === "right" ? unref(t)("pinnedRight") + " · " + unref(t)("unpin") : "",
              onClick: _cache[6] || (_cache[6] = ($event) => pick(() => toggleGeneralPin("right")))
            }, [
              createElementVNode("span", _hoisted_15$4, toDisplayString(unref(icons).pin), 1),
              createTextVNode(toDisplayString(unref(t)("pinRight")) + " ", 1),
              _ctx.pinned === "right" ? (openBlock(), createElementBlock("span", _hoisted_16$4, toDisplayString(unref(icons).checked), 1)) : createCommentVNode("", true)
            ], 10, _hoisted_14$5),
            _ctx.pinned ? (openBlock(), createElementBlock("div", {
              key: 1,
              class: "rj-colmenu-item",
              onClick: _cache[7] || (_cache[7] = ($event) => pick(() => _ctx.$emit("pin", null)))
            }, toDisplayString(unref(t)("unpin")), 1)) : createCommentVNode("", true),
            createElementVNode("div", {
              class: "rj-colmenu-item",
              onClick: _cache[8] || (_cache[8] = ($event) => pick(() => _ctx.$emit("hide")))
            }, [
              createElementVNode("span", _hoisted_17$3, toDisplayString(unref(icons).hidden), 1),
              createTextVNode(toDisplayString(unref(t)("hideColumn")), 1)
            ]),
            _ctx.canGroup ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
              _cache[18] || (_cache[18] = createElementVNode("div", { class: "rj-colmenu-divider" }, null, -1)),
              createElementVNode("div", {
                class: "rj-colmenu-item",
                onClick: _cache[9] || (_cache[9] = ($event) => pick(() => _ctx.$emit("group")))
              }, toDisplayString(unref(t)("groupBy")), 1)
            ], 64)) : createCommentVNode("", true)
          ], 64)) : tab.value === "filter" ? (openBlock(), createBlock(_sfc_main$e, {
            key: 1,
            inline: "",
            column: _ctx.col,
            "filter-type": _ctx.filterType,
            model: _ctx.filterModel,
            "unique-values": _ctx.uniqueValues,
            onApply: _cache[10] || (_cache[10] = (m) => _ctx.$emit("apply-filter", m)),
            onClear: _cache[11] || (_cache[11] = ($event) => _ctx.$emit("clear-filter")),
            onAdvanced: _cache[12] || (_cache[12] = ($event) => _ctx.$emit("advanced"))
          }, null, 8, ["column", "filter-type", "model", "unique-values"])) : tab.value === "columns" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
            createElementVNode("div", _hoisted_18$3, toDisplayString(unref(t)("columnsCount", { n: _ctx.columns.length })), 1),
            createElementVNode("div", _hoisted_19$2, toDisplayString(unref(t)("colDragHint")), 1),
            createElementVNode("div", _hoisted_20$2, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.columns, (c) => {
                return openBlock(), createElementBlock("div", {
                  key: c.colId,
                  class: normalizeClass(["rj-colmenu-col", {
                    "is-dragover": dragOverId.value === c.colId && dragId.value !== c.colId,
                    "is-pinned": !!c.pinned
                  }]),
                  draggable: "true",
                  onDragstart: ($event) => onColDragStart(c.colId, $event),
                  onDragover: withModifiers(($event) => dragOverId.value = c.colId, ["prevent"]),
                  onDragleave: ($event) => dragOverId.value === c.colId && (dragOverId.value = ""),
                  onDrop: withModifiers(($event) => onColDrop(c.colId), ["prevent"]),
                  onDragend: onColDragEnd
                }, [
                  createElementVNode("span", _hoisted_22$2, toDisplayString(unref(icons).rowDrag), 1),
                  createElementVNode("span", {
                    class: "rj-colmenu-eye",
                    title: c.hidden ? unref(t)("show") : unref(t)("hide"),
                    onClick: ($event) => _ctx.$emit("toggle-col-hide", c.colId)
                  }, toDisplayString(c.hidden ? unref(icons).hidden : unref(icons).visible), 9, _hoisted_23$2),
                  createElementVNode("span", {
                    class: "rj-colmenu-col-name",
                    style: normalizeStyle({ opacity: c.hidden ? 0.45 : 1 })
                  }, toDisplayString(c.title), 5),
                  c.pinned ? (openBlock(), createElementBlock("span", {
                    key: 0,
                    class: normalizeClass(["rj-colmenu-pin-tag", { "is-right": c.pinned === "right" }])
                  }, toDisplayString(c.pinned === "right" ? unref(t)("pinTagRight") : unref(t)("pinTagLeft")), 3)) : createCommentVNode("", true),
                  createElementVNode("span", {
                    class: normalizeClass(["rj-colmenu-pin", { "is-on": !!c.pinned }]),
                    title: c.pinned === "left" ? unref(t)("pinnedLeft") + " · " + unref(t)("unpin") : c.pinned === "right" ? unref(t)("pinnedRight") + " · " + unref(t)("unpin") : unref(t)("pinColumn"),
                    onClick: ($event) => toggleColPin(c)
                  }, toDisplayString(unref(icons).pin), 11, _hoisted_24$2)
                ], 42, _hoisted_21$2);
              }), 128))
            ]),
            createElementVNode("div", _hoisted_25$2, [
              createElementVNode("a", {
                onClick: _cache[13] || (_cache[13] = ($event) => setAll(true))
              }, toDisplayString(unref(t)("showAll")), 1),
              createElementVNode("a", {
                onClick: _cache[14] || (_cache[14] = ($event) => setAll(false))
              }, toDisplayString(unref(t)("hideAll")), 1)
            ])
          ], 64)) : createCommentVNode("", true)
        ])
      ], 36);
    };
  }
});
const _hoisted_1$9 = { class: "rj-panel" };
const _hoisted_2$9 = { class: "rj-panel-tabs" };
const _hoisted_3$9 = ["onClick"];
const _hoisted_4$7 = { class: "rj-panel-body" };
const _hoisted_5$7 = { class: "rj-panel-section" };
const _hoisted_6$7 = ["onDragstart", "onDragover", "onDrop"];
const _hoisted_7$6 = { class: "rj-panel-item-ops" };
const _hoisted_8$6 = {
  key: 0,
  class: "rj-panel-pin-tag"
};
const _hoisted_9$4 = ["title", "onClick"];
const _hoisted_10$4 = ["title", "onClick"];
const _hoisted_11$4 = { class: "rj-panel-section" };
const _hoisted_12$4 = { class: "rj-panel-item-title" };
const _hoisted_13$4 = { class: "rj-panel-item-ops" };
const _hoisted_14$4 = ["title", "onClick"];
const _hoisted_15$3 = ["title", "onClick"];
const _hoisted_16$3 = {
  class: "rj-panel-section",
  style: { "margin-top": "10px" }
};
const _hoisted_17$2 = ["onClick"];
const _hoisted_18$2 = { class: "rj-panel-item-title" };
const _hoisted_19$1 = { class: "rj-popup-row" };
const _hoisted_20$1 = { style: { "display": "flex", "align-items": "center", "gap": "6px", "cursor": "pointer" } };
const _hoisted_21$1 = ["checked"];
const _hoisted_22$1 = { class: "rj-panel-section" };
const _hoisted_23$1 = ["onClick"];
const _hoisted_24$1 = ["checked"];
const _hoisted_25$1 = { class: "rj-panel-item-title" };
const _hoisted_26$1 = {
  class: "rj-panel-section",
  style: { "margin-top": "10px" }
};
const _hoisted_27$1 = ["onClick"];
const _hoisted_28$1 = ["checked"];
const _hoisted_29$1 = { class: "rj-panel-item-title" };
const _hoisted_30$1 = {
  class: "rj-panel-section",
  style: { "margin-top": "10px" }
};
const _hoisted_31$1 = {
  key: 0,
  class: "rj-panel-item"
};
const _hoisted_32$1 = { class: "rj-panel-item-title" };
const _hoisted_33$1 = { class: "rj-panel-item-ops" };
const _hoisted_34$1 = ["title"];
const _hoisted_35$1 = { class: "rj-panel-item-title" };
const _hoisted_36$1 = { style: { "color": "var(--rj-text-secondary)" } };
const _hoisted_37$1 = { class: "rj-panel-item-ops" };
const _hoisted_38$1 = ["title", "onClick"];
const _hoisted_39$1 = {
  key: 1,
  class: "rj-panel-section"
};
const _hoisted_40$1 = { class: "rj-panel-item-title" };
const _sfc_main$9 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjToolPanel" },
  __name: "RjToolPanel",
  props: {
    leafList: {},
    pivotLeafList: {},
    pivotValueDefault: {},
    groupedFields: {},
    pivot: {},
    filters: {},
    quickFilter: {}
  },
  emits: ["toggle-hide", "toggle-pin", "col-drop", "group-add", "group-remove", "group-drop", "pivot-enable", "pivot-toggle", "pivot-drop", "set-agg", "filter-remove", "filters-clear-all", "quick-clear"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const tabs = computed(() => [
      { k: "cols", label: t("tabColumns") },
      { k: "group", label: t("tabGroup") },
      { k: "pivot", label: t("tabPivot") },
      { k: "filters", label: t("tabFilter") }
    ]);
    const icons = inject(
      RJ_ICONS_KEY,
      computed(() => mergeIcons())
    );
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const tab = ref("cols");
    const dragId = ref("");
    const dragOver = ref("");
    const overZone = ref("");
    const dimKey = (c) => c.field || c.colId;
    const candLeaves = computed(() => {
      const base = props.pivotLeafList && props.pivotLeafList.length ? props.pivotLeafList : props.leafList;
      return base.filter(
        (c) => !String(c.colId).startsWith("__pv") && !String(c.field ?? "").startsWith("__pv")
      );
    });
    const groupableCols = computed(
      () => candLeaves.value.filter(
        (c) => !c.col.checkbox && !c.col.rowDrag && !props.groupedFields.includes(dimKey(c)) && !props.pivot.cols.includes(dimKey(c))
      )
    );
    const pivotableCols = computed(
      () => candLeaves.value.filter(
        (c) => c.col.allowPivot !== false && !props.groupedFields.includes(dimKey(c)) && (c.col.type === "text" || c.col.type === "boolean" || !c.col.type || c.col.type === "link")
      )
    );
    const valueCols = computed(
      () => candLeaves.value.filter(
        (c) => c.col.type === "num" || c.col.type === "money" || c.col.type === "percent" || !!c.col.aggFunc
      )
    );
    const valueDefaultSet = computed(() => new Set(props.pivotValueDefault || []));
    function isValueOn(c) {
      return props.pivot.values.length ? props.pivot.values.includes(c.colId) : valueDefaultSet.value.has(c.colId);
    }
    const titleOf = (f) => {
      var _a, _b;
      return ((_a = candLeaves.value.find((c) => c.field === f || c.colId === f)) == null ? void 0 : _a.title) || ((_b = props.leafList.find((c) => c.field === f || c.colId === f)) == null ? void 0 : _b.title) || f;
    };
    const aggOf = (f) => {
      const c = candLeaves.value.find((x) => x.field === f);
      const a = c == null ? void 0 : c.aggFunc;
      return a ? { sum: "∑", avg: "x̄", min: "↓", max: "↑", count: "#" }[a] || a : "";
    };
    const AGG_CYCLE = ["sum", "avg", "min", "max", "count"];
    function cycleAgg(f) {
      var _a;
      const cur = (_a = candLeaves.value.find((x) => x.field === f)) == null ? void 0 : _a.aggFunc;
      const i = cur ? AGG_CYCLE.indexOf(cur) : -1;
      const next = AGG_CYCLE[(i + 1) % AGG_CYCLE.length];
      emit("set-agg", f, next);
    }
    function togglePinCol(c) {
      emit("toggle-pin", c.colId, c.pinned ? null : "left");
    }
    function drop(toId) {
      if (dragId.value && dragId.value !== toId)
        emit("col-drop", dragId.value, toId);
      dragId.value = "";
      dragOver.value = "";
    }
    function onDropTo(zone, e) {
      var _a;
      overZone.value = "";
      const id = dragId.value || ((_a = e == null ? void 0 : e.dataTransfer) == null ? void 0 : _a.getData("text/x-rj-col")) || "";
      if (!id)
        return;
      if (zone === "group")
        emit("group-drop", id);
      else
        emit("pivot-drop", id);
      dragId.value = "";
    }
    return (_ctx, _cache) => {
      var _a, _b;
      return openBlock(), createElementBlock("div", _hoisted_1$9, [
        createElementVNode("div", _hoisted_2$9, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(tabs.value, (tb) => {
            return openBlock(), createElementBlock("div", {
              key: tb.k,
              class: normalizeClass(["rj-panel-tab", { "is-active": tab.value === tb.k }]),
              onClick: ($event) => tab.value = tb.k
            }, toDisplayString(tb.label), 11, _hoisted_3$9);
          }), 128))
        ]),
        createElementVNode("div", _hoisted_4$7, [
          tab.value === "cols" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createElementVNode("div", _hoisted_5$7, toDisplayString(unref(t)("panelColsHint")), 1),
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.leafList, (c) => {
              return openBlock(), createElementBlock("div", {
                key: c.colId,
                class: normalizeClass(["rj-panel-item", { "is-pinned": !!c.pinned }]),
                draggable: "true",
                onDragstart: ($event) => dragId.value = c.colId,
                onDragover: withModifiers(($event) => dragOver.value = c.colId, ["prevent"]),
                onDrop: ($event) => drop(c.colId)
              }, [
                createElementVNode("span", {
                  style: normalizeStyle({ opacity: c.hidden ? 0.4 : 1 }),
                  class: "rj-panel-item-title"
                }, toDisplayString(c.title || c.colId), 5),
                createElementVNode("span", _hoisted_7$6, [
                  c.pinned ? (openBlock(), createElementBlock("span", _hoisted_8$6, toDisplayString(c.pinned === "right" ? unref(t)("pinTagRight") : unref(t)("pinTagLeft")), 1)) : createCommentVNode("", true),
                  createElementVNode("span", {
                    class: normalizeClass(["rj-panel-pin", { "is-on": !!c.pinned }]),
                    title: c.pinned === "left" ? unref(t)("pinnedLeft") + " · " + unref(t)("unpin") : c.pinned === "right" ? unref(t)("pinnedRight") + " · " + unref(t)("unpin") : unref(t)("pinColumn"),
                    onClick: withModifiers(($event) => togglePinCol(c), ["stop"])
                  }, toDisplayString(unref(icons).pin), 11, _hoisted_9$4),
                  createElementVNode("span", {
                    title: c.hidden ? unref(t)("show") : unref(t)("hide"),
                    onClick: withModifiers(($event) => _ctx.$emit("toggle-hide", c.colId), ["stop"])
                  }, toDisplayString(c.hidden ? unref(icons).hidden : unref(icons).visible), 9, _hoisted_10$4)
                ])
              ], 42, _hoisted_6$7);
            }), 128))
          ], 64)) : tab.value === "group" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
            createElementVNode("div", _hoisted_11$4, toDisplayString(unref(t)("groupHere")), 1),
            createElementVNode("div", {
              class: normalizeClass(["rj-drop-banner", { "is-over": overZone.value === "group" }]),
              style: { "border": "1px dashed var(--rj-border-strong)", "height": "40px", "margin-bottom": "8px" },
              onDragover: _cache[0] || (_cache[0] = withModifiers(($event) => overZone.value = "group", ["prevent"])),
              onDragleave: _cache[1] || (_cache[1] = ($event) => overZone.value = ""),
              onDrop: _cache[2] || (_cache[2] = ($event) => onDropTo("group", $event))
            }, toDisplayString(unref(t)("dragToGroup")), 35),
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.groupedFields, (f) => {
              return openBlock(), createElementBlock("div", {
                key: f,
                class: "rj-panel-item"
              }, [
                createElementVNode("span", _hoisted_12$4, toDisplayString(titleOf(f)), 1),
                createElementVNode("span", _hoisted_13$4, [
                  createElementVNode("span", {
                    title: unref(t)("aggMode"),
                    onClick: withModifiers(($event) => cycleAgg(f), ["stop"])
                  }, toDisplayString(aggOf(f) || "∑"), 9, _hoisted_14$4),
                  createElementVNode("span", {
                    title: unref(t)("remove"),
                    onClick: withModifiers(($event) => _ctx.$emit("group-remove", f), ["stop"])
                  }, toDisplayString(unref(icons).remove), 9, _hoisted_15$3)
                ])
              ]);
            }), 128)),
            groupableCols.value.length ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createElementVNode("div", _hoisted_16$3, toDisplayString(unref(t)("groupAddMore")), 1),
              (openBlock(true), createElementBlock(Fragment, null, renderList(groupableCols.value, (c) => {
                return openBlock(), createElementBlock("div", {
                  key: c.colId,
                  class: "rj-panel-item",
                  style: { "cursor": "pointer" },
                  onClick: ($event) => _ctx.$emit("group-add", dimKey(c))
                }, [
                  createElementVNode("span", _hoisted_18$2, toDisplayString(unref(icons).add) + " " + toDisplayString(c.title || c.colId), 1)
                ], 8, _hoisted_17$2);
              }), 128))
            ], 64)) : createCommentVNode("", true)
          ], 64)) : tab.value === "pivot" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
            createElementVNode("div", _hoisted_19$1, [
              createElementVNode("label", _hoisted_20$1, [
                createElementVNode("input", {
                  type: "checkbox",
                  checked: _ctx.pivot.active,
                  onChange: _cache[3] || (_cache[3] = ($event) => _ctx.$emit("pivot-enable", $event.target.checked))
                }, null, 40, _hoisted_21$1),
                createTextVNode(" " + toDisplayString(unref(t)("enablePivot")), 1)
              ])
            ]),
            createElementVNode("div", _hoisted_22$1, toDisplayString(unref(t)("pivotCols")), 1),
            createElementVNode("div", {
              class: normalizeClass(["rj-drop-banner", { "is-over": overZone.value === "pv-col" }]),
              style: { "border": "1px dashed var(--rj-border-strong)", "height": "32px", "margin-bottom": "6px" },
              onDragover: _cache[4] || (_cache[4] = withModifiers(($event) => overZone.value = "pv-col", ["prevent"])),
              onDragleave: _cache[5] || (_cache[5] = ($event) => overZone.value = ""),
              onDrop: _cache[6] || (_cache[6] = ($event) => onDropTo("pv-col", $event))
            }, toDisplayString(unref(t)("dragHere")), 35),
            (openBlock(true), createElementBlock(Fragment, null, renderList(pivotableCols.value, (c) => {
              return openBlock(), createElementBlock("div", {
                key: c.colId,
                class: "rj-panel-item is-check",
                onClick: ($event) => _ctx.$emit("pivot-toggle", "cols", dimKey(c))
              }, [
                createElementVNode("input", {
                  type: "checkbox",
                  checked: _ctx.pivot.cols.includes(dimKey(c))
                }, null, 8, _hoisted_24$1),
                createElementVNode("span", _hoisted_25$1, toDisplayString(c.title || c.colId), 1)
              ], 8, _hoisted_23$1);
            }), 128)),
            createElementVNode("div", _hoisted_26$1, toDisplayString(unref(t)("pivotVals")), 1),
            (openBlock(true), createElementBlock(Fragment, null, renderList(valueCols.value, (c) => {
              return openBlock(), createElementBlock("div", {
                key: c.colId,
                class: "rj-panel-item is-check",
                onClick: ($event) => _ctx.$emit("pivot-toggle", "values", c.colId)
              }, [
                createElementVNode("input", {
                  type: "checkbox",
                  checked: isValueOn(c)
                }, null, 8, _hoisted_28$1),
                createElementVNode("span", _hoisted_29$1, toDisplayString(c.title || c.colId) + " (" + toDisplayString(c.aggFunc || "sum") + ")", 1)
              ], 8, _hoisted_27$1);
            }), 128)),
            createElementVNode("div", _hoisted_30$1, toDisplayString(unref(t)("pivotRowDims")), 1)
          ], 64)) : tab.value === "filters" ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
            _ctx.quickFilter ? (openBlock(), createElementBlock("div", _hoisted_31$1, [
              createElementVNode("span", _hoisted_32$1, toDisplayString(unref(t)("globalSearch", { v: _ctx.quickFilter })), 1),
              createElementVNode("span", _hoisted_33$1, [
                createElementVNode("span", {
                  title: unref(t)("clearShort"),
                  onClick: _cache[7] || (_cache[7] = withModifiers(($event) => _ctx.$emit("quick-clear"), ["stop"]))
                }, toDisplayString(unref(icons).remove), 9, _hoisted_34$1)
              ])
            ])) : createCommentVNode("", true),
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.filters, (f) => {
              return openBlock(), createElementBlock("div", {
                key: f.colId + ":" + f.kind,
                class: "rj-panel-item"
              }, [
                createElementVNode("span", _hoisted_35$1, [
                  createTextVNode(toDisplayString(f.title) + " ", 1),
                  createElementVNode("span", _hoisted_36$1, " (" + toDisplayString(f.kind === "float" ? unref(t)("kindFloat") : f.kind === "advanced" ? unref(t)("kindAdvanced") : unref(t)("kindColumn")) + ")" + toDisplayString(f.text), 1)
                ]),
                createElementVNode("span", _hoisted_37$1, [
                  createElementVNode("span", {
                    title: unref(t)("remove"),
                    onClick: withModifiers(($event) => _ctx.$emit("filter-remove", f.colId, f.kind), ["stop"])
                  }, toDisplayString(unref(icons).remove), 9, _hoisted_38$1)
                ])
              ]);
            }), 128)),
            !((_a = _ctx.filters) == null ? void 0 : _a.length) && !_ctx.quickFilter ? (openBlock(), createElementBlock("div", _hoisted_39$1, toDisplayString(unref(t)("noFilters")), 1)) : createCommentVNode("", true),
            ((_b = _ctx.filters) == null ? void 0 : _b.length) || _ctx.quickFilter ? (openBlock(), createElementBlock("div", {
              key: 2,
              class: "rj-panel-item",
              style: { "cursor": "pointer", "color": "var(--rj-danger)", "justify-content": "center" },
              onClick: _cache[8] || (_cache[8] = ($event) => _ctx.$emit("filters-clear-all"))
            }, [
              createElementVNode("span", _hoisted_40$1, toDisplayString(unref(t)("clearAllFilters")), 1)
            ])) : createCommentVNode("", true)
          ], 64)) : createCommentVNode("", true)
        ])
      ]);
    };
  }
});
const _hoisted_1$8 = {
  class: "rj-pager-opt rj-pager-total",
  style: { "color": "var(--rj-text-secondary)" }
};
const _hoisted_2$8 = ["value"];
const _hoisted_3$8 = ["value"];
const _hoisted_4$6 = { class: "rj-pager-nav" };
const _hoisted_5$6 = ["disabled"];
const _hoisted_6$6 = ["disabled"];
const _hoisted_7$5 = ["disabled"];
const _hoisted_8$5 = ["disabled"];
const _sfc_main$8 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjPager" },
  __name: "RjPager",
  props: {
    page: {},
    pageSize: {},
    total: {},
    variant: { default: "bottom" }
  },
  emits: ["update:page", "update:pageSize"],
  setup(__props) {
    const props = __props;
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const pages = computed(() => Math.max(Math.ceil(props.total / props.pageSize), 1));
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["rj-pager", _ctx.variant === "top" ? "rj-pager-top" : "rj-pager-bottom"])
      }, [
        createElementVNode("span", _hoisted_1$8, toDisplayString(unref(t)("pagerTotal", { n: _ctx.total })), 1),
        createElementVNode("select", {
          class: "rj-input rj-pager-opt rj-pager-size",
          value: _ctx.pageSize,
          onChange: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("update:pageSize", Number($event.target.value)))
        }, [
          (openBlock(), createElementBlock(Fragment, null, renderList([20, 50, 100, 200, 500], (s) => {
            return createElementVNode("option", {
              key: s,
              value: s
            }, toDisplayString(unref(t)("perPage", { n: s })), 9, _hoisted_3$8);
          }), 64))
        ], 40, _hoisted_2$8),
        createElementVNode("div", _hoisted_4$6, [
          createElementVNode("button", {
            class: "rj-btn",
            disabled: _ctx.page <= 1,
            onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("update:page", 1))
          }, toDisplayString(unref(t)("first")), 9, _hoisted_5$6),
          createElementVNode("button", {
            class: "rj-btn",
            disabled: _ctx.page <= 1,
            onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$emit("update:page", _ctx.page - 1))
          }, toDisplayString(unref(t)("prev")), 9, _hoisted_6$6),
          createElementVNode("span", null, toDisplayString(_ctx.page) + " / " + toDisplayString(pages.value || 1), 1),
          createElementVNode("button", {
            class: "rj-btn",
            disabled: _ctx.page >= pages.value,
            onClick: _cache[3] || (_cache[3] = ($event) => _ctx.$emit("update:page", _ctx.page + 1))
          }, toDisplayString(unref(t)("next")), 9, _hoisted_7$5),
          createElementVNode("button", {
            class: "rj-btn",
            disabled: _ctx.page >= pages.value,
            onClick: _cache[4] || (_cache[4] = ($event) => _ctx.$emit("update:page", pages.value))
          }, toDisplayString(unref(t)("last")), 9, _hoisted_8$5)
        ])
      ], 2);
    };
  }
});
const _hoisted_1$7 = { class: "rj-chart-dialog" };
const _hoisted_2$7 = { class: "rj-chart-header" };
const _hoisted_3$7 = { class: "rj-chart-body" };
const _hoisted_4$5 = { style: { "display": "flex", "gap": "8px", "flex-wrap": "wrap", "align-items": "center" } };
const _hoisted_5$5 = { class: "rj-radio-tabs" };
const _hoisted_6$5 = ["onClick"];
const _hoisted_7$4 = { value: "" };
const _hoisted_8$4 = ["value"];
const _hoisted_9$3 = { value: "" };
const _hoisted_10$3 = ["value"];
const _hoisted_11$3 = ["value"];
const _hoisted_12$3 = { value: "" };
const _hoisted_13$3 = ["value"];
const _hoisted_14$3 = {
  key: 0,
  class: "rj-chart-warn"
};
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjChartDialog" },
  __name: "RjChartDialog",
  props: {
    columns: {},
    rows: {}
  },
  emits: ["close"],
  setup(__props) {
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const icons = inject(
      RJ_ICONS_KEY,
      computed(() => mergeIcons())
    );
    const TYPE_KEYS = [
      { k: "bar", labelKey: "chartBar" },
      { k: "line", labelKey: "chartLine" },
      { k: "pie", labelKey: "chartPie" },
      { k: "area", labelKey: "chartArea" }
    ];
    const props = __props;
    const dimCols = computed(
      () => props.columns.filter(
        (c) => c.field && !c.checkbox && c.type !== "num" && c.type !== "money" && c.type !== "percent"
      )
    );
    const valCols = computed(
      () => props.columns.filter(
        (c) => c.field && (c.type === "num" || c.type === "money" || c.type === "percent" || c.aggFunc)
      )
    );
    const groupCols = computed(() => dimCols.value.filter((c) => c !== null).slice(0, 30));
    const aggEntries = computed(
      () => Object.keys(AGG_LABELS).map((k) => [k, t(AGG_LABELS[k])])
    );
    const chartType = ref("bar");
    const xCat = ref("");
    const yVal = ref("");
    const agg = ref("sum");
    const groupBy = ref("");
    const chartEl = ref();
    const chartUnavailable = ref(false);
    let chartInstance = null;
    let disposed = false;
    function applyDefaults() {
      var _a;
      if (!xCat.value)
        xCat.value = ((_a = dimCols.value[0]) == null ? void 0 : _a.field) || "";
      if (!yVal.value) {
        const vc = valCols.value.find((c) => c.field && c.field !== xCat.value) || valCols.value[0];
        yVal.value = (vc == null ? void 0 : vc.field) || "";
      }
    }
    watch([xCat, yVal], applyDefaults);
    async function renderChart() {
      var _a;
      if (!chartEl.value || !xCat.value || !yVal.value)
        return;
      let echarts;
      try {
        echarts = await import("echarts");
      } catch {
        chartUnavailable.value = true;
        return;
      }
      chartUnavailable.value = false;
      if (disposed || !chartEl.value)
        return;
      if (!chartInstance || ((_a = chartInstance.isDisposed) == null ? void 0 : _a.call(chartInstance))) {
        chartInstance = echarts.init(chartEl.value);
      }
      const xCol = props.columns.find((c) => c.field === xCat.value);
      const yCol = props.columns.find((c) => c.field === yVal.value);
      const buildSeries = (subset) => {
        const map = /* @__PURE__ */ new Map();
        subset.forEach((r) => {
          const k = String(cellRawValue(xCol, r) ?? t("emptyVal"));
          if (!map.has(k))
            map.set(k, []);
          map.get(k).push(r);
        });
        const labels = Array.from(map.keys());
        const values = labels.map((k) => {
          const rowsOf = map.get(k);
          const vals = rowsOf.map((r) => cellRawValue(yCol, r)).filter((v) => v != null);
          const num = runAgg(agg.value, rowsOf, vals);
          return typeof num === "number" ? Math.round(num * 100) / 100 : num;
        });
        return { labels, values };
      };
      let option;
      if (chartType.value === "pie") {
        const { labels, values } = buildSeries(props.rows);
        option = {
          tooltip: { trigger: "item" },
          series: [
            {
              type: "pie",
              radius: ["35%", "65%"],
              data: labels.map((n, i) => ({ name: n, value: values[i] }))
            }
          ]
        };
      } else {
        let labels = [];
        let series = [];
        if (groupBy.value) {
          const gCol = props.columns.find((c) => c.field === groupBy.value);
          const groups = Array.from(
            new Set(props.rows.map((r) => String(cellRawValue(gCol, r) ?? t("emptyVal"))))
          );
          const base = buildSeries(props.rows);
          labels = base.labels;
          series = groups.map((g) => {
            const s = buildSeries(
              props.rows.filter((r) => String(cellRawValue(gCol, r) ?? t("emptyVal")) === g)
            );
            return {
              name: g,
              type: chartType.value === "line" || chartType.value === "area" ? "line" : "bar",
              areaStyle: chartType.value === "area" ? {} : void 0,
              smooth: chartType.value !== "bar",
              data: labels.map((l) => s.values[s.labels.indexOf(l)] ?? null)
            };
          });
        } else {
          const built = buildSeries(props.rows);
          labels = built.labels;
          series = [
            {
              type: chartType.value === "line" || chartType.value === "area" ? "line" : "bar",
              areaStyle: chartType.value === "area" ? {} : void 0,
              smooth: chartType.value !== "bar",
              data: built.values
            }
          ];
        }
        option = {
          tooltip: { trigger: "axis" },
          legend: series.length > 1 ? { top: 0 } : void 0,
          grid: { left: 50, right: 20, bottom: 60, top: series.length > 1 ? 32 : 16 },
          xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.length > 8 ? 35 : 0 } },
          yAxis: { type: "value" },
          series
        };
      }
      chartInstance.setOption(option, true);
      chartInstance.resize();
    }
    const onResize = () => chartInstance == null ? void 0 : chartInstance.resize();
    let raf = 0;
    function scheduleRender() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(renderChart);
    }
    watch([chartType, xCat, yVal, agg, groupBy], scheduleRender);
    onMounted(() => {
      applyDefaults();
      window.addEventListener("resize", onResize);
      scheduleRender();
    });
    onBeforeUnmount(() => {
      var _a;
      disposed = true;
      window.removeEventListener("resize", onResize);
      (_a = chartInstance == null ? void 0 : chartInstance.dispose) == null ? void 0 : _a.call(chartInstance);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "rj-chart-mask",
        onClick: _cache[5] || (_cache[5] = withModifiers(($event) => _ctx.$emit("close"), ["self"]))
      }, [
        createElementVNode("div", _hoisted_1$7, [
          createElementVNode("div", _hoisted_2$7, [
            createTextVNode(toDisplayString(unref(t)("chartTitle")) + " ", 1),
            createElementVNode("span", {
              class: "rj-chart-close",
              onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("close"))
            }, toDisplayString(unref(icons).remove), 1)
          ]),
          createElementVNode("div", _hoisted_3$7, [
            createElementVNode("div", _hoisted_4$5, [
              createElementVNode("div", _hoisted_5$5, [
                (openBlock(), createElementBlock(Fragment, null, renderList(TYPE_KEYS, (tt) => {
                  return createElementVNode("span", {
                    key: tt.k,
                    class: normalizeClass({ "is-active": chartType.value === tt.k }),
                    onClick: ($event) => chartType.value = tt.k
                  }, toDisplayString(unref(t)(tt.labelKey)), 11, _hoisted_6$5);
                }), 64))
              ]),
              withDirectives(createElementVNode("select", {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => xCat.value = $event),
                class: "rj-input",
                style: { "padding": "0 4px" }
              }, [
                createElementVNode("option", _hoisted_7$4, toDisplayString(unref(t)("chartPickX")), 1),
                (openBlock(true), createElementBlock(Fragment, null, renderList(dimCols.value, (c) => {
                  return openBlock(), createElementBlock("option", {
                    key: c.field,
                    value: c.field
                  }, toDisplayString(c.title || c.field), 9, _hoisted_8$4);
                }), 128))
              ], 512), [
                [vModelSelect, xCat.value]
              ]),
              withDirectives(createElementVNode("select", {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => yVal.value = $event),
                class: "rj-input",
                style: { "padding": "0 4px" }
              }, [
                createElementVNode("option", _hoisted_9$3, toDisplayString(unref(t)("chartPickY")), 1),
                (openBlock(true), createElementBlock(Fragment, null, renderList(valCols.value, (c) => {
                  return openBlock(), createElementBlock("option", {
                    key: c.field,
                    value: c.field
                  }, toDisplayString(c.title || c.field), 9, _hoisted_10$3);
                }), 128))
              ], 512), [
                [vModelSelect, yVal.value]
              ]),
              withDirectives(createElementVNode("select", {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => agg.value = $event),
                class: "rj-input",
                style: { "padding": "0 4px" }
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(aggEntries.value, ([k, v]) => {
                  return openBlock(), createElementBlock("option", {
                    key: k,
                    value: k
                  }, toDisplayString(v), 9, _hoisted_11$3);
                }), 128))
              ], 512), [
                [vModelSelect, agg.value]
              ]),
              groupCols.value.length ? withDirectives((openBlock(), createElementBlock("select", {
                key: 0,
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => groupBy.value = $event),
                class: "rj-input",
                style: { "padding": "0 4px" }
              }, [
                createElementVNode("option", _hoisted_12$3, toDisplayString(unref(t)("chartNoSeries")), 1),
                (openBlock(true), createElementBlock(Fragment, null, renderList(groupCols.value, (c) => {
                  return openBlock(), createElementBlock("option", {
                    key: c.field,
                    value: c.field
                  }, toDisplayString(c.title || c.field), 9, _hoisted_13$3);
                }), 128))
              ], 512)), [
                [vModelSelect, groupBy.value]
              ]) : createCommentVNode("", true)
            ]),
            createElementVNode("div", {
              ref_key: "chartEl",
              ref: chartEl,
              class: "rj-chart-canvas"
            }, null, 512),
            chartUnavailable.value ? (openBlock(), createElementBlock("div", _hoisted_14$3, toDisplayString(unref(t)("chartNoEcharts")), 1)) : createCommentVNode("", true)
          ])
        ])
      ]);
    };
  }
});
function normalizeEditor(col) {
  if (!col.editor)
    return void 0;
  return typeof col.editor === "string" ? { type: col.editor } : col.editor;
}
function formFieldKind(col, editor) {
  switch (editor == null ? void 0 : editor.type) {
    case "select":
    case "richSelect":
      return "select";
    case "largeText":
      return "textarea";
    case "checkbox":
      return "checkbox";
    case "number":
      return "number";
    case "date":
      return "date";
    case "input":
    case "custom":
      return "text";
  }
  switch (col.type) {
    case "num":
    case "money":
    case "percent":
      return "number";
    case "date":
    case "datetime":
      return "date";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}
function defaultInclude(col) {
  if (!col.field || col.field.startsWith("__"))
    return false;
  if (colIdOf(col).startsWith("__"))
    return false;
  return !!col.editor || !!col.editable;
}
function buildFormFields(cols, cfg, sampleRows) {
  var _a;
  const include = (cfg == null ? void 0 : cfg.columns) || defaultInclude;
  const out = [];
  for (const col of cols) {
    if (!col.field || !include(col))
      continue;
    const editor = normalizeEditor(col);
    const kind = formFieldKind(col, editor);
    const rawOpts = editor == null ? void 0 : editor.options;
    const options = kind === "select" ? typeof rawOpts === "function" ? rawOpts(sampleRows[0]) : rawOpts || [] : [];
    out.push({
      field: col.field,
      colId: colIdOf(col),
      title: col.title || col.field,
      kind,
      options,
      rows: ((_a = editor == null ? void 0 : editor.props) == null ? void 0 : _a.rows) || 4,
      validator: editor == null ? void 0 : editor.validator,
      col
    });
  }
  return out;
}
function applyFormChanges(rows, changes) {
  rows.forEach((row) => {
    for (const field of Object.keys(changes))
      setValueByPath(row, field, changes[field]);
  });
  return rows;
}
function ensureValueByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== "object")
      cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}
function createFormRow(preset, changes) {
  const row = { ...preset || {} };
  for (const field of Object.keys(changes))
    ensureValueByPath(row, field, changes[field]);
  return row;
}
function fieldValue(row, field) {
  return getValueByPath(row, field);
}
function queryActionDisabled(action, rows) {
  return typeof action.disabled === "function" ? !!action.disabled(rows) : !!action.disabled;
}
function queryActionConfirm(action, rows) {
  if (!action.confirm)
    return "";
  return typeof action.confirm === "function" ? action.confirm(rows) : action.confirm;
}
const _hoisted_1$6 = { class: "rj-opt-text" };
const _hoisted_2$6 = ["placeholder"];
const _hoisted_3$6 = ["onMouseenter", "onClick"];
const _hoisted_4$4 = ["onClick"];
const _hoisted_5$4 = {
  key: 1,
  class: "rj-option-caret is-leaf"
};
const _hoisted_6$4 = ["checked", "onChange"];
const _hoisted_7$3 = { class: "rj-option-label" };
const _hoisted_8$3 = {
  key: 0,
  class: "rj-opt-empty"
};
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjOptionSelect" },
  __name: "RjOptionSelect",
  props: {
    options: { default: () => [] },
    modelValue: { default: void 0 },
    multiple: { type: Boolean, default: false },
    placeholder: { default: "" }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const rootRef = ref();
    const searchRef = ref();
    const listRef = ref();
    const open = ref(false);
    const query = ref("");
    const activeIdx = ref(-1);
    const expanded = ref(new Set(collectParentKeys(props.options)));
    watch(
      () => props.options,
      (opts) => {
        expanded.value = collectParentKeys(opts);
      }
    );
    const filteredTree = computed(() => filterOptionTree(props.options, query.value));
    const visibleRows = computed(() => {
      const q = (query.value || "").trim();
      const tree = filteredTree.value;
      const exp = q ? collectParentKeys(tree) : expanded.value;
      return flattenTreeForRender(tree, exp);
    });
    const flat = computed(() => flattenOptions(props.options));
    function labelOf(value) {
      const hit = flat.value.find((o) => String(o.value) === String(value));
      return hit ? String(hit.label) : String(value ?? "");
    }
    const chosen = computed(
      () => props.multiple ? Array.isArray(props.modelValue) ? props.modelValue : [] : props.modelValue == null || props.modelValue === "" ? [] : [props.modelValue]
    );
    const displayText = computed(() => {
      if (!chosen.value.length)
        return "";
      if (props.multiple)
        return chosen.value.map((v) => labelOf(v)).join("、");
      return labelOf(chosen.value[0]);
    });
    function isChosen(value) {
      return chosen.value.some((v) => String(v) === String(value));
    }
    function toggle() {
      if (open.value)
        close();
      else
        openList();
    }
    function openList() {
      open.value = true;
      query.value = "";
      activeIdx.value = visibleRows.value.length ? 0 : -1;
      nextTick(() => {
        var _a;
        return (_a = searchRef.value) == null ? void 0 : _a.focus();
      });
      document.addEventListener("mousedown", onDocDown);
    }
    function close() {
      open.value = false;
      document.removeEventListener("mousedown", onDocDown);
    }
    function onDocDown(e) {
      if (rootRef.value && !rootRef.value.contains(e.target))
        close();
    }
    function toggleExpand(opt) {
      const k = String(opt.value);
      const next = new Set(expanded.value);
      if (next.has(k))
        next.delete(k);
      else
        next.add(k);
      expanded.value = next;
    }
    function move(dir) {
      const len = visibleRows.value.length;
      if (!len)
        return;
      activeIdx.value = Math.min(len - 1, Math.max(0, activeIdx.value + dir));
      nextTick(() => {
        var _a, _b, _c;
        const el = (_b = (_a = listRef.value) == null ? void 0 : _a.children) == null ? void 0 : _b[activeIdx.value];
        (_c = el == null ? void 0 : el.scrollIntoView) == null ? void 0 : _c.call(el, { block: "nearest" });
      });
    }
    function emitValue(v) {
      emit("update:modelValue", v);
    }
    function pickSingle(opt) {
      emitValue(opt.value);
      close();
    }
    function toggleValue(opt) {
      const cur = chosen.value.slice();
      const i = cur.findIndex((v) => String(v) === String(opt.value));
      if (i >= 0)
        cur.splice(i, 1);
      else
        cur.push(opt.value);
      emitValue(cur);
    }
    function onRowClick(row) {
      if (props.multiple)
        toggleValue(row.option);
      else
        pickSingle(row.option);
    }
    function confirmActive() {
      const row = visibleRows.value[activeIdx.value];
      if (row)
        onRowClick(row);
    }
    onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown));
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "rootRef",
        ref: rootRef,
        class: normalizeClass(["rj-opt-select", { "is-open": open.value }])
      }, [
        createElementVNode("button", {
          type: "button",
          class: normalizeClass(["rj-opt-trigger", { "is-placeholder": !displayText.value }]),
          onClick: _cache[0] || (_cache[0] = ($event) => toggle())
        }, [
          createElementVNode("span", _hoisted_1$6, toDisplayString(displayText.value || _ctx.placeholder), 1),
          _cache[8] || (_cache[8] = createElementVNode("span", {
            class: "rj-opt-arrow",
            "aria-hidden": "true"
          }, "▾", -1))
        ], 2),
        withDirectives(createElementVNode("div", {
          class: "rj-opt-panel",
          onMousedown: _cache[7] || (_cache[7] = withModifiers(() => {
          }, ["stop"]))
        }, [
          withDirectives(createElementVNode("input", {
            ref_key: "searchRef",
            ref: searchRef,
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => query.value = $event),
            class: "rj-opt-search",
            type: "text",
            placeholder: unref(t)("searchOptions"),
            onKeydown: [
              _cache[2] || (_cache[2] = withKeys(withModifiers(($event) => move(1), ["prevent"]), ["down"])),
              _cache[3] || (_cache[3] = withKeys(withModifiers(($event) => move(-1), ["prevent"]), ["up"])),
              _cache[4] || (_cache[4] = withKeys(withModifiers(($event) => confirmActive(), ["prevent"]), ["enter"])),
              _cache[5] || (_cache[5] = withKeys(withModifiers(($event) => close(), ["prevent"]), ["esc"]))
            ]
          }, null, 40, _hoisted_2$6), [
            [vModelText, query.value]
          ]),
          createElementVNode("div", {
            ref_key: "listRef",
            ref: listRef,
            class: "rj-opt-list rj-option-tree"
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(visibleRows.value, (row, i) => {
              return openBlock(), createElementBlock("div", {
                key: String(row.option.value) + ":" + i,
                class: normalizeClass(["rj-opt-row", { "is-active": i === activeIdx.value, "is-selected": isChosen(row.option.value) }]),
                style: normalizeStyle({ paddingLeft: 8 + row.depth * 16 + "px" }),
                onMouseenter: ($event) => activeIdx.value = i,
                onClick: ($event) => onRowClick(row)
              }, [
                row.hasChildren ? (openBlock(), createElementBlock("span", {
                  key: 0,
                  class: "rj-option-caret",
                  onClick: withModifiers(($event) => toggleExpand(row.option), ["stop"])
                }, toDisplayString(row.expanded ? "▾" : "▸"), 9, _hoisted_4$4)) : (openBlock(), createElementBlock("span", _hoisted_5$4)),
                _ctx.multiple ? (openBlock(), createElementBlock("input", {
                  key: 2,
                  type: "checkbox",
                  class: "rj-opt-check",
                  checked: isChosen(row.option.value),
                  onClick: _cache[6] || (_cache[6] = withModifiers(() => {
                  }, ["stop"])),
                  onChange: ($event) => toggleValue(row.option)
                }, null, 40, _hoisted_6$4)) : createCommentVNode("", true),
                createElementVNode("span", _hoisted_7$3, toDisplayString(row.option.label), 1)
              ], 46, _hoisted_3$6);
            }), 128)),
            !visibleRows.value.length ? (openBlock(), createElementBlock("div", _hoisted_8$3, toDisplayString(unref(t)("noOptions")), 1)) : createCommentVNode("", true)
          ], 512)
        ], 544), [
          [vShow, open.value]
        ])
      ], 2);
    };
  }
});
const _hoisted_1$5 = { class: "rj-query-bar" };
const _hoisted_2$5 = { class: "rj-query-label" };
const _hoisted_3$5 = ["value", "onChange"];
const _hoisted_4$3 = ["value"];
const _hoisted_5$3 = ["value", "placeholder", "onInput"];
const _hoisted_6$3 = ["value", "placeholder", "onInput"];
const _hoisted_7$2 = ["title", "onClick"];
const _hoisted_8$2 = {
  value: "",
  disabled: ""
};
const _hoisted_9$2 = ["value"];
const _hoisted_10$2 = {
  key: 0,
  value: "",
  disabled: ""
};
const _hoisted_11$2 = { class: "rj-query-actions" };
const _hoisted_12$2 = { class: "rj-query-core" };
const _hoisted_13$2 = {
  key: 0,
  class: "rj-query-sep",
  "aria-hidden": "true"
};
const _hoisted_14$2 = {
  key: 1,
  class: "rj-query-action-btns"
};
const _hoisted_15$2 = ["disabled", "onClick"];
const _hoisted_16$2 = {
  key: 2,
  class: "rj-query-slot-btns"
};
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjQueryBar" },
  __name: "RjQueryBar",
  props: {
    fields: {},
    modelValue: {},
    actions: {},
    selectedRows: {}
  },
  emits: ["update:modelValue", "search", "reset", "action-click"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const selRows = computed(() => props.selectedRows || []);
    const actionList = computed(() => props.actions || []);
    const slots = useSlots();
    const hasActions = computed(() => actionList.value.length > 0 || !!slots.actions);
    function isDisabled(a) {
      return queryActionDisabled(a, selRows.value);
    }
    const list = computed(() => props.modelValue || []);
    const fieldMap = computed(() => new Map(props.fields.map((f) => [f.field, f])));
    const available = computed(() => {
      const used = new Set(list.value.map((c) => c.field));
      return props.fields.filter((f) => !used.has(f.field));
    });
    function defOf(field) {
      return fieldMap.value.get(field);
    }
    function titleOf(field) {
      var _a;
      return ((_a = defOf(field)) == null ? void 0 : _a.title) || field;
    }
    function kindOf(field) {
      var _a;
      return ((_a = defOf(field)) == null ? void 0 : _a.kind) || "text";
    }
    function optionsOf(field) {
      var _a;
      return ((_a = defOf(field)) == null ? void 0 : _a.options) || [];
    }
    function opsOf(field) {
      return queryOpsOfKind(kindOf(field));
    }
    const OP_KEY = {
      contains: "opContains",
      eq: "opEq",
      ne: "opNe",
      gt: "opGt",
      gte: "opGte",
      lt: "opLt",
      lte: "opLte",
      between: "opBetween",
      in: "opIn"
    };
    function opText(op) {
      return t(OP_KEY[op] || op);
    }
    const KIND_KEY = {
      text: "queryKindText",
      number: "queryKindNumber",
      date: "queryKindDate",
      select: "queryKindSelect"
    };
    function kindText(k) {
      return t(KIND_KEY[k || "text"] || "queryKindText");
    }
    function emitList(next) {
      emit("update:modelValue", next);
    }
    function add(ev) {
      const sel = ev.target;
      const field = sel.value;
      sel.value = "";
      if (!field)
        return;
      const next = list.value.slice();
      next.push({
        field,
        operator: defaultQueryOperator(kindOf(field)),
        value: void 0,
        valueText: ""
      });
      emitList(next);
    }
    function remove(i) {
      const next = list.value.slice();
      next.splice(i, 1);
      emitList(next);
    }
    function clearAll() {
      emit("reset");
    }
    function readVal(ev, numeric) {
      const raw = ev.target.value;
      if (raw === "" || raw === void 0)
        return void 0;
      return numeric ? Number(raw) : raw;
    }
    function setVal(c, key, ev, isSelect = false) {
      const numeric = isSelect ? false : kindOf(c.field) === "number";
      c[key] = readVal(ev, numeric);
      emitList(list.value.slice());
    }
    function labelOf(field, value) {
      const hit = flattenOptions(optionsOf(field)).find((o) => String(o.value) === String(value));
      return hit ? String(hit.label) : String(value ?? "");
    }
    function setSingle(c, v) {
      c.value = v;
      c.valueText = v == null || v === "" ? "" : labelOf(c.field, v);
      emitList(list.value.slice());
    }
    function setMulti(c, v) {
      const arr = Array.isArray(v) ? v : [];
      c.value = arr;
      c.valueText = arr.map((x) => labelOf(c.field, x)).join("、");
      emitList(list.value.slice());
    }
    function onOp(c, ev) {
      const op = ev.target.value;
      c.operator = op;
      if (op === "between") {
        c.value = void 0;
      } else if (op === "in") {
        c.value = Array.isArray(c.value) ? c.value : c.value == null || c.value === "" ? [] : [c.value];
      } else {
        c.value1 = void 0;
        c.value2 = void 0;
        if (Array.isArray(c.value))
          c.value = void 0;
      }
      emitList(list.value.slice());
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(list.value, (c, i) => {
          return openBlock(), createElementBlock("span", {
            key: c.field,
            class: "rj-query-item"
          }, [
            createElementVNode("b", _hoisted_2$5, toDisplayString(titleOf(c.field)), 1),
            createElementVNode("select", {
              class: "rj-query-op",
              value: c.operator,
              onChange: ($event) => onOp(c, $event)
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(opsOf(c.field), (o) => {
                return openBlock(), createElementBlock("option", {
                  key: o,
                  value: o
                }, toDisplayString(opText(o)), 9, _hoisted_4$3);
              }), 128))
            ], 40, _hoisted_3$5),
            c.operator === "between" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              (openBlock(), createBlock(resolveDynamicComponent("input"), {
                class: "rj-query-val sm",
                type: kindOf(c.field) === "date" ? "date" : "number",
                value: c.value1,
                placeholder: unref(t)("queryFrom"),
                onInput: ($event) => setVal(c, "value1", $event)
              }, null, 40, ["type", "value", "placeholder", "onInput"])),
              _cache[4] || (_cache[4] = createElementVNode("span", { class: "rj-query-tilde" }, "~", -1)),
              (openBlock(), createBlock(resolveDynamicComponent("input"), {
                class: "rj-query-val sm",
                type: kindOf(c.field) === "date" ? "date" : "number",
                value: c.value2,
                placeholder: unref(t)("queryTo"),
                onInput: ($event) => setVal(c, "value2", $event)
              }, null, 40, ["type", "value", "placeholder", "onInput"]))
            ], 64)) : c.operator === "in" ? (openBlock(), createBlock(_sfc_main$6, {
              key: 1,
              class: "rj-query-select",
              multiple: "",
              options: optionsOf(c.field),
              "model-value": Array.isArray(c.value) ? c.value : [],
              placeholder: unref(t)("querySelect"),
              "onUpdate:modelValue": ($event) => setMulti(c, $event)
            }, null, 8, ["options", "model-value", "placeholder", "onUpdate:modelValue"])) : kindOf(c.field) === "select" ? (openBlock(), createBlock(_sfc_main$6, {
              key: 2,
              class: "rj-query-select",
              options: optionsOf(c.field),
              "model-value": c.value,
              placeholder: unref(t)("querySelect"),
              "onUpdate:modelValue": ($event) => setSingle(c, $event)
            }, null, 8, ["options", "model-value", "placeholder", "onUpdate:modelValue"])) : kindOf(c.field) === "number" ? (openBlock(), createElementBlock("input", {
              key: 3,
              class: "rj-query-val",
              type: "number",
              value: c.value,
              placeholder: unref(t)("queryInput"),
              onInput: ($event) => setVal(c, "value", $event),
              onKeyup: _cache[0] || (_cache[0] = withKeys(($event) => emit("search"), ["enter"]))
            }, null, 40, _hoisted_5$3)) : (openBlock(), createElementBlock("input", {
              key: 4,
              class: "rj-query-val",
              type: "text",
              value: c.value,
              placeholder: unref(t)("queryInput"),
              onInput: ($event) => setVal(c, "value", $event),
              onKeyup: _cache[1] || (_cache[1] = withKeys(($event) => emit("search"), ["enter"]))
            }, null, 40, _hoisted_6$3)),
            createElementVNode("span", {
              class: "rj-query-del",
              title: unref(t)("queryRemove"),
              onClick: ($event) => remove(i)
            }, "✕", 8, _hoisted_7$2)
          ]);
        }), 128)),
        createElementVNode("select", {
          class: "rj-query-add",
          value: "",
          onChange: _cache[2] || (_cache[2] = ($event) => add($event))
        }, [
          createElementVNode("option", _hoisted_8$2, "＋ " + toDisplayString(unref(t)("queryAddField")), 1),
          (openBlock(true), createElementBlock(Fragment, null, renderList(available.value, (f) => {
            return openBlock(), createElementBlock("option", {
              key: f.field,
              value: f.field
            }, toDisplayString(f.title) + "（" + toDisplayString(kindText(f.kind)) + "） ", 9, _hoisted_9$2);
          }), 128)),
          !available.value.length ? (openBlock(), createElementBlock("option", _hoisted_10$2, toDisplayString(unref(t)("queryAllAdded")), 1)) : createCommentVNode("", true)
        ], 32),
        createElementVNode("span", _hoisted_11$2, [
          createElementVNode("span", _hoisted_12$2, [
            createElementVNode("button", {
              class: "rj-btn rj-btn-primary",
              onClick: _cache[3] || (_cache[3] = ($event) => emit("search"))
            }, toDisplayString(unref(t)("querySearch")), 1),
            createElementVNode("button", {
              class: "rj-btn",
              onClick: clearAll
            }, toDisplayString(unref(t)("queryReset")), 1)
          ]),
          hasActions.value ? (openBlock(), createElementBlock("span", _hoisted_13$2)) : createCommentVNode("", true),
          actionList.value.length ? (openBlock(), createElementBlock("span", _hoisted_14$2, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(actionList.value, (a, i) => {
              return openBlock(), createElementBlock("button", {
                key: i,
                class: normalizeClass(["rj-btn", { "rj-btn-danger": a.danger }]),
                disabled: isDisabled(a),
                onClick: ($event) => emit("action-click", a)
              }, [
                a.icon ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(a.icon), 1)
                ], 64)) : createCommentVNode("", true),
                createTextVNode(toDisplayString(a.name), 1)
              ], 10, _hoisted_15$2);
            }), 128))
          ])) : createCommentVNode("", true),
          _ctx.$slots.actions ? (openBlock(), createElementBlock("span", _hoisted_16$2, [
            renderSlot(_ctx.$slots, "actions", { rows: selRows.value })
          ])) : createCommentVNode("", true)
        ])
      ]);
    };
  }
});
const _hoisted_1$4 = { class: "rj-form-header" };
const _hoisted_2$4 = {
  key: 0,
  class: "rj-form-hint"
};
const _hoisted_3$4 = { class: "rj-form-body" };
const _hoisted_4$2 = {
  key: 0,
  class: "rj-form-empty"
};
const _hoisted_5$2 = ["title"];
const _hoisted_6$2 = ["onUpdate:modelValue"];
const _hoisted_7$1 = { class: "rj-form-label" };
const _hoisted_8$1 = ["onUpdate:modelValue", "rows"];
const _hoisted_9$1 = ["onUpdate:modelValue"];
const _hoisted_10$1 = { value: void 0 };
const _hoisted_11$1 = ["value"];
const _hoisted_12$1 = ["onUpdate:modelValue"];
const _hoisted_13$1 = ["onUpdate:modelValue"];
const _hoisted_14$1 = ["onUpdate:modelValue"];
const _hoisted_15$1 = ["onUpdate:modelValue"];
const _hoisted_16$1 = {
  key: 7,
  class: "rj-form-error"
};
const _hoisted_17$1 = { class: "rj-popup-footer" };
const _hoisted_18$1 = ["disabled"];
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjRowFormDialog" },
  __name: "RjRowFormDialog",
  props: {
    fields: {},
    rows: {},
    title: {},
    width: { default: 560 },
    mode: { default: "edit" }
  },
  emits: ["submit", "close"],
  setup(__props, { emit: __emit }) {
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const props = __props;
    const emit = __emit;
    const multi = computed(() => props.rows.length > 1);
    const addMode = computed(() => props.mode === "add");
    const values = reactive({});
    const enabled = reactive({});
    const errors = reactive({});
    props.fields.forEach((f) => {
      values[f.field] = fieldValue(props.rows[0] || {}, f.field) ?? "";
      enabled[f.field] = !multi.value;
    });
    const changedCount = computed(
      () => props.fields.filter((f) => !multi.value || enabled[f.field]).length
    );
    function activeFields() {
      return props.fields.filter((f) => !multi.value || enabled[f.field]);
    }
    async function submit() {
      var _a;
      const fields = activeFields();
      Object.keys(errors).forEach((k) => delete errors[k]);
      for (const f of fields) {
        for (const row of props.rows) {
          const v = values[f.field];
          const msg = await ((_a = f.validator) == null ? void 0 : _a.call(f, v, row, f.col)) || "";
          if (msg) {
            errors[f.field] = msg;
            return;
          }
        }
      }
      const changes = {};
      fields.forEach((f) => {
        changes[f.field] = values[f.field] === "" && f.kind !== "text" ? void 0 : values[f.field];
      });
      emit("submit", changes);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "rj-form-mask",
        onClick: _cache[3] || (_cache[3] = withModifiers(($event) => _ctx.$emit("close"), ["self"]))
      }, [
        createElementVNode("div", {
          class: "rj-row-form-dialog",
          style: normalizeStyle({ width: _ctx.width + "px" }),
          onClick: _cache[2] || (_cache[2] = withModifiers(() => {
          }, ["stop"]))
        }, [
          createElementVNode("div", _hoisted_1$4, [
            createTextVNode(toDisplayString(_ctx.title || (addMode.value ? unref(t)("rowFormAddTitle") : unref(t)("rowFormTitle"))) + " ", 1),
            createElementVNode("span", {
              class: "rj-form-close",
              onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("close"))
            }, "✕")
          ]),
          multi.value ? (openBlock(), createElementBlock("div", _hoisted_2$4, toDisplayString(unref(t)("rowFormMultiHint")), 1)) : createCommentVNode("", true),
          createElementVNode("div", _hoisted_3$4, [
            !_ctx.fields.length ? (openBlock(), createElementBlock("div", _hoisted_4$2, toDisplayString(unref(t)("rowFormEmpty")), 1)) : createCommentVNode("", true),
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.fields, (f) => {
              return openBlock(), createElementBlock("div", {
                key: f.colId,
                class: normalizeClass(["rj-form-field", { "is-off": multi.value && !enabled[f.field] }])
              }, [
                multi.value ? (openBlock(), createElementBlock("label", {
                  key: 0,
                  class: "rj-form-batch",
                  title: unref(t)("rowFormMultiHint")
                }, [
                  withDirectives(createElementVNode("input", {
                    "onUpdate:modelValue": ($event) => enabled[f.field] = $event,
                    type: "checkbox"
                  }, null, 8, _hoisted_6$2), [
                    [vModelCheckbox, enabled[f.field]]
                  ]),
                  createTextVNode(toDisplayString(unref(t)("rowFormChangeTag")), 1)
                ], 8, _hoisted_5$2)) : createCommentVNode("", true),
                createElementVNode("label", _hoisted_7$1, toDisplayString(f.title), 1),
                f.kind === "textarea" ? withDirectives((openBlock(), createElementBlock("textarea", {
                  key: 1,
                  "onUpdate:modelValue": ($event) => values[f.field] = $event,
                  class: "rj-form-input",
                  rows: f.rows
                }, null, 8, _hoisted_8$1)), [
                  [vModelText, values[f.field]]
                ]) : f.kind === "select" ? withDirectives((openBlock(), createElementBlock("select", {
                  key: 2,
                  "onUpdate:modelValue": ($event) => values[f.field] = $event,
                  class: "rj-form-input"
                }, [
                  createElementVNode("option", _hoisted_10$1, toDisplayString(addMode.value ? unref(t)("querySelect") : unref(t)("rowFormKeepValue")), 1),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(f.options, (o) => {
                    return openBlock(), createElementBlock("option", {
                      key: String(o.value),
                      value: o.value
                    }, toDisplayString(o.label), 9, _hoisted_11$1);
                  }), 128))
                ], 8, _hoisted_9$1)), [
                  [vModelSelect, values[f.field]]
                ]) : f.kind === "checkbox" ? withDirectives((openBlock(), createElementBlock("input", {
                  key: 3,
                  "onUpdate:modelValue": ($event) => values[f.field] = $event,
                  type: "checkbox",
                  class: "rj-form-check"
                }, null, 8, _hoisted_12$1)), [
                  [vModelCheckbox, values[f.field]]
                ]) : f.kind === "number" ? withDirectives((openBlock(), createElementBlock("input", {
                  key: 4,
                  "onUpdate:modelValue": ($event) => values[f.field] = $event,
                  type: "number",
                  class: "rj-form-input"
                }, null, 8, _hoisted_13$1)), [
                  [
                    vModelText,
                    values[f.field],
                    void 0,
                    { number: true }
                  ]
                ]) : f.kind === "date" ? withDirectives((openBlock(), createElementBlock("input", {
                  key: 5,
                  "onUpdate:modelValue": ($event) => values[f.field] = $event,
                  type: "date",
                  class: "rj-form-input"
                }, null, 8, _hoisted_14$1)), [
                  [vModelText, values[f.field]]
                ]) : withDirectives((openBlock(), createElementBlock("input", {
                  key: 6,
                  "onUpdate:modelValue": ($event) => values[f.field] = $event,
                  type: "text",
                  class: "rj-form-input"
                }, null, 8, _hoisted_15$1)), [
                  [vModelText, values[f.field]]
                ]),
                errors[f.field] ? (openBlock(), createElementBlock("div", _hoisted_16$1, toDisplayString(errors[f.field]), 1)) : createCommentVNode("", true)
              ], 2);
            }), 128))
          ]),
          createElementVNode("div", _hoisted_17$1, [
            createElementVNode("button", {
              class: "rj-btn",
              onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("close"))
            }, toDisplayString(unref(t)("confirmCancel")), 1),
            createElementVNode("button", {
              class: "rj-btn rj-btn-primary",
              disabled: !changedCount.value,
              onClick: submit
            }, toDisplayString((addMode.value ? unref(t)("rowFormSave") : unref(t)("rowFormApply")) + (multi.value ? "(" + changedCount.value + ")" : "")), 9, _hoisted_18$1)
          ])
        ], 4)
      ]);
    };
  }
});
const _hoisted_1$3 = { class: "rj-form-header" };
const _hoisted_2$3 = { class: "rj-confirm-msg" };
const _hoisted_3$3 = { class: "rj-popup-footer" };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjConfirmDialog" },
  __name: "RjConfirmDialog",
  props: {
    message: {},
    title: {}
  },
  emits: ["ok", "cancel"],
  setup(__props) {
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "rj-form-mask",
        onClick: _cache[4] || (_cache[4] = withModifiers(($event) => _ctx.$emit("cancel"), ["self"]))
      }, [
        createElementVNode("div", {
          class: "rj-confirm-dialog",
          onClick: _cache[3] || (_cache[3] = withModifiers(() => {
          }, ["stop"]))
        }, [
          createElementVNode("div", _hoisted_1$3, [
            createTextVNode(toDisplayString(_ctx.title || unref(t)("confirmTitle")) + " ", 1),
            createElementVNode("span", {
              class: "rj-form-close",
              onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("cancel"))
            }, "✕")
          ]),
          createElementVNode("div", _hoisted_2$3, toDisplayString(_ctx.message), 1),
          createElementVNode("div", _hoisted_3$3, [
            createElementVNode("button", {
              class: "rj-btn",
              onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("cancel"))
            }, toDisplayString(unref(t)("confirmCancel")), 1),
            createElementVNode("button", {
              class: "rj-btn rj-btn-primary",
              onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$emit("ok"))
            }, toDisplayString(unref(t)("confirmOk")), 1)
          ])
        ])
      ]);
    };
  }
});
const _hoisted_1$2 = { class: "rj-form-header" };
const _hoisted_2$2 = {
  class: "rj-json-body",
  tabindex: "0"
};
const _hoisted_3$2 = { class: "rj-popup-footer" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjRowJsonDialog" },
  __name: "RjRowJsonDialog",
  props: {
    json: {}
  },
  emits: ["close"],
  setup(__props) {
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const props = __props;
    const tip = ref("");
    let tipTimer;
    async function copy() {
      const done = await writeClipboard(props.json);
      tip.value = done ? "jsonCopied" : "jsonCopyFail";
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => tip.value = "", 1500);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "rj-form-mask",
        onClick: _cache[3] || (_cache[3] = withModifiers(($event) => _ctx.$emit("close"), ["self"]))
      }, [
        createElementVNode("div", {
          class: "rj-json-dialog",
          onClick: _cache[2] || (_cache[2] = withModifiers(() => {
          }, ["stop"]))
        }, [
          createElementVNode("div", _hoisted_1$2, [
            createTextVNode(toDisplayString(unref(t)("jsonTitle")) + " ", 1),
            createElementVNode("span", {
              class: "rj-form-close",
              onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("close"))
            }, "✕")
          ]),
          createElementVNode("pre", _hoisted_2$2, toDisplayString(_ctx.json), 1),
          createElementVNode("div", _hoisted_3$2, [
            createElementVNode("button", {
              class: "rj-btn",
              onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("close"))
            }, toDisplayString(unref(t)("jsonClose")), 1),
            createElementVNode("button", {
              class: "rj-btn rj-btn-primary",
              onClick: copy
            }, toDisplayString(unref(t)(tip.value || "jsonCopy")), 1)
          ])
        ])
      ]);
    };
  }
});
function stringifyRowJson(row) {
  try {
    const seen = /* @__PURE__ */ new WeakSet();
    const out = JSON.stringify(
      row,
      (_key, value) => {
        if (typeof value === "function")
          return String(value);
        if (value && typeof value === "object") {
          if (seen.has(value))
            return "[Circular]";
          seen.add(value);
        }
        return value;
      },
      2
    );
    return out === void 0 ? String(row) : out;
  } catch {
    try {
      return String(row);
    } catch {
      return "(unserializable row)";
    }
  }
}
const _hoisted_1$1 = { class: "rj-view-dlg" };
const _hoisted_2$1 = { class: "rj-view-dlg-title" };
const _hoisted_3$1 = { class: "rj-view-dlg-label" };
const _hoisted_4$1 = ["placeholder"];
const _hoisted_5$1 = { class: "rj-view-dlg-tip" };
const _hoisted_6$1 = { class: "rj-view-dlg-foot" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  ...{ name: "RjViewManager" },
  __name: "RjViewManager",
  props: {
    condCount: {},
    colCount: {}
  },
  emits: ["save"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const emit = __emit;
    const t = inject(RJ_LOCALE_KEY, defaultTranslate);
    const dlg = ref(false);
    const draftName = ref("");
    const nameInput = ref();
    function open() {
      dlg.value = true;
      draftName.value = "";
      nextTick(() => {
        var _a;
        return (_a = nameInput.value) == null ? void 0 : _a.focus();
      });
    }
    function confirm() {
      const name = draftName.value.trim();
      if (!name)
        return;
      emit("save", { name });
      dlg.value = false;
    }
    __expose({ openNew: open });
    return (_ctx, _cache) => {
      return dlg.value ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "rj-view-mask",
        onClick: _cache[3] || (_cache[3] = withModifiers(($event) => dlg.value = false, ["self"]))
      }, [
        createElementVNode("div", _hoisted_1$1, [
          createElementVNode("div", _hoisted_2$1, toDisplayString(unref(t)("viewSaveNew")), 1),
          createElementVNode("label", _hoisted_3$1, toDisplayString(unref(t)("viewName")), 1),
          withDirectives(createElementVNode("input", {
            ref_key: "nameInput",
            ref: nameInput,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => draftName.value = $event),
            class: "rj-input",
            placeholder: unref(t)("viewNamePh"),
            maxlength: "30",
            onKeyup: withKeys(confirm, ["enter"]),
            onKeydown: _cache[1] || (_cache[1] = withKeys(($event) => dlg.value = false, ["esc"]))
          }, null, 40, _hoisted_4$1), [
            [vModelText, draftName.value]
          ]),
          createElementVNode("div", _hoisted_5$1, toDisplayString(unref(t)("viewDlgTip", { q: _ctx.condCount, c: _ctx.colCount })), 1),
          createElementVNode("div", _hoisted_6$1, [
            createElementVNode("button", {
              class: "rj-btn",
              onClick: _cache[2] || (_cache[2] = ($event) => dlg.value = false)
            }, toDisplayString(unref(t)("viewCancel")), 1),
            createElementVNode("button", {
              class: "rj-btn rj-btn-primary",
              onClick: confirm
            }, toDisplayString(unref(t)("viewOk")), 1)
          ])
        ])
      ])) : createCommentVNode("", true);
    };
  }
});
const PREFIX = "rj-grid:view:";
function storageKey(stateKey) {
  return PREFIX + stateKey;
}
function loadSavedViews(stateKey) {
  if (!stateKey)
    return [];
  try {
    const raw = localStorage.getItem(storageKey(stateKey));
    if (!raw)
      return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr))
      return [];
    return arr.filter(
      (v) => v && typeof v.id === "string" && typeof v.name === "string"
    );
  } catch {
    return [];
  }
}
function persistViews(stateKey, views) {
  if (!stateKey)
    return;
  try {
    localStorage.setItem(
      storageKey(stateKey),
      JSON.stringify(views.filter((v) => !v.builtin))
    );
  } catch {
  }
}
function newViewId() {
  return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function useSavedViews(stateKey, builtin = () => []) {
  const views = ref([]);
  function reload() {
    views.value = [...builtin(), ...loadSavedViews(stateKey())];
    return views.value;
  }
  function upsert(v) {
    const list = loadSavedViews(stateKey());
    const idx = list.findIndex((x) => x.id === v.id);
    if (idx >= 0)
      list[idx] = v;
    else
      list.unshift(v);
    persistViews(stateKey(), list);
    views.value = [...builtin(), ...list];
    return views.value;
  }
  function remove(id) {
    const list = loadSavedViews(stateKey()).filter((x) => x.id !== id);
    persistViews(stateKey(), list);
    views.value = [...builtin(), ...list];
    return views.value;
  }
  reload();
  return { views, reload, upsert, remove };
}
class EditHistory {
  constructor(limit = 50) {
    __publicField(this, "undoStack", []);
    __publicField(this, "redoStack", []);
    __publicField(this, "limit");
    this.limit = Math.max(1, limit | 0);
  }
  setLimit(n) {
    this.limit = Math.max(1, n | 0);
    this.trim();
  }
  /** 记录一次动作（一组变更）；清空重做栈 */
  push(group) {
    if (!group || !group.length)
      return;
    this.undoStack.push(group.slice());
    this.redoStack.length = 0;
    this.trim();
  }
  trim() {
    while (this.undoStack.length > this.limit)
      this.undoStack.shift();
  }
  canUndo() {
    return this.undoStack.length > 0;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
  get undoDepth() {
    return this.undoStack.length;
  }
  get redoDepth() {
    return this.redoStack.length;
  }
  /** 弹出一组待反向应用（写回 oldValue）的变更 */
  undo() {
    const g = this.undoStack.pop();
    if (!g)
      return null;
    this.redoStack.push(g);
    return g;
  }
  /** 弹出一组待正向应用（写回 newValue）的变更 */
  redo() {
    const g = this.redoStack.pop();
    if (!g)
      return null;
    this.undoStack.push(g);
    return g;
  }
  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
const PAGE_SIZES = {
  A4: "297mm 210mm",
  A5: "210mm 148mm",
  Letter: "279.4mm 215.9mm",
  Legal: "355.6mm 215.9mm"
};
const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function cellText(v) {
  if (v == null)
    return "";
  if (typeof v === "number")
    return String(v);
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
const DEFAULT_PAGE_TEXT = "第 {p} 页 / 共 {t} 页";
function pageContentCss(tpl) {
  const quote = (s) => `"${s.replace(/"/g, '\\"')}"`;
  const re = /\{p\}|\{t\}/g;
  const seg = [];
  let last = 0;
  let m;
  while (m = re.exec(tpl)) {
    seg.push(quote(tpl.slice(last, m.index)), m[0] === "{p}" ? "counter(page)" : "counter(pages)");
    last = m.index + 3;
  }
  seg.push(quote(tpl.slice(last)));
  return seg.join(" ");
}
function norm(o) {
  return {
    pageSize: (o == null ? void 0 : o.pageSize) ?? "A4",
    orientation: (o == null ? void 0 : o.orientation) ?? "landscape",
    margins: (o == null ? void 0 : o.margins) ?? 10,
    scaleToFit: (o == null ? void 0 : o.scaleToFit) ?? false,
    showGridLines: (o == null ? void 0 : o.showGridLines) ?? true,
    zebra: (o == null ? void 0 : o.zebra) ?? true,
    headerDark: (o == null ? void 0 : o.headerDark) ?? true,
    pageNumbers: (o == null ? void 0 : o.pageNumbers) ?? true,
    pageNumberText: (o == null ? void 0 : o.pageNumberText) ?? DEFAULT_PAGE_TEXT,
    docLang: (o == null ? void 0 : o.docLang) ?? "zh",
    ...o
  };
}
function buildPrintHtml(input, opts = {}) {
  const o = norm(opts);
  const cols = input.columns;
  const n = cols.length;
  const sizeKey = PAGE_SIZES[o.pageSize] ? o.pageSize : "A4";
  const baseSize = PAGE_SIZES[sizeKey];
  const pageBox = o.pageSize === "auto" ? "" : `size: ${baseSize};`;
  const orient = o.orientation === "portrait" ? "portrait" : "landscape";
  const levels = input.headerLevels && input.headerLevels.length ? input.headerLevels : [cols.map((c) => ({ title: c.title, colSpan: 1 }))];
  const totalW = cols.reduce((s, c) => s + (c.width && c.width > 0 ? c.width : 120), 0) || 1;
  const colgroup = o.scaleToFit ? "" : `<colgroup>${cols.map((c) => {
    const w = (c.width && c.width > 0 ? c.width : 120) / totalW;
    return `<col style="width:${(w * 100).toFixed(3)}%"/>`;
  }).join("")}</colgroup>`;
  const thead = (() => {
    const occ = new Array(n).fill(0);
    return `<thead>${levels.map((row) => {
      const parts = [];
      let col = 0;
      for (const cell of row) {
        while (col < n && occ[col] > 0)
          col++;
        const cSpan = Math.max(1, cell.colSpan || 1);
        const rSpan = Math.max(1, cell.rowSpan || 1);
        for (let c = col; c < col + cSpan && c < n; c++)
          occ[c] = rSpan;
        const cAttr = cSpan > 1 ? ` colspan="${cSpan}"` : "";
        const rAttr = rSpan > 1 ? ` rowspan="${rSpan}"` : "";
        parts.push(`<th${cAttr}${rAttr}>${escHtml(cell.title)}</th>`);
        col += cSpan;
      }
      for (let c = 0; c < n; c++)
        if (occ[c] > 0)
          occ[c]--;
      return `<tr class="rj-hrow">${parts.join("")}</tr>`;
    }).join("")}</thead>`;
  })();
  const bodyRows = input.matrix.map((r, ri) => {
    var _a;
    const styleKind = ((_a = input.rowStyles) == null ? void 0 : _a[ri]) ?? 0;
    const cls = styleKind === 1 ? ' class="rj-group"' : styleKind === 2 ? ' class="rj-total"' : "";
    const tds = r.map((v, ci) => {
      var _a2;
      const align = ((_a2 = cols[ci]) == null ? void 0 : _a2.align) ?? (typeof v === "number" ? "right" : "left");
      const a = align && align !== "left" ? ` style="text-align:${align}"` : "";
      return `<td${a}>${escHtml(cellText(v))}</td>`;
    }).join("");
    const pad2 = n - r.length;
    const padTds = pad2 > 0 ? "<td></td>".repeat(pad2) : "";
    return `<tr${cls}>${tds}${padTds}</tr>`;
  }).join("");
  const titleHtml = o.title ? `<h1 class="rj-print-title">${escHtml(o.title)}</h1>` : "";
  const subHtml = o.header ? `<div class="rj-print-sub">${escHtml(o.header)}</div>` : "";
  const footHtml = o.footer ? `<div class="rj-print-footer">${escHtml(o.footer)}</div>` : "";
  const border = o.showGridLines ? "1px solid #c9ced6" : "none";
  const headBg = o.headerDark ? "#4472c4" : "#eef1f6";
  const headColor = o.headerDark ? "#ffffff" : "#1f2329";
  const zebraRule = o.zebra ? "tbody tr:nth-child(even) td{background:#f7f9fc}" : "";
  const rowBreakRule = input.matrix.length > 300 ? "tr { break-inside: auto; page-break-inside: auto; }" : "tr { page-break-inside: avoid; break-inside: avoid; }";
  const style = `
@page { ${pageBox} margin: ${o.margins}mm; }
${o.pageNumbers ? `@page { @bottom-center { content: ${pageContentCss(o.pageNumberText)}; font-size: 10px; color: #999; } }` : ""}
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", Arial, sans-serif; color: #1f2329; }
.rj-print-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.rj-print-sub { font-size: 12px; color: #666; margin: 0 0 10px; }
table { border-collapse: collapse; width: 100%; table-layout: ${o.scaleToFit ? "auto" : "fixed"}; font-size: 12px; }
thead { display: table-header-group; }
${rowBreakRule}
th, td { border: ${border}; padding: 4px 8px; text-align: left; vertical-align: top; word-break: break-word; }
thead th { background: ${headBg}; color: ${headColor}; font-weight: 600; text-align: center; }
${zebraRule}
tbody tr.rj-group td { background: #eef1f6; font-weight: 600; }
tbody tr.rj-total td { background: #fff7e0; font-weight: 700; }
.rj-print-foot { position: fixed; left: 0; right: 0; bottom: 0; text-align: center; font-size: 11px; color: #999; }
.rj-print-footer { margin-top: 10px; font-size: 11px; color: #888; text-align: right; }
`.trim();
  return `<!DOCTYPE html>
<html lang="${escHtml(o.docLang)}"><head><meta charset="utf-8"/><title>${escHtml(
    o.docTitle || o.title || "RJGrid"
  )}</title>
<meta name="orientation" content="${orient}"/>
<style>${style}</style>
</head><body>
${titleHtml}${subHtml}
<table>${colgroup}${thead}<tbody>${bodyRows}</tbody></table>
${footHtml}
</body></html>`;
}
function openPrintDialog(html) {
  var _a;
  const existing = document.getElementById("__rj_print_frame__");
  if (existing)
    existing.remove();
  const frame = document.createElement("iframe");
  frame.id = "__rj_print_frame__";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  } else {
    frame.srcdoc = html;
  }
  const run = () => {
    var _a2, _b;
    try {
      const w = frame.contentWindow;
      if (!w)
        return;
      w.focus();
      w.print();
    } finally {
      const cleanup = () => {
        setTimeout(() => {
          if (frame.parentNode)
            frame.remove();
        }, 1e3);
      };
      try {
        (_b = (_a2 = frame.contentWindow) == null ? void 0 : _a2.addEventListener) == null ? void 0 : _b.call(_a2, "afterprint", cleanup);
      } catch {
        cleanup();
      }
      setTimeout(cleanup, 6e4);
    }
  };
  if (((_a = frame.contentDocument) == null ? void 0 : _a.readyState) === "complete")
    setTimeout(run, 60);
  else
    frame.onload = () => setTimeout(run, 60);
}
function printHtml(input, opts = {}) {
  openPrintDialog(buildPrintHtml(input, opts));
}
const _hoisted_1 = ["aria-label", "aria-rowcount", "aria-colcount", "aria-multiselectable"];
const _hoisted_2 = {
  key: 0,
  class: "rj-toolbar"
};
const _hoisted_3 = { class: "rj-toolbar-left" };
const _hoisted_4 = {
  key: 1,
  style: { "color": "var(--rj-primary)", "font-size": "12px" }
};
const _hoisted_5 = { class: "rj-toolbar-right" };
const _hoisted_6 = ["placeholder"];
const _hoisted_7 = {
  key: 3,
  class: "rj-second-bar"
};
const _hoisted_8 = { key: 0 };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = ["data-tip", "aria-label"];
const _hoisted_11 = ["data-tip", "aria-label"];
const _hoisted_12 = ["data-tip", "aria-label"];
const _hoisted_13 = ["data-tip", "aria-label"];
const _hoisted_14 = {
  key: 5,
  class: "rj-export-group"
};
const _hoisted_15 = ["data-tip"];
const _hoisted_16 = ["data-tip"];
const _hoisted_17 = ["data-tip"];
const _hoisted_18 = ["data-tip"];
const _hoisted_19 = ["data-tip", "aria-label"];
const _hoisted_20 = { style: { "display": "flex", "flex": "1", "min-height": "0" } };
const _hoisted_21 = ["role"];
const _hoisted_22 = ["aria-rowindex", "aria-selected", "data-rk"];
const _hoisted_23 = { class: "rj-hover-brush" };
const _hoisted_24 = ["data-rk"];
const _hoisted_25 = { class: "rj-hover-brush" };
const _hoisted_26 = {
  key: 1,
  style: { position: "absolute", inset: 0, background: "inherit" }
};
const _hoisted_27 = ["data-rk"];
const _hoisted_28 = { class: "rj-hover-brush" };
const _hoisted_29 = {
  key: 1,
  style: { position: "absolute", inset: 0, background: "inherit" }
};
const _hoisted_30 = {
  key: 2,
  class: "rj-overlay"
};
const _hoisted_31 = {
  key: 3,
  class: "rj-overlay",
  style: { "position": "static", "background": "transparent", "flex": "1" }
};
const _hoisted_32 = { style: { "padding": "30px", "color": "var(--rj-text-secondary)" } };
const _hoisted_33 = {
  key: 4,
  class: "rj-grid-toast"
};
const _hoisted_34 = {
  key: 5,
  class: "rj-find-bar"
};
const _hoisted_35 = ["placeholder"];
const _hoisted_36 = { style: { "font-size": "12px", "color": "var(--rj-text-secondary)", "white-space": "nowrap" } };
const _hoisted_37 = {
  key: 0,
  class: "rj-summary"
};
const _hoisted_38 = {
  key: 1,
  class: "rj-load-more"
};
const _hoisted_39 = {
  key: 4,
  class: "rj-pager-bar"
};
const _hoisted_40 = {
  key: 5,
  class: "rj-status"
};
const _hoisted_41 = { class: "rj-status-left" };
const _hoisted_42 = { key: 0 };
const _hoisted_43 = {
  key: 1,
  class: "rj-status-dirty"
};
const _hoisted_44 = { key: 2 };
const _hoisted_45 = {
  key: 3,
  class: "rj-status-ssrm"
};
const _hoisted_46 = { key: 0 };
const _hoisted_47 = {
  key: 0,
  class: "rj-status-right"
};
const _hoisted_48 = {
  key: 0,
  class: "rj-status-more"
};
const _hoisted_49 = {
  key: 0,
  class: "rj-drag-ghost-img"
};
const _hoisted_50 = {
  key: 1,
  class: "rj-drag-ghost-spark"
};
const _hoisted_51 = {
  key: 0,
  class: "rj-drag-ghost-empty"
};
const _hoisted_52 = ["aria-label"];
const _hoisted_53 = ["src", "alt"];
const _hoisted_54 = { class: "rj-img-viewer-close" };
const FROW_H = 30;
const DRAG_START_GAP = 4;
const DRAG_EDGE_ZONE = 56;
const GHOST_MAX_W = 520;
const DRAG_TRANSITION = "transform 190ms cubic-bezier(0.2, 0.9, 0.24, 1), opacity 150ms ease";
const DRAG_TRANSITION_FAST = "transform 90ms cubic-bezier(0.2, 0.9, 0.24, 1), opacity 120ms ease";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "RjGrid" },
  __name: "RjGrid",
  props: {
    columns: {},
    rows: { default: () => [] },
    rowKey: {},
    height: { default: "100%" },
    loading: { type: Boolean },
    theme: {},
    detectHostTheme: { type: Boolean, default: true },
    density: { default: "medium" },
    lang: {},
    localeText: {},
    showToolbar: { type: Boolean, default: true },
    quickFilterEnabled: { type: Boolean, default: true },
    floatingFilters: { type: Boolean, default: false },
    groupFooter: { type: Boolean, default: false },
    serverSideGrouping: { type: Boolean, default: false },
    groupDisplayType: { default: "singleColumn" },
    groupSelectsChildren: { type: Boolean, default: true },
    toolPanel: { type: Boolean, default: true },
    groupable: { type: Boolean, default: true },
    showGroupPanel: { type: Boolean, default: true },
    chartable: { type: Boolean, default: true },
    exportable: { type: Boolean, default: true },
    showPrint: { type: Boolean, default: true },
    showCsv: { type: Boolean, default: true },
    showPdf: { type: Boolean, default: true },
    showExcel: { type: Boolean, default: true },
    colReorder: { type: Boolean, default: true },
    resizable: { type: Boolean, default: true },
    rowSelection: { type: [Boolean, String], default: false },
    selectOnCellClick: { type: Boolean, default: true },
    keepSelectionCrossPage: { type: Boolean },
    editable: { type: Boolean, default: false },
    rangeSelection: { type: Boolean, default: true },
    clipboard: { type: Boolean, default: true },
    contextMenu: { type: [Boolean, Function], default: false },
    contextMenus: {},
    rowJson: { type: Boolean, default: true },
    rowDraggable: { type: Boolean, default: false },
    stateKey: {},
    dataMode: { default: "client" },
    loadData: {},
    pageSize: { default: 100 },
    pagerPosition: { default: "top" },
    ssrmBlockSize: { default: 100 },
    ssrmMaxBlocksInCache: { default: 10 },
    ssrmCacheOverflow: { default: 4 },
    isServerSideGroup: {},
    treeData: { type: Boolean },
    childrenField: { default: "children" },
    parentField: { default: "" },
    defaultExpandAll: { type: Boolean, default: false },
    showSummary: { type: Boolean, default: false },
    pinnedTopRows: { default: () => [] },
    pinnedBottomRows: { default: () => [] },
    fullWidthRow: {},
    detailHeight: { default: 240 },
    fullWidthHeight: { default: 90 },
    getRowClass: {},
    suppressVirtualCols: { type: Boolean },
    exportRange: { default: "auto" },
    serverExport: {},
    exportFileName: {},
    printMaxRows: { default: 1e3 },
    exportRawValues: { type: Boolean },
    statusBar: { type: Boolean, default: true },
    statusAggregations: { default: () => ["sum", "avg", "count", "min", "max"] },
    ariaLabel: { default: "" },
    undoRedoCellEditing: { type: Boolean, default: false },
    undoRedoCellEditingLimit: { default: 50 },
    copyHeadersToClipboard: { type: Boolean, default: false },
    pasteTransformer: {},
    markDirtyCells: { type: Boolean, default: false },
    rowHover: { type: Boolean, default: true },
    icons: {},
    queryable: { type: Boolean, default: false },
    viewable: { type: Boolean, default: false },
    queryFields: { default: () => [] },
    queryActions: { default: () => [] },
    rowForm: { type: [Object, Boolean], default: true },
    dictLoader: {},
    optionsLoader: {},
    builtinViews: { default: () => [] }
  },
  emits: ["selection-change", "cell-click", "cell-dblclick", "cell-action", "context-menu-action", "cell-value-changed", "cells-changed", "sort-change", "filter-change", "row-group-change", "pivot-change", "page-change", "view-change", "detail-open", "row-drag-end", "row-form-submit", "row-form-add", "ready"],
  setup(__props, { expose: __expose, emit: __emit }) {
    var _a;
    const props = __props;
    const optCache = reactive(/* @__PURE__ */ new Map());
    async function resolveAllOptions() {
      const pending = /* @__PURE__ */ new Map();
      for (const col of collectOptionCols(props.columns)) {
        const key = sourceCacheKey(col);
        if (!key || optCache.has(key) || pending.has(key))
          continue;
        pending.set(key, col);
      }
      await Promise.all(
        [...pending.entries()].map(async ([key, col]) => {
          const list = await resolveOptions(col.options, col.dict, {
            dictLoader: props.dictLoader,
            optionsLoader: props.optionsLoader
          });
          optCache.set(key, list);
        })
      );
    }
    const colOptionsIndex = computed(() => {
      const m = /* @__PURE__ */ new Map();
      for (const col of collectOptionCols(props.columns)) {
        const key = sourceCacheKey(col);
        const list = key ? optCache.get(key) : void 0;
        if (!list || !list.length)
          continue;
        const labelMap = /* @__PURE__ */ new Map();
        for (const o of flattenOptions(list))
          labelMap.set(String(o.value), String(o.label));
        m.set(colIdOf(col), { list, labelMap });
      }
      return m;
    });
    function colOptionList(col) {
      var _a2;
      return (_a2 = colOptionsIndex.value.get(colIdOf(col))) == null ? void 0 : _a2.list;
    }
    function colOptionLabel(col, value) {
      var _a2;
      if (value == null || value === "")
        return void 0;
      return (_a2 = colOptionsIndex.value.get(colIdOf(col))) == null ? void 0 : _a2.labelMap.get(String(value));
    }
    provide(RJ_OPTIONS_KEY, { list: colOptionList, label: colOptionLabel });
    onMounted(() => {
      void resolveAllOptions();
    });
    watch(
      () => props.columns,
      () => {
        void resolveAllOptions();
      }
    );
    const emit = __emit;
    const busListeners = /* @__PURE__ */ new Map();
    function addEventListener(type, cb) {
      let set = busListeners.get(type);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        busListeners.set(type, set);
      }
      set.add(cb);
      return () => removeEventListener(type, cb);
    }
    function removeEventListener(type, cb) {
      var _a2;
      (_a2 = busListeners.get(type)) == null ? void 0 : _a2.delete(cb);
    }
    function dispatchEvent(type, payload = {}) {
      const set = busListeners.get(type);
      if (!set || !set.size)
        return;
      const event = { type, ...payload || {} };
      set.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error('[rj-grid] listener error for "' + type + '"', err);
        }
      });
    }
    function notifySelection() {
      const rows = selectedRows();
      emit("selection-change", rows);
      dispatchEvent("rowSelectionChanged", { selected: rows });
    }
    const DENSITY_KEYS = ["small", "medium", "large"];
    const DENSITY_H = { small: 30, medium: 36, large: 44 };
    const densityIdx = ref(Math.max(0, DENSITY_KEYS.indexOf(props.density)));
    const DENSITY_LABELS = computed(() => [t("densSmall"), t("densMedium"), t("densLarge")]);
    const prefersDark = ref(false);
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      prefersDark.value = mq.matches;
      (_a = mq.addEventListener) == null ? void 0 : _a.call(mq, "change", (e) => prefersDark.value = e.matches);
    }
    const hostDark = ref(null);
    function readHostClass() {
      if (typeof document === "undefined")
        return;
      const cl = document.documentElement.classList;
      if (cl.contains("dark"))
        hostDark.value = true;
      else if (cl.contains("light"))
        hostDark.value = false;
      else
        hostDark.value = null;
    }
    if (props.detectHostTheme)
      readHostClass();
    let hostThemeMo = null;
    onMounted(() => {
      if (!props.detectHostTheme || typeof MutationObserver === "undefined")
        return;
      readHostClass();
      hostThemeMo = new MutationObserver(readHostClass);
      hostThemeMo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    });
    onBeforeUnmount(() => {
      hostThemeMo == null ? void 0 : hostThemeMo.disconnect();
      hostThemeMo = null;
    });
    function themeFromProp(t2) {
      if (!t2)
        return {};
      if (typeof t2 === "string")
        return { mode: t2 };
      return { ...t2 };
    }
    const themeState = ref(themeFromProp(props.theme));
    watch(
      () => props.theme,
      (t2) => themeState.value = themeFromProp(t2),
      { deep: true }
    );
    const themeMode = computed(
      () => resolveMode(
        themeState.value.mode,
        prefersDark.value,
        props.detectHostTheme ? hostDark.value : null
      )
    );
    const themeVars = computed(() => buildThemeVars({ ...themeState.value, mode: themeMode.value }));
    const dark = computed(() => themeMode.value === "dark");
    function toggleDark() {
      themeState.value = { ...themeState.value, mode: dark.value ? "light" : "dark" };
    }
    const langRef = ref(props.lang);
    watch(
      () => props.lang,
      (v) => langRef.value = v
    );
    const localeOverride = ref(props.localeText ? { ...props.localeText } : null);
    watch(
      () => props.localeText,
      (v) => localeOverride.value = v ? { ...v } : null,
      { deep: true }
    );
    const messages = computed(() => resolveMessages(langRef.value, localeOverride.value));
    const t = (key, params) => translate(messages.value, key, params);
    provide(RJ_LOCALE_KEY, t);
    const BOOL_LABELS = computed(() => [t("yesVal"), t("noVal")]);
    const rowHeight = computed(() => DENSITY_H[DENSITY_KEYS[densityIdx.value]]);
    const headerRowHeight = computed(() => rowHeight.value);
    const rootClass = computed(() => [
      dark.value ? "rj--dark" : "",
      `rj--${DENSITY_KEYS[densityIdx.value]}`
    ]);
    const rootStyle = computed(() => ({
      height: typeof props.height === "number" ? props.height + "px" : props.height,
      ...themeVars.value
    }));
    const slots = useSlots();
    const resolvedIcons = computed(() => mergeIcons(props.icons));
    provide(RJ_ICONS_KEY, resolvedIcons);
    const pagerSize = ref(props.pageSize);
    const pagerPage = ref(1);
    const showPager = computed(() => props.dataMode === "pagination" && !!props.loadData);
    const pagerAtTop = computed(() => showPager.value && props.pagerPosition !== "bottom");
    const pagerAtBottom = computed(() => showPager.value && props.pagerPosition !== "top");
    const cellFormulas = /* @__PURE__ */ new Map();
    const rowModel = useRowModel(() => props.rows, {
      rowKey: () => props.rowKey,
      rowHeight: () => rowHeight.value,
      detailHeight: () => props.detailHeight,
      fullWidthHeight: () => props.fullWidthHeight,
      hasDetailSlot: () => !!slots["row-detail"],
      groupFooter: () => !!props.groupFooter,
      // 组行标题拿被分组列的 formatter 转成显示文本（客户端分组）：不能让组行显示「1(60)」
      // 而行内单元格显示「目录」——同一件事在同一行上出现两种口径。列缺失或没 formatter 时原样返回。
      groupLabelOf: (col, value, row) => (col == null ? void 0 : col.formatter) ? displayOf(col, value, row, 0) : value,
      serverGrouping: () => !!props.serverSideGrouping,
      isServerSideGroup: props.isServerSideGroup,
      isFullWidthRow: (r) => {
        var _a2;
        return slots["full-row"] ? ((_a2 = props.fullWidthRow) == null ? void 0 : _a2.call(props, r)) ?? false : false;
      },
      loadData: (p) => props.loadData(p),
      dataMode: () => props.dataMode,
      pageSize: () => pagerSize.value,
      treeData: () => !!props.treeData,
      childrenField: () => props.childrenField,
      parentField: () => props.parentField,
      ssrmBlockSize: () => props.ssrmBlockSize,
      ssrmMaxBlocks: () => props.ssrmMaxBlocksInCache,
      ssrmOverflow: () => props.ssrmCacheOverflow,
      labels: () => ({
        total: t("summaryTotal"),
        grandTotal: t("grandTotal"),
        totalOf: (title) => t("summaryOf", { title })
      }),
      formulaColumns: () => (
        // 公式上下文含隐藏列：公式引用的是数据字段，不该因为依赖列没显示而降级成 #NAME?
        formulaColumnContext(
          gridCols.value.map((l) => l.col),
          colState.listLeafColumns(),
          (id) => colState.isColumnHidden(id),
          pivotActive.value
        )
      ),
      cellFormulas: () => cellFormulas
    });
    rowModel.defaultExpandAll.value = props.defaultExpandAll;
    {
      const sorts = [];
      const groups = [];
      const pcols = [];
      const walkInit = (list) => list.forEach((c) => {
        var _a2;
        if ((_a2 = c.children) == null ? void 0 : _a2.length)
          walkInit(c.children);
        else {
          if (c.initialSort && (c.field || c.colId))
            sorts.push({ field: c.field || colIdOf(c), dir: c.initialSort });
          if (c.initialRowGroup && c.field)
            groups.push(c.field);
          if (c.initialPivot && c.field)
            pcols.push(c.field);
        }
      });
      walkInit(props.columns);
      if (sorts.length)
        rowModel.sortStates.value = sorts;
      if (groups.length)
        rowModel.rowGroupFields.value = groups;
      if (pcols.length)
        rowModel.pivotState.value = { ...rowModel.pivotState.value, cols: pcols, active: true };
    }
    const rowDragEnabled = computed(() => !!props.rowDraggable && props.dataMode !== "serverSide");
    const pivotColumns = computed(() => rowModel.pivotCols(props.columns));
    const userColumns = computed(() => {
      const cols = [];
      if (props.rowSelection)
        cols.push({
          colId: "__check",
          checkbox: true,
          width: 44,
          fixed: "left",
          title: "",
          suppressSort: true,
          suppressMenu: true,
          headerClass: "rj-hcell-ctl",
          filter: false
        });
      if (rowDragEnabled.value)
        cols.push({
          colId: "__drag",
          rowDrag: true,
          width: 34,
          fixed: "left",
          title: "",
          suppressSort: true,
          suppressMenu: true,
          headerClass: "rj-hcell-ctl",
          filter: false
        });
      cols.push(...pivotColumns.value.length ? pivotColumns.value : props.columns);
      return cols;
    });
    const colState = useColumnState(() => userColumns.value);
    const layout = computed(() => colState.computeLayout());
    const gridCols = computed(() => [
      ...layout.value.leftLeaves,
      ...layout.value.normalLeaves,
      ...layout.value.rightLeaves
    ]);
    const anchorColId = computed(() => {
      for (const leaf of gridCols.value) {
        if (!leaf.col.checkbox && !leaf.col.rowDrag)
          return leaf.colId;
      }
      return "";
    });
    const headerRowsInfo = computed(() => colState.computeHeaderRows());
    const pipelineCols = computed(() => colState.listLeafColumns());
    watch(pipelineCols, (v) => rowModel.setPipelineColumns(v), { immediate: true });
    const queryConditions = rowModel.queryConditions;
    const queryFieldDefs = computed(
      () => withCarrierOptions(deriveQueryFields(userColumns.value, props.queryFields), colOptionsIndex.value)
    );
    const savedViews = useSavedViews(
      () => props.stateKey,
      () => props.builtinViews
    );
    const currentViewId = ref("");
    const viewMgrRef = ref();
    const activeQueryCount = computed(
      () => queryConditions.value.filter((c) => queryCondFilled(c)).length
    );
    const liveColCount = computed(() => gridCols.value.filter((l) => !isInternalColKey(l.colId)).length);
    function queryCondFilled(c) {
      if (c.operator === "between") {
        if (Array.isArray(c.value))
          return c.value.some(filled);
        return filled(c.value1) || filled(c.value2);
      }
      if (Array.isArray(c.value))
        return c.value.length > 0;
      return filled(c.value);
    }
    function filled(v) {
      return v !== void 0 && v !== null && v !== "";
    }
    function onQuerySearch() {
      rowModel.touch();
      if (props.dataMode !== "client" && props.loadData) {
        if (props.dataMode === "pagination")
          pagerPage.value = 1;
        if (props.dataMode === "serverSide")
          reloadServerSide();
        else
          rowModel.reloadServer();
      }
      scheduleSave();
      emit("filter-change");
      dispatchEvent("filterChanged", {});
    }
    function onQueryReset() {
      const cur = savedViews.views.value.find((v) => v.id === currentViewId.value);
      queryConditions.value = cur ? cloneConditions(cur.conditions || []) : [];
      onQuerySearch();
    }
    function applyView(v, viewId) {
      var _a2;
      const view = "conditions" in v ? v : null;
      const conds = view ? view.conditions : v;
      queryConditions.value = cloneConditions(conds || []);
      if ((_a2 = view == null ? void 0 : view.columns) == null ? void 0 : _a2.length)
        colState.applyColumnState(view.columns);
      const gs = view == null ? void 0 : view.gridState;
      rowModel.sortStates.value = ((gs == null ? void 0 : gs.sort) || []).map((s) => ({ ...s }));
      rowModel.rowGroupFields.value = ((gs == null ? void 0 : gs.rowGroup) || []).slice();
      if (viewId !== void 0)
        currentViewId.value = viewId;
      rowModel.touch();
      if (props.dataMode !== "client" && props.loadData) {
        syncServerCtx();
        if (props.dataMode === "pagination")
          pagerPage.value = 1;
        if (props.dataMode === "serverSide")
          reloadServerSide();
        else
          rowModel.reloadServer();
      }
      scheduleSave();
      emit("filter-change");
    }
    function cloneConditions(list) {
      return list.map((c) => ({ ...c, value: Array.isArray(c.value) ? c.value.slice() : c.value }));
    }
    function onSelectView(id) {
      const v = savedViews.views.value.find((x) => x.id === id);
      if (v)
        applyView(v, id);
    }
    function onSaveView(payload) {
      const view = {
        id: payload.id || newViewId(),
        name: payload.name,
        queryFields: queryConditions.value.map((c) => c.field),
        conditions: cloneConditions(queryConditions.value),
        columns: colState.getColumnState(),
        gridState: {
          sort: rowModel.sortStates.value.map((s) => ({ ...s })),
          rowGroup: rowModel.rowGroupFields.value.slice()
        },
        createTime: Date.now()
      };
      savedViews.upsert(view);
      currentViewId.value = view.id;
      emit("view-change", view);
      dispatchEvent("savedViewChanged", { id: view.id, name: view.name });
    }
    function onDeleteView(id) {
      savedViews.remove(id);
      const rest = savedViews.views.value;
      if (rest.length)
        applyView(rest[0], rest[0].id);
      else
        currentViewId.value = "";
    }
    function onSaveViewFromBar() {
      var _a2, _b;
      (_b = (_a2 = viewMgrRef.value) == null ? void 0 : _a2.openNew) == null ? void 0 : _b.call(_a2);
    }
    watch(queryFieldDefs, (defs) => {
      const pool = new Set(defs.map((d) => d.field));
      if (queryConditions.value.some((c) => !pool.has(c.field))) {
        queryConditions.value = queryConditions.value.filter((c) => pool.has(c.field));
      }
    });
    const quickPop = ref(null);
    const quickInputRef = ref();
    function toggleQuickPop(ev) {
      tip.value = null;
      if (quickPop.value) {
        quickPop.value = null;
        return;
      }
      menu.value = null;
      colMenu.value = null;
      filterMenu.value = null;
      const el = ev.currentTarget;
      const r = el.getBoundingClientRect();
      const rb = (el.closest(".rj-tool-block") ?? el).getBoundingClientRect();
      const x = Math.max(8, Math.min(r.right - 240, window.innerWidth - 248));
      const est = 56;
      quickPop.value = {
        x,
        y: rb.bottom + 6 + est > window.innerHeight - 8 ? Math.max(8, rb.top - est - 6) : rb.bottom + 6
      };
      nextTick(() => {
        var _a2;
        return (_a2 = quickInputRef.value) == null ? void 0 : _a2.focus();
      });
    }
    function openViewMenu(ev) {
      menu.value = null;
      colMenu.value = null;
      filterMenu.value = null;
      quickPop.value = null;
      const views = savedViews.views.value;
      const cur = views.find((v) => v.id === currentViewId.value) || null;
      const items = [];
      views.forEach((v) => {
        items.push({
          name: (v.id === currentViewId.value ? "✓ " : v.builtin ? "★ " : "") + v.name,
          action: () => onSelectView(v.id)
        });
      });
      if (!views.length)
        items.push({ name: t("viewNone"), disabled: () => true });
      items.push({ isSeparator: true });
      items.push({ name: t("viewSaveNew"), action: () => onSaveViewFromBar() });
      items.push({
        name: t("viewUpdate"),
        disabled: () => !cur || !!cur.builtin,
        action: () => cur && !cur.builtin && onSaveView({ id: cur.id, name: cur.name })
      });
      items.push({
        name: t("viewDelete"),
        disabled: () => !cur || !!cur.builtin,
        action: () => cur && !cur.builtin && onDeleteView(cur.id)
      });
      const el = ev.currentTarget;
      const r = el.getBoundingClientRect();
      const rb = (el.closest(".rj-tool-block") ?? el).getBoundingClientRect();
      const x = Math.max(8, Math.min(r.right - 200, window.innerWidth - 210));
      openMenuAt(x, rb.bottom + 6, items, rb.top);
    }
    function seedDefaultQuery() {
      if (!props.queryable || queryConditions.value.length)
        return;
      const defs = queryFieldDefs.value;
      if (!defs.length)
        return;
      const first = defs.find((d) => d.kind === "text") || defs[0];
      queryConditions.value = [
        {
          field: first.field,
          operator: defaultQueryOperator(first.kind || "text"),
          value: void 0,
          valueText: ""
        }
      ];
    }
    watch(queryConditions, (list) => {
      if (props.queryable && list.length === 0)
        seedDefaultQuery();
    });
    const rowFormCfg = computed(() => typeof props.rowForm === "object" ? props.rowForm : void 0);
    const rowFormDlg = ref(null);
    const confirmDlg = ref(null);
    const rowJsonDlg = ref(null);
    function openRowForm(rows) {
      if (props.rowForm === false)
        return;
      const rs = rows && rows.length ? rows : selectedRows();
      if (!rs.length)
        return;
      rowFormDlg.value = {
        rows: rs,
        mode: "edit",
        fields: buildFormFields(pipelineCols.value, rowFormCfg.value, rs)
      };
    }
    function openRowFormAdd(preset) {
      if (props.rowForm === false)
        return;
      const cfg = rowFormCfg.value;
      const sample = [preset || {}];
      rowFormDlg.value = {
        rows: sample,
        mode: "add",
        preset,
        fields: buildFormFields(
          pipelineCols.value,
          (cfg == null ? void 0 : cfg.addColumns) ? { ...cfg, columns: cfg.addColumns } : cfg,
          sample
        )
      };
    }
    function onRowFormSubmit(changes) {
      const dlg = rowFormDlg.value;
      rowFormDlg.value = null;
      if (!dlg)
        return;
      if (dlg.mode === "add") {
        const row = createFormRow(dlg.preset, changes);
        emit("row-form-add", { row, changes });
        rowModel.applyTransaction({ add: [row] });
        scheduleSave();
        emit("row-form-submit", { rows: [row], changes, mode: "add" });
        return;
      }
      applyFormChanges(dlg.rows, changes);
      rowModel.applyTransaction({ update: dlg.rows.slice() });
      scheduleSave();
      emit("row-form-submit", { rows: dlg.rows, changes, mode: "edit" });
    }
    function runQueryAction(a) {
      const rows = selectedRows();
      if (queryActionDisabled(a, rows))
        return;
      const ctx = { rows, api: apiObj, openRowForm, openRowFormAdd };
      const msg = queryActionConfirm(a, rows);
      if (msg)
        confirmDlg.value = { message: msg, onOk: () => void a.onClick(ctx) };
      else
        void a.onClick(ctx);
    }
    function onConfirmOk() {
      const d = confirmDlg.value;
      confirmDlg.value = null;
      d == null ? void 0 : d.onOk();
    }
    const levelCells = computed(() => {
      const leafX = /* @__PURE__ */ new Map();
      gridCols.value.forEach((l) => leafX.set(l.colId, { x: l.x, width: l.width }));
      return headerRowsInfo.value.rows.map(
        (level) => level.map((cell) => {
          if (!cell.isGroup) {
            const g = leafX.get(cell.colId);
            return {
              col: cell.col,
              colId: cell.colId,
              x: (g == null ? void 0 : g.x) ?? 0,
              width: (g == null ? void 0 : g.width) ?? 120,
              isGroup: false
            };
          }
          const kids = collectGroupLeafIds(cell.col);
          const xs = kids.map((k) => leafX.get(k)).filter(Boolean);
          if (!xs.length)
            return {
              col: cell.col,
              colId: cell.colId,
              x: 0,
              width: cell.col.width ?? 120,
              isGroup: true
            };
          const min = Math.min(...xs.map((v) => v.x));
          const max = Math.max(...xs.map((v) => v.x + v.width));
          return { col: cell.col, colId: cell.colId, x: min, width: max - min, isGroup: true };
        })
      );
    });
    function collectGroupLeafIds(col) {
      const out = [];
      const walk = (c) => {
        var _a2;
        if ((_a2 = c.children) == null ? void 0 : _a2.length)
          c.children.forEach(walk);
        else
          out.push(colIdOf(c));
      };
      walk(col);
      return out;
    }
    const rootRef = ref();
    const scrollerRef = ref();
    const bodyWrapRef = ref();
    const scrollLeft = ref(0);
    const scrollTop = ref(0);
    const viewportW = ref(800);
    const viewportH = ref(400);
    const headerTotalHeight = computed(() => headerRowsInfo.value.depth * headerRowHeight.value);
    const windowRange = computed(() => {
      const rows = rowModel.processed.value.displayRows;
      const offs = rowModel.offsets.value;
      const h2 = rowHeight.value;
      const st = scrollTop.value;
      if (!rows.length)
        return { start: 0, end: 0 };
      let start = Math.max(lowerBound(offs, st, (i) => offs[i]) - 2, 0);
      let end = start;
      while (end < rows.length && (offs[end] ?? 0) < st + viewportH.value + h2)
        end++;
      return { start, end: Math.min(end + 2, rows.length) };
    });
    const visibleRows = computed(() => {
      const rows = rowModel.processed.value.displayRows;
      const offs = rowModel.offsets.value;
      const out = [];
      for (let i = windowRange.value.start; i < windowRange.value.end; i++) {
        const row = rows[i];
        if (row)
          out.push({ row, i, top: offs[i] });
      }
      return out;
    });
    const windowLeaves = computed(() => {
      const normal = layout.value.normalLeaves;
      if (!layout.value.virtualCols)
        return normal;
      const xs = normal.map((l) => l.x);
      const sl = scrollLeft.value;
      const start = Math.max(lowerBound(xs, sl, (i) => xs[i]) - 3, 0);
      let end = start;
      while (end < normal.length && normal[end].x < sl + viewportW.value)
        end++;
      return normal.slice(start, Math.min(end + 3, normal.length));
    });
    watch(
      () => {
        var _a2, _b;
        return [
          (_a2 = windowLeaves.value[0]) == null ? void 0 : _a2.colId,
          (_b = windowLeaves.value[windowLeaves.value.length - 1]) == null ? void 0 : _b.colId,
          windowLeaves.value.length
        ];
      },
      (v, o) => {
        if (o && v[0] === o[0] && v[1] === o[1] && v[2] === o[2])
          return;
        dispatchEvent("virtualColumnsChanged", { colIds: windowLeaves.value.map((l) => l.colId) });
      }
    );
    function onScrollRaw() {
      const el = scrollerRef.value;
      if (el)
        syncFixedCanvas(el.scrollTop);
      onScroll();
    }
    const onScroll = throttleRaf(() => {
      const el = scrollerRef.value;
      if (!el)
        return;
      if (el.clientHeight > 0 && el.clientHeight !== viewportH.value)
        measure();
      scrollLeft.value = el.scrollLeft;
      scrollTop.value = el.scrollTop;
      syncFixedCanvas(el.scrollTop);
      if (props.dataMode === "infinite" && el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight - 300) {
        rowModel.fetchMore();
      }
      if (props.dataMode === "serverSide") {
        const wr = windowRange.value;
        rowModel.ensureServerBlocks(wr.start, Math.max(wr.start, wr.end - 1));
      }
    });
    function forwardWheel(e) {
      const el = scrollerRef.value;
      if (el)
        el.scrollTop += e.deltaY;
    }
    let ro = null;
    const measure = () => {
      const el = scrollerRef.value;
      if (!el)
        return;
      viewportW.value = el.clientWidth;
      viewportH.value = el.clientHeight;
      colState.setViewportWidth(el.clientWidth);
      colState.setSuppressVirtual(!!props.suppressVirtualCols);
    };
    const selection = reactive(/* @__PURE__ */ new Set());
    const preserveMap = reactive(/* @__PURE__ */ new Map());
    function toggleRowKey(d) {
      if (d.type === "group" && groupCheckEnabled.value) {
        const keys = groupDescKeys.value.get(d.key) || [];
        const allSel = keys.length > 0 && keys.every((k) => selection.has(k));
        if (allSel)
          keys.forEach((k) => selection.delete(k));
        else
          keys.forEach((k) => selection.add(k));
        if (props.keepSelectionCrossPage) {
          const dataByKey = new Map(rowModel.processed.value.displayRows.map((r) => [r.key, r.data]));
          keys.forEach((k) => {
            if (selection.has(k)) {
              const dr = dataByKey.get(k);
              if (dr)
                preserveMap.set(k, dr);
            } else
              preserveMap.delete(k);
          });
        }
        notifySelection();
        return;
      }
      if (props.rowSelection === "single") {
        selection.clear();
        selection.add(d.key);
      } else if (selection.has(d.key))
        selection.delete(d.key);
      else
        selection.add(d.key);
      if (props.keepSelectionCrossPage) {
        if (selection.has(d.key))
          preserveMap.set(d.key, d.data);
        else
          preserveMap.delete(d.key);
      }
      notifySelection();
    }
    function selectRowByClick(d) {
      if (selection.size === 1 && selection.has(d.key))
        return;
      selection.clear();
      if (props.keepSelectionCrossPage)
        preserveMap.clear();
      selection.add(d.key);
      if (props.keepSelectionCrossPage)
        preserveMap.set(d.key, d.data);
      notifySelection();
    }
    function selectedRows() {
      const rows = rowModel.processed.value.displayRows.filter((d) => selection.has(d.key)).map((d) => d.data);
      Array.from(preserveMap.values()).forEach((r) => {
        if (!rows.includes(r))
          rows.push(r);
      });
      return rows;
    }
    const dataDisplayRows = computed(
      () => rowModel.processed.value.displayRows.filter((d) => d.type === "row")
    );
    const showExpandCollapse = computed(
      () => props.groupable && rowModel.processed.value.displayRows.length > 0 && (!!props.treeData || rowGroupFields.value.length > 0)
    );
    const groupCheckEnabled = computed(
      () => !!props.groupSelectsChildren && props.rowSelection === "multiple" && !!rowModel.rowGroupFields.value.length
    );
    const groupDescKeys = computed(() => {
      const map = /* @__PURE__ */ new Map();
      if (!groupCheckEnabled.value)
        return map;
      const rows = rowModel.processed.value.displayRows;
      const byParent = /* @__PURE__ */ new Map();
      rows.forEach((r) => {
        if (r.parentKey == null)
          return;
        const a = byParent.get(r.parentKey) || [];
        a.push(r);
        byParent.set(r.parentKey, a);
      });
      rows.forEach((g) => {
        if (g.type !== "group")
          return;
        const keys = [];
        const st = [g.key];
        while (st.length) {
          const k = st.pop();
          (byParent.get(k) || []).forEach((ch) => {
            if (ch.type === "row")
              keys.push(ch.key);
            else if (ch.type === "group")
              st.push(ch.key);
          });
        }
        map.set(g.key, keys);
      });
      return map;
    });
    function groupCheckedState(key) {
      const keys = groupDescKeys.value.get(key) || [];
      let sel = 0;
      for (const k of keys)
        if (selection.has(k))
          sel++;
      return {
        checked: keys.length > 0 && sel === keys.length,
        indeterminate: sel > 0 && sel < keys.length
      };
    }
    const allChecked = computed(
      () => dataDisplayRows.value.length > 0 && dataDisplayRows.value.every((d) => selection.has(d.key))
    );
    const someChecked = computed(
      () => !allChecked.value && dataDisplayRows.value.some((d) => selection.has(d.key))
    );
    function toggleAll() {
      if (allChecked.value)
        dataDisplayRows.value.forEach((d) => {
          selection.delete(d.key);
          if (props.keepSelectionCrossPage)
            preserveMap.delete(d.key);
        });
      else
        dataDisplayRows.value.forEach((d) => {
          selection.add(d.key);
          if (props.keepSelectionCrossPage)
            preserveMap.set(d.key, d.data);
        });
      notifySelection();
    }
    const rowGroupFields = computed(() => rowModel.rowGroupFields.value);
    const pivotState = computed(() => rowModel.pivotState.value);
    function onSort(colId, field, additive) {
      if (!field)
        return;
      const cur = rowModel.sortStates.value;
      const idx = cur.findIndex((s) => s.field === colId || s.field === field);
      let next;
      if (idx >= 0) {
        const dir = cur[idx].dir === "asc" ? "desc" : cur[idx].dir === "desc" ? null : "asc";
        next = cur.slice();
        if (dir)
          next[idx] = { field, dir };
        else
          next.splice(idx, 1);
      } else {
        next = additive ? [...cur, { field, dir: "asc" }] : [{ field, dir: "asc" }];
      }
      rowModel.sortStates.value = next;
      rowModel.touch();
      emit("sort-change", next);
      dispatchEvent("sortChanged", { sort: next });
      scheduleSave();
    }
    const activeFilterIds = computed(() => {
      const ids = Array.from(rowModel.filterModels.keys());
      rowModel.floatFilters.forEach((v, id) => {
        if (v && v.trim() && !ids.includes(id))
          ids.push(id);
      });
      return ids;
    });
    function opLabelOf(type, op) {
      var _a2;
      const o = (_a2 = FILTER_OPS[type]) == null ? void 0 : _a2.find((x) => x.value === op);
      if (!o)
        return op;
      const s = t(o.labelKey);
      return s === o.labelKey ? o.label : s;
    }
    function filterModelText(m) {
      const parts = m.conditions.map((c) => {
        if (c.op === "blank" || c.op === "notBlank")
          return opLabelOf(m.type, c.op);
        const range = c.value2 != null && c.value2 !== "";
        const v = range ? `${c.value1 ?? ""} ~ ${c.value2}` : `${c.value1 ?? ""}`;
        return `${opLabelOf(m.type, c.op)} ${v}`;
      });
      return parts.join(m.operator === "and" ? t("andOp") : t("orOp"));
    }
    const colTitleById = computed(() => {
      const o = {};
      gridCols.value.forEach((l) => o[l.colId] = l.col.title || l.colId);
      return o;
    });
    const aggRev = ref(0);
    const panelCandidateLeaves = computed(() => {
      void aggRev.value;
      return collectLeaves(props.columns).filter((c) => !c.checkbox && !c.rowDrag).map((c) => ({
        col: c,
        colId: colIdOf(c),
        field: c.field,
        title: c.title,
        hidden: !!c.hidden || c.visible === false,
        pinned: c.fixed === "left" ? "left" : c.fixed === "right" ? "right" : null,
        aggFunc: c.aggFunc
      }));
    });
    const panelFilters = computed(() => {
      const out = [];
      rowModel.filterModels.forEach(
        (m, id) => out.push({
          colId: id,
          kind: "column",
          title: colTitleById.value[id] || id,
          text: filterModelText(m)
        })
      );
      rowModel.floatFilters.forEach((v, id) => {
        if (v && v.trim())
          out.push({ colId: id, kind: "float", title: colTitleById.value[id] || id, text: v });
      });
      const adv = rowModel.advancedFilter.value;
      if (adv && countAdvConditions(adv) > 0)
        out.push({
          colId: "__advanced__",
          kind: "advanced",
          title: t("advFilterTitle"),
          text: t("advConditions", { n: countAdvConditions(adv), op: adv.operator.toUpperCase() })
        });
      return out;
    });
    function removePanelFilter(colId, kind) {
      if (kind === "advanced")
        rowModel.advancedFilter.value = null;
      else if (kind === "column")
        rowModel.filterModels.delete(colId);
      else {
        rowModel.floatFilters.delete(colId);
        delete floatInput[colId];
      }
      rowModel.touch();
      emit("filter-change");
      dispatchEvent("filterChanged", {});
      scheduleSave();
    }
    function clearAllPanelFilters() {
      rowModel.filterModels.clear();
      rowModel.floatFilters.clear();
      rowModel.advancedFilter.value = null;
      rowModel.quickFilter.value = "";
      commitFloat.cancel();
      commitQuick.cancel();
      syncFloatInput();
      rowModel.touch();
      emit("filter-change");
      dispatchEvent("filterChanged", {});
      scheduleSave();
    }
    const gridRole = computed(
      () => props.treeData || rowGroupFields.value.length ? "treegrid" : "grid"
    );
    const ariaRowCount = computed(
      () => rowModel.processed.value.displayRows.length + headerRowsInfo.value.depth
    );
    const ariaColCount = computed(() => gridCols.value.length);
    const frowH = computed(() => props.floatingFilters ? FROW_H : 0);
    const floatInput = reactive({});
    function syncFloatInput() {
      Object.keys(floatInput).forEach((k) => delete floatInput[k]);
      rowModel.floatFilters.forEach((v, k) => floatInput[k] = v);
    }
    const floatValuesObj = computed(() => ({ ...floatInput }));
    const floatSig = computed(
      () => Array.from(rowModel.floatFilters.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => k + "=" + v).join("&")
    );
    const commitFloat = debounce(() => {
      const cur = new Set(Object.keys(floatInput).filter((k) => floatInput[k]));
      rowModel.floatFilters.forEach((_v, k) => {
        if (!cur.has(k))
          rowModel.floatFilters.delete(k);
      });
      cur.forEach((k) => rowModel.floatFilters.set(k, floatInput[k]));
      rowModel.touch();
      emit("filter-change");
      dispatchEvent("filterChanged", {});
      scheduleSave();
    }, 200);
    function onFloatFilter(colId, value) {
      if (value)
        floatInput[colId] = value;
      else
        delete floatInput[colId];
      commitFloat();
    }
    syncFloatInput();
    const filterMenu = ref(null);
    function openFilter(cell, el) {
      var _a2;
      const col = cell.col;
      const type = rowModel.filterTypeOf(col);
      let unique = [];
      if (type === "select") {
        const optList = colOptionList(col);
        if (optList && optList.length) {
          unique = flattenOptions(optList).map((o) => String(o.value));
        } else {
          unique = Array.from(
            new Set(
              rowModel.sourceRows().slice(0, 5e3).map((r) => cellRawValue(col, r)).filter((v) => v != null)
            )
          ).map(String);
        }
      }
      const targetRect = el.target.getBoundingClientRect();
      const rootRect = (_a2 = rootRef.value) == null ? void 0 : _a2.getBoundingClientRect();
      const menuW = 260;
      filterMenu.value = {
        col,
        type,
        model: rowModel.filterModels.get(colIdOf(col)) || null,
        x: Math.max(
          Math.min(targetRect.left - ((rootRect == null ? void 0 : rootRect.left) || 0), ((rootRect == null ? void 0 : rootRect.width) || 400) - menuW),
          4
        ),
        y: targetRect.bottom - ((rootRect == null ? void 0 : rootRect.top) || 0) + 4,
        unique
      };
    }
    function applyFilterMenu(model) {
      if (!filterMenu.value)
        return;
      const colId = colIdOf(filterMenu.value.col);
      rowModel.filterModels.set(colId, model);
      rowModel.touch();
      filterMenu.value = null;
      emit("filter-change");
      dispatchEvent("filterChanged", { colId });
      scheduleSave();
    }
    function clearFilterMenu() {
      if (!filterMenu.value)
        return;
      const colId = colIdOf(filterMenu.value.col);
      rowModel.filterModels.delete(colId);
      rowModel.touch();
      filterMenu.value = null;
      emit("filter-change");
      dispatchEvent("filterChanged", { colId });
      scheduleSave();
    }
    const advDialog = ref(null);
    const advFilterColumns = computed(
      () => gridCols.value.filter((l) => !l.col.checkbox && !l.col.rowDrag).map((l) => ({
        colId: l.colId,
        title: l.col.title || l.colId,
        filterType: rowModel.filterTypeOf(l.col)
      }))
    );
    function openAdvancedFilter() {
      var _a2;
      filterMenu.value = null;
      colMenu.value = null;
      const rootRect = (_a2 = rootRef.value) == null ? void 0 : _a2.getBoundingClientRect();
      advDialog.value = {
        x: Math.max(((rootRect == null ? void 0 : rootRect.width) || 400) - 460, 8),
        y: 44
      };
    }
    function applyAdvancedFilter(model) {
      rowModel.advancedFilter.value = model;
      rowModel.touch();
      advDialog.value = null;
      emit("filter-change");
      dispatchEvent("advancedFilterChanged", { model });
      dispatchEvent("filterChanged", {});
      scheduleSave();
    }
    function clearAdvancedFilter() {
      rowModel.advancedFilter.value = null;
      rowModel.touch();
      advDialog.value = null;
      emit("filter-change");
      dispatchEvent("advancedFilterChanged", { model: null });
      dispatchEvent("filterChanged", {});
      scheduleSave();
    }
    const quickInput = ref(rowModel.quickFilter.value);
    const commitQuick = debounce((v) => {
      rowModel.quickFilter.value = v;
      rowModel.touch();
      scheduleSave();
    }, 180);
    watch(quickInput, (v) => commitQuick(v));
    watch(
      () => rowModel.quickFilter.value,
      (v) => {
        if (v !== quickInput.value)
          quickInput.value = v;
      }
    );
    const editing = ref(null);
    const dirtyMap = ref(/* @__PURE__ */ new Map());
    function dirtyKey(data, colId) {
      return rowKeyOf(data, props.rowKey) + "::" + colId;
    }
    function markDirty(data, colId, oldValue, newValue) {
      if (!props.markDirtyCells)
        return;
      const k = dirtyKey(data, colId);
      const orig = dirtyMap.value.has(k) ? dirtyMap.value.get(k).orig : oldValue;
      if (Object.is(newValue, orig))
        dirtyMap.value.delete(k);
      else
        dirtyMap.value.set(k, { orig, data, colId });
    }
    const interaction = useInteraction({
      gridCols: () => gridCols.value,
      displayRows: () => rowModel.processed.value.displayRows,
      offsets: () => rowModel.offsets.value,
      rowHeight: () => rowHeight.value,
      getCellValue: (row, c) => {
        const leaf = gridCols.value[c];
        return leaf ? cellRawValue(leaf.col, row) : void 0;
      },
      // 复制/查找用文本视图：图片列取文件名，避免整段 data URI 进剪贴板或被匹配
      getCellText: (row, c) => {
        const leaf = gridCols.value[c];
        return leaf ? exportRaw(leaf.col, cellRawValue(leaf.col, row)) : void 0;
      },
      setCellValue: (row, colId, v) => {
        const col = pipelineCols.value.find((c) => colIdOf(c) === colId);
        if (col)
          rowModel.setRowValue(row, col, v);
      },
      isCellEditable: (row, c) => {
        var _a2;
        return isEditable(row, (_a2 = gridCols.value[c]) == null ? void 0 : _a2.col);
      },
      startEdit: (r, c) => startEdit(r, c),
      scrollToCell: (r, c) => {
        var _a2;
        return apiObj.scrollTo(r, (_a2 = gridCols.value[c]) == null ? void 0 : _a2.colId);
      },
      viewportSize: () => ({ w: viewportW.value, h: viewportH.value }),
      gridLeft: () => {
        var _a2;
        return ((_a2 = rootRef.value) == null ? void 0 : _a2.getBoundingClientRect().left) || 0;
      },
      gridTop: () => {
        var _a2;
        return ((_a2 = rootRef.value) == null ? void 0 : _a2.getBoundingClientRect().top) || 0;
      },
      onCellsChanged: (ps) => {
        emit("cells-changed", ps);
        ps.forEach((p) => {
          emit("cell-value-changed", p);
          markDirty(p.row, p.colId, p.oldValue, p.newValue);
        });
        recordEdit(
          ps.map((p) => ({
            target: p.row,
            field: p.colId,
            oldValue: p.oldValue,
            newValue: p.newValue
          }))
        );
        scheduleSave();
      },
      copyHeaders: () => !!props.copyHeadersToClipboard,
      pasteTransformer: (t2) => props.pasteTransformer ? props.pasteTransformer(t2) : t2
    });
    interaction.bindScroll(() => ({ top: scrollTop.value, left: scrollLeft.value }));
    watch(editing, (v) => interaction.editingRef.value = !!v);
    const findOpen = interaction.findOpen;
    const findQuery = interaction.findQuery;
    const findMatches = interaction.findMatches;
    const findActive = interaction.findActive;
    const gotoMatch = interaction.gotoMatch;
    const findInputRef = ref();
    watch(findOpen, (v) => {
      if (v)
        nextTick(() => {
          var _a2;
          return (_a2 = findInputRef.value) == null ? void 0 : _a2.select();
        });
      else
        nextTick(() => {
          var _a2;
          return (_a2 = rootRef.value) == null ? void 0 : _a2.focus();
        });
    });
    const rangeRect = interaction.rangeRect;
    watch(
      () => interaction.range.value,
      (r) => {
        var _a2, _b;
        dispatchEvent("rangeSelectionChanged", {
          ranges: r ? [
            {
              startRow: r.start.r,
              endRow: r.end.r,
              startColumn: (_a2 = gridCols.value[r.start.c]) == null ? void 0 : _a2.colId,
              endColumn: (_b = gridCols.value[r.end.c]) == null ? void 0 : _b.colId
            }
          ] : []
        });
      }
    );
    function fmtStatNum(n) {
      if (!isFinite(n))
        return "-";
      if (Number.isInteger(n))
        return n.toLocaleString();
      return (Math.round(n * 1e4) / 1e4).toLocaleString(void 0, { maximumFractionDigits: 4 });
    }
    const pivotActive = computed(
      () => rowModel.pivotState.value.active && rowModel.pivotState.value.cols.length > 0
    );
    const totalRowCount = computed(() => {
      if (props.dataMode === "pagination" && props.loadData)
        return rowModel.serverTotal.value;
      const dr = rowModel.processed.value.displayRows;
      if (pivotActive.value)
        return dr.length;
      const tops = dr.filter((d) => d.type === "group" && d.level === 0 && !d.isFooter);
      if (tops.length)
        return tops.reduce((s, d) => s + (Number(d.data.__count) || 0), 0);
      return dr.filter((d) => d.type === "row").length;
    });
    const visPinnedTop = computed(() => pivotActive.value ? [] : props.pinnedTopRows || []);
    const visPinnedBottom = computed(() => pivotActive.value ? [] : props.pinnedBottomRows || []);
    const dirtyCount = computed(() => props.markDirtyCells ? dirtyMap.value.size : 0);
    const ssrmInfo = computed(() => {
      void rowModel.processed.value;
      if (props.dataMode !== "serverSide")
        return null;
      const s = rowModel.ssrmStore();
      const total = s.rowCount > 0 ? s.rowCount : 0;
      const bc = s.blockCount();
      let blocks = 0;
      let loadedRows = 0;
      for (let b = 0; b < bc; b++)
        if (s.isBlockLoaded(b)) {
          blocks++;
          loadedRows += s.endRowOf(b) - s.startRowOf(b);
        }
      return { total, blocks, loadedRows };
    });
    const rangeStats = computed(() => {
      const ranges = interaction.allRanges();
      if (!ranges.length)
        return null;
      const dispRows = rowModel.processed.value.displayRows;
      const cols = gridCols.value;
      const agg = /* @__PURE__ */ new Map();
      let cMin = Infinity;
      let cMax = -1;
      let rowCount = 0;
      ranges.forEach((rng) => {
        const r1 = Math.min(rng.start.r, rng.end.r);
        const r2 = Math.max(rng.start.r, rng.end.r);
        const c1 = Math.min(rng.start.c, rng.end.c);
        const c2 = Math.max(rng.start.c, rng.end.c);
        rowCount += r2 - r1 + 1;
        cMin = Math.min(cMin, c1);
        cMax = Math.max(cMax, c2);
        for (let c = c1; c <= c2; c++) {
          const leaf = cols[c];
          if (!leaf)
            continue;
          let slot = agg.get(c);
          if (!slot) {
            slot = { nums: [], nonEmpty: 0 };
            agg.set(c, slot);
          }
          for (let r = r1; r <= r2; r++) {
            const drow = dispRows[r];
            if (!drow || drow.type !== "row")
              continue;
            const v = cellRawValue(leaf.col, drow.data);
            if (v == null || v === "")
              continue;
            slot.nonEmpty++;
            const s = String(v).trim();
            const n = typeof v === "number" ? v : Number(s);
            if (typeof v === "number" || s !== "" && !isNaN(n))
              slot.nums.push(n);
          }
        }
      });
      const perCol = [];
      Array.from(agg.entries()).sort((a, b) => a[0] - b[0]).forEach(([c, slot]) => {
        const leaf = cols[c];
        if (!leaf)
          return;
        const title = leaf.col.title || leaf.colId;
        if (slot.nums.length) {
          const sum = slot.nums.reduce((s, x) => s + x, 0);
          const map = {
            sum: fmtStatNum(sum),
            avg: fmtStatNum(sum / slot.nums.length),
            count: String(slot.nums.length),
            min: fmtStatNum(Math.min(...slot.nums)),
            max: fmtStatNum(Math.max(...slot.nums))
          };
          const stats = [];
          props.statusAggregations.forEach((k) => {
            if (map[k] != null)
              stats.push({ key: k, label: t(AGG_LABELS[k]), value: map[k] });
          });
          perCol.push({ colId: leaf.colId, title, stats });
        } else if (slot.nonEmpty) {
          perCol.push({
            colId: leaf.colId,
            title,
            stats: [{ key: "count", label: t("aggCount"), value: String(slot.nonEmpty) }]
          });
        }
      });
      return { rows: rowCount, cols: cMax - cMin + 1, perCol };
    });
    function isEditable(row, col) {
      if (!props.editable || !col || !col.field)
        return false;
      if (row.__group || row.__summary || row.__pivot || row.__ssrmLoading || row.__pinned)
        return false;
      if (col.checkbox || col.rowDrag)
        return false;
      if (col.editable == null)
        return true;
      return typeof col.editable === "function" ? col.editable(row) : col.editable;
    }
    function startEdit(r, c) {
      const rows = rowModel.processed.value.displayRows;
      const cols = gridCols.value;
      const row = rows[r];
      const leaf = cols[c];
      if (!row || row.type !== "row" || !leaf)
        return;
      if (!isEditable(row.data, leaf.col))
        return;
      editing.value = { r, c };
      nextTick(() => {
        var _a2;
        return (_a2 = rootRef.value) == null ? void 0 : _a2.focus();
      });
    }
    function stopEdit() {
      editing.value = null;
    }
    function commitEdit(v) {
      var _a2, _b, _c, _d;
      if (!editing.value)
        return;
      const { r, c } = editing.value;
      const rows = rowModel.processed.value.displayRows;
      const leaf = gridCols.value[c];
      const row = rows[r];
      if (row && leaf) {
        const oldValue = cellRawValue(leaf.col, row.data);
        const fxKey = dirtyKey(row.data, leaf.colId);
        if (typeof v === "string" && isFormula(v)) {
          cellFormulas.set(fxKey, v);
          rowModel.touch();
          emit("cell-value-changed", { row: row.data, colId: leaf.colId, newValue: v, oldValue });
          dispatchEvent("cellValueChanged", { node: row, colId: leaf.colId, newValue: v, oldValue });
          (_b = (_a2 = leaf.col).onCellValueChanged) == null ? void 0 : _b.call(_a2, { newValue: v, oldValue, row: row.data, column: leaf.col });
          scheduleSave();
          editing.value = null;
          return;
        }
        if (cellFormulas.has(fxKey))
          cellFormulas.delete(fxKey);
        const newValue = leaf.col.valueParser ? leaf.col.valueParser({ newValue: v, oldValue, row: row.data, column: leaf.col }) : v;
        rowModel.setRowValue(row.data, leaf.col, newValue);
        emit("cell-value-changed", { row: row.data, colId: leaf.colId, newValue, oldValue });
        dispatchEvent("cellValueChanged", {
          node: row,
          colId: leaf.colId,
          newValue,
          oldValue
        });
        (_d = (_c = leaf.col).onCellValueChanged) == null ? void 0 : _d.call(_c, { newValue, oldValue, row: row.data, column: leaf.col });
        if (!Object.is(newValue, oldValue))
          recordEdit([{ target: row.data, field: leaf.colId, oldValue, newValue }]);
        markDirty(row.data, leaf.colId, oldValue, newValue);
        scheduleSave();
      }
      editing.value = null;
    }
    const editHistory = new EditHistory(props.undoRedoCellEditingLimit);
    watch(
      () => props.undoRedoCellEditingLimit,
      (n) => editHistory.setLimit(n)
    );
    watch(
      () => props.rows,
      () => {
        editHistory.clear();
        dirtyMap.value.clear();
      }
    );
    function recordEdit(group) {
      if (!props.undoRedoCellEditing || !group.length)
        return;
      editHistory.push(group);
      dispatchEvent("historyUndoChanged", { undoDepth: editHistory.undoDepth });
      dispatchEvent("historyRedoChanged", { redoDepth: editHistory.redoDepth });
    }
    function colByColId(colId) {
      return pipelineCols.value.find((c) => colIdOf(c) === colId);
    }
    function applyEditChange(ch, useOld) {
      var _a2;
      const col = colByColId(ch.field);
      if (!col)
        return;
      const v = useOld ? ch.oldValue : ch.newValue;
      const reverted = useOld ? ch.newValue : ch.oldValue;
      rowModel.setRowValue(ch.target, col, v);
      markDirty(ch.target, ch.field, useOld ? ch.newValue : ch.oldValue, v);
      emit("cell-value-changed", { row: ch.target, colId: ch.field, newValue: v, oldValue: reverted });
      dispatchEvent("cellValueChanged", { colId: ch.field, newValue: v, oldValue: reverted });
      (_a2 = col.onCellValueChanged) == null ? void 0 : _a2.call(col, { newValue: v, oldValue: reverted, row: ch.target, column: col });
    }
    function undoEdit() {
      if (!props.undoRedoCellEditing)
        return;
      const g = editHistory.undo();
      if (!g)
        return;
      g.forEach((ch) => applyEditChange(ch, true));
      rowModel.touch();
      scheduleSave();
      dispatchEvent("historyUndoChanged", { undoDepth: editHistory.undoDepth });
      dispatchEvent("historyRedoChanged", { redoDepth: editHistory.redoDepth });
    }
    function redoEdit() {
      if (!props.undoRedoCellEditing)
        return;
      const g = editHistory.redo();
      if (!g)
        return;
      g.forEach((ch) => applyEditChange(ch, false));
      rowModel.touch();
      scheduleSave();
      dispatchEvent("historyUndoChanged", { undoDepth: editHistory.undoDepth });
      dispatchEvent("historyRedoChanged", { redoDepth: editHistory.redoDepth });
    }
    function deleteSelection() {
      if (!props.editable)
        return;
      const rows = rowModel.processed.value.displayRows;
      const cols = gridCols.value;
      const cells = [];
      const rng = interaction.range.value;
      if (rng) {
        const r1 = Math.min(rng.start.r, rng.end.r);
        const r2 = Math.max(rng.start.r, rng.end.r);
        const c1 = Math.min(rng.start.c, rng.end.c);
        const c2 = Math.max(rng.start.c, rng.end.c);
        for (let r = r1; r <= r2; r++)
          for (let c = c1; c <= c2; c++)
            cells.push({ r, c });
      } else if (interaction.active.value) {
        cells.push({ r: interaction.active.value.r, c: interaction.active.value.c });
      } else
        return;
      const changes = [];
      for (const { r, c } of cells) {
        const row = rows[r];
        const leaf = cols[c];
        if (!row || row.type !== "row" || !leaf || !isEditable(row.data, leaf.col))
          continue;
        const oldValue = cellRawValue(leaf.col, row.data);
        if (oldValue == null)
          continue;
        rowModel.setRowValue(row.data, leaf.col, null);
        emit("cell-value-changed", { row: row.data, colId: leaf.colId, newValue: null, oldValue });
        dispatchEvent("cellValueChanged", { colId: leaf.colId, newValue: null, oldValue });
        changes.push({ target: row.data, field: leaf.colId, oldValue, newValue: null });
      }
      if (changes.length) {
        recordEdit(changes);
        rowModel.touch();
        scheduleSave();
      }
    }
    const globalColIndex = computed(() => new Map(gridCols.value.map((l, i) => [l.colId, i])));
    function displayOf(col, value, row, rowIndex) {
      if (col.checkbox || col.rowDrag)
        return "";
      if (value == null && (row.__group || row.__summary))
        return "";
      const params = { value, row, rowIndex, column: col, colIndex: 0 };
      const fm = col.formatter;
      if (fm) {
        let t2;
        if (typeof fm === "function")
          t2 = fm(params);
        else {
          const fn = compileExpression(fm);
          t2 = fn ? fn({ ...params, data: row, node: row }) : null;
        }
        const s = t2 == null ? "" : String(t2);
        if ((s === "" || s === "NaN" || s === "Invalid Date") && row.__group && value != null)
          return formatByType(col, value, BOOL_LABELS.value);
        return s;
      }
      const lab = colOptionLabel(col, value);
      if (lab != null)
        return lab;
      return formatByType(col, value, BOOL_LABELS.value);
    }
    function coveredByRowSpan(rows, i, leaf) {
      const fn = leaf.col.rowSpan;
      if (!fn)
        return false;
      for (let j = i - 1; j >= 0 && i - j <= 50; j--) {
        const r = rows[j];
        const s = r.type === "row" ? Math.max(fn(r.data) || 1, 1) : 1;
        if (s > i - j)
          return true;
        if (s === 1)
          return false;
      }
      return false;
    }
    function cellsOf(drow, rowIndex, leaves) {
      const out = [];
      const rows = rowModel.processed.value.displayRows;
      const gmap = globalColIndex.value;
      const isDataRow = drow.type === "row";
      const isGroup = drow.type === "group";
      for (let k = 0; k < leaves.length; k++) {
        const leaf = leaves[k];
        const col = leaf.col;
        if (isGroup && col.checkbox && !groupCheckEnabled.value)
          continue;
        const gi = gmap.get(leaf.colId) ?? k;
        if (isDataRow && col.rowSpan && coveredByRowSpan(rows, rowIndex, leaf))
          continue;
        let w = leaf.width;
        let skip = 0;
        if (isDataRow && col.colSpan) {
          const cs = Math.max(col.colSpan(drow.data) || 1, 1);
          for (let j = 1; j < cs; j++) {
            const nl = gridCols.value[gi + j];
            if (!nl || nl.fixed !== leaf.fixed)
              break;
            w += nl.width;
            skip++;
          }
        }
        let h2 = drow.height;
        let z;
        if (isDataRow && col.rowSpan) {
          const rs = Math.max(col.rowSpan(drow.data) || 1, 1);
          for (let j = 1; j < rs && rowIndex + j < rows.length; j++)
            h2 += rows[rowIndex + j].height;
          if (rs > 1)
            z = 2;
        }
        const anchor = leaf.colId === anchorColId.value && (isDataRow || isGroup);
        const value = isDataRow || isGroup ? cellRawValue(col, drow.data) : void 0;
        out.push({
          leaf,
          colIndex: gi,
          value,
          display: displayOf(col, value, drow.data, rowIndex),
          width: w,
          height: h2,
          isAnchor: anchor && isDataRow,
          isGroupAnchor: anchor && isGroup,
          z
        });
        k += skip;
      }
      return out;
    }
    function cellProps(cell, vr, fixed) {
      var _a2, _b;
      const leaf = cell.leaf;
      const drow = vr.row;
      const ed = editing.value;
      const rt = layout.value;
      return {
        leaf,
        drow,
        rowIndex: vr.i,
        colIndex: cell.colIndex,
        x: fixed === "right" ? leaf.x - Math.max(rt.totalWidth - rt.rightWidth, 0) : leaf.x,
        width: cell.width,
        height: cell.height,
        z: cell.z,
        value: !!ed && ed.r === vr.i && ((_a2 = gridCols.value[ed.c]) == null ? void 0 : _a2.colId) === leaf.colId ? cellFormulas.get(dirtyKey(drow.data, leaf.colId)) ?? cell.value : cell.value,
        display: cell.display,
        checked: leaf.col.checkbox ? drow.type === "group" ? groupCheckedState(drow.key).checked : selection.has(drow.key) : void 0,
        indeterminate: leaf.col.checkbox && drow.type === "group" ? groupCheckedState(drow.key).indeterminate : void 0,
        groupDisplay: props.groupDisplayType,
        editing: !!ed && ed.r === vr.i && ((_b = gridCols.value[ed.c]) == null ? void 0 : _b.colId) === leaf.colId,
        flash: rowModel.flashRows.value.has(drow.key),
        dirty: props.markDirtyCells && drow.type === "row" && !leaf.col.checkbox && !leaf.col.rowDrag ? dirtyMap.value.has(dirtyKey(drow.data, leaf.colId)) : void 0,
        treeExpandable: !!props.treeData && drow.type === "row" && drow.expanded !== void 0,
        hasDetail: !!slots["row-detail"] && drow.type === "row",
        detailOpen: rowModel.expandedDetails.value.has(drow.key),
        isAnchor: cell.isAnchor,
        isGroupAnchor: cell.isGroupAnchor,
        matches: interaction.matchOf(vr.i, leaf.colId),
        activeMatch: interaction.activeMatchOf(vr.i, leaf.colId)
      };
    }
    function pinnedAsDisplay(prow) {
      return {
        key: rowKeyOf(prow, props.rowKey),
        type: "row",
        data: { ...prow, __pinned: true },
        level: 0,
        height: rowHeight.value,
        noDrag: true,
        pinned: true
      };
    }
    function pinCells(prow) {
      return cellsOf(pinnedAsDisplay(prow), -1, gridCols.value);
    }
    function pinSideLayers() {
      const { totalWidth, leftWidth, rightWidth, leftLeaves, rightLeaves } = layout.value;
      const out = [];
      if (leftWidth > 0 && leftLeaves.length)
        out.push({
          key: "l",
          style: { left: "0px", width: leftWidth + "px" },
          shift: 0,
          leaves: leftLeaves
        });
      if (rightWidth > 0 && rightLeaves.length)
        out.push({
          key: "r",
          style: { right: "0px", width: rightWidth + "px" },
          shift: rightWidth - totalWidth,
          leaves: rightLeaves
        });
      return out;
    }
    function pinCellsSide(prow, leaves) {
      return cellsOf(pinnedAsDisplay(prow), -1, leaves);
    }
    const summaryLabelColId = computed(() => {
      const s = rowModel.summaryRow.value;
      const plain = gridCols.value.filter(
        (l) => !l.col.checkbox && !l.col.rowDrag && l.col.type !== "image"
      );
      const empty = plain.filter((l) => {
        const v = s == null ? void 0 : s[l.colId];
        return v == null || v === "";
      });
      const forced = empty.find((l) => l.col.summaryLabel) || plain.find((l) => l.col.summaryLabel);
      if (forced)
        return forced.colId;
      const ranked = [...empty.filter((l) => l.col.fixed === "left"), ...empty];
      const pick = ranked.find((l) => !slots["cell-" + l.colId]) || ranked[0] || plain[0];
      return pick ? pick.colId : "";
    });
    function pinRowCellProps(leaf, data, summary = false) {
      const drow = {
        key: summary ? "__summary__" : "__pin__",
        type: "row",
        data,
        level: 0,
        height: rowHeight.value,
        noDrag: true,
        pinned: true
      };
      const value = summary ? data[colIdOf(leaf.col)] ?? cellRawValue(leaf.col, data) : cellRawValue(leaf.col, data);
      let display = displayOf(leaf.col, value, data, -1);
      let cellValue = value;
      if (summary && (value == null || value === "") && leaf.colId === summaryLabelColId.value) {
        cellValue = display = t("grandTotal");
      }
      return {
        leaf,
        drow,
        rowIndex: -1,
        colIndex: 0,
        x: leaf.x,
        width: leaf.width,
        height: rowHeight.value,
        value: cellValue,
        display
      };
    }
    const hoverKey = ref("");
    function onBodyPointerMove(e) {
      var _a2, _b, _c;
      if (rowDragState)
        return;
      if (!props.rowHover || e.pointerType !== "mouse")
        return;
      const rk = ((_c = (_b = (_a2 = e.target).closest) == null ? void 0 : _b.call(_a2, ".rj-row")) == null ? void 0 : _c.getAttribute("data-rk")) ?? "";
      if (rk !== hoverKey.value)
        hoverKey.value = rk;
    }
    function isHoverRow(drow) {
      return drow.type === "row" && props.rowHover && hoverKey.value !== "" && String(drow.key) === hoverKey.value;
    }
    function rowClass(drow, i) {
      const cls = {
        "rj-odd": i % 2 === 1,
        "is-hover": isHoverRow(drow),
        "is-selected": selection.has(drow.key),
        "is-flash": rowModel.flashRows.value.has(drow.key),
        "rj-group-row": drow.type === "group" && !drow.isFooter,
        "rj-group-footer": drow.type === "group" && !!drow.isFooter,
        "rj-detail-row": drow.type === "detail",
        "rj-fullwidth-row": drow.type === "fullwidth"
      };
      if (props.getRowClass && drow.type === "row") {
        const extra = props.getRowClass({ row: drow.data, rowIndex: i });
        if (extra)
          String(extra).split(" ").filter(Boolean).forEach((x) => cls[x] = true);
      }
      return cls;
    }
    function onToggleExpand(drow) {
      if (drow.type === "group") {
        const path = String(drow.data.__path ?? drow.key);
        if (rowModel.isServerGroupView()) {
          rowModel.setServerGroupCollapsed(path, !!drow.expanded);
          dispatchEvent("rowGroupOpened", { groupKey: path, expanded: !drow.expanded });
          return;
        }
        if (drow.expanded && rowModel.defaultExpandAll.value) {
          const all = new Set(
            rowModel.processed.value.displayRows.filter((d) => d.type === "group").map((d) => String(d.key))
          );
          all.delete(path);
          rowModel.expandedGroups.value = all;
          rowModel.defaultExpandAll.value = false;
        } else
          rowModel.expandGroup(path, !drow.expanded);
        dispatchEvent("rowGroupOpened", { groupKey: path, expanded: !drow.expanded });
      } else if (props.treeData) {
        const key = String(drow.key);
        if (drow.expanded && rowModel.defaultExpandAll.value) {
          const s = /* @__PURE__ */ new Set();
          rowModel.processed.value.displayRows.forEach((d) => {
            if (d.type === "row" && d.expanded !== void 0 && String(d.key) !== key)
              s.add(String(d.key));
          });
          rowModel.expandedTree.value = s;
          rowModel.defaultExpandAll.value = false;
        } else
          rowModel.toggleTree(key);
      }
    }
    function onToggleDetail(drow) {
      rowModel.toggleDetail(drow.key);
      if (rowModel.expandedDetails.value.has(drow.key))
        emit("detail-open", drow.data);
    }
    function vrInRange(i) {
      const rg = interaction.range.value;
      if (!rg)
        return false;
      const a = Math.min(rg.start.r, rg.end.r);
      const b = Math.max(rg.start.r, rg.end.r);
      return i >= a && i <= b;
    }
    function rangeStyleInRow(vr, right = false) {
      const rect = rangeRect.value;
      if (!rect)
        return {};
      const top = Math.max(rect.top, vr.top) - vr.top;
      const bottom = Math.min(rect.top + rect.height, vr.top + vr.row.height) - vr.top;
      const left = right ? rect.left - Math.max(layout.value.totalWidth - layout.value.rightWidth, 0) : rect.left;
      return {
        left: left + "px",
        top: top + "px",
        width: rect.width + "px",
        height: Math.max(bottom - top, 0) + "px"
      };
    }
    const activeRectStyle = computed(() => {
      const r = interaction.activeRect.value;
      if (!r)
        return {};
      return { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" };
    });
    const fillHandleStyle = computed(() => {
      const r = rangeRect.value;
      if (!r)
        return {};
      return { left: r.left + r.width - 4 + "px", top: r.top + r.height - 4 + "px" };
    });
    function extraRangeStyle(er) {
      const r = interaction.rangeRectOf(er);
      if (!r)
        return {};
      return { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" };
    }
    function rightFit() {
      return layout.value.totalWidth <= viewportW.value;
    }
    function headerClipStyle(side) {
      if (side === "left")
        return { left: "0px", width: layout.value.leftWidth + "px" };
      return rightFit() ? {
        left: layout.value.totalWidth - layout.value.rightWidth + "px",
        right: "auto",
        width: layout.value.rightWidth + "px"
      } : { right: "0px", width: layout.value.rightWidth + "px" };
    }
    function fixedLayerStyle(side) {
      const clip = { height: viewportH.value + "px", overflow: "hidden" };
      if (side === "left") {
        return {
          position: "absolute",
          left: "0px",
          top: "0px",
          width: layout.value.leftWidth + "px",
          ...clip
        };
      }
      if (rightFit()) {
        return {
          position: "absolute",
          left: layout.value.totalWidth - layout.value.rightWidth + "px",
          right: "auto",
          top: "0px",
          width: layout.value.rightWidth + "px",
          ...clip
        };
      }
      return {
        position: "absolute",
        right: "0px",
        left: "auto",
        top: "0px",
        width: layout.value.rightWidth + "px",
        ...clip
      };
    }
    const leftCanvasRef = ref(null);
    const rightCanvasRef = ref(null);
    function syncFixedCanvas(y) {
      const t2 = `translate3d(0, ${-y}px, 0)`;
      if (leftCanvasRef.value)
        leftCanvasRef.value.style.transform = t2;
      if (rightCanvasRef.value)
        rightCanvasRef.value.style.transform = t2;
      if (scrollTop.value !== y)
        scrollTop.value = y;
    }
    const fixedCanvasStyle = computed(() => ({
      position: "absolute",
      left: "0px",
      top: "0px",
      width: "100%",
      height: Math.max(rowModel.totalHeight.value, 1) + "px",
      transform: `translate3d(0, ${-scrollTop.value}px, 0)`,
      willChange: "transform"
    }));
    function pointToCell(e) {
      const el = scrollerRef.value;
      if (!el)
        return null;
      const rect = el.getBoundingClientRect();
      return interaction.cellFromPoint(e.clientX - rect.left, e.clientY - rect.top);
    }
    function cellDisplayAt(pos) {
      const drow = rowModel.processed.value.displayRows[pos.r];
      const leaf = gridCols.value[pos.c];
      if (!drow || !leaf)
        return "";
      return displayOf(leaf.col, cellRawValue(leaf.col, drow.data), drow.data, pos.r);
    }
    let winPointerMove = null;
    let winPointerUp = null;
    function onBodyPointerDown(e) {
      const pos = pointToCell(e);
      if (pos) {
        const drow = rowModel.processed.value.displayRows[pos.r];
        const leaf = gridCols.value[pos.c];
        if (drow && leaf)
          emit(
            "cell-click",
            {
              value: cellRawValue(leaf.col, drow.data),
              row: drow.data,
              rowIndex: pos.r,
              column: leaf.col,
              colIndex: pos.c
            },
            e
          );
        if (drow && leaf)
          dispatchEvent("cellClicked", {
            node: drow,
            data: drow.data,
            rowIndex: pos.r,
            colIndex: pos.c,
            column: leaf.col
          });
        if (props.selectOnCellClick && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && drow && drow.type === "row" && !(e.target instanceof Element && e.target.closest(".rj-checkbox")))
          selectRowByClick(drow);
      }
      if (!props.rangeSelection || e.button !== 0 || !pos)
        return;
      interaction.onPointerDown(pos, e);
      winPointerMove = (ev) => interaction.onPointerMove(pointToCell(ev), ev);
      winPointerUp = () => {
        interaction.onPointerUp();
        if (winPointerMove)
          window.removeEventListener("pointermove", winPointerMove);
        if (winPointerUp)
          window.removeEventListener("pointerup", winPointerUp);
        winPointerMove = null;
        winPointerUp = null;
      };
      window.addEventListener("pointermove", winPointerMove);
      window.addEventListener("pointerup", winPointerUp);
    }
    function onBodyDblClick(e) {
      const pos = pointToCell(e);
      if (!pos)
        return;
      const drow = rowModel.processed.value.displayRows[pos.r];
      const leaf = gridCols.value[pos.c];
      if (!drow || !leaf)
        return;
      emit(
        "cell-dblclick",
        {
          value: cellRawValue(leaf.col, drow.data),
          row: drow.data,
          rowIndex: pos.r,
          column: leaf.col,
          colIndex: pos.c
        },
        e
      );
      dispatchEvent("cellDoubleClicked", {
        node: drow,
        data: drow.data,
        rowIndex: pos.r,
        colIndex: pos.c,
        column: leaf.col
      });
      if (drow.type === "row" && isEditable(drow.data, leaf.col))
        startEdit(pos.r, pos.c);
    }
    function onRootKeydown(e) {
      if (editing.value)
        return;
      const t2 = e.target;
      if (t2 && (t2.tagName === "INPUT" || t2.tagName === "TEXTAREA" || t2.isContentEditable))
        return;
      const ctrl = isMac() ? e.metaKey : e.ctrlKey;
      if (ctrl && (e.key === "z" || e.key === "Z")) {
        if (e.shiftKey)
          redoEdit();
        else
          undoEdit();
        e.preventDefault();
        return;
      }
      if (ctrl && (e.key === "y" || e.key === "Y")) {
        redoEdit();
        e.preventDefault();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && props.editable) {
        if (interaction.active.value || interaction.range.value) {
          deleteSelection();
          e.preventDefault();
          return;
        }
      }
      const handled = interaction.onKeydown(e, false);
      if (!handled && e.key === "Escape") {
        filterMenu.value = null;
        menu.value = null;
        colMenu.value = null;
      }
    }
    function onWinPaste(e) {
      var _a2;
      const t2 = e.target;
      if (t2 && (t2.tagName === "INPUT" || t2.tagName === "TEXTAREA" || t2.isContentEditable))
        return;
      if (!((_a2 = rootRef.value) == null ? void 0 : _a2.contains(t2 ?? null)))
        return;
      interaction.onPaste(e);
    }
    const rowDrag = ref(null);
    const dragGhost = ref(null);
    const dragGhostRef = ref(null);
    const ghostInitTransform = ref("translate3d(-9999px, -9999px, 0)");
    let rowDragState = null;
    let dragRaf = 0;
    let dragSettle = null;
    const gridToast = ref("");
    let gridToastTimer = null;
    function showToast(text, ms = 2200) {
      gridToast.value = text;
      if (gridToastTimer)
        clearTimeout(gridToastTimer);
      gridToastTimer = setTimeout(() => {
        gridToast.value = "";
        gridToastTimer = null;
      }, ms);
    }
    const NO_ROW_STYLE = {};
    function dragDebug(...args) {
      if (typeof window !== "undefined" && window.__RJGRID_DRAG_DEBUG)
        console.log("[rj-drag]", ...args);
    }
    let dragFast = false;
    function dragTransition() {
      return dragFast ? DRAG_TRANSITION_FAST : DRAG_TRANSITION;
    }
    function rowDragShift(i) {
      const d = rowDrag.value;
      if (!d || i === d.from)
        return 0;
      if (d.from < d.to && i > d.from && i <= d.to)
        return -d.height;
      if (d.from > d.to && i >= d.to && i < d.from)
        return d.height;
      return 0;
    }
    const DRAG_IDLE_STYLE = { transition: DRAG_TRANSITION };
    const DRAG_IDLE_FAST = { transition: DRAG_TRANSITION_FAST };
    const DRAG_FROM_STYLE = { transition: DRAG_TRANSITION, opacity: "0.4" };
    const DRAG_FROM_FAST = { transition: DRAG_TRANSITION_FAST, opacity: "0.4" };
    const dragShiftStyles = /* @__PURE__ */ new Map();
    function rowDragStyle(i) {
      const d = rowDrag.value;
      if (!d)
        return NO_ROW_STYLE;
      const shift = rowDragShift(i);
      if (i === d.from)
        return dragFast ? DRAG_FROM_FAST : DRAG_FROM_STYLE;
      if (!shift)
        return dragFast ? DRAG_IDLE_FAST : DRAG_IDLE_STYLE;
      const ck = (dragFast ? "f" : "n") + shift;
      let style = dragShiftStyles.get(ck);
      if (!style) {
        style = {
          transition: dragTransition(),
          transform: `translate3d(0, ${shift}px, 0)`,
          willChange: "transform"
        };
        dragShiftStyles.set(ck, style);
      }
      return style;
    }
    function buildGhostCells(drow) {
      const all = [];
      const rows = rowModel.processed.value.displayRows;
      const rowIndex = rows.indexOf(drow);
      for (const leaf of gridCols.value) {
        const col = leaf.col;
        if (col.checkbox || col.rowDrag)
          continue;
        const kind = col.type === "image" ? "img" : col.sparkline ? "spark" : "text";
        let text = "";
        if (kind === "text") {
          const v = cellRawValue(col, drow.data);
          if (v != null && v !== "")
            text = displayOf(col, v, drow.data, rowIndex) || "";
        }
        all.push({ w: leaf.width, kind, text });
      }
      return all.slice(0, ghostCellCount(all, GHOST_MAX_W));
    }
    function moveGhost(x, y) {
      const el = dragGhostRef.value;
      if (el)
        el.style.transform = `translate3d(${x + 14}px, ${y + 18}px, 0)`;
    }
    function startRowDrag(ev, drow) {
      if (!props.rowDraggable || rowDragState)
        return;
      if (!rowDragEnabled.value)
        return showToast(t("rowDragNoServer"));
      clearDragSettle();
      if (rowModel.sortStates.value.length)
        return showToast(t("rowDragNoSort"));
      if (rowGroupFields.value.length || pivotActive.value)
        return showToast(t("rowDragNoGroup"));
      if (props.treeData)
        return showToast(t("rowDragNoTree"));
      ev.preventDefault();
      const rows = rowModel.processed.value.displayRows;
      const idx = rows.findIndex((d) => d.key === drow.key);
      if (idx < 0)
        return;
      rowDragState = {
        drow,
        from: idx,
        height: drow.height || rowHeight.value,
        x: ev.clientX,
        y: ev.clientY,
        startX: ev.clientX,
        startY: ev.clientY,
        active: false,
        rectTop: 0,
        rectH: 0,
        maxScroll: 0,
        geomAt: 0,
        sub: 0
      };
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", endRowDrag);
      window.addEventListener("pointercancel", endRowDrag);
      const sc0 = scrollerRef.value;
      const wr0 = bodyWrapRef.value;
      if (sc0 && wr0) {
        const r0 = wr0.getBoundingClientRect();
        rowDragState.rectTop = r0.top;
        rowDragState.rectH = r0.height;
        rowDragState.maxScroll = Math.max(0, sc0.scrollHeight - sc0.clientHeight);
        rowDragState.geomAt = performance.now();
      }
      dragRaf = requestAnimationFrame(dragTick);
    }
    function onDragMove(e) {
      const st = rowDragState;
      if (!st)
        return;
      let mx = e.clientX;
      let my = e.clientY;
      if (typeof e.getCoalescedEvents === "function") {
        const co = e.getCoalescedEvents();
        if (co && co.length) {
          mx = co[co.length - 1].clientX;
          my = co[co.length - 1].clientY;
        }
      }
      st.x = mx;
      st.y = my;
      if (st.active)
        return;
      if (Math.abs(e.clientX - st.startX) + Math.abs(e.clientY - st.startY) < DRAG_START_GAP)
        return;
      st.active = true;
      dragDebug("activate", { startX: st.startX, startY: st.startY, x: mx, y: my });
      ghostInitTransform.value = `translate3d(${e.clientX + 14}px, ${e.clientY + 18}px, 0)`;
      dragGhost.value = { cells: buildGhostCells(st.drow), h: st.height };
      rowDrag.value = { from: st.from, to: st.from, height: st.height };
      document.body.style.cursor = "grabbing";
      dispatchEvent("dragStarted", { node: st.drow, row: st.drow.data, from: st.from });
    }
    function resolveDropTo(st, prevTo) {
      const scroller = scrollerRef.value;
      if (!scroller)
        return prevTo;
      const rws = rowModel.processed.value.displayRows;
      const offs = rowModel.offsets.value;
      if (!rws.length)
        return prevTo;
      const y = st.y - st.rectTop + scroller.scrollTop;
      let t2 = lowerBound(offs, y + 1, (i) => offs[i]) - 1;
      if (t2 < 0)
        t2 = 0;
      if (t2 >= rws.length)
        t2 = rws.length - 1;
      const rh = rws[t2].height || st.height;
      const top = offs[t2] ?? 0;
      let to = t2;
      if (prevTo !== to) {
        const margin = Math.min(10, rh * 0.25);
        if (prevTo === t2 - 1 && y - top < margin)
          to = prevTo;
        else if (prevTo === t2 + 1 && top + rh - y < margin)
          to = prevTo;
      }
      if (to < 0)
        to = 0;
      if (to > rws.length - 1)
        to = rws.length - 1;
      return to;
    }
    function dragTick() {
      dragRaf = requestAnimationFrame(dragTick);
      const st = rowDragState;
      const d = rowDrag.value;
      if (!st || !st.active || !d)
        return;
      const scroller = scrollerRef.value;
      const wrap = bodyWrapRef.value;
      if (!scroller || !wrap)
        return;
      const now = performance.now();
      if (now - st.geomAt > 500) {
        const rect = wrap.getBoundingClientRect();
        st.rectTop = rect.top;
        st.rectH = rect.height;
        st.geomAt = now;
      }
      const relY = st.y - st.rectTop;
      const zone = DRAG_EDGE_ZONE;
      const vmax = 2 + st.height * 0.22;
      let delta = 0;
      if (relY < zone)
        delta = -(1.5 + vmax * (1 - Math.max(relY, 0) / zone));
      else if (relY > st.rectH - zone)
        delta = 1.5 + vmax * (1 - Math.max(st.rectH - relY, 0) / zone);
      if (delta) {
        st.sub += delta;
        const step = Math.round(st.sub);
        if (step) {
          st.sub -= step;
          const next = Math.min(Math.max(scroller.scrollTop + step, 0), st.maxScroll);
          if (next !== scroller.scrollTop) {
            scroller.scrollTop = next;
            syncFixedCanvas(next);
          }
        }
      }
      const fast = !!delta;
      if (fast !== dragFast)
        dragFast = fast;
      const to = resolveDropTo(st, d.to);
      if (to !== d.to) {
        rowDrag.value = { from: st.from, to, height: st.height };
        dispatchEvent("rowDragMove", {
          node: st.drow,
          overNode: rowModel.processed.value.displayRows[to],
          to
        });
      }
      moveGhost(st.x, st.y);
    }
    function endRowDrag(ev) {
      var _a2, _b;
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", endRowDrag);
      window.removeEventListener("pointercancel", endRowDrag);
      if (dragRaf) {
        cancelAnimationFrame(dragRaf);
        dragRaf = 0;
      }
      const st = rowDragState;
      const prevTo = (_a2 = rowDrag.value) == null ? void 0 : _a2.to;
      if (st && ev) {
        let fx = ev.clientX;
        let fy = ev.clientY;
        if (typeof ev.getCoalescedEvents === "function") {
          const co = ev.getCoalescedEvents();
          if (co && co.length) {
            fx = co[co.length - 1].clientX;
            fy = co[co.length - 1].clientY;
          }
        }
        st.x = fx;
        st.y = fy;
      }
      let finalTo = prevTo ?? 0;
      if (st && st.active && rowDrag.value) {
        finalTo = resolveDropTo(st, rowDrag.value.to);
        if (finalTo !== rowDrag.value.to)
          rowDrag.value = { from: st.from, to: finalTo, height: st.height };
      }
      const d = rowDrag.value;
      rowDragState = null;
      rowDrag.value = null;
      dragGhost.value = null;
      dragShiftStyles.clear();
      dragFast = false;
      ghostInitTransform.value = "translate3d(-9999px, -9999px, 0)";
      document.body.style.cursor = "";
      if (!st || !st.active) {
        dragDebug("end-cancelled", {
          active: st == null ? void 0 : st.active,
          evType: ev == null ? void 0 : ev.type,
          evY: ev == null ? void 0 : ev.clientY,
          stY: st == null ? void 0 : st.y
        });
        return;
      }
      const moved = !!(d && d.to !== st.from);
      dragDebug("end", {
        evType: ev == null ? void 0 : ev.type,
        evX: ev == null ? void 0 : ev.clientX,
        evY: ev == null ? void 0 : ev.clientY,
        coalesced: ev && typeof ev.getCoalescedEvents === "function" ? ev.getCoalescedEvents().length : -1,
        startY: st.startY,
        stY: st.y,
        scrollTop: (_b = scrollerRef.value) == null ? void 0 : _b.scrollTop,
        rectTop: st.rectTop,
        from: st.from,
        prevTo,
        finalTo,
        moved
      });
      if (moved && d) {
        const from = st.from;
        const to = d.to;
        applyRowMove(st.drow, from, to);
        settleDraggedRow(st.drow.key, from, to, st.height);
      }
      dispatchEvent("dragEnded", {
        node: st.drow,
        row: st.drow.data,
        from: st.from,
        to: d == null ? void 0 : d.to,
        moved
      });
    }
    function clearDragSettle() {
      if (!dragSettle)
        return;
      clearTimeout(dragSettle.timer);
      dragSettle.els.forEach((el) => {
        el.style.transition = "";
        el.style.transform = "";
      });
      dragSettle = null;
    }
    function settleDraggedRow(key, from, to, height) {
      const dist = (from - to) * height;
      clearDragSettle();
      if (!dist)
        return;
      nextTick(() => {
        const root = rootRef.value;
        if (!root)
          return;
        const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(String(key)) : String(key);
        const els = Array.from(root.querySelectorAll(`.rj-row[data-rk="${esc}"]`));
        if (!els.length)
          return;
        els.forEach((el) => {
          el.style.transition = "none";
          el.style.transform = `translate3d(0, ${dist}px, 0)`;
        });
        void root.offsetHeight;
        els.forEach((el) => {
          el.style.transition = DRAG_TRANSITION;
          el.style.transform = "translate3d(0, 0, 0)";
        });
        dragSettle = {
          els,
          timer: setTimeout(() => clearDragSettle(), 240)
        };
      });
    }
    function applyRowMove(drow, from, to) {
      const moved = drow.data;
      const arr = rowModel.sourceRows();
      const cur = arr.indexOf(moved);
      if (cur < 0)
        return;
      const rws = rowModel.processed.value.displayRows;
      const insertAt = rowMoveInsertIndex(
        rws.length,
        (i) => rws[i].type === "row",
        (i) => rws[i].data === moved,
        from,
        to
      );
      arr.splice(cur, 1);
      arr.splice(insertAt, 0, moved);
      dragDebug("applyRowMove", { cur, insertAt, from, to });
      rowModel.touchOrder();
      emit("row-drag-end", { row: moved, from, to });
    }
    const bannerOver = ref(false);
    function titleOfField(f) {
      const live = colState.listLeafColumns().find((c) => c.field === f || colIdOf(c) === f);
      if (live == null ? void 0 : live.title)
        return live.title;
      const src = collectLeaves(props.columns).find((c) => c.field === f || colIdOf(c) === f);
      return (src == null ? void 0 : src.title) || f;
    }
    function fieldOfCol(colId) {
      const col = colState.listLeafColumns().find((c) => colIdOf(c) === colId);
      return (col == null ? void 0 : col.field) || colId;
    }
    function isInternalColKey(k) {
      const s = String(k);
      return s.startsWith("__pv") || s === "__check" || s === "__drag" || s === "__group";
    }
    function addGroup(f) {
      const field = f.includes("|") ? f : fieldOfCol(f);
      if (isInternalColKey(field) || isInternalColKey(f))
        return showToast(t("groupInternalCol"));
      if (rowModel.pivotState.value.active && rowModel.pivotState.value.cols.includes(field)) {
        return showToast(t("groupDupDim"));
      }
      if (rowModel.rowGroupFields.value.includes(field))
        return;
      rowModel.rowGroupFields.value = [...rowModel.rowGroupFields.value, field];
      emit("row-group-change", rowModel.rowGroupFields.value);
      dispatchEvent("rowGroupChanged", { groupedColumns: [...rowModel.rowGroupFields.value] });
      scheduleSave();
    }
    function removeGroup(i) {
      const arr = rowModel.rowGroupFields.value.slice();
      arr.splice(i, 1);
      rowModel.rowGroupFields.value = arr;
      emit("row-group-change", arr);
      dispatchEvent("rowGroupChanged", { groupedColumns: arr.slice() });
      scheduleSave();
    }
    function removeGroupByField(f) {
      rowModel.rowGroupFields.value = rowModel.rowGroupFields.value.filter((x) => x !== f);
      emit("row-group-change", rowModel.rowGroupFields.value);
      dispatchEvent("rowGroupChanged", { groupedColumns: [...rowModel.rowGroupFields.value] });
      scheduleSave();
    }
    function setAgg(field, agg) {
      const col = colState.listLeafColumns().find((c) => c.field === field || colIdOf(c) === field);
      if (!col)
        return;
      col.aggFunc = agg;
      aggRev.value++;
      rowModel.touch();
      scheduleSave();
    }
    function togglePivot(v) {
      rowModel.pivotState.value = { ...rowModel.pivotState.value, active: v };
      emit("pivot-change", rowModel.pivotState.value);
      scheduleSave();
    }
    function allValueColIds() {
      return collectLeaves(props.columns).filter((c) => !isInternalColKey(colIdOf(c)) && isPivotValueCol(c)).map((c) => colIdOf(c));
    }
    const pivotImplicitValues = computed(() => allValueColIds());
    function normalizePivotOrder(arr) {
      const leaves = collectLeaves(props.columns);
      const rank = (k) => {
        const i = leaves.findIndex((c) => c.field === k || colIdOf(c) === k);
        return i < 0 ? Number.MAX_SAFE_INTEGER : i;
      };
      return arr.slice().sort((a, b) => rank(a) - rank(b));
    }
    function pivotToggle(which, key) {
      if (isInternalColKey(key))
        return showToast(t("pivotInternalCol"));
      if (which === "cols" && rowModel.rowGroupFields.value.includes(key)) {
        return showToast(t("pivotDupDim"));
      }
      const cur = rowModel.pivotState.value;
      const arr = which === "cols" ? cur.cols.slice() : cur.values.slice();
      const i = arr.indexOf(key);
      if (which === "values" && !cur.values.length) {
        const base = allValueColIds();
        arr.length = 0;
        if (!base.includes(key))
          arr.push(key);
        for (const id of base)
          if (id !== key)
            arr.push(id);
      } else if (i >= 0) {
        arr.splice(i, 1);
      } else {
        arr.push(key);
      }
      if (which === "values" && !arr.length && allValueColIds().length)
        showToast(t("pivotAllRestored"));
      const next = {
        ...cur,
        // 透视列非空即启用、清空最后一个则停用
        active: which === "cols" ? arr.length > 0 : cur.active,
        [which]: normalizePivotOrder(arr)
      };
      rowModel.pivotState.value = next;
      emit("pivot-change", next);
      scheduleSave();
    }
    function onDropBanner(e) {
      var _a2;
      e.preventDefault();
      bannerOver.value = false;
      const id = (_a2 = e.dataTransfer) == null ? void 0 : _a2.getData("text/x-rj-col");
      if (id)
        addGroup(id);
    }
    function onPanelDropGroup(colId) {
      addGroup(colId);
    }
    function onPanelDropPivotCol(colId) {
      const f = fieldOfCol(colId);
      if (f && !rowModel.pivotState.value.cols.includes(f))
        pivotToggle("cols", f);
    }
    function onColDrop(dragId, targetId) {
      colState.moveColumn(dragId, targetId);
      dispatchEvent("columnMoved", {});
      dispatchEvent("columnEverythingChanged", {});
      scheduleSave();
    }
    function onPanelToggleHide(colId) {
      colState.toggleHide(colId);
      dispatchEvent("columnVisible", { column: colId });
      dispatchEvent("columnEverythingChanged", {});
      scheduleSave();
    }
    function onPanelTogglePin(colId, pin) {
      colState.togglePin(colId, pin);
      dispatchEvent("columnPinned", { column: colId, pinned: pin });
      dispatchEvent("columnEverythingChanged", {});
      scheduleSave();
    }
    function onResize(colId, width, done) {
      colState.resize(colId, width);
      if (done) {
        dispatchEvent("columnResized", { column: colId, width });
        dispatchEvent("columnEverythingChanged", {});
        scheduleSave();
      }
    }
    function autoWidth(colId) {
      const leaf = gridCols.value.find((l) => l.colId === colId);
      if (!leaf)
        return;
      colState.resize(colId, measureColWidth(leaf.col.title || "", sampleTexts(leaf.col)));
      scheduleSave();
    }
    function sampleTexts(col) {
      return rowModel.sourceRows().slice(0, 200).map((r, i) => String(displayOf(col, cellRawValue(col, r), r, i) ?? ""));
    }
    function applyDefaultAutoWidths() {
      gridCols.value.forEach((l) => {
        const col = l.col;
        if (col.checkbox || col.rowDrag)
          return;
        if (colState.hasSizedWidth(l.colId))
          return;
        colState.setAutoWidth(l.colId, measureColWidth(col.title || "", sampleTexts(col)));
      });
    }
    const panelLeaves = computed(() => {
      void aggRev.value;
      return colState.listLeafUi().filter((x) => !x.col.checkbox && !x.col.rowDrag).map((x) => ({
        col: x.col,
        colId: x.colId,
        field: x.col.field,
        title: x.col.title,
        hidden: x.hidden,
        pinned: x.pinned,
        aggFunc: x.col.aggFunc
      }));
    });
    const menu = ref(null);
    const tip = ref(null);
    function onTipOver(e) {
      var _a2, _b;
      const host = e.currentTarget;
      const el = (_b = (_a2 = e.target) == null ? void 0 : _a2.closest) == null ? void 0 : _b.call(_a2, "[data-tip]");
      if (!el || !host.contains(el))
        return;
      const r = el.getBoundingClientRect();
      tip.value = { text: el.getAttribute("data-tip") || "", x: r.right, y: r.bottom + 6 };
    }
    function onTipOut(e) {
      var _a2, _b;
      const el = (_b = (_a2 = e.target) == null ? void 0 : _a2.closest) == null ? void 0 : _b.call(_a2, "[data-tip]");
      const to = e.relatedTarget;
      if (el && to && el.contains(to))
        return;
      tip.value = null;
    }
    function openMenuAt(x, y, items, above, estW = 220) {
      if (!items.length)
        return;
      tip.value = null;
      const est = items.length * 28 + 16;
      const bottom = window.innerHeight - 8;
      const xc = Math.max(8, Math.min(x, window.innerWidth - estW - 8));
      if (y + est <= bottom) {
        menu.value = { items, x: xc, y, limit: bottom };
        return;
      }
      const lim = (above ?? y) - 6;
      menu.value = { items, x: xc, y: Math.max(8, (above ?? y) - est - 8), limit: lim };
    }
    function onMenuReposition(h2, w) {
      const m = menu.value;
      if (!m)
        return;
      const lim = m.limit ?? window.innerHeight - 8;
      const next = { ...m };
      if (m.y + h2 > lim)
        next.y = Math.max(8, lim - h2);
      if (w && m.x + w > window.innerWidth - 8)
        next.x = Math.max(8, window.innerWidth - 8 - w);
      if (next.y !== m.y || next.x !== m.x)
        menu.value = next;
    }
    function onMenuSelect(item) {
      var _a2;
      menu.value = null;
      (_a2 = item.action) == null ? void 0 : _a2.call(item);
    }
    function setSortSingle(field, dir) {
      rowModel.sortStates.value = dir ? [{ field, dir }] : [];
      rowModel.touch();
      emit("sort-change", rowModel.sortStates.value);
      dispatchEvent("sortChanged", { column: field, sort: dir });
      scheduleSave();
    }
    const colMenu = ref(null);
    const colMenuPinned = computed(
      () => colMenu.value ? colState.pinOf(colMenu.value.col) : null
    );
    const colMenuColumns = computed(
      () => panelLeaves.value.map((p) => ({
        colId: p.colId,
        title: p.title || p.colId,
        hidden: !!p.hidden,
        pinned: p.pinned ?? null
      }))
    );
    function onHeaderContextMenu(cell, ev) {
      const col = cell.col;
      if (cell.isGroup)
        return;
      menu.value = null;
      filterMenu.value = null;
      const colId = colIdOf(col);
      const type = rowModel.filterTypeOf(col);
      let unique = [];
      if (type === "select") {
        const optList = colOptionList(col);
        if (optList && optList.length) {
          unique = flattenOptions(optList).map((o) => String(o.value));
        } else {
          unique = Array.from(
            new Set(
              rowModel.sourceRows().slice(0, 5e3).map((r) => cellRawValue(col, r)).filter((v) => v != null)
            )
          ).map(String);
        }
      }
      const ss = rowModel.sortStates.value.find((x) => x.field === colId || x.field === col.field);
      colMenu.value = {
        col,
        colId,
        x: ev.clientX,
        y: ev.clientY,
        canSort: !!col.field && col.sortable !== false && col.suppressSort !== true,
        canFilter: !!col.field && col.filter !== false && !col.checkbox && !col.rowDrag,
        canGroup: !!props.groupable && !!col.field,
        sortDir: ss ? ss.dir : null,
        filterType: type,
        filterModel: rowModel.filterModels.get(colId) || null,
        unique
      };
    }
    function colMenuSort(dir) {
      if (!colMenu.value)
        return;
      const field = colMenu.value.col.field;
      colMenu.value = null;
      if (field)
        setSortSingle(field, dir);
    }
    function colMenuSelect() {
      if (!colMenu.value)
        return;
      const ci = gridCols.value.findIndex((g) => g.colId === colMenu.value.colId);
      colMenu.value = null;
      if (ci >= 0)
        interaction.selectColumn(ci);
    }
    function colMenuAutosize() {
      if (!colMenu.value)
        return;
      const colId = colMenu.value.colId;
      colMenu.value = null;
      autoWidth(colId);
    }
    function colMenuPin(pos) {
      if (!colMenu.value)
        return;
      const colId = colMenu.value.colId;
      colMenu.value = null;
      onPanelTogglePin(colId, pos);
    }
    function colMenuHide() {
      if (!colMenu.value)
        return;
      const colId = colMenu.value.colId;
      colMenu.value = null;
      onPanelToggleHide(colId);
    }
    function colMenuGroup() {
      if (!colMenu.value)
        return;
      const f = colMenu.value.col.field;
      colMenu.value = null;
      if (f)
        addGroup(f);
    }
    function colMenuApplyFilter(model) {
      if (!colMenu.value)
        return;
      const colId = colMenu.value.colId;
      rowModel.filterModels.set(colId, model);
      rowModel.touch();
      colMenu.value = null;
      emit("filter-change");
      dispatchEvent("filterChanged", { colId });
      scheduleSave();
    }
    function colMenuClearFilter() {
      if (!colMenu.value)
        return;
      const colId = colMenu.value.colId;
      rowModel.filterModels.delete(colId);
      rowModel.touch();
      colMenu.value = null;
      emit("filter-change");
      dispatchEvent("filterChanged", { colId });
      scheduleSave();
    }
    function colMenuToggleColHide(colId) {
      onPanelToggleHide(colId);
    }
    function colMenuToggleColPin(colId, pin) {
      onPanelTogglePin(colId, pin);
    }
    function onBodyContextMenuRaw(e) {
      var _a2;
      const legacy = typeof props.contextMenu === "function" ? props.contextMenu : null;
      const declared = props.contextMenus;
      const hasDeclared = !!declared && (Array.isArray(declared) ? declared.length > 0 : typeof declared === "function");
      if (!legacy && props.contextMenu !== true && !hasDeclared)
        return;
      if (isEditableContextTarget(e.target))
        return;
      if (hasUserTextSelection(rootRef.value, (_a2 = window.getSelection) == null ? void 0 : _a2.call(window)))
        return;
      const pos = pointToCell(e);
      const drow = pos ? rowModel.processed.value.displayRows[pos.r] : void 0;
      const leaf = pos ? gridCols.value[pos.c] : void 0;
      if (!drow)
        return;
      e.preventDefault();
      dispatchEvent("cellContextMenu", {
        node: drow,
        column: leaf == null ? void 0 : leaf.col,
        colId: leaf == null ? void 0 : leaf.colId,
        rowIndex: pos == null ? void 0 : pos.r,
        value: drow && leaf ? cellRawValue(leaf.col, drow.data) : void 0,
        x: e.clientX,
        y: e.clientY
      });
      const ctx = {
        row: drow == null ? void 0 : drow.data,
        column: leaf == null ? void 0 : leaf.col,
        colId: leaf == null ? void 0 : leaf.colId,
        rowIndex: pos == null ? void 0 : pos.r,
        value: drow && leaf ? cellRawValue(leaf.col, drow.data) : void 0,
        api: apiObj,
        event: e
      };
      const items = [];
      if (props.clipboard) {
        const before = items.length;
        if (pos && drow && leaf)
          items.push({
            name: t("cmCopyCell"),
            action: () => writeClipboard(cellDisplayAt(pos))
          });
        if (interaction.range.value)
          items.push({ name: t("cmCopyRange"), action: () => void interaction.copyRange(false) });
        if (items.length > before)
          items.push({ isSeparator: true });
      }
      if (pos && (drow == null ? void 0 : drow.type) === "row" && leaf && isEditable(drow.data, leaf.col))
        items.push({ name: t("cmEdit"), action: () => startEdit(pos.r, pos.c) });
      if (pos && drow)
        items.push({ name: t("cmSelectRow"), action: () => interaction.selectRow(pos.r) });
      if (drow.type === "row" && props.rowJson)
        items.push({ name: t("cmRowJson"), action: () => rowJsonDlg.value = stringifyRowJson(drow.data) });
      if (legacy)
        items.push(...legacy(ctx));
      const customItems = hasDeclared ? buildCustomMenuItems(
        (typeof declared === "function" ? declared(ctx) : declared) || [],
        ctx,
        runContextMenuItem
      ) : [];
      const merged = joinMenuSections(items, customItems);
      if (!merged.length)
        return;
      openMenuAt(e.clientX, e.clientY, merged);
    }
    function runContextMenuItem(item, ctx) {
      const flag = (v) => v == null ? false : typeof v === "function" ? !!v(ctx) : !!v;
      if (flag(item.disabled))
        return;
      const fire = () => {
        var _a2;
        (_a2 = item.onClick) == null ? void 0 : _a2.call(item, ctx);
        emit("context-menu-action", { ...ctx, item });
      };
      const msg = typeof item.confirm === "function" ? item.confirm(ctx) : item.confirm;
      if (msg)
        confirmDlg.value = { message: msg, onOk: fire };
      else
        fire();
    }
    function exportRaw(col, value) {
      return col.type === "image" ? imageText(value) : value;
    }
    function exportCellOf(col, row, raw) {
      const v = raw === void 0 ? cellRawValue(col, row) : raw;
      return props.exportRawValues ? exportRaw(col, v) : printTextOf(col, row, v);
    }
    function summaryExportCell(col, srow) {
      const raw = srow[colIdOf(col)] ?? cellRawValue(col, srow);
      if ((raw == null || raw === "") && colIdOf(col) === summaryLabelColId.value)
        return t("grandTotal");
      return exportCellOf(col, srow, raw);
    }
    function scopeOf(params) {
      if (params == null ? void 0 : params.scope)
        return resolveExportScope(params.scope, selection.size);
      if (props.exportRange && props.exportRange !== "auto")
        return props.exportRange;
      if (params == null ? void 0 : params.onlySelected)
        return "selected";
      if (params && params.currentView === false)
        return "all";
      return resolveExportScope("auto", selection.size);
    }
    function exportRowSource() {
      return {
        selected: selectedRows(),
        display: rowModel.processed.value.displayRows,
        source: rowModel.sourceRows()
      };
    }
    function exportColumnsOf(params) {
      var _a2;
      let cols = gridCols.value.map((l) => l.col).filter((c) => !c.checkbox && !c.rowDrag);
      if ((_a2 = params == null ? void 0 : params.columnKeys) == null ? void 0 : _a2.length)
        cols = cols.filter((c) => params.columnKeys.includes(colIdOf(c)));
      return cols;
    }
    function warnIfLoadedOnly(scope) {
      if (props.dataMode !== "client" && (scope === "view" || scope === "all"))
        showToast(t("expLoadedHint"));
    }
    function viewMatrix(params) {
      const cols = exportColumnsOf(params);
      const matrix = [cols.map((c) => c.title || c.field || colIdOf(c))];
      const scope = scopeOf(params);
      pickExportRows(scope, exportRowSource(), true).forEach(
        (r) => matrix.push(cols.map((c) => exportCellOf(c, r)))
      );
      const srow = rowModel.summaryRow.value;
      if (scope === "view" && props.showSummary && srow)
        matrix.push(cols.map((c) => summaryExportCell(c, srow)));
      return matrix;
    }
    const exporting = ref(false);
    async function withExportBusy(run) {
      if (exporting.value)
        return;
      exporting.value = true;
      try {
        await nextTick();
        await new Promise((resolve) => setTimeout(() => resolve(), 30));
        run();
      } catch (e) {
        console.error("[RjGrid] export/print failed:", e);
      } finally {
        exporting.value = false;
      }
    }
    function doExport(type, params) {
      if (scopeOf(params) === "server") {
        if (type === "pdf") {
          showToast(t("expServerNoPdf"));
          withExportBusy(() => runExport("pdf", { ...params, scope: fallbackScope() }));
          return;
        }
        callServerExport(type, params);
        return;
      }
      warnIfLoadedOnly(scopeOf(params));
      withExportBusy(() => runExport(type, params));
    }
    function openRangeMenu(ev, fmt) {
      const canSelect = !!props.rowSelection;
      const sel = selection.size;
      const cnt = (n) => " · " + t("expCnt", { n });
      const items = [];
      if (canSelect)
        items.push({
          name: t("scopeSelected") + cnt(sel),
          disabled: () => sel === 0,
          action: () => runFormat(fmt, "selected")
        });
      items.push({
        name: t("scopeView") + cnt(dataDisplayRows.value.length),
        action: () => runFormat(fmt, "view")
      });
      if ((fmt === "csv" || fmt === "excel") && props.serverExport)
        items.push(
          { isSeparator: true },
          { name: t("scopeServer"), action: () => callServerExport(fmt) }
        );
      const el = ev.currentTarget;
      const r = el.getBoundingClientRect();
      openMenuAt(r.left, r.bottom + 6, items, r.top);
    }
    function runFormat(fmt, scope) {
      if (fmt === "print")
        doPrint({ scope });
      else
        doExport(fmt, { scope });
    }
    async function callServerExport(type, params) {
      const fn = props.serverExport;
      if (!fn) {
        showToast(t("expServerMissing"));
        return;
      }
      const p = {
        type,
        fileName: (params == null ? void 0 : params.fileName) || props.exportFileName || "rj-grid-export",
        columns: exportColumnsOf(params).map((c) => ({
          colId: colIdOf(c),
          field: c.field,
          title: c.title || c.field || colIdOf(c)
        })),
        state: getState(),
        paging: {
          pageNo: props.dataMode === "pagination" ? pagerPage.value : 1,
          pageSize: pagerSize.value,
          total: totalRowCount.value
        },
        selectedKeys: Array.from(selection.keys())
      };
      try {
        await fn(p);
      } catch (e) {
        console.error("[RjGrid] serverExport failed:", e);
        showToast(t("expFailed"));
      }
    }
    function runExport(type, params) {
      const name = (params == null ? void 0 : params.fileName) || props.exportFileName || "rj-grid-export";
      if (type === "pdf") {
        runPrint(params);
        return;
      }
      if (type === "csv") {
        downloadCsv(viewMatrix(params), name);
        return;
      }
      const cols = exportColumnsOf(params);
      const head = cols.map((c) => c.title || c.field || colIdOf(c));
      const widths = cols.map((c) => {
        var _a2;
        return ((_a2 = gridCols.value.find((l) => l.colId === colIdOf(c))) == null ? void 0 : _a2.width) || 120;
      });
      const sheets = [];
      const scope = scopeOf(params);
      const dataM = [head];
      const dataS = [1];
      pickExportRows(scope, exportRowSource(), false).forEach((r) => {
        dataM.push(cols.map((c) => exportCellOf(c, r)));
        dataS.push(0);
      });
      const srow = rowModel.summaryRow.value;
      if (scope === "view" && props.showSummary && srow) {
        dataM.push(cols.map((c) => summaryExportCell(c, srow)));
        dataS.push(2);
      }
      sheets.push({ name: t("sheetData"), matrix: dataM, colWidths: widths, rowStyles: dataS });
      if (scope === "view" && rowGroupFields.value.length) {
        const gM = [head];
        const gS = [1];
        rowModel.processed.value.displayRows.forEach((d) => {
          if (d.type === "group" && !d.isFooter) {
            gM.push(cols.map((c) => displayOf(c, cellRawValue(c, d.data), d.data, 0)));
            gS.push(2);
          } else if (d.type === "row") {
            gM.push(cols.map((c) => displayOf(c, cellRawValue(c, d.data), d.data, 0)));
            gS.push(0);
          }
        });
        sheets.push({ name: t("sheetGroup"), matrix: gM, colWidths: widths, rowStyles: gS });
      }
      if (sheets.length === 1)
        downloadXlsx(dataM, name, widths);
      else
        downloadXlsxWorkbook(sheets, name);
    }
    function buildPrintHeaderLevels(cols) {
      const info = headerRowsInfo.value;
      if (info.depth <= 1)
        return void 0;
      const exportIds = new Set(cols.map((c) => colIdOf(c)));
      const levels = [];
      for (let level = 0; level < info.depth; level++) {
        const cells = [];
        for (const cell of info.rows[level]) {
          let span;
          let rowSpan;
          if (cell.isGroup) {
            span = collectGroupLeafIds(cell.col).filter((id) => exportIds.has(id)).length;
            rowSpan = 1;
          } else {
            span = exportIds.has(cell.colId) ? 1 : 0;
            rowSpan = info.depth - level;
          }
          if (!span)
            continue;
          cells.push({ title: cell.col.title || cell.col.field || cell.colId, colSpan: span, rowSpan });
        }
        levels.push(cells);
      }
      return levels;
    }
    function printTextOf(col, row, raw) {
      const v = raw === void 0 ? cellRawValue(col, row) : raw;
      if (col.type === "image")
        return imageText(v);
      if (col.sparkline && Array.isArray(v))
        return v.join(" ");
      return displayOf(col, v, row, 0);
    }
    function buildPrintInput(params, limit = 0) {
      const cols = exportColumnsOf(params);
      const columns = cols.map((c) => {
        var _a2;
        return {
          title: c.title || c.field || colIdOf(c),
          width: ((_a2 = gridCols.value.find((l) => l.colId === colIdOf(c))) == null ? void 0 : _a2.width) || c.width || 120,
          align: c.align || (c.type === "num" || c.type === "money" || c.type === "percent" ? "right" : "left")
        };
      });
      const matrix = [];
      const rowStyles = [];
      const capped = limit > 0;
      const full = () => capped && matrix.length >= limit;
      const pushRow = (d, kind) => {
        matrix.push(cols.map((c) => printTextOf(c, d.data)));
        rowStyles.push(kind);
      };
      const scope = scopeOf(params);
      if (scope === "view") {
        for (const d of rowModel.processed.value.displayRows) {
          if (full())
            break;
          if (d.type === "group" && !d.isFooter)
            pushRow(d, 1);
          else if (d.type === "row")
            pushRow(d, 0);
        }
      } else {
        for (const r of pickExportRows(scope, exportRowSource(), false)) {
          if (full())
            break;
          matrix.push(cols.map((c) => printTextOf(c, r)));
          rowStyles.push(0);
        }
      }
      const srow = rowModel.summaryRow.value;
      if (scope === "view" && props.showSummary && srow && !full()) {
        matrix.push(
          cols.map((c) => {
            const raw = srow[colIdOf(c)] ?? cellRawValue(c, srow);
            if ((raw == null || raw === "") && colIdOf(c) === summaryLabelColId.value)
              return t("grandTotal");
            return printTextOf(c, srow, raw);
          })
        );
        rowStyles.push(2);
      }
      return { columns, headerLevels: buildPrintHeaderLevels(cols), matrix, rowStyles };
    }
    function printOpts(params) {
      const o = params || {};
      return {
        ...o,
        pageNumberText: o.pageNumberText ?? t("pageNumber"),
        docLang: o.docLang ?? normalizeLang(langRef.value),
        docTitle: o.docTitle ?? o.title ?? t("print")
      };
    }
    function getPrintHtml(params) {
      return buildPrintHtml(buildPrintInput(params), printOpts(params));
    }
    function fallbackScope() {
      return resolveExportScope("auto", selection.size);
    }
    function doPrint(params) {
      if (scopeOf(params) === "server") {
        showToast(t("expServerNoPdf"));
        const p = { ...params, scope: fallbackScope() };
        withExportBusy(() => runPrint(p));
        return;
      }
      warnIfLoadedOnly(scopeOf(params));
      withExportBusy(() => runPrint(params));
    }
    function printRowEstimate(scope) {
      if (scope === "view")
        return rowModel.processed.value.displayRows.reduce(
          (n, d) => n + (d.type === "row" || d.type === "group" && !d.isFooter ? 1 : 0),
          0
        );
      return pickExportRows(scope, exportRowSource(), false).length;
    }
    function runPrint(params) {
      const cap = props.printMaxRows;
      const total = printRowEstimate(scopeOf(params));
      const limit = cap > 0 && total > cap ? cap : 0;
      const input = buildPrintInput(params, limit);
      if (limit)
        showToast(t("printCap", { n: cap, total }));
      printHtml(input, printOpts(params));
    }
    const rowGroupPayload = computed(() => {
      void aggRev.value;
      return rowGroupFields.value.map((f) => {
        const col = colState.listLeafColumns().find((c) => c.field === f || colIdOf(c) === f);
        return { field: f, aggFunc: col == null ? void 0 : col.aggFunc };
      });
    });
    const groupSig = computed(
      () => rowGroupPayload.value.map((g) => g.field + ":" + (g.aggFunc || "")).join("|")
    );
    function syncServerCtx() {
      rowModel.setLoadCtx({
        sort: rowModel.sortStates.value,
        filters: Array.from(rowModel.filterModels.entries()).map(([field, model]) => ({
          field,
          model
        })),
        quickFilterText: rowModel.quickFilter.value,
        floatFilters: Array.from(rowModel.floatFilters.entries()).filter(([, v]) => v && v.trim()).map(([colId, value]) => ({ colId, value })),
        rowGroup: rowGroupPayload.value,
        advancedFilter: rowModel.advancedFilter.value
      });
    }
    function reloadServerSide() {
      const start = windowRange.value.start;
      rowModel.purgeServerSideCache();
      const bs = props.ssrmBlockSize || 100;
      rowModel.ensureServerBlocks(start, start + bs * 2 - 1);
    }
    watch(
      () => [
        rowModel.sortStates.value,
        rowModel.quickFilter.value,
        activeFilterIds.value.length,
        floatSig.value,
        groupSig.value,
        rowModel.advancedFilter.value
      ],
      () => {
        syncServerCtx();
        if (props.dataMode !== "client" && props.loadData) {
          if (props.dataMode === "pagination")
            pagerPage.value = 1;
          if (props.dataMode === "serverSide")
            reloadServerSide();
          else
            rowModel.reloadServer();
        }
      }
    );
    watch([pagerPage, pagerSize], ([p, s]) => {
      if (props.dataMode === "pagination" && props.loadData) {
        syncServerCtx();
        rowModel.fetchPage(p, s);
        emit("page-change", { page: p, pageSize: s });
        dispatchEvent("paginationChanged", { page: p, pageSize: s });
      }
    });
    watch(
      () => rowModel.processed.value,
      () => dispatchEvent("modelUpdated", {})
    );
    function getState() {
      return {
        columns: colState.getColumnState(),
        sort: rowModel.sortStates.value,
        filters: Array.from(rowModel.filterModels.entries()).map(([field, model]) => ({
          field,
          model
        })),
        quickFilter: rowModel.quickFilter.value,
        floatFilters: floatValuesObj.value,
        advancedFilter: rowModel.advancedFilter.value ? JSON.parse(JSON.stringify(rowModel.advancedFilter.value)) : null,
        rowGroup: [...rowModel.rowGroupFields.value],
        pivot: { ...rowModel.pivotState.value },
        queryConditions: rowModel.queryConditions.value.map((c) => ({ ...c }))
      };
    }
    function setState(s) {
      var _a2;
      colState.applyColumnState(s.columns);
      const valid = /* @__PURE__ */ new Set();
      const addValid = (c) => {
        if (isInternalColKey(colIdOf(c)))
          return;
        valid.add(colIdOf(c));
        if (c.field && !isInternalColKey(c.field))
          valid.add(c.field);
      };
      collectLeaves(props.columns).forEach(addValid);
      pipelineCols.value.forEach(addValid);
      const ok = (k) => !!k && valid.has(k);
      rowModel.sortStates.value = (s.sort || []).filter((x) => ok(x.field));
      rowModel.filterModels.clear();
      (_a2 = s.filters) == null ? void 0 : _a2.forEach((f) => {
        if (ok(f.field))
          rowModel.filterModels.set(f.field, f.model);
      });
      rowModel.quickFilter.value = s.quickFilter || "";
      rowModel.floatFilters.clear();
      if (s.floatFilters)
        Object.entries(s.floatFilters).forEach(([k, v]) => {
          if (ok(k))
            rowModel.floatFilters.set(k, v);
        });
      syncFloatInput();
      rowModel.advancedFilter.value = s.advancedFilter ? { ...s.advancedFilter } : null;
      rowModel.rowGroupFields.value = (s.rowGroup || []).filter((f) => ok(f));
      rowModel.queryConditions.value = (s.queryConditions || []).filter((c) => ok(c.field));
      if (s.pivot)
        rowModel.pivotState.value = {
          cols: normalizePivotOrder((s.pivot.cols || []).filter((f) => ok(f))),
          values: normalizePivotOrder((s.pivot.values || []).filter((f) => ok(f))),
          active: !!s.pivot.active
        };
      editHistory.clear();
      rowModel.touch();
      scheduleSave();
    }
    function saveState() {
      if (!props.stateKey)
        return;
      try {
        localStorage.setItem(`rj-grid-state:${props.stateKey}`, JSON.stringify(getState()));
      } catch {
      }
    }
    const scheduleSave = debounce(saveState, 400);
    function resetState() {
      if (props.stateKey)
        localStorage.removeItem(`rj-grid-state:${props.stateKey}`);
      colState.resetColumnState();
      rowModel.sortStates.value = [];
      rowModel.filterModels.clear();
      rowModel.floatFilters.clear();
      rowModel.quickFilter.value = "";
      commitFloat.cancel();
      commitQuick.cancel();
      syncFloatInput();
      rowModel.rowGroupFields.value = [];
      rowModel.pivotState.value = { cols: [], values: [], active: false };
      rowModel.touch();
    }
    const chartOpen = ref(false);
    const panelOpen = ref(false);
    watch(panelOpen, (v) => dispatchEvent("toolPanelVisibleChanged", { visible: v }));
    const chartRows = computed(
      () => rowModel.processed.value.displayRows.filter((d) => d.type === "row").map((d) => d.data)
    );
    function scrollTo(rowIndex, colId) {
      const el = scrollerRef.value;
      if (!el)
        return;
      const offs = rowModel.offsets.value;
      el.scrollTop = Math.max((offs[rowIndex] ?? 0) - el.clientHeight / 3, 0);
      if (colId) {
        const leaf = gridCols.value.find((l) => l.colId === colId);
        if (leaf && !leaf.fixed)
          el.scrollLeft = Math.max(Math.min(leaf.x - 40, layout.value.totalWidth - el.clientWidth), 0);
      }
      scrollLeft.value = el.scrollLeft;
      scrollTop.value = el.scrollTop;
      syncFixedCanvas(el.scrollTop);
    }
    function nlqColumns() {
      const src = rowModel.sourceRows();
      const out = [];
      for (const leaf of gridCols.value) {
        const col = leaf.col;
        if (!col || !col.field)
          continue;
        if (leaf.colId === "__check" || leaf.colId === "__drag" || leaf.colId === "__group")
          continue;
        let filterType = "text";
        if (typeof col.filter === "string")
          filterType = col.filter;
        else if (col.type === "num" || col.type === "money" || col.type === "percent")
          filterType = "number";
        else if (col.type === "date" || col.type === "datetime")
          filterType = "date";
        const ed = col.editor;
        const edType = typeof ed === "string" ? ed : ed == null ? void 0 : ed.type;
        const eo = typeof ed === "string" ? void 0 : ed == null ? void 0 : ed.options;
        if (edType === "select" || edType === "richSelect")
          filterType = "select";
        let options;
        let strictOptions = false;
        const resolvedOpts = colOptionList(col);
        if (Array.isArray(eo) && eo.length) {
          filterType = "select";
          options = eo.map((o) => String((o == null ? void 0 : o.label) ?? (o == null ? void 0 : o.value) ?? o));
          strictOptions = true;
        } else if (resolvedOpts && resolvedOpts.length) {
          filterType = "select";
          options = flattenOptions(resolvedOpts).map((o) => String(o.label ?? o.value));
          strictOptions = true;
        } else if (filterType === "select") {
          const set = /* @__PURE__ */ new Set();
          for (const r of src) {
            const v = r[col.field];
            if (v != null && v !== "") {
              set.add(String(v));
              if (set.size > 60)
                break;
            }
          }
          if (set.size && set.size <= Math.max(8, Math.min(src.length, 40))) {
            options = [...set];
            strictOptions = props.dataMode === "client";
          }
        }
        out.push({
          colId: leaf.colId,
          field: col.field,
          title: col.title,
          filterType,
          options,
          strictOptions
        });
      }
      return out;
    }
    function applyNLQ(r) {
      if (!r.ok)
        return;
      rowModel.filterModels.clear();
      for (const f of r.filters)
        rowModel.filterModels.set(f.colId, f.model);
      rowModel.sortStates.value = r.sort ? [r.sort] : [];
      const prevGroup = rowModel.rowGroupFields.value.slice();
      if (r.groupColId) {
        const gcol = gridCols.value.find((l) => l.colId === r.groupColId);
        rowModel.rowGroupFields.value = gcol ? [gcol.col.field || r.groupColId] : [];
      } else {
        rowModel.rowGroupFields.value = [];
      }
      rowModel.quickFilter.value = r.search || "";
      rowModel.rowLimit.value = r.limit && r.limit > 0 ? r.limit : 0;
      rowModel.touch();
      emit("filter-change");
      if (rowModel.rowGroupFields.value.join("|") !== prevGroup.join("|"))
        emit("row-group-change", rowModel.rowGroupFields.value);
    }
    const apiObj = {
      getDisplayedRowAtIndex: (i) => {
        var _a2;
        return (_a2 = rowModel.processed.value.displayRows[i]) == null ? void 0 : _a2.data;
      },
      getDisplayedRowsCount: () => rowModel.processed.value.displayRows.length,
      /** 当前虚拟可见行区间 [start, end)（对标 AG Grid getVirtualRowRanges） */
      getVisibleRange: () => {
        const wr = windowRange.value;
        return { start: wr.start, end: wr.end };
      },
      applyTransaction: (tx) => {
        rowModel.applyTransaction(tx);
        scheduleSave();
      },
      applyTransactionAsync: async (tx) => {
        if (props.dataMode === "serverSide")
          rowModel.ssrmBatcher.push(tx);
        else
          rowModel.applyTransaction(tx);
      },
      refreshServerSide: (params) => {
        if (props.dataMode !== "serverSide")
          return;
        if ((params == null ? void 0 : params.purge) === false) {
          const wr = windowRange.value;
          rowModel.ensureServerBlocks(wr.start, Math.max(wr.start, wr.end - 1));
        } else
          reloadServerSide();
      },
      purgeServerSideCache: () => rowModel.purgeServerSideCache(),
      setRowData: (rows) => rowModel.setRowData(rows),
      updateRow: (row) => rowModel.applyTransaction({ update: [row] }),
      getCellValue: (rowIndex, field) => {
        const d = rowModel.processed.value.displayRows[rowIndex];
        if (!d)
          return void 0;
        const col = pipelineCols.value.find((c) => c.field === field || colIdOf(c) === field);
        return col ? cellRawValue(col, d.data) : d.data[field];
      },
      setCellValue: (rowIndex, field, value) => {
        const d = rowModel.processed.value.displayRows[rowIndex];
        const col = pipelineCols.value.find((c) => c.field === field || colIdOf(c) === field);
        if (!d || !col)
          return;
        const oldValue = cellRawValue(col, d.data);
        rowModel.setRowValue(d.data, col, value);
        emit("cell-value-changed", { row: d.data, colId: colIdOf(col), newValue: value, oldValue });
      },
      getSelectedRows: () => selectedRows(),
      getSelectedKeys: () => Array.from(selection),
      openRowForm: (rows) => openRowForm(rows),
      openRowFormAdd: (preset) => openRowFormAdd(preset),
      setRowSelection: (row, selected) => {
        const k = rowKeyOf(row, props.rowKey);
        if (selected) {
          if (props.rowSelection === "single")
            selection.clear();
          selection.add(k);
          if (props.keepSelectionCrossPage)
            preserveMap.set(k, row);
        } else {
          selection.delete(k);
          preserveMap.delete(k);
        }
        notifySelection();
      },
      selectAll: () => toggleAll(),
      clearSelection: () => {
        selection.clear();
        preserveMap.clear();
        emit("selection-change", []);
        dispatchEvent("rowSelectionChanged", { selected: [] });
      },
      setSort: (sorts) => {
        rowModel.sortStates.value = sorts;
        rowModel.touch();
        emit("sort-change", sorts);
        dispatchEvent("sortChanged", { sort: sorts });
      },
      setFilterModel: (field, model) => {
        if (model)
          rowModel.filterModels.set(field, model);
        else
          rowModel.filterModels.delete(field);
        rowModel.touch();
        emit("filter-change");
        dispatchEvent("filterChanged", { colId: field });
      },
      clearAllFilters: () => {
        rowModel.filterModels.clear();
        rowModel.floatFilters.clear();
        rowModel.advancedFilter.value = null;
        rowModel.quickFilter.value = "";
        commitFloat.cancel();
        commitQuick.cancel();
        syncFloatInput();
        rowModel.touch();
        emit("filter-change");
        dispatchEvent("filterChanged", {});
        scheduleSave();
      },
      setQuickFilter: (text) => {
        rowModel.quickFilter.value = text;
        rowModel.touch();
        emit("filter-change");
        dispatchEvent("filterChanged", {});
      },
      setAdvancedFilter: (model) => {
        if (model)
          applyAdvancedFilter(model);
        else
          clearAdvancedFilter();
      },
      getAdvancedFilter: () => rowModel.advancedFilter.value,
      openAdvancedFilter: () => openAdvancedFilter(),
      setRowGroup: (fields) => {
        rowModel.rowGroupFields.value = fields;
        emit("row-group-change", fields);
        dispatchEvent("rowGroupChanged", { groupedColumns: fields.slice() });
        scheduleSave();
      },
      /** NLQ/外部设置「取前 N」显示限量（0=不限量）；供重置等场景显式复位 */
      setRowLimit: (n) => {
        rowModel.rowLimit.value = n && n > 0 ? n : 0;
        rowModel.touch();
      },
      expandAll: () => rowModel.expandAll(),
      collapseAll: () => rowModel.collapseAll(),
      setPivot: (cols, values) => {
        rowModel.pivotState.value = { cols, values, active: true };
        scheduleSave();
      },
      scrollTo,
      startEditing: (rowIndex, colId) => {
        const c = gridCols.value.findIndex((l) => l.colId === colId);
        if (c >= 0)
          startEdit(rowIndex, c);
      },
      stopEditing: () => stopEdit(),
      undoCellEditing: () => undoEdit(),
      redoCellEditing: () => redoEdit(),
      canUndo: () => editHistory.canUndo(),
      canRedo: () => editHistory.canRedo(),
      // 脏格 API（对标 AG Grid dirty cells）
      isDirty: () => dirtyMap.value.size > 0,
      isCellDirty: (rowIndex, colId) => {
        const drow = rowModel.processed.value.displayRows[rowIndex];
        return drow ? dirtyMap.value.has(dirtyKey(drow.data, colId)) : false;
      },
      getDirtyCells: () => Array.from(dirtyMap.value.values()).map((info) => {
        const col = colByColId(info.colId);
        return {
          row: info.data,
          colId: info.colId,
          oldValue: info.orig,
          newValue: col ? cellRawValue(col, info.data) : info.data[info.colId]
        };
      }),
      getDirtyRows: () => {
        const seen = /* @__PURE__ */ new Set();
        dirtyMap.value.forEach((info) => seen.add(info.data));
        return Array.from(seen);
      },
      clearDirtyCells: () => {
        dirtyMap.value.clear();
      },
      recalculate: (_force) => {
        rowModel.touch();
      },
      setCellFormula: (rowIndex, colId, formula) => {
        const d = rowModel.processed.value.displayRows[rowIndex];
        if (!d || d.type !== "row")
          return;
        if (formula && isFormula(formula))
          cellFormulas.set(dirtyKey(d.data, colId), formula);
        else
          cellFormulas.delete(dirtyKey(d.data, colId));
        rowModel.touch();
      },
      getCellFormula: (rowIndex, colId) => {
        const d = rowModel.processed.value.displayRows[rowIndex];
        return d ? cellFormulas.get(dirtyKey(d.data, colId)) : void 0;
      },
      hasFormula: () => cellFormulas.size > 0 || colState.listLeafColumns().some((c) => !!c.formula),
      getCircularRefs: () => {
        const out = [];
        const cols = gridCols.value;
        rowModel.processed.value.displayRows.forEach((d, ri) => {
          if (d.type !== "row")
            return;
          cols.forEach((leaf) => {
            if (cellRawValue(leaf.col, d.data) === "#CIRCULAR!")
              out.push({ row: ri, colId: leaf.colId });
          });
        });
        return out;
      },
      exportData: (params) => doExport((params == null ? void 0 : params.type) === "excel" ? "excel" : (params == null ? void 0 : params.type) === "pdf" ? "pdf" : "csv", params),
      exportCurrentAsCsv: () => doExport("csv"),
      print: (params) => doPrint(params),
      getPrintHtml: (params) => getPrintHtml(params),
      copySelectedToClipboard: () => {
        const rows = selectedRows();
        if (!rows.length)
          return;
        const cols = colState.listLeafColumns().filter((c) => !c.checkbox && !c.rowDrag);
        writeClipboard(
          toTsv([
            cols.map((c) => c.title || c.field || colIdOf(c)),
            ...rows.map((r) => cols.map((c) => exportRaw(c, cellRawValue(c, r))))
          ])
        );
      },
      getState,
      setState,
      refresh: () => rowModel.touch(),
      refreshCells: () => rowModel.touch(),
      getRangeSelection: () => {
        const rg = interaction.range.value;
        return rg ? { start: { ...rg.start }, end: { ...rg.end } } : null;
      },
      clearRangeSelection: () => interaction.clearSelection(),
      // 列便利方法（对齐 AG Grid column API）
      getColumns: () => colState.listLeafColumns().map((c) => ({ colId: colIdOf(c), field: c.field, title: c.title })),
      isColumnHidden: (colId) => colState.isColumnHidden(colId),
      setColumnVisible: (colId, visible) => {
        if (colState.isColumnHidden(colId) === !visible)
          return;
        colState.toggleHide(colId, !visible);
        dispatchEvent("columnVisible", { column: colId });
        dispatchEvent("columnEverythingChanged", {});
        scheduleSave();
      },
      setColumnPinned: (colId, pinned) => onPanelTogglePin(colId, pinned),
      setColumnWidth: (colId, width) => {
        colState.resize(colId, width);
        dispatchEvent("columnResized", { column: colId, width });
        scheduleSave();
      },
      autoSizeColumn: (colId) => autoWidth(colId),
      autoSizeAll: () => {
        gridCols.value.forEach((l) => autoWidth(l.colId));
        dispatchEvent("columnEverythingChanged", {});
      },
      sizeColumnsToFit: () => {
        colState.sizeToFit();
        scheduleSave();
        dispatchEvent("columnEverythingChanged", {});
      },
      /** 清除宽度覆盖：把列宽还原到列定义/内容自适应默认值（配合 autoSizeAll 做「自适应↔还原」切换） */
      resetColumnWidths: () => {
        colState.clearWidths();
        applyDefaultAutoWidths();
        scheduleSave();
        dispatchEvent("columnEverythingChanged", {});
      },
      // 主题 / i18n（运行时切换）
      setTheme: (params) => {
        themeState.value = { ...params };
      },
      getTheme: () => themeState.value,
      setLang: (lang) => {
        langRef.value = lang;
      },
      setLocaleText: (patch) => {
        localeOverride.value = { ...localeOverride.value || {}, ...patch };
      },
      parseQuery: (text) => parseNLQ(text, nlqColumns()),
      applyQuery: (text) => {
        const r = parseNLQ(text, nlqColumns());
        applyNLQ(r);
        dispatchEvent("queryApplied", { text, result: r });
        return r;
      },
      forEachNode: (fn) => rowModel.processed.value.displayRows.forEach((d, i) => fn(d.data, i, d)),
      // 动态事件订阅（AG Grid 风格）
      addEventListener,
      removeEventListener,
      dispatchEvent
    };
    const imgPreview = ref("");
    function onDocPointerDown(e) {
      var _a2, _b, _c, _d, _e;
      const t2 = e.target;
      if (menu.value && !((_a2 = t2 == null ? void 0 : t2.closest) == null ? void 0 : _a2.call(t2, ".rj-menu, .rj-export-btn, .rj-view-btn")))
        menu.value = null;
      if (filterMenu.value && !((_b = t2 == null ? void 0 : t2.closest) == null ? void 0 : _b.call(t2, ".rj-popup")))
        filterMenu.value = null;
      if (colMenu.value && !((_c = t2 == null ? void 0 : t2.closest) == null ? void 0 : _c.call(t2, ".rj-colmenu")))
        colMenu.value = null;
      if (imgPreview.value && !((_d = t2 == null ? void 0 : t2.closest) == null ? void 0 : _d.call(t2, ".rj-img-viewer")))
        imgPreview.value = "";
      if (quickPop.value && !((_e = t2 == null ? void 0 : t2.closest) == null ? void 0 : _e.call(t2, ".rj-quick-pop, .rj-quick-btn")))
        quickPop.value = null;
    }
    function onDocKeyDown(e) {
      if (e.key !== "Escape")
        return;
      if (imgPreview.value) {
        imgPreview.value = "";
        return;
      }
      if (colMenu.value || menu.value || filterMenu.value || quickPop.value) {
        colMenu.value = null;
        menu.value = null;
        filterMenu.value = null;
        quickPop.value = null;
      }
    }
    function evalActionFlag(v, ctx, def = false) {
      if (v == null)
        return def;
      return typeof v === "function" ? !!v(ctx) : !!v;
    }
    function runCellAction(action, params) {
      const ctx = { ...params, action, api: apiObj };
      if (evalActionFlag(action.disabled, ctx))
        return;
      const fire = () => {
        var _a2;
        (_a2 = action.onClick) == null ? void 0 : _a2.call(action, ctx);
        emit("cell-action", ctx);
      };
      const msg = typeof action.confirm === "function" ? action.confirm(ctx) : action.confirm;
      if (msg)
        confirmDlg.value = { message: msg, onOk: fire };
      else
        fire();
    }
    provide(RJ_CELL_ACTIONS_KEY, {
      run: runCellAction,
      openOverflow: (el, actions, params) => {
        const r = el.getBoundingClientRect();
        const items = actions.map((a) => {
          const ctx = { ...params, action: a, api: apiObj };
          return {
            name: (a.icon ? a.icon + " " : "") + (a.label || a.name),
            disabled: () => evalActionFlag(a.disabled, ctx),
            action: () => runCellAction(a, params)
          };
        });
        openMenuAt(r.left, r.bottom + 6, items, r.top, 180);
      }
    });
    watch(
      () => props.density,
      (v) => {
        const i = DENSITY_KEYS.indexOf(v);
        if (i >= 0)
          densityIdx.value = i;
      }
    );
    watch(
      () => props.columns,
      () => nextTick(applyDefaultAutoWidths)
    );
    watch(
      () => rowModel.processed.value.displayRows.length,
      (n, o) => {
        if (!o && n)
          nextTick(applyDefaultAutoWidths);
      },
      { flush: "post" }
    );
    onMounted(() => {
      nextTick(measure);
      nextTick(applyDefaultAutoWidths);
      if (scrollerRef.value) {
        ro = new ResizeObserver(() => measure());
        ro.observe(scrollerRef.value);
      }
      document.addEventListener("pointerdown", onDocPointerDown);
      document.addEventListener("keydown", onDocKeyDown);
      document.addEventListener("paste", onWinPaste);
      if (props.stateKey) {
        try {
          const raw = localStorage.getItem(`rj-grid-state:${props.stateKey}`);
          if (raw)
            setState(JSON.parse(raw));
        } catch {
        }
      }
      seedDefaultQuery();
      if (props.dataMode !== "client" && props.loadData) {
        syncServerCtx();
        if (props.dataMode === "serverSide") {
          nextTick(() => {
            const bs = props.ssrmBlockSize || 100;
            rowModel.ensureServerBlocks(0, bs * 2 - 1);
          });
        } else {
          rowModel.reloadServer();
        }
      }
      emit("ready", apiObj);
    });
    onBeforeUnmount(() => {
      ro == null ? void 0 : ro.disconnect();
      ro = null;
      if (dragRaf) {
        cancelAnimationFrame(dragRaf);
        dragRaf = 0;
      }
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", endRowDrag);
      window.removeEventListener("pointercancel", endRowDrag);
      document.body.style.cursor = "";
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
      document.removeEventListener("paste", onWinPaste);
      if (winPointerMove)
        window.removeEventListener("pointermove", winPointerMove);
      if (winPointerUp)
        window.removeEventListener("pointerup", winPointerUp);
    });
    __expose(apiObj);
    return (_ctx, _cache) => {
      var _a2, _b, _c;
      return openBlock(), createElementBlock("div", {
        ref_key: "rootRef",
        ref: rootRef,
        class: normalizeClass(["rj-grid", rootClass.value]),
        style: normalizeStyle(rootStyle.value),
        tabindex: "0",
        role: "group",
        "aria-label": _ctx.ariaLabel || t("ariaLabel"),
        "aria-rowcount": ariaRowCount.value,
        "aria-colcount": ariaColCount.value,
        "aria-multiselectable": _ctx.rowSelection === "multiple" || void 0,
        onKeydown: onRootKeydown
      }, [
        _ctx.showToolbar ? (openBlock(), createElementBlock("div", _hoisted_2, [
          createElementVNode("div", _hoisted_3, [
            renderSlot(_ctx.$slots, "toolbar", { api: apiObj }),
            _ctx.queryable ? (openBlock(), createBlock(_sfc_main$5, {
              key: 0,
              modelValue: unref(queryConditions),
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(queryConditions) ? queryConditions.value = $event : null),
              fields: queryFieldDefs.value,
              actions: _ctx.queryActions,
              "selected-rows": selectedRows(),
              onSearch: onQuerySearch,
              onReset: onQueryReset,
              onActionClick: runQueryAction
            }, createSlots({ _: 2 }, [
              _ctx.$slots["query-actions"] ? {
                name: "actions",
                fn: withCtx(({ rows: sel }) => [
                  renderSlot(_ctx.$slots, "query-actions", {
                    api: apiObj,
                    rows: sel,
                    openRowForm,
                    openRowFormAdd
                  })
                ]),
                key: "0"
              } : void 0
            ]), 1032, ["modelValue", "fields", "actions", "selected-rows"])) : createCommentVNode("", true),
            selection.size ? (openBlock(), createElementBlock("span", _hoisted_4, toDisplayString(t("selRows", { n: selection.size })), 1)) : createCommentVNode("", true)
          ]),
          createElementVNode("div", _hoisted_5, [
            pagerAtTop.value ? (openBlock(), createBlock(_sfc_main$8, {
              key: 0,
              class: "rj-pager-inline",
              variant: "top",
              page: pagerPage.value,
              "onUpdate:page": _cache[1] || (_cache[1] = ($event) => pagerPage.value = $event),
              "page-size": pagerSize.value,
              "onUpdate:pageSize": _cache[2] || (_cache[2] = ($event) => pagerSize.value = $event),
              total: unref(rowModel).serverTotal.value
            }, null, 8, ["page", "page-size", "total"])) : createCommentVNode("", true)
          ])
        ])) : createCommentVNode("", true),
        _ctx.viewable ? (openBlock(), createBlock(_sfc_main$1, {
          key: 1,
          ref_key: "viewMgrRef",
          ref: viewMgrRef,
          "cond-count": activeQueryCount.value,
          "col-count": liveColCount.value,
          onSave: onSaveView
        }, null, 8, ["cond-count", "col-count"])) : createCommentVNode("", true),
        quickPop.value ? (openBlock(), createElementBlock("div", {
          key: 2,
          class: "rj-popup rj-quick-pop",
          style: normalizeStyle({ left: quickPop.value.x + "px", top: quickPop.value.y + "px" }),
          onClick: _cache[6] || (_cache[6] = withModifiers(() => {
          }, ["stop"]))
        }, [
          _cache[51] || (_cache[51] = createElementVNode("span", { class: "rj-quick-ico" }, "🔍", -1)),
          withDirectives(createElementVNode("input", {
            ref_key: "quickInputRef",
            ref: quickInputRef,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => quickInput.value = $event),
            class: "rj-input rj-quick-input",
            placeholder: t("quickSearch"),
            onKeyup: _cache[4] || (_cache[4] = withKeys(($event) => quickPop.value = null, ["enter"]))
          }, null, 40, _hoisted_6), [
            [vModelText, quickInput.value]
          ]),
          quickInput.value ? (openBlock(), createElementBlock("span", {
            key: 0,
            class: "rj-quick-clear",
            onClick: _cache[5] || (_cache[5] = ($event) => quickInput.value = "")
          }, "✕")) : createCommentVNode("", true)
        ], 4)) : createCommentVNode("", true),
        _ctx.groupable && _ctx.showGroupPanel || _ctx.showToolbar ? (openBlock(), createElementBlock("div", _hoisted_7, [
          _ctx.groupable && _ctx.showGroupPanel ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(["rj-drop-banner", { "is-over": bannerOver.value }]),
            onDragover: _cache[7] || (_cache[7] = withModifiers(($event) => bannerOver.value = true, ["prevent"])),
            onDragleave: _cache[8] || (_cache[8] = ($event) => bannerOver.value = false),
            onDrop: onDropBanner
          }, [
            !rowGroupFields.value.length ? (openBlock(), createElementBlock("span", _hoisted_8, toDisplayString(t("groupBanner")), 1)) : createCommentVNode("", true),
            (openBlock(true), createElementBlock(Fragment, null, renderList(rowGroupFields.value, (f, i) => {
              return openBlock(), createElementBlock("span", {
                key: f,
                class: "rj-group-chip"
              }, [
                createTextVNode(toDisplayString(titleOfField(f)) + " ", 1),
                createElementVNode("span", {
                  class: "rj-group-chip-close",
                  onClick: ($event) => removeGroup(i)
                }, "✕", 8, _hoisted_9)
              ]);
            }), 128))
          ], 34)) : createCommentVNode("", true),
          _ctx.showToolbar ? (openBlock(), createElementBlock("div", {
            key: 1,
            class: "rj-toolbar-right rj-tool-block",
            onDragover: _cache[21] || (_cache[21] = withModifiers(() => {
            }, ["stop"])),
            onDrop: _cache[22] || (_cache[22] = withModifiers(() => {
            }, ["stop"])),
            onPointerover: onTipOver,
            onPointerout: onTipOut,
            onFocusin: onTipOver,
            onFocusout: onTipOut
          }, [
            _ctx.quickFilterEnabled ? (openBlock(), createElementBlock("button", {
              key: 0,
              class: normalizeClass(["rj-btn rj-tool-btn rj-quick-btn", { "is-active": !!unref(rowModel).quickFilter.value }]),
              "data-tip": t("quickBtn"),
              "aria-label": t("quickBtn"),
              onClick: _cache[9] || (_cache[9] = ($event) => toggleQuickPop($event))
            }, "🔍", 10, _hoisted_10)) : createCommentVNode("", true),
            _ctx.viewable ? (openBlock(), createElementBlock("button", {
              key: 1,
              class: normalizeClass(["rj-btn rj-tool-btn rj-view-btn", { "is-active": !!currentViewId.value }]),
              "data-tip": t("viewBtn"),
              "aria-label": t("viewBtn"),
              onClick: _cache[10] || (_cache[10] = ($event) => openViewMenu($event))
            }, "◈", 10, _hoisted_11)) : createCommentVNode("", true),
            showExpandCollapse.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
              createElementVNode("button", {
                class: "rj-btn",
                onClick: _cache[11] || (_cache[11] = ($event) => unref(rowModel).expandAll())
              }, toDisplayString(t("expandAll")), 1),
              createElementVNode("button", {
                class: "rj-btn",
                onClick: _cache[12] || (_cache[12] = ($event) => unref(rowModel).collapseAll())
              }, toDisplayString(t("collapseAll")), 1)
            ], 64)) : createCommentVNode("", true),
            _ctx.chartable ? (openBlock(), createElementBlock("button", {
              key: 3,
              class: "rj-btn",
              onClick: _cache[13] || (_cache[13] = ($event) => chartOpen.value = true)
            }, toDisplayString(t("chart")), 1)) : createCommentVNode("", true),
            createElementVNode("button", {
              class: "rj-btn",
              "data-tip": t("density") + " · " + DENSITY_LABELS.value[densityIdx.value],
              "aria-label": t("density"),
              onClick: _cache[14] || (_cache[14] = ($event) => densityIdx.value = (densityIdx.value + 1) % 3)
            }, toDisplayString(["▤", "☰", "▥"][densityIdx.value]), 9, _hoisted_12),
            createElementVNode("button", {
              class: "rj-btn",
              "data-tip": dark.value ? t("toLight") : t("toDark"),
              "aria-label": dark.value ? t("toLight") : t("toDark"),
              onClick: _cache[15] || (_cache[15] = ($event) => toggleDark())
            }, toDisplayString(dark.value ? "☀" : "🌙"), 9, _hoisted_13),
            _ctx.toolPanel ? (openBlock(), createElementBlock("button", {
              key: 4,
              class: normalizeClass(["rj-btn", { "is-active": panelOpen.value }]),
              onClick: _cache[16] || (_cache[16] = ($event) => panelOpen.value = !panelOpen.value)
            }, toDisplayString(t("panel")), 3)) : createCommentVNode("", true),
            _ctx.exportable && (_ctx.showPrint || _ctx.showCsv || _ctx.showPdf || _ctx.showExcel) ? (openBlock(), createElementBlock("div", _hoisted_14, [
              _ctx.showPrint ? (openBlock(), createElementBlock("button", {
                key: 0,
                class: "rj-btn rj-btn-export rj-export-btn",
                "data-tip": t("printTip"),
                onClick: _cache[17] || (_cache[17] = ($event) => openRangeMenu($event, "print"))
              }, toDisplayString(t("printBtn")), 9, _hoisted_15)) : createCommentVNode("", true),
              _ctx.showCsv ? (openBlock(), createElementBlock("button", {
                key: 1,
                class: "rj-btn rj-btn-export rj-export-btn",
                "data-tip": t("csvTip"),
                onClick: _cache[18] || (_cache[18] = ($event) => openRangeMenu($event, "csv"))
              }, " CSV ", 8, _hoisted_16)) : createCommentVNode("", true),
              _ctx.showPdf ? (openBlock(), createElementBlock("button", {
                key: 2,
                class: "rj-btn rj-btn-export rj-export-btn",
                "data-tip": t("pdfTip"),
                onClick: _cache[19] || (_cache[19] = ($event) => openRangeMenu($event, "pdf"))
              }, " PDF ", 8, _hoisted_17)) : createCommentVNode("", true),
              _ctx.showExcel ? (openBlock(), createElementBlock("button", {
                key: 3,
                class: "rj-btn rj-btn-export rj-export-btn",
                "data-tip": t("excelTip"),
                onClick: _cache[20] || (_cache[20] = ($event) => openRangeMenu($event, "excel"))
              }, " Excel ", 8, _hoisted_18)) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            _ctx.stateKey ? (openBlock(), createElementBlock("button", {
              key: 6,
              class: "rj-btn",
              "data-tip": t("resetState"),
              "aria-label": t("resetState"),
              onClick: resetState
            }, "↺", 8, _hoisted_19)) : createCommentVNode("", true)
          ], 32)) : createCommentVNode("", true)
        ])) : createCommentVNode("", true),
        createElementVNode("div", _hoisted_20, [
          createElementVNode("div", {
            role: gridRole.value,
            style: { "flex": "1", "display": "flex", "flex-direction": "column", "min-width": "0", "position": "relative" }
          }, [
            createElementVNode("div", {
              class: "rj-header",
              style: normalizeStyle({ height: headerTotalHeight.value + frowH.value + "px" })
            }, [
              createVNode(_sfc_main$k, {
                "level-cells": levelCells.value,
                "total-width": layout.value.totalWidth,
                "scroll-left": scrollLeft.value,
                "header-row-height": headerRowHeight.value,
                "sort-states": unref(rowModel).sortStates.value,
                "active-filters": activeFilterIds.value,
                reorderable: _ctx.colReorder,
                "grid-slots": _ctx.$slots,
                "all-leaves": gridCols.value,
                "header-checked": allChecked.value,
                "header-indeterminate": someChecked.value,
                onSort,
                onOpenFilter: openFilter,
                onHeaderMenu: onHeaderContextMenu,
                onResize,
                onColDrop,
                onAutoWidth: autoWidth,
                onToggleCheckAll: toggleAll,
                floating: _ctx.floatingFilters,
                "float-values": floatValuesObj.value,
                "filter-row-height": FROW_H,
                onFloatFilter
              }, null, 8, ["level-cells", "total-width", "scroll-left", "header-row-height", "sort-states", "active-filters", "reorderable", "grid-slots", "all-leaves", "header-checked", "header-indeterminate", "floating", "float-values"]),
              layout.value.leftWidth ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: "rj-header-clip",
                style: normalizeStyle(headerClipStyle("left")),
                "aria-hidden": "true"
              }, [
                createVNode(_sfc_main$k, {
                  "level-cells": levelCells.value,
                  "total-width": layout.value.totalWidth,
                  "scroll-left": 0,
                  "header-row-height": headerRowHeight.value,
                  "sort-states": unref(rowModel).sortStates.value,
                  "active-filters": activeFilterIds.value,
                  "grid-slots": _ctx.$slots,
                  "all-leaves": gridCols.value,
                  "header-checked": allChecked.value,
                  "header-indeterminate": someChecked.value,
                  onSort,
                  onOpenFilter: openFilter,
                  onHeaderMenu: onHeaderContextMenu,
                  onResize,
                  onAutoWidth: autoWidth,
                  onToggleCheckAll: toggleAll,
                  floating: _ctx.floatingFilters,
                  "float-values": floatValuesObj.value,
                  "filter-row-height": FROW_H,
                  onFloatFilter
                }, null, 8, ["level-cells", "total-width", "header-row-height", "sort-states", "active-filters", "grid-slots", "all-leaves", "header-checked", "header-indeterminate", "floating", "float-values"])
              ], 4)) : createCommentVNode("", true),
              layout.value.rightWidth ? (openBlock(), createElementBlock("div", {
                key: 1,
                class: "rj-header-clip",
                style: normalizeStyle(headerClipStyle("right")),
                "aria-hidden": "true"
              }, [
                createVNode(_sfc_main$k, {
                  "level-cells": levelCells.value,
                  "total-width": layout.value.totalWidth,
                  "scroll-left": Math.max(layout.value.totalWidth - layout.value.rightWidth, 0),
                  "header-row-height": headerRowHeight.value,
                  "sort-states": unref(rowModel).sortStates.value,
                  "active-filters": activeFilterIds.value,
                  "grid-slots": _ctx.$slots,
                  "all-leaves": gridCols.value,
                  onSort,
                  onOpenFilter: openFilter,
                  onHeaderMenu: onHeaderContextMenu,
                  onResize,
                  onAutoWidth: autoWidth,
                  floating: _ctx.floatingFilters,
                  "float-values": floatValuesObj.value,
                  "filter-row-height": FROW_H,
                  onFloatFilter
                }, null, 8, ["level-cells", "total-width", "scroll-left", "header-row-height", "sort-states", "active-filters", "grid-slots", "all-leaves", "floating", "float-values"])
              ], 4)) : createCommentVNode("", true)
            ], 4),
            createElementVNode("div", {
              ref_key: "bodyWrapRef",
              ref: bodyWrapRef,
              class: "rj-body-wrap",
              onPointerdown: onBodyPointerDown,
              onDblclick: onBodyDblClick,
              onContextmenu: onBodyContextMenuRaw,
              onPointermove: onBodyPointerMove,
              onPointerleave: _cache[39] || (_cache[39] = ($event) => hoverKey.value = "")
            }, [
              createElementVNode("div", {
                ref_key: "scrollerRef",
                ref: scrollerRef,
                class: "rj-scroller",
                onScrollPassive: onScrollRaw
              }, [
                createElementVNode("div", {
                  class: "rj-canvas",
                  style: normalizeStyle({
                    width: layout.value.totalWidth + "px",
                    height: Math.max(unref(rowModel).totalHeight.value, 1) + "px"
                  })
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(visibleRows.value, (vr) => {
                    return openBlock(), createElementBlock("div", {
                      key: vr.row.key,
                      class: normalizeClass(["rj-row", rowClass(vr.row, vr.i)]),
                      role: "row",
                      "aria-rowindex": vr.i + headerRowsInfo.value.depth + 1,
                      "aria-selected": selection.has(vr.row.key) || void 0,
                      "data-rk": String(vr.row.key),
                      style: normalizeStyle({
                        top: vr.top + "px",
                        height: vr.row.height + "px",
                        width: layout.value.totalWidth + "px",
                        ...rowDragStyle(vr.i)
                      })
                    }, [
                      withDirectives(createElementVNode("div", _hoisted_23, null, 512), [
                        [vShow, isHoverRow(vr.row)]
                      ]),
                      vr.row.type === "row" || vr.row.type === "group" ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(cellsOf(vr.row, vr.i, windowLeaves.value), (cell) => {
                        return openBlock(), createBlock(_sfc_main$f, mergeProps({
                          key: cell.leaf.colId,
                          ref_for: true
                        }, cellProps(cell, vr), {
                          "grid-slots": _ctx.$slots,
                          onEditCommit: _cache[23] || (_cache[23] = ($event) => commitEdit($event)),
                          onEditCancel: _cache[24] || (_cache[24] = ($event) => stopEdit()),
                          onToggleCheck: ($event) => toggleRowKey(vr.row),
                          onToggleExpand: ($event) => onToggleExpand(vr.row),
                          onToggleDetail: ($event) => onToggleDetail(vr.row),
                          onRowDragStart: ($event) => startRowDrag($event, vr.row),
                          onImgPreview: _cache[25] || (_cache[25] = ($event) => imgPreview.value = $event)
                        }), null, 16, ["grid-slots", "onToggleCheck", "onToggleExpand", "onToggleDetail", "onRowDragStart"]);
                      }), 128)) : (openBlock(), createElementBlock("div", {
                        key: 1,
                        style: normalizeStyle({
                          position: "absolute",
                          left: scrollLeft.value + layout.value.leftWidth + "px",
                          width: Math.max(viewportW.value - layout.value.leftWidth - layout.value.rightWidth, 100) + "px",
                          height: "100%",
                          overflow: "auto"
                        })
                      }, [
                        vr.row.type === "detail" ? renderSlot(_ctx.$slots, "row-detail", {
                          key: 0,
                          row: vr.row.data,
                          api: apiObj
                        }) : renderSlot(_ctx.$slots, "full-row", {
                          key: 1,
                          row: vr.row.data,
                          api: apiObj
                        })
                      ], 4)),
                      unref(rangeRect) && vrInRange(vr.i) ? (openBlock(), createElementBlock("div", {
                        key: 2,
                        class: "rj-range-rect",
                        style: normalizeStyle(rangeStyleInRow(vr))
                      }, null, 4)) : createCommentVNode("", true)
                    ], 14, _hoisted_22);
                  }), 128)),
                  unref(interaction).activeRect.value ? (openBlock(), createElementBlock("div", {
                    key: 0,
                    class: "rj-active-rect",
                    style: normalizeStyle(activeRectStyle.value)
                  }, null, 4)) : createCommentVNode("", true),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(interaction).extraRanges.value, (er, ei) => {
                    return openBlock(), createElementBlock("div", {
                      key: "xr" + ei,
                      class: "rj-extra-rect",
                      style: normalizeStyle(extraRangeStyle(er))
                    }, null, 4);
                  }), 128)),
                  unref(interaction).range.value && unref(interaction).rangeRect.value ? (openBlock(), createElementBlock("div", {
                    key: 1,
                    class: "rj-fill-handle",
                    style: normalizeStyle(fillHandleStyle.value),
                    onPointerdown: _cache[26] || (_cache[26] = withModifiers(($event) => unref(interaction).startFill(), ["stop"]))
                  }, null, 36)) : createCommentVNode("", true)
                ], 4)
              ], 544),
              layout.value.leftWidth ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: "rj-fixed-layer",
                style: normalizeStyle(fixedLayerStyle("left")),
                onWheel: withModifiers(forwardWheel, ["prevent"])
              }, [
                createElementVNode("div", {
                  ref_key: "leftCanvasRef",
                  ref: leftCanvasRef,
                  class: "rj-fixed-canvas",
                  style: normalizeStyle(fixedCanvasStyle.value)
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(visibleRows.value, (vr) => {
                    return openBlock(), createElementBlock("div", {
                      key: vr.row.key,
                      class: normalizeClass(["rj-row", rowClass(vr.row, vr.i)]),
                      "data-rk": String(vr.row.key),
                      style: normalizeStyle({
                        top: vr.top + "px",
                        height: vr.row.height + "px",
                        width: layout.value.leftWidth + "px",
                        ...rowDragStyle(vr.i)
                      })
                    }, [
                      withDirectives(createElementVNode("div", _hoisted_25, null, 512), [
                        [vShow, isHoverRow(vr.row)]
                      ]),
                      vr.row.type === "row" || vr.row.type === "group" ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(cellsOf(vr.row, vr.i, layout.value.leftLeaves), (cell) => {
                        return openBlock(), createBlock(_sfc_main$f, mergeProps({
                          key: cell.leaf.colId,
                          ref_for: true
                        }, cellProps(cell, vr, "left"), {
                          "grid-slots": _ctx.$slots,
                          onEditCommit: _cache[27] || (_cache[27] = ($event) => commitEdit($event)),
                          onEditCancel: _cache[28] || (_cache[28] = ($event) => stopEdit()),
                          onToggleCheck: ($event) => toggleRowKey(vr.row),
                          onToggleExpand: ($event) => onToggleExpand(vr.row),
                          onToggleDetail: ($event) => onToggleDetail(vr.row),
                          onRowDragStart: ($event) => startRowDrag($event, vr.row),
                          onImgPreview: _cache[29] || (_cache[29] = ($event) => imgPreview.value = $event)
                        }), null, 16, ["grid-slots", "onToggleCheck", "onToggleExpand", "onToggleDetail", "onRowDragStart"]);
                      }), 128)) : (openBlock(), createElementBlock("div", _hoisted_26)),
                      unref(rangeRect) && vrInRange(vr.i) ? (openBlock(), createElementBlock("div", {
                        key: 2,
                        class: "rj-range-rect",
                        style: normalizeStyle(rangeStyleInRow(vr))
                      }, null, 4)) : createCommentVNode("", true)
                    ], 14, _hoisted_24);
                  }), 128))
                ], 4)
              ], 36)) : createCommentVNode("", true),
              layout.value.rightWidth ? (openBlock(), createElementBlock("div", {
                key: 1,
                class: "rj-fixed-layer",
                style: normalizeStyle(fixedLayerStyle("right")),
                onWheel: withModifiers(forwardWheel, ["prevent"])
              }, [
                createElementVNode("div", {
                  ref_key: "rightCanvasRef",
                  ref: rightCanvasRef,
                  class: "rj-fixed-canvas",
                  style: normalizeStyle(fixedCanvasStyle.value)
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(visibleRows.value, (vr) => {
                    return openBlock(), createElementBlock("div", {
                      key: vr.row.key,
                      class: normalizeClass(["rj-row", rowClass(vr.row, vr.i)]),
                      "data-rk": String(vr.row.key),
                      style: normalizeStyle({
                        top: vr.top + "px",
                        height: vr.row.height + "px",
                        width: layout.value.rightWidth + "px",
                        right: 0,
                        ...rowDragStyle(vr.i)
                      })
                    }, [
                      withDirectives(createElementVNode("div", _hoisted_28, null, 512), [
                        [vShow, isHoverRow(vr.row)]
                      ]),
                      vr.row.type === "row" || vr.row.type === "group" ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(cellsOf(vr.row, vr.i, layout.value.rightLeaves), (cell) => {
                        return openBlock(), createBlock(_sfc_main$f, mergeProps({
                          key: cell.leaf.colId,
                          ref_for: true
                        }, cellProps(cell, vr, "right"), {
                          "grid-slots": _ctx.$slots,
                          onEditCommit: _cache[30] || (_cache[30] = ($event) => commitEdit($event)),
                          onEditCancel: _cache[31] || (_cache[31] = ($event) => stopEdit()),
                          onToggleCheck: ($event) => toggleRowKey(vr.row),
                          onToggleExpand: ($event) => onToggleExpand(vr.row),
                          onToggleDetail: ($event) => onToggleDetail(vr.row),
                          onImgPreview: _cache[32] || (_cache[32] = ($event) => imgPreview.value = $event)
                        }), null, 16, ["grid-slots", "onToggleCheck", "onToggleExpand", "onToggleDetail"]);
                      }), 128)) : (openBlock(), createElementBlock("div", _hoisted_29)),
                      unref(rangeRect) && vrInRange(vr.i) ? (openBlock(), createElementBlock("div", {
                        key: 2,
                        class: "rj-range-rect",
                        style: normalizeStyle(rangeStyleInRow(vr, true))
                      }, null, 4)) : createCommentVNode("", true)
                    ], 14, _hoisted_27);
                  }), 128))
                ], 4)
              ], 36)) : createCommentVNode("", true),
              _ctx.loading || unref(rowModel).serverLoading.value || exporting.value ? (openBlock(), createElementBlock("div", _hoisted_30, [
                renderSlot(_ctx.$slots, "loading", {}, () => [
                  _cache[52] || (_cache[52] = createElementVNode("span", { class: "rj-spinner" }, null, -1)),
                  createElementVNode("span", null, toDisplayString(exporting.value ? t("exporting") : t("loading")), 1)
                ])
              ])) : !unref(rowModel).processed.value.displayRows.length ? (openBlock(), createElementBlock("div", _hoisted_31, [
                renderSlot(_ctx.$slots, "empty", {}, () => [
                  createElementVNode("span", _hoisted_32, toDisplayString(t("empty")), 1)
                ])
              ])) : createCommentVNode("", true),
              gridToast.value ? (openBlock(), createElementBlock("div", _hoisted_33, toDisplayString(gridToast.value), 1)) : createCommentVNode("", true),
              unref(findOpen) ? (openBlock(), createElementBlock("div", _hoisted_34, [
                withDirectives(createElementVNode("input", {
                  ref_key: "findInputRef",
                  ref: findInputRef,
                  "onUpdate:modelValue": _cache[33] || (_cache[33] = ($event) => isRef(findQuery) ? findQuery.value = $event : null),
                  class: "rj-input",
                  style: { "width": "180px" },
                  placeholder: t("findPlaceholder"),
                  onKeydown: [
                    _cache[34] || (_cache[34] = withKeys(withModifiers(($event) => unref(gotoMatch)(unref(findActive) + ($event.shiftKey ? -1 : 1)), ["prevent"]), ["enter"])),
                    _cache[35] || (_cache[35] = withKeys(withModifiers(($event) => findOpen.value = false, ["prevent"]), ["esc"]))
                  ]
                }, null, 40, _hoisted_35), [
                  [vModelText, unref(findQuery)]
                ]),
                createElementVNode("span", _hoisted_36, toDisplayString(unref(findMatches).length ? unref(findActive) + 1 : 0) + "/" + toDisplayString(unref(findMatches).length), 1),
                createElementVNode("button", {
                  class: "rj-btn",
                  onClick: _cache[36] || (_cache[36] = ($event) => unref(gotoMatch)(unref(findActive) - 1))
                }, "▴"),
                createElementVNode("button", {
                  class: "rj-btn",
                  onClick: _cache[37] || (_cache[37] = ($event) => unref(gotoMatch)(unref(findActive) + 1))
                }, "▾"),
                createElementVNode("button", {
                  class: "rj-btn",
                  onClick: _cache[38] || (_cache[38] = ($event) => findOpen.value = false)
                }, "✕")
              ])) : createCommentVNode("", true)
            ], 544),
            (openBlock(true), createElementBlock(Fragment, null, renderList(visPinnedTop.value, (prow, pi) => {
              return openBlock(), createElementBlock("div", {
                key: "pt" + pi,
                class: "rj-summary",
                style: { "border-top": "none" }
              }, [
                createElementVNode("div", {
                  class: "rj-summary-row",
                  role: "row",
                  style: normalizeStyle({
                    width: layout.value.totalWidth + "px",
                    transform: `translateX(${-scrollLeft.value}px)`,
                    height: rowHeight.value + "px",
                    position: "relative"
                  })
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(pinCells(prow), (cell) => {
                    return openBlock(), createBlock(_sfc_main$f, mergeProps({
                      key: cell.leaf.colId,
                      ref_for: true
                    }, cellProps(cell, { row: pinnedAsDisplay(prow), i: -1 }), { "grid-slots": _ctx.$slots }), null, 16, ["grid-slots"]);
                  }), 128))
                ], 4),
                (openBlock(true), createElementBlock(Fragment, null, renderList(pinSideLayers(), (side) => {
                  return openBlock(), createElementBlock("div", {
                    key: "pt" + pi + side.key,
                    class: "rj-summary-clip",
                    style: normalizeStyle(side.style)
                  }, [
                    createElementVNode("div", {
                      class: "rj-summary-row",
                      role: "row",
                      style: normalizeStyle({
                        width: layout.value.totalWidth + "px",
                        transform: `translateX(${side.shift}px)`,
                        height: rowHeight.value + "px",
                        position: "relative"
                      })
                    }, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(pinCellsSide(prow, side.leaves), (cell) => {
                        return openBlock(), createBlock(_sfc_main$f, mergeProps({
                          key: cell.leaf.colId,
                          ref_for: true
                        }, cellProps(cell, { row: pinnedAsDisplay(prow), i: -1 }), { "grid-slots": _ctx.$slots }), null, 16, ["grid-slots"]);
                      }), 128))
                    ], 4)
                  ], 4);
                }), 128))
              ]);
            }), 128)),
            _ctx.showSummary && unref(rowModel).summaryRow.value && !pivotActive.value ? (openBlock(), createElementBlock("div", _hoisted_37, [
              createElementVNode("div", {
                class: "rj-summary-row",
                role: "row",
                style: normalizeStyle({
                  width: layout.value.totalWidth + "px",
                  transform: `translateX(${-scrollLeft.value}px)`,
                  height: rowHeight.value + "px",
                  position: "relative"
                })
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(gridCols.value, (leaf) => {
                  return openBlock(), createBlock(_sfc_main$f, mergeProps({
                    key: leaf.colId,
                    ref_for: true
                  }, pinRowCellProps(leaf, unref(rowModel).summaryRow.value, true), { "grid-slots": _ctx.$slots }), null, 16, ["grid-slots"]);
                }), 128))
              ], 4),
              (openBlock(true), createElementBlock(Fragment, null, renderList(pinSideLayers(), (side) => {
                return openBlock(), createElementBlock("div", {
                  key: "sm" + side.key,
                  class: "rj-summary-clip",
                  style: normalizeStyle(side.style)
                }, [
                  createElementVNode("div", {
                    class: "rj-summary-row",
                    role: "row",
                    style: normalizeStyle({
                      width: layout.value.totalWidth + "px",
                      transform: `translateX(${side.shift}px)`,
                      height: rowHeight.value + "px",
                      position: "relative"
                    })
                  }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(side.leaves, (leaf) => {
                      return openBlock(), createBlock(_sfc_main$f, mergeProps({
                        key: leaf.colId,
                        ref_for: true
                      }, pinRowCellProps(leaf, unref(rowModel).summaryRow.value, true), { "grid-slots": _ctx.$slots }), null, 16, ["grid-slots"]);
                    }), 128))
                  ], 4)
                ], 4);
              }), 128))
            ])) : createCommentVNode("", true),
            (openBlock(true), createElementBlock(Fragment, null, renderList(visPinnedBottom.value, (prow, pi) => {
              return openBlock(), createElementBlock("div", {
                key: "pb" + pi,
                class: "rj-summary"
              }, [
                createElementVNode("div", {
                  class: "rj-summary-row",
                  role: "row",
                  style: normalizeStyle({
                    width: layout.value.totalWidth + "px",
                    transform: `translateX(${-scrollLeft.value}px)`,
                    height: rowHeight.value + "px",
                    position: "relative"
                  })
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(pinCells(prow), (cell) => {
                    return openBlock(), createBlock(_sfc_main$f, mergeProps({
                      key: cell.leaf.colId,
                      ref_for: true
                    }, cellProps(cell, { row: pinnedAsDisplay(prow), i: -1 }), { "grid-slots": _ctx.$slots }), null, 16, ["grid-slots"]);
                  }), 128))
                ], 4),
                (openBlock(true), createElementBlock(Fragment, null, renderList(pinSideLayers(), (side) => {
                  return openBlock(), createElementBlock("div", {
                    key: "pb" + pi + side.key,
                    class: "rj-summary-clip",
                    style: normalizeStyle(side.style)
                  }, [
                    createElementVNode("div", {
                      class: "rj-summary-row",
                      role: "row",
                      style: normalizeStyle({
                        width: layout.value.totalWidth + "px",
                        transform: `translateX(${side.shift}px)`,
                        height: rowHeight.value + "px",
                        position: "relative"
                      })
                    }, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(pinCellsSide(prow, side.leaves), (cell) => {
                        return openBlock(), createBlock(_sfc_main$f, mergeProps({
                          key: cell.leaf.colId,
                          ref_for: true
                        }, cellProps(cell, { row: pinnedAsDisplay(prow), i: -1 }), { "grid-slots": _ctx.$slots }), null, 16, ["grid-slots"]);
                      }), 128))
                    ], 4)
                  ], 4);
                }), 128))
              ]);
            }), 128)),
            _ctx.dataMode === "infinite" && unref(rowModel).loadingMore.value ? (openBlock(), createElementBlock("div", _hoisted_38, toDisplayString(t("loadMore")), 1)) : createCommentVNode("", true)
          ], 8, _hoisted_21),
          _ctx.toolPanel && panelOpen.value ? (openBlock(), createBlock(_sfc_main$9, {
            key: 0,
            "leaf-list": panelLeaves.value,
            "pivot-leaf-list": panelCandidateLeaves.value,
            "pivot-value-default": pivotImplicitValues.value,
            "grouped-fields": rowGroupFields.value,
            pivot: pivotState.value,
            filters: panelFilters.value,
            "quick-filter": unref(rowModel).quickFilter.value,
            onToggleHide: onPanelToggleHide,
            onTogglePin: onPanelTogglePin,
            onColDrop,
            onGroupAdd: addGroup,
            onGroupRemove: removeGroupByField,
            onGroupDrop: onPanelDropGroup,
            onPivotDrop: onPanelDropPivotCol,
            onPivotEnable: togglePivot,
            onPivotToggle: pivotToggle,
            onSetAgg: setAgg,
            onFilterRemove: removePanelFilter,
            onFiltersClearAll: clearAllPanelFilters,
            onQuickClear: _cache[40] || (_cache[40] = ($event) => unref(rowModel).quickFilter.value = "")
          }, null, 8, ["leaf-list", "pivot-leaf-list", "pivot-value-default", "grouped-fields", "pivot", "filters", "quick-filter"])) : createCommentVNode("", true)
        ]),
        pagerAtBottom.value ? (openBlock(), createElementBlock("div", _hoisted_39, [
          createVNode(_sfc_main$8, {
            page: pagerPage.value,
            "onUpdate:page": _cache[41] || (_cache[41] = ($event) => pagerPage.value = $event),
            "page-size": pagerSize.value,
            "onUpdate:pageSize": _cache[42] || (_cache[42] = ($event) => pagerSize.value = $event),
            total: unref(rowModel).serverTotal.value
          }, null, 8, ["page", "page-size", "total"])
        ])) : createCommentVNode("", true),
        _ctx.statusBar ? (openBlock(), createElementBlock("div", _hoisted_40, [
          createElementVNode("div", _hoisted_41, [
            createElementVNode("span", null, toDisplayString(t("totalRows", { n: totalRowCount.value.toLocaleString() })), 1),
            selection.size ? (openBlock(), createElementBlock("span", _hoisted_42, "· " + toDisplayString(t("selRows", { n: selection.size })), 1)) : createCommentVNode("", true),
            props.markDirtyCells && dirtyCount.value ? (openBlock(), createElementBlock("span", _hoisted_43, "· " + toDisplayString(t("dirtyPending", { n: dirtyCount.value })), 1)) : createCommentVNode("", true),
            rangeStats.value ? (openBlock(), createElementBlock("span", _hoisted_44, "· " + toDisplayString(t("rangeSel", { r: rangeStats.value.rows, c: rangeStats.value.cols })), 1)) : createCommentVNode("", true),
            ssrmInfo.value ? (openBlock(), createElementBlock("span", _hoisted_45, [
              createTextVNode("· " + toDisplayString(t("ssrmCache", { b: ssrmInfo.value.blocks, r: ssrmInfo.value.loadedRows.toLocaleString() })), 1),
              unref(rowModel).serverLoading.value ? (openBlock(), createElementBlock("span", _hoisted_46, "（" + toDisplayString(t("loading")) + "）", 1)) : createCommentVNode("", true)
            ])) : createCommentVNode("", true)
          ]),
          rangeStats.value && rangeStats.value.perCol.length ? (openBlock(), createElementBlock("div", _hoisted_47, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(rangeStats.value.perCol.slice(0, 6), (pc) => {
              return openBlock(), createElementBlock("span", {
                key: pc.colId,
                class: "rj-status-agg"
              }, [
                createElementVNode("b", null, toDisplayString(pc.title), 1),
                (openBlock(true), createElementBlock(Fragment, null, renderList(pc.stats, (s) => {
                  return openBlock(), createElementBlock("i", {
                    key: s.key
                  }, toDisplayString(s.label) + " " + toDisplayString(s.value), 1);
                }), 128))
              ]);
            }), 128)),
            rangeStats.value.perCol.length > 6 ? (openBlock(), createElementBlock("span", _hoisted_48, toDisplayString(t("moreCols", { n: rangeStats.value.perCol.length - 6 })), 1)) : createCommentVNode("", true)
          ])) : createCommentVNode("", true)
        ])) : createCommentVNode("", true),
        filterMenu.value ? (openBlock(), createBlock(_sfc_main$e, {
          key: 6,
          column: filterMenu.value.col,
          "filter-type": filterMenu.value.type,
          model: filterMenu.value.model,
          x: filterMenu.value.x,
          y: filterMenu.value.y,
          "unique-values": filterMenu.value.unique,
          onApply: applyFilterMenu,
          onClear: clearFilterMenu,
          onAdvanced: openAdvancedFilter
        }, null, 8, ["column", "filter-type", "model", "x", "y", "unique-values"])) : createCommentVNode("", true),
        advDialog.value ? (openBlock(), createBlock(_sfc_main$c, {
          key: 7,
          model: unref(rowModel).advancedFilter.value,
          columns: advFilterColumns.value,
          x: advDialog.value.x,
          y: advDialog.value.y,
          onApply: applyAdvancedFilter,
          onClear: clearAdvancedFilter,
          onClose: _cache[43] || (_cache[43] = ($event) => advDialog.value = null)
        }, null, 8, ["model", "columns", "x", "y"])) : createCommentVNode("", true),
        tip.value ? (openBlock(), createElementBlock("div", {
          key: 8,
          class: "rj-tip",
          role: "tooltip",
          style: normalizeStyle({ left: tip.value.x + "px", top: tip.value.y + "px" })
        }, toDisplayString(tip.value.text), 5)) : createCommentVNode("", true),
        menu.value ? (openBlock(), createBlock(_sfc_main$b, {
          key: 9,
          items: menu.value.items,
          x: menu.value.x,
          y: menu.value.y,
          onSelect: onMenuSelect,
          onReposition: onMenuReposition
        }, null, 8, ["items", "x", "y"])) : createCommentVNode("", true),
        colMenu.value ? (openBlock(), createBlock(_sfc_main$a, {
          key: 10,
          col: colMenu.value.col,
          "col-id": colMenu.value.colId,
          x: colMenu.value.x,
          y: colMenu.value.y,
          "can-sort": colMenu.value.canSort,
          "can-filter": colMenu.value.canFilter,
          "can-group": colMenu.value.canGroup,
          "sort-dir": colMenu.value.sortDir,
          pinned: colMenuPinned.value,
          "filter-type": colMenu.value.filterType,
          "filter-model": colMenu.value.filterModel,
          "unique-values": colMenu.value.unique,
          columns: colMenuColumns.value,
          onSort: colMenuSort,
          onSelect: colMenuSelect,
          onAutosize: colMenuAutosize,
          onPin: colMenuPin,
          onHide: colMenuHide,
          onGroup: colMenuGroup,
          onApplyFilter: colMenuApplyFilter,
          onClearFilter: colMenuClearFilter,
          onAdvanced: openAdvancedFilter,
          onToggleColHide: colMenuToggleColHide,
          onToggleColPin: colMenuToggleColPin,
          onColDrop
        }, null, 8, ["col", "col-id", "x", "y", "can-sort", "can-filter", "can-group", "sort-dir", "pinned", "filter-type", "filter-model", "unique-values", "columns"])) : createCommentVNode("", true),
        chartOpen.value ? (openBlock(), createBlock(_sfc_main$7, {
          key: 11,
          columns: pipelineCols.value,
          rows: chartRows.value,
          onClose: _cache[44] || (_cache[44] = ($event) => chartOpen.value = false)
        }, null, 8, ["columns", "rows"])) : createCommentVNode("", true),
        rowFormDlg.value ? (openBlock(), createBlock(_sfc_main$4, {
          key: 12,
          fields: rowFormDlg.value.fields,
          rows: rowFormDlg.value.rows,
          mode: rowFormDlg.value.mode,
          title: rowFormDlg.value.mode === "add" ? (_a2 = rowFormCfg.value) == null ? void 0 : _a2.addTitle : (_b = rowFormCfg.value) == null ? void 0 : _b.title,
          width: (_c = rowFormCfg.value) == null ? void 0 : _c.width,
          onSubmit: onRowFormSubmit,
          onClose: _cache[45] || (_cache[45] = ($event) => rowFormDlg.value = null)
        }, null, 8, ["fields", "rows", "mode", "title", "width"])) : createCommentVNode("", true),
        confirmDlg.value ? (openBlock(), createBlock(_sfc_main$3, {
          key: 13,
          message: confirmDlg.value.message,
          onOk: onConfirmOk,
          onCancel: _cache[46] || (_cache[46] = ($event) => confirmDlg.value = null)
        }, null, 8, ["message"])) : createCommentVNode("", true),
        rowJsonDlg.value !== null ? (openBlock(), createBlock(_sfc_main$2, {
          key: 14,
          json: rowJsonDlg.value,
          onClose: _cache[47] || (_cache[47] = ($event) => rowJsonDlg.value = null)
        }, null, 8, ["json"])) : createCommentVNode("", true),
        dragGhost.value ? (openBlock(), createElementBlock("div", {
          key: 15,
          ref_key: "dragGhostRef",
          ref: dragGhostRef,
          class: "rj-drag-ghost",
          style: normalizeStyle({ transform: ghostInitTransform.value, height: dragGhost.value.h + "px" }),
          role: "presentation"
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(dragGhost.value.cells, (c, ci) => {
            return openBlock(), createElementBlock("span", {
              key: ci,
              class: normalizeClass(["rj-drag-ghost-cell", "is-" + c.kind]),
              style: normalizeStyle({ width: c.w + "px" })
            }, [
              c.kind === "img" ? (openBlock(), createElementBlock("span", _hoisted_49)) : c.kind === "spark" ? (openBlock(), createElementBlock("span", _hoisted_50)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                createTextVNode(toDisplayString(c.text), 1)
              ], 64))
            ], 6);
          }), 128)),
          !dragGhost.value.cells.length ? (openBlock(), createElementBlock("span", _hoisted_51, toDisplayString(t("dragRow")), 1)) : createCommentVNode("", true)
        ], 4)) : createCommentVNode("", true),
        imgPreview.value ? (openBlock(), createElementBlock("div", {
          key: 16,
          class: "rj-img-viewer",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("imgPreview"),
          onClick: _cache[49] || (_cache[49] = ($event) => imgPreview.value = ""),
          onPointerdown: _cache[50] || (_cache[50] = withModifiers(() => {
          }, ["stop"]))
        }, [
          createElementVNode("img", {
            src: imgPreview.value,
            alt: t("imgPreview"),
            onClick: _cache[48] || (_cache[48] = withModifiers(() => {
            }, ["stop"]))
          }, null, 8, _hoisted_53),
          createElementVNode("span", _hoisted_54, toDisplayString(resolvedIcons.value.close), 1)
        ], 40, _hoisted_52)) : createCommentVNode("", true)
      ], 46, _hoisted_1);
    };
  }
});
export {
  _sfc_main as RjGrid,
  activeQueryConditions,
  applyFormChanges,
  buildFormFields,
  createFormRow,
  defaultQueryOperator,
  deriveQueryFields,
  explainNLQ,
  formFieldKind,
  kindOfColumn,
  matchQueryValue,
  normalizeEditor,
  parseNLQ,
  queryActionConfirm,
  queryActionDisabled,
  queryOpsOfKind,
  rowPassesQuery
};
