# RjGrid 右冻结列在"内容窄于容器"时重复显示（幽灵列）

> 交付对象：rj-grid 组件仓。本工作区（join-cloud-vue3）对组件产物只读，故以本文档形式提需求，不在前端做 hack 规避。
> 复现版本：`rj-grid@0.2.7`（`node_modules/rj-grid/dist/rj-grid.js`）。

## 1. 现象

业务网格存在右冻结列（`fixed: 'right'`，如"操作"列）时，**当浏览器缩放变小 / 容器变宽，使列总宽 `totalWidth` ≤ 可视容器宽 `viewportW`（即无需横向滚动）时，该右冻结列会并排出现两次**：

- 靠左的一个：只有表头标题、下方无单元格数据（"幽灵列"），其排序/菜单图标被浮层压住 → 看起来是空的、无图标的一列；
- 靠右的一个：贴在容器右边缘，表头 + 单元格内容（如行内按钮）齐全，是真正生效的那列。

左冻结列（`fixed: 'left'`）**无此问题**。100% 缩放下若内容比容器宽（有横向滚动）也**不复现**——因为此时两个定位恰好重合。

## 2. 复现步骤

1. 一个 `data-mode="pagination"` 的 rj-grid，列总宽约 1900px，含一个 `fixed: 'right'` 的"操作"列（走 `#cell-action` 插槽渲染按钮）。
2. 页面实际渲染，浏览器缩放调到 75%（或把窗口拉宽到列总宽能完整放下）。
3. 观察右边缘：出现两个"操作"列，左边那个无数据。

参考业务页：`src/views/bd/material/index.vue` 的 `action` 列。

## 3. 根因

右冻结不是"就地 sticky"，而是用一个**独立浮层**（表头 `.rj-header-clip`、表体 `.rj-fixed-layer`）贴在**容器右边缘**渲染；与此同时，主表头 `.rj-header-main` 仍会把该列画在**内容右边缘**。两个边缘在"内容装得下"时不重合，于是各显示一次。

关键代码（`dist/rj-grid.js`）：

- **主表头渲染全部列**（含右冻结），右冻结单元格落在内容右边缘 `x = totalWidth - rightWidth`：
  - `gridCols = [...leftLeaves, ...normalLeaves, ...rightLeaves]`（约 L10478-10482）
  - `levelCells` 由 `gridCols` 推导 `x/width`（约 L10745-10775）
- **主表体只渲染普通列**（`windowLeaves` ← `normalLeaves`，约 L10820-10824），**不含**右冻结列 → 主表头那个右冻结单元格下方没有对应数据格，形成"幽灵表头 + 空格"。
- **右冻结浮层锚在容器右边缘 `right: 0`**：
  - 表头浮层 `headerClipStyle('right')` → `{ right: "0px", width: rightWidth + "px" }`（约 L11973-11974）
  - 表体浮层 `fixedLayerStyle('right')` → `{ position:"absolute", right:"0px", left:"auto", width: rightWidth + "px" }`（约 L11976-11993）

对照：左冻结浮层 `headerClipStyle('left')` / `fixedLayerStyle('left')` 都锚 `left: 0`，而主表头左冻结单元格天然也在 `[0, leftWidth]`，两者恒重合，所以左冻结永不重复。右冻结的锚点（容器边）与主表头落点（内容边）只有在"内容溢出、且滚动到最右"时才重合；一旦内容装得下，容器右边缘在内容右边缘之右侧，产生一个 `rightWidth` 宽的错位，浮层又用不透明背景 + `z-index:3` 盖住主表头右冻结单元格的右半（图标区），露出左半标题 → 即"无图标幽灵列"。

## 4. 修复建议（组件层）

核心：**当内容无需横向滚动（`totalWidth <= viewportW`）时，右冻结浮层的锚点从"容器右边缘"改为与主表头右冻结单元格重合的"内容右边缘"**，使浮层与主渲染列对齐、消除错位。

组件内已有两个量可用：`viewportW.value = el.clientWidth`（约 L10880）、`layout.value.totalWidth`。据此改 `headerClipStyle` 与 `fixedLayerStyle` 的 `right` 分支：

```ts
// 建议：内容装得下时，用 left 贴到内容右边缘，与主表头/主表体的右冻结落点对齐；
// 内容溢出时维持 right:0 贴容器边（滚动时冻结在视口右缘，符合预期）。
function headerClipStyle(side) {
  if (side === "left")
    return { left: "0px", width: layout.value.leftWidth + "px" };
  const fit = layout.value.totalWidth <= viewportW.value; // 内容无需横向滚动
  return fit
    ? { left: layout.value.totalWidth - layout.value.rightWidth + "px", width: layout.value.rightWidth + "px" }
    : { right: "0px", width: layout.value.rightWidth + "px" };
}
// fixedLayerStyle 的 right 分支同理：fit 时用 left = totalWidth - rightWidth，并保留 left:"auto" 的覆盖处理。
```

> 注：`fixedLayerStyle` 现有注释已提示"基类 `.rj-fixed-layer` 带 `left:0`，绝对定位下 `left` 会压过 `right`"。改走 `left` 定位时，务必同步确认基类默认 `left` 不干扰，且 `right` 显式置 `auto`。

**更彻底的方向（可选）**：让主表头/主表体在渲染时**排除右冻结列**（右冻结列只由浮层渲染），从源头消除"主渲染一份 + 浮层一份"的双份结构；如此无论内容是否装得下都不会重复。此改动面较大，需一并核对列虚拟滚动（`windowLeaves`）、列宽自适应 `sizeToFit`、拖拽重排落点等对 `totalWidth` 的依赖。

## 5. 边界与回归点

- **列宽自适应 / sizeToFit**：`fit` 判定依赖 `totalWidth` 与 `viewportW`，缩放窗口跨越"装得下/装不下"临界时，浮层锚点应即时切换，不得残留双列或跳位。
- **弹性列（`flex`）**：含 flex 列时 `totalWidth` 通常等于 `viewportW`，属"刚好装得下"，须走 `fit` 分支验证不重复。
- **多级表头 / 分组**：`levelCells` 的组单元格跨列宽度计算（`collectGroupLeafIds`）在 `fit` 分支下仍应与浮层对齐。
- **列显隐 / 冻结切换**：通过列菜单动态冻结/取消冻结右列时，`rightWidth` 变化后 `fit` 分支应重算。
- **横向滚动态**：`totalWidth > viewportW` 时必须保持现有 `right:0` 行为（滚动中冻结列钉在视口右缘），本次修复不得回退该场景。

## 6. 验收标准

1. 上述业务网格在浏览器缩放 50% / 75% / 100% / 125% 及任意窗口宽度下，右冻结"操作"列**始终只显示一个**，且带完整表头图标与行内按钮。
2. 内容溢出（有横向滚动）时，右冻结列滚动中稳定钉在视口右缘，行为与修复前一致（无回归）。
3. 左冻结列行为不变。
4. 列宽自适应、flex 列、多级表头、列显隐/冻结切换、拖拽重排等回归用例全绿。

## 7. 前端侧现状

`src/views/bd/material/index.vue` 的 `action` 列保留 `fixed: 'right'`（用法正确，不做 CSS 规避）。组件按本文修复并发版后，前端升级依赖即可，无需改页面代码。
