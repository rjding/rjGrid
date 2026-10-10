<template>
  <div
    ref="rootRef"
    class="rj-grid"
    :class="rootClass"
    :style="rootStyle"
    tabindex="0"
    role="group"
    :aria-label="ariaLabel || t('ariaLabel')"
    :aria-rowcount="ariaRowCount"
    :aria-colcount="ariaColCount"
    :aria-multiselectable="rowSelection === 'multiple' || undefined"
    @keydown="onRootKeydown"
  >
    <!-- 工具条 -->
    <div v-if="showToolbar" class="rj-toolbar">
      <div class="rj-toolbar-left">
        <slot name="toolbar" :api="apiObj"></slot>
        <!-- queryable：查询条件字段内联到左侧（原快速搜索位），默认预置 1 个条件 -->
        <RjQueryBar
          v-if="queryable"
          v-model="queryConditions"
          :fields="queryFieldDefs"
          :actions="queryActions"
          :selected-rows="selectedRows()"
          @search="onQuerySearch"
          @reset="onQueryReset"
          @action-click="runQueryAction"
        >
          <!-- #query-actions 覆盖轨：与声明式按钮并存，作用域交出 api/选中行/弹窗入口 -->
          <template v-if="$slots['query-actions']" #actions="{ rows: sel }">
            <slot
              name="query-actions"
              :api="apiObj"
              :rows="sel"
              :open-row-form="openRowForm"
              :open-row-form-add="openRowFormAdd"
            ></slot>
          </template>
        </RjQueryBar>
        <span v-if="selection.size" style="color: var(--rj-primary); font-size: 12px">{{
          t('selRows', { n: selection.size })
        }}</span>
      </div>
      <div class="rj-toolbar-right">
        <!-- 互换：分页块上移到工具条右上，与左上的查询条件/查询按钮同行，查询完不需下滚即可快速翻页 -->
        <RjPager
          v-if="pagerAtTop"
          class="rj-pager-inline"
          variant="top"
          v-model:page="pagerPage"
          v-model:page-size="pagerSize"
          :total="rowModel.serverTotal.value"
        />
      </div>
    </div>

    <!-- 自定义视图命名弹框：由视图菜单「存为新视图」唤起；仅渲染遮罩弹层（根内 fixed，不 Teleport），不再独占一行 -->
    <RjViewManager
      v-if="viewable"
      ref="viewMgrRef"
      :cond-count="activeQueryCount"
      :col-count="liveColCount"
      @save="onSaveView"
    />

    <!-- 快速搜索弹层：与列菜单/筛选菜单同族的根内同级 fixed 弹层（不 Teleport，保留 --rj 主题变量） -->
    <div
      v-if="quickPop"
      class="rj-popup rj-quick-pop"
      :style="{ left: quickPop.x + 'px', top: quickPop.y + 'px' }"
      @click.stop
    >
      <span class="rj-quick-ico">🔍</span>
      <input
        ref="quickInputRef"
        v-model="quickInput"
        class="rj-input rj-quick-input"
        :placeholder="t('quickSearch')"
        @keyup.enter="quickPop = null"
      />
      <span v-if="quickInput" class="rj-quick-clear" @click="quickInput = ''">✕</span>
    </div>

    <!-- 第二行（与原第一行右侧功能键块互换，即上一版分页器内联的位置）：左行分组拖放横幅（可选）+ 右功能键块 -->
    <div v-if="(groupable && showGroupPanel) || showToolbar" class="rj-second-bar">
      <div
        v-if="groupable && showGroupPanel"
        class="rj-drop-banner"
        :class="{ 'is-over': bannerOver }"
        @dragover.prevent="bannerOver = true"
        @dragleave="bannerOver = false"
        @drop="onDropBanner"
      >
        <span v-if="!rowGroupFields.length">{{ t('groupBanner') }}</span>
        <span v-for="(f, i) in rowGroupFields" :key="f" class="rj-group-chip">
          {{ titleOfField(f) }}
          <span class="rj-group-chip-close" @click="removeGroup(i)">✕</span>
        </span>
      </div>
      <div
        v-if="showToolbar"
        class="rj-toolbar-right rj-tool-block"
        @dragover.stop
        @drop.stop
        @pointerover="onTipOver"
        @pointerout="onTipOut"
        @focusin="onTipOver"
        @focusout="onTipOut"
      >
        <!-- 快速搜索按钮：点击弹出输入框（与导出弹框同族；靠近视口底部时自动向上弹） -->
        <button
          v-if="quickFilterEnabled"
          class="rj-btn rj-tool-btn rj-quick-btn"
          :class="{ 'is-active': !!rowModel.quickFilter.value }"
          :data-tip="t('quickBtn')"
          :aria-label="t('quickBtn')"
          @click="toggleQuickPop($event)"
          >🔍</button
        >
        <!-- 视图按钮：点击弹出视图菜单（切换 / 存为新视图 / 更新 / 删除） -->
        <button
          v-if="viewable"
          class="rj-btn rj-tool-btn rj-view-btn"
          :class="{ 'is-active': !!currentViewId }"
          :data-tip="t('viewBtn')"
          :aria-label="t('viewBtn')"
          @click="openViewMenu($event)"
          >◈</button
        >
        <template v-if="showExpandCollapse">
          <button class="rj-btn" @click="rowModel.expandAll()">{{ t('expandAll') }}</button>
          <button class="rj-btn" @click="rowModel.collapseAll()">{{ t('collapseAll') }}</button>
        </template>
        <button v-if="chartable" class="rj-btn" @click="chartOpen = true">{{ t('chart') }}</button>
        <button
          class="rj-btn"
          :data-tip="t('density') + ' · ' + DENSITY_LABELS[densityIdx]"
          :aria-label="t('density')"
          @click="densityIdx = (densityIdx + 1) % 3"
        >
          {{ ['▤', '☰', '▥'][densityIdx] }}
        </button>
        <button
          class="rj-btn"
          :data-tip="dark ? t('toLight') : t('toDark')"
          :aria-label="dark ? t('toLight') : t('toDark')"
          @click="toggleDark()"
          >{{ dark ? '☀' : '🌙' }}</button
        >
        <button
          v-if="toolPanel"
          class="rj-btn"
          :class="{ 'is-active': panelOpen }"
          @click="panelOpen = !panelOpen"
          >{{ t('panel') }}</button
        >
        <div
          v-if="exportable && (showPrint || showCsv || showPdf || showExcel)"
          class="rj-export-group"
        >
          <button
            v-if="showPrint"
            class="rj-btn rj-btn-export rj-export-btn"
            :data-tip="t('printTip')"
            @click="openRangeMenu($event, 'print')"
          >
            {{ t('printBtn') }}
          </button>
          <button
            v-if="showCsv"
            class="rj-btn rj-btn-export rj-export-btn"
            :data-tip="t('csvTip')"
            @click="openRangeMenu($event, 'csv')"
          >
            CSV
          </button>
          <button
            v-if="showPdf"
            class="rj-btn rj-btn-export rj-export-btn"
            :data-tip="t('pdfTip')"
            @click="openRangeMenu($event, 'pdf')"
          >
            PDF
          </button>
          <button
            v-if="showExcel"
            class="rj-btn rj-btn-export rj-export-btn"
            :data-tip="t('excelTip')"
            @click="openRangeMenu($event, 'excel')"
          >
            Excel
          </button>
        </div>
        <button v-if="stateKey" class="rj-btn" :data-tip="t('resetState')" :aria-label="t('resetState')" @click="resetState"
          >↺</button
        >
      </div>
    </div>

    <div style="display: flex; flex: 1; min-height: 0">
      <div
        :role="gridRole"
        style="flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative"
      >
        <!-- 表头 -->
        <div class="rj-header" :style="{ height: headerTotalHeight + frowH + 'px' }">
          <RjHeader
            :level-cells="levelCells"
            :total-width="layout.totalWidth"
            :scroll-left="scrollLeft"
            :header-row-height="headerRowHeight"
            :sort-states="rowModel.sortStates.value as any"
            :active-filters="activeFilterIds"
            :reorderable="colReorder"
            :grid-slots="$slots"
            :all-leaves="gridCols"
            :header-checked="allChecked"
            :header-indeterminate="someChecked"
            @sort="onSort"
            @open-filter="openFilter"
            @header-menu="onHeaderContextMenu"
            @resize="onResize"
            @col-drop="onColDrop"
            @auto-width="autoWidth"
            @toggle-check-all="toggleAll"
            :floating="floatingFilters"
            :float-values="floatValuesObj"
            :filter-row-height="FROW_H"
            @float-filter="onFloatFilter"
          />
          <div
            v-if="layout.leftWidth"
            class="rj-header-clip"
            :style="headerClipStyle('left')"
            aria-hidden="true"
          >
            <RjHeader
              :level-cells="levelCells"
              :total-width="layout.totalWidth"
              :scroll-left="0"
              :header-row-height="headerRowHeight"
              :sort-states="rowModel.sortStates.value as any"
              :active-filters="activeFilterIds"
              :grid-slots="$slots"
              :all-leaves="gridCols"
              :header-checked="allChecked"
              :header-indeterminate="someChecked"
              @sort="onSort"
              @open-filter="openFilter"
              @header-menu="onHeaderContextMenu"
              @resize="onResize"
              @auto-width="autoWidth"
              @toggle-check-all="toggleAll"
              :floating="floatingFilters"
              :float-values="floatValuesObj"
              :filter-row-height="FROW_H"
              @float-filter="onFloatFilter"
            />
          </div>
          <div
            v-if="layout.rightWidth"
            class="rj-header-clip"
            :style="headerClipStyle('right')"
            aria-hidden="true"
          >
            <RjHeader
              :level-cells="levelCells"
              :total-width="layout.totalWidth"
              :scroll-left="Math.max(layout.totalWidth - layout.rightWidth, 0)"
              :header-row-height="headerRowHeight"
              :sort-states="rowModel.sortStates.value as any"
              :active-filters="activeFilterIds"
              :grid-slots="$slots"
              :all-leaves="gridCols"
              @sort="onSort"
              @open-filter="openFilter"
              @header-menu="onHeaderContextMenu"
              @resize="onResize"
              @auto-width="autoWidth"
              :floating="floatingFilters"
              :float-values="floatValuesObj"
              :filter-row-height="FROW_H"
              @float-filter="onFloatFilter"
            />
          </div>
        </div>

        <!-- 主体 -->
        <div
          ref="bodyWrapRef"
          class="rj-body-wrap"
          @pointerdown="onBodyPointerDown"
          @dblclick="onBodyDblClick"
          @contextmenu="onBodyContextMenuRaw"
          @pointermove="onBodyPointerMove"
          @pointerleave="hoverKey = ''"
        >
          <div ref="scrollerRef" class="rj-scroller" @scroll.passive="onScrollRaw">
            <div
              class="rj-canvas"
              :style="{
                width: layout.totalWidth + 'px',
                height: Math.max(rowModel.totalHeight.value, 1) + 'px'
              }"
            >
              <div
                v-for="vr in visibleRows"
                :key="vr.row.key"
                class="rj-row"
                :class="rowClass(vr.row, vr.i)"
                role="row"
                :aria-rowindex="vr.i + headerRowsInfo.depth + 1"
                :aria-selected="selection.has(vr.row.key) || undefined"
                :data-rk="String(vr.row.key)"
                :style="{
                  top: vr.top + 'px',
                  height: vr.row.height + 'px',
                  width: layout.totalWidth + 'px',
                  ...rowDragStyle(vr.i)
                }"
              >
                <!-- 悬停行最左侧刷痕指示条：笔刷式 8px 展开动画，v-show 常驻节点避免滚动时反复挂载重播 -->
                <div class="rj-hover-brush" v-show="isHoverRow(vr.row)"></div>
                <template v-if="vr.row.type === 'row' || vr.row.type === 'group'">
                  <RjCell
                    v-for="cell in cellsOf(vr.row, vr.i, windowLeaves)"
                    :key="cell.leaf.colId"
                    v-bind="cellProps(cell, vr)"
                    :grid-slots="$slots"
                    @edit-commit="commitEdit($event)"
                    @edit-cancel="stopEdit()"
                    @toggle-check="toggleRowKey(vr.row)"
                    @toggle-expand="onToggleExpand(vr.row)"
                    @toggle-detail="onToggleDetail(vr.row)"
                    @row-drag-start="startRowDrag($event, vr.row)"
                    @img-preview="imgPreview = $event"
                  />
                </template>
                <div
                  v-else
                  :style="{
                    position: 'absolute',
                    left: scrollLeft + layout.leftWidth + 'px',
                    width: Math.max(viewportW - layout.leftWidth - layout.rightWidth, 100) + 'px',
                    height: '100%',
                    overflow: 'auto'
                  }"
                >
                  <slot
                    v-if="vr.row.type === 'detail'"
                    name="row-detail"
                    :row="vr.row.data"
                    :api="apiObj"
                  ></slot>
                  <slot v-else name="full-row" :row="vr.row.data" :api="apiObj"></slot>
                </div>
                <div
                  v-if="rangeRect && vrInRange(vr.i)"
                  class="rj-range-rect"
                  :style="rangeStyleInRow(vr)"
                ></div>
              </div>
              <div
                v-if="interaction.activeRect.value"
                class="rj-active-rect"
                :style="activeRectStyle"
              ></div>
              <div
                v-for="(er, ei) in interaction.extraRanges.value"
                :key="'xr' + ei"
                class="rj-extra-rect"
                :style="extraRangeStyle(er)"
              ></div>
              <div
                v-if="interaction.range.value && interaction.rangeRect.value"
                class="rj-fill-handle"
                :style="fillHandleStyle"
                @pointerdown.stop="interaction.startFill()"
              ></div>
            </div>
          </div>

          <!-- 左冻结层：外层定高裁切 + 内层单条 transform 跟滚，避免每帧改写 N 行的 top -->
          <div
            v-if="layout.leftWidth"
            class="rj-fixed-layer"
            :style="fixedLayerStyle('left')"
            @wheel.prevent="forwardWheel"
          >
            <div ref="leftCanvasRef" class="rj-fixed-canvas" :style="fixedCanvasStyle">
              <div
                v-for="vr in visibleRows"
                :key="vr.row.key"
                class="rj-row"
                :class="rowClass(vr.row, vr.i)"
                :data-rk="String(vr.row.key)"
                :style="{
                  top: vr.top + 'px',
                  height: vr.row.height + 'px',
                  width: layout.leftWidth + 'px',
                  ...rowDragStyle(vr.i)
                }"
              >
                <div class="rj-hover-brush" v-show="isHoverRow(vr.row)"></div>
                <template v-if="vr.row.type === 'row' || vr.row.type === 'group'">
                  <RjCell
                    v-for="cell in cellsOf(vr.row, vr.i, layout.leftLeaves)"
                    :key="cell.leaf.colId"
                    v-bind="cellProps(cell, vr, 'left')"
                    :grid-slots="$slots"
                    @edit-commit="commitEdit($event)"
                    @edit-cancel="stopEdit()"
                    @toggle-check="toggleRowKey(vr.row)"
                    @toggle-expand="onToggleExpand(vr.row)"
                    @toggle-detail="onToggleDetail(vr.row)"
                    @row-drag-start="startRowDrag($event, vr.row)"
                    @img-preview="imgPreview = $event"
                  />
                </template>
                <div
                  v-else
                  :style="{ position: 'absolute', inset: 0, background: 'inherit' }"
                ></div>
                <div
                  v-if="rangeRect && vrInRange(vr.i)"
                  class="rj-range-rect"
                  :style="rangeStyleInRow(vr)"
                ></div>
              </div>
            </div>
          </div>
          <!-- 右冻结层：同左层，单条 transform 跟滚 -->
          <div
            v-if="layout.rightWidth"
            class="rj-fixed-layer"
            :style="fixedLayerStyle('right')"
            @wheel.prevent="forwardWheel"
          >
            <div ref="rightCanvasRef" class="rj-fixed-canvas" :style="fixedCanvasStyle">
              <div
                v-for="vr in visibleRows"
                :key="vr.row.key"
                class="rj-row"
                :class="rowClass(vr.row, vr.i)"
                :data-rk="String(vr.row.key)"
                :style="{
                  top: vr.top + 'px',
                  height: vr.row.height + 'px',
                  width: layout.rightWidth + 'px',
                  right: 0,
                  ...rowDragStyle(vr.i)
                }"
              >
                <div class="rj-hover-brush" v-show="isHoverRow(vr.row)"></div>
                <template v-if="vr.row.type === 'row' || vr.row.type === 'group'">
                  <RjCell
                    v-for="cell in cellsOf(vr.row, vr.i, layout.rightLeaves)"
                    :key="cell.leaf.colId"
                    v-bind="cellProps(cell, vr, 'right')"
                    :grid-slots="$slots"
                    @edit-commit="commitEdit($event)"
                    @edit-cancel="stopEdit()"
                    @toggle-check="toggleRowKey(vr.row)"
                    @toggle-expand="onToggleExpand(vr.row)"
                    @toggle-detail="onToggleDetail(vr.row)"
                    @img-preview="imgPreview = $event"
                  />
                </template>
                <div
                  v-else
                  :style="{ position: 'absolute', inset: 0, background: 'inherit' }"
                ></div>
                <div
                  v-if="rangeRect && vrInRange(vr.i)"
                  class="rj-range-rect"
                  :style="rangeStyleInRow(vr, true)"
                ></div>
              </div>
            </div>
          </div>

          <!-- 加载 / 空态 -->
          <div v-if="loading || rowModel.serverLoading.value || exporting" class="rj-overlay">
            <slot name="loading"
              ><span class="rj-spinner"></span
              ><span>{{ exporting ? t('exporting') : t('loading') }}</span></slot
            >
          </div>
          <div
            v-else-if="!rowModel.processed.value.displayRows.length"
            class="rj-overlay"
            style="position: static; background: transparent; flex: 1"
          >
            <slot name="empty"
              ><span style="padding: 30px; color: var(--rj-text-secondary)">{{
                t('empty')
              }}</span></slot
            >
          </div>
          <!-- 轻提示：不能拖拽的原因等短消息（紧跟加载/空态之后，不参与其 v-else-if 链） -->
          <div v-if="gridToast" class="rj-grid-toast">{{ gridToast }}</div>

          <!-- 查找条 -->
          <div v-if="findOpen" class="rj-find-bar">
            <input
              ref="findInputRef"
              v-model="findQuery"
              class="rj-input"
              style="width: 180px"
              :placeholder="t('findPlaceholder')"
              @keydown.enter.prevent="gotoMatch(findActive + ($event.shiftKey ? -1 : 1))"
              @keydown.esc.prevent="findOpen = false"
            />
            <span style="font-size: 12px; color: var(--rj-text-secondary); white-space: nowrap"
              >{{ findMatches.length ? findActive + 1 : 0 }}/{{ findMatches.length }}</span
            >
            <button class="rj-btn" @click="gotoMatch(findActive - 1)">▴</button>
            <button class="rj-btn" @click="gotoMatch(findActive + 1)">▾</button>
            <button class="rj-btn" @click="findOpen = false">✕</button>
          </div>
        </div>

        <!-- 顶部钉住行 -->
        <div
          v-for="(prow, pi) in visPinnedTop"
          :key="'pt' + pi"
          class="rj-summary"
          style="border-top: none"
        >
          <div
            class="rj-summary-row"
            role="row"
            :style="{
              width: layout.totalWidth + 'px',
              transform: `translateX(${-scrollLeft}px)`,
              height: rowHeight + 'px',
              position: 'relative'
            }"
          >
            <RjCell
              v-for="cell in pinCells(prow)"
              :key="cell.leaf.colId"
              v-bind="cellProps(cell, { row: pinnedAsDisplay(prow), i: -1, top: 0 })"
              :grid-slots="$slots"
            />
          </div>
          <!-- 冻结列副本：钉行与合计行同样不参与左右冻结会令首列标签横滚就跑出可视区 -->
          <div
            v-for="side in pinSideLayers()"
            :key="'pt' + pi + side.key"
            class="rj-summary-clip"
            :style="side.style"
          >
            <div
              class="rj-summary-row"
              role="row"
              :style="{
                width: layout.totalWidth + 'px',
                transform: `translateX(${side.shift}px)`,
                height: rowHeight + 'px',
                position: 'relative'
              }"
            >
              <RjCell
                v-for="cell in pinCellsSide(prow, side.leaves)"
                :key="cell.leaf.colId"
                v-bind="cellProps(cell, { row: pinnedAsDisplay(prow), i: -1, top: 0 })"
                :grid-slots="$slots"
              />
            </div>
          </div>
        </div>
        <!-- 合计行 -->
        <div v-if="showSummary && rowModel.summaryRow.value && !pivotActive" class="rj-summary">
          <div
            class="rj-summary-row"
            role="row"
            :style="{
              width: layout.totalWidth + 'px',
              transform: `translateX(${-scrollLeft}px)`,
              height: rowHeight + 'px',
              position: 'relative'
            }"
          >
            <RjCell
              v-for="leaf in gridCols"
              :key="leaf.colId"
              v-bind="pinRowCellProps(leaf, rowModel.summaryRow.value, true)"
              :grid-slots="$slots"
            />
          </div>
          <div
            v-for="side in pinSideLayers()"
            :key="'sm' + side.key"
            class="rj-summary-clip"
            :style="side.style"
          >
            <div
              class="rj-summary-row"
              role="row"
              :style="{
                width: layout.totalWidth + 'px',
                transform: `translateX(${side.shift}px)`,
                height: rowHeight + 'px',
                position: 'relative'
              }"
            >
              <RjCell
                v-for="leaf in side.leaves"
                :key="leaf.colId"
                v-bind="pinRowCellProps(leaf, rowModel.summaryRow.value, true)"
                :grid-slots="$slots"
              />
            </div>
          </div>
        </div>
        <div v-for="(prow, pi) in visPinnedBottom" :key="'pb' + pi" class="rj-summary">
          <div
            class="rj-summary-row"
            role="row"
            :style="{
              width: layout.totalWidth + 'px',
              transform: `translateX(${-scrollLeft}px)`,
              height: rowHeight + 'px',
              position: 'relative'
            }"
          >
            <RjCell
              v-for="cell in pinCells(prow)"
              :key="cell.leaf.colId"
              v-bind="cellProps(cell, { row: pinnedAsDisplay(prow), i: -1, top: 0 })"
              :grid-slots="$slots"
            />
          </div>
          <div
            v-for="side in pinSideLayers()"
            :key="'pb' + pi + side.key"
            class="rj-summary-clip"
            :style="side.style"
          >
            <div
              class="rj-summary-row"
              role="row"
              :style="{
                width: layout.totalWidth + 'px',
                transform: `translateX(${side.shift}px)`,
                height: rowHeight + 'px',
                position: 'relative'
              }"
            >
              <RjCell
                v-for="cell in pinCellsSide(prow, side.leaves)"
                :key="cell.leaf.colId"
                v-bind="cellProps(cell, { row: pinnedAsDisplay(prow), i: -1, top: 0 })"
                :grid-slots="$slots"
              />
            </div>
          </div>
        </div>

        <div v-if="dataMode === 'infinite' && rowModel.loadingMore.value" class="rj-load-more">{{
          t('loadMore')
        }}</div>
      </div>

      <!-- 侧边工具面板 -->
      <RjToolPanel
        v-if="toolPanel && panelOpen"
        :leaf-list="panelLeaves"
        :pivot-leaf-list="panelCandidateLeaves"
        :pivot-value-default="pivotImplicitValues"
        :grouped-fields="rowGroupFields"
        :pivot="pivotState"
        :filters="panelFilters"
        :quick-filter="rowModel.quickFilter.value"
        @toggle-hide="onPanelToggleHide"
        @toggle-pin="onPanelTogglePin"
        @col-drop="onColDrop"
        @group-add="addGroup"
        @group-remove="removeGroupByField"
        @group-drop="onPanelDropGroup"
        @pivot-drop="onPanelDropPivotCol"
        @pivot-enable="togglePivot"
        @pivot-toggle="pivotToggle"
        @set-agg="setAgg"
        @filter-remove="removePanelFilter"
        @filters-clear-all="clearAllPanelFilters"
        @quick-clear="rowModel.quickFilter.value = ''"
      />
    </div>

    <!-- 分页（pagerPosition bottom/both）：表体之下独占一行 -->
    <div v-if="pagerAtBottom" class="rj-pager-bar">
      <RjPager
        v-model:page="pagerPage"
        v-model:page-size="pagerSize"
        :total="rowModel.serverTotal.value"
      />
    </div>

    <!-- 状态栏 -->
    <div v-if="statusBar" class="rj-status">
      <div class="rj-status-left">
        <span>{{ t('totalRows', { n: totalRowCount.toLocaleString() }) }}</span>
        <span v-if="selection.size">· {{ t('selRows', { n: selection.size }) }}</span>
        <span v-if="props.markDirtyCells && dirtyCount" class="rj-status-dirty"
          >· {{ t('dirtyPending', { n: dirtyCount }) }}</span
        >
        <span v-if="rangeStats"
          >· {{ t('rangeSel', { r: rangeStats.rows, c: rangeStats.cols }) }}</span
        >
        <span v-if="ssrmInfo" class="rj-status-ssrm"
          >· {{ t('ssrmCache', { b: ssrmInfo.blocks, r: ssrmInfo.loadedRows.toLocaleString() })
          }}<span v-if="rowModel.serverLoading.value">（{{ t('loading') }}）</span></span
        >
      </div>
      <div v-if="rangeStats && rangeStats.perCol.length" class="rj-status-right">
        <span v-for="pc in rangeStats.perCol.slice(0, 6)" :key="pc.colId" class="rj-status-agg">
          <b>{{ pc.title }}</b>
          <i v-for="s in pc.stats" :key="s.key">{{ s.label }} {{ s.value }}</i>
        </span>
        <span v-if="rangeStats.perCol.length > 6" class="rj-status-more">{{
          t('moreCols', { n: rangeStats.perCol.length - 6 })
        }}</span>
      </div>
    </div>

    <!-- 浮层 -->
    <RjFilterMenu
      v-if="filterMenu"
      :column="filterMenu.col"
      :filter-type="filterMenu.type"
      :model="filterMenu.model"
      :x="filterMenu.x"
      :y="filterMenu.y"
      :unique-values="filterMenu.unique"
      @apply="applyFilterMenu"
      @clear="clearFilterMenu"
      @advanced="openAdvancedFilter"
    />

    <RjAdvancedFilterDialog
      v-if="advDialog"
      :model="rowModel.advancedFilter.value"
      :columns="advFilterColumns"
      :x="advDialog.x"
      :y="advDialog.y"
      @apply="applyAdvancedFilter"
      @clear="clearAdvancedFilter"
      @close="advDialog = null"
    />
    <!-- 工具栏即时提示气泡（#3）：fixed 挂网格根层，不受工具栏 overflow-x:auto 裁切（与 .rj-menu 同族） -->
    <div
      v-if="tip"
      class="rj-tip"
      role="tooltip"
      :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
    >
      {{ tip.text }}
    </div>
    <RjContextMenu
      v-if="menu"
      :items="menu.items"
      :x="menu.x"
      :y="menu.y"
      @select="onMenuSelect"
      @reposition="onMenuReposition"
    />
    <RjColumnMenu
      v-if="colMenu"
      :col="colMenu.col"
      :col-id="colMenu.colId"
      :x="colMenu.x"
      :y="colMenu.y"
      :can-sort="colMenu.canSort"
      :can-filter="colMenu.canFilter"
      :can-group="colMenu.canGroup"
      :sort-dir="colMenu.sortDir"
      :pinned="colMenuPinned"
      :filter-type="colMenu.filterType"
      :filter-model="colMenu.filterModel"
      :unique-values="colMenu.unique"
      :columns="colMenuColumns"
      @sort="colMenuSort"
      @select="colMenuSelect"
      @autosize="colMenuAutosize"
      @pin="colMenuPin"
      @hide="colMenuHide"
      @group="colMenuGroup"
      @apply-filter="colMenuApplyFilter"
      @clear-filter="colMenuClearFilter"
      @advanced="openAdvancedFilter"
      @toggle-col-hide="colMenuToggleColHide"
      @toggle-col-pin="colMenuToggleColPin"
      @col-drop="onColDrop"
    />
    <RjChartDialog
      v-if="chartOpen"
      :columns="pipelineCols"
      :rows="chartRows"
      @close="chartOpen = false"
    />
    <!-- 内置行编辑/新增弹窗：字段由列定义自动生成，确认后事务回填/插入新行 + 透出宿主持久化 -->
    <RjRowFormDialog
      v-if="rowFormDlg"
      :fields="rowFormDlg.fields"
      :rows="rowFormDlg.rows"
      :mode="rowFormDlg.mode"
      :title="rowFormDlg.mode === 'add' ? rowFormCfg?.addTitle : rowFormCfg?.title"
      :width="rowFormCfg?.width"
      @submit="onRowFormSubmit"
      @close="rowFormDlg = null"
    />
    <!-- 内置确认框：查询栏 confirm 型按钮（删除等危险动作）共用 -->
    <RjConfirmDialog
      v-if="confirmDlg"
      :message="confirmDlg.message"
      @ok="onConfirmOk"
      @cancel="confirmDlg = null"
    />
    <!-- 内置行 JSON 查看器：右键菜单项配套弹层，同族根内 fixed 遮罩取主题变量 -->
    <RjRowJsonDialog
      v-if="rowJsonDlg !== null"
      :json="rowJsonDlg"
      @close="rowJsonDlg = null"
    />
    <!-- 拖拽跟手浮影：整行缩略快照（逐格复用列宽，图片/迷你图用占位块）。
         与图片预览同为根内同级 fixed 定位：Teleport 到 body 会丢失 .rj-grid 上的主题变量。
         位置每帧直写 transform（合成器层），故内容仅激活时渲染一次。 -->
    <div
      v-if="dragGhost"
      ref="dragGhostRef"
      class="rj-drag-ghost"
      :style="{ transform: ghostInitTransform, height: dragGhost.h + 'px' }"
      role="presentation"
    >
      <span
        v-for="(c, ci) in dragGhost.cells"
        :key="ci"
        class="rj-drag-ghost-cell"
        :class="'is-' + c.kind"
        :style="{ width: c.w + 'px' }"
      >
        <span v-if="c.kind === 'img'" class="rj-drag-ghost-img"></span>
        <span v-else-if="c.kind === 'spark'" class="rj-drag-ghost-spark"></span>
        <template v-else>{{ c.text }}</template>
      </span>
      <span v-if="!dragGhost.cells.length" class="rj-drag-ghost-empty">{{ t('dragRow') }}</span>
    </div>
    <!-- 图片预览（与其余浮层一样为根内同级固定定位：Teleport 到 body 会丢失 .rj-grid 上的主题变量） -->
    <div
      v-if="imgPreview"
      class="rj-img-viewer"
      role="dialog"
      aria-modal="true"
      :aria-label="t('imgPreview')"
      @click="imgPreview = ''"
      @pointerdown.stop
    >
      <img :src="imgPreview" :alt="t('imgPreview')" @click.stop />
      <span class="rj-img-viewer-close">{{ resolvedIcons.close }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  useSlots,
  watch
} from 'vue'
import './styles/rj-grid.scss'
import type {
  RjCellParams,
  RjCellAction,
  RjCellActionCtx,
  RjColumn,
  RjDataMode,
  RjEditorOption,
  RjExportParams,
  RjExportScopeResolved,
  RjFilterModel,
  RjGridState,
  RjLoadServerParams,
  RjMenuItem,
  RjContextMenuItem,
  RjContextMenuCtx,
  RjPrintParams,
  RjRowData,
  RjServerExportParams,
  RjSortState,
  RjTransaction,
  RjQueryAction,
  RjQueryActionCtx,
  RjQueryCondition,
  RjQueryFieldDef,
  RjRowFormConfig,
  RjSavedView
} from './types'
import { useColumnState, type RjLeafCol } from './useColumnState'
import { buildCustomMenuItems, joinMenuSections, isEditableContextTarget, hasUserTextSelection } from './contextMenus'
import {
  cellRawValue,
  isPivotValueCol,
  rowKeyOf,
  useRowModel,
  FILTER_OPS,
  type RjDisplayRow
} from './useRowModel'
import { isFormula } from './formula'
import { RJ_ICONS_KEY, mergeIcons, type RjIconsOverride } from './icons'
import { RJ_CELL_ACTIONS_KEY } from './cellActions'
import { buildThemeVars, resolveMode, type RjThemeParams } from './theme'
import { RJ_LOCALE_KEY, normalizeLang, resolveMessages, translate, type RjMessages } from './locale'
import {
  RJ_OPTIONS_KEY,
  collectOptionCols,
  flattenOptions,
  resolveOptions,
  sourceCacheKey
} from './optionsSource'
import { parseNLQ, type RjNlqColumn, type RjNlqFilterType, type RjNlqResult } from './nlq'
import { useInteraction } from './useInteraction'
import RjHeader, { type HeaderLevelCell } from './RjHeader.vue'
import RjCell from './RjCell.vue'
import RjFilterMenu from './RjFilterMenu.vue'
import RjAdvancedFilterDialog from './RjAdvancedFilterDialog.vue'
import type { AdvFilterGroup } from './filtering'
import { countAdvConditions } from './filtering'
import RjContextMenu from './RjContextMenu.vue'
import RjColumnMenu from './RjColumnMenu.vue'
import RjToolPanel, { type PanelLeaf } from './RjToolPanel.vue'
import RjPager from './RjPager.vue'
import RjChartDialog from './RjChartDialog.vue'
import RjQueryBar from './RjQueryBar.vue'
import RjRowFormDialog from './RjRowFormDialog.vue'
import RjConfirmDialog from './RjConfirmDialog.vue'
import RjRowJsonDialog from './RjRowJsonDialog.vue'
import { stringifyRowJson } from './rowJson'
import RjViewManager from './RjViewManager.vue'
import { defaultQueryOperator, deriveQueryFields, withCarrierOptions } from './query'
import {
  applyFormChanges,
  buildFormFields,
  createFormRow,
  queryActionConfirm,
  queryActionDisabled,
  type RjFormField
} from './rowForm'
import { newViewId, useSavedViews } from './useQueryViews'
import {
  colIdOf,
  collectLeaves,
  debounce,
  formatByType,
  formulaColumnContext,
  imageText,
  isMac,
  lowerBound,
  measureColWidth,
  pickExportRows,
  resolveExportScope,
  rowMoveInsertIndex,
  ghostCellCount,
  throttleRaf,
  AGG_LABELS
} from './utils'
import { compileExpression } from './expression'
import { EditHistory, type EditChange } from './editHistory'
import {
  downloadCsv,
  downloadXlsx,
  downloadXlsxWorkbook,
  toTsv,
  writeClipboard,
  type XlsxSheet
} from './export'
import {
  buildPrintHtml,
  printHtml,
  type RjPrintColumn,
  type RjPrintHeaderCell,
  type RjPrintInput
} from './print'

defineOptions({ name: 'RjGrid' })

const props = withDefaults(
  defineProps<{
    columns: RjColumn[]
    rows?: RjRowData[]
    rowKey?: string
    height?: number | string
    loading?: boolean
    theme?: 'light' | 'dark' | RjThemeParams
    /** 未显式指定主题时，是否自动跟随宿主 <html> 的 dark/light class（element-plus/vben/tailwind 约定）；默认 true */
    detectHostTheme?: boolean
    density?: 'small' | 'medium' | 'large'
    /** 语言：'zh' | 'en' | 区域标识（内部归一），默认中文 */
    lang?: string
    /** 局部文案覆盖（对标 AG Grid localeText）：按 key 覆盖内置目录 */
    localeText?: RjMessages
    showToolbar?: boolean
    quickFilterEnabled?: boolean
    /** 表头下方浮动筛选行（每列即时输入） */
    floatingFilters?: boolean
    /** 分组页脚行：每个展开分组底部显示聚合汇总 */
    groupFooter?: boolean
    /** 服务端权威分组（仅非 client 模式生效）：分组定义下推后端，客户端不重建组树 */
    serverSideGrouping?: boolean
    /** 分组显示模式：singleColumn=单列聚合(各级合并到一列、缩进显示完整路径)；multipleColumns=各级各占一列 */
    groupDisplayType?: 'singleColumn' | 'multipleColumns'
    /** 分组行复选框：选中组=级联选中其下所有数据行，组行本身不计入 selectedRows（AG Grid groupSelectsChildren） */
    groupSelectsChildren?: boolean
    toolPanel?: boolean
    groupable?: boolean
    showGroupPanel?: boolean
    chartable?: boolean
    exportable?: boolean
    /** 工具栏各导出/打印按钮单独显隐（仅在 exportable 为真时生效）；默认全 true，可按需关掉其中任意几个 */
    showPrint?: boolean
    showCsv?: boolean
    showPdf?: boolean
    showExcel?: boolean
    colReorder?: boolean
    resizable?: boolean
    rowSelection?: false | 'single' | 'multiple'
    /** 单击数据行单元格即选中该行（替换式，无需再点复选框）；按住 Ctrl/Shift/Alt 仍走区域选择，复选框保留多选，双击仍编辑。默认 true */
    selectOnCellClick?: boolean
    keepSelectionCrossPage?: boolean
    editable?: boolean
    rangeSelection?: boolean
    clipboard?: boolean
    contextMenu?: boolean | ((ctx: any) => RjMenuItem[])
    /** 声明式自定义右键菜单（与 col.actions 同风格）：数组或按上下文生成，追加在内置菜单项之后；声明后无需再开 contextMenu */
    contextMenus?: RjContextMenuItem[] | ((ctx: RjContextMenuCtx) => RjContextMenuItem[])
    /** 右键菜单内置「查看该行 JSON」项（命中数据行时显示，配套主题化弹层）；默认开，`:row-json="false"` 关 */
    rowJson?: boolean
    rowDraggable?: boolean
    stateKey?: string
    dataMode?: RjDataMode
    loadData?: (p: RjLoadServerParams) => Promise<{ list?: any[]; rows?: any[]; total: number }>
    pageSize?: number
    /** 分页键显示位置（仅服务端分页模式 dataMode='pagination'+loadData 时出现）：top 工具条右上（与查询同行，查询后即翻页）/ bottom 底栏功能键块左侧 / both 两处 */
    pagerPosition?: 'top' | 'bottom' | 'both'
    /** SSRM：块大小（serverSide 模式） */
    ssrmBlockSize?: number
    /** SSRM：缓存中最多保留的已加载块数（0=不限） */
    ssrmMaxBlocksInCache?: number
    /** SSRM：视口外额外保留块数 */
    ssrmCacheOverflow?: number
    /** SSRM：判断某行是否为可展开的服务端分组 */
    isServerSideGroup?: (data: any) => boolean
    treeData?: boolean
    childrenField?: string
    parentField?: string
    defaultExpandAll?: boolean
    showSummary?: boolean
    pinnedTopRows?: RjRowData[]
    pinnedBottomRows?: RjRowData[]
    fullWidthRow?: (row: RjRowData) => boolean
    detailHeight?: number
    fullWidthHeight?: number
    getRowClass?: (params: { row: RjRowData; rowIndex: number }) => string
    suppressVirtualCols?: boolean
    /** 导出/打印的默认数据范围（缺 auto：有选中就导选中）；工具栏菜单里可逐次改选 */
    exportRange?: RjExportScopeResolved | 'auto'
    /**
     * 后端导出回调（按查询条件出全量数据）：传了才在导出菜单里出现「后端导出」项。
     * 组件不直接跟后端打交道，只把生效列 + 当前查询状态 + 分页快照 + 选中 key 透出去。
     */
    serverExport?: (params: RjServerExportParams) => void | Promise<void>
    exportFileName?: string
    /**
     * 打印 / PDF 单次最大行数护栏：浏览器打印靠把整表排版进隐藏 iframe，
     * 上万行会生成十几 MB HTML 并让主线程卡死（页面假死）。超过此上限只打印前 N 行并提示，
     * 需全量请先筛选 / 用分页 / 走后端导出，或按宿主机器性能调大本值。置 0 或负数则不限。
     */
    printMaxRows?: number
    /** 导出取值口径：默认导出「所见即所得」的格式化文本（与屏幕一致、单文件内口径统一）；
     *  置 true 则导出原始类型值，让 Excel 里数字仍是数字（对齐 AG Grid useCellValuesForExports） */
    exportRawValues?: boolean
    /** 底部状态栏：显示行数/选区/区域聚合（求和/平均/计数/最小/最大） */
    statusBar?: boolean
    /** 状态栏参与的聚合项（仅对含数值的选区列生效） */
    statusAggregations?: ('sum' | 'avg' | 'count' | 'min' | 'max')[]
    /** 无障碍：网格的 aria-label */
    ariaLabel?: string
    /** 开启编辑撤销/重做（Ctrl+Z / Ctrl+Y），对标 AG Grid undoRedoCellEditing */
    undoRedoCellEditing?: boolean
    /** 撤销历史步数上限，默认 50 */
    undoRedoCellEditingLimit?: number
    /** 复制时附带列标题行（对标 copyHeadersToClipboard） */
    copyHeadersToClipboard?: boolean
    /** 粘贴前对剪贴板文本的转换钩子（对标 pasteTransformer） */
    pasteTransformer?: (text: string) => string
    /** 脏格标记：编辑后与初始值不一致的单元格标脏，供保存工作流（对标 AG Grid dirty cells） */
    markDirtyCells?: boolean
    /** 鼠标悬停行高亮跟随（斑马纹之上的动态层），默认开启 */
    rowHover?: boolean
    /** 图标覆盖（对标 AG Grid gridOptions.icons）：按语义名替换界面字形 */
    icons?: RjIconsOverride
    /** 查询条件栏：开启后网格上方出现可增删的「字段 + 运算符 + 值」条件；client 即时过滤 / 服务端透出给 loadData */
    queryable?: boolean
    /** 自定义视图：把「查询字段 + 条件 + 列布局 + 排序/分组」存成可命名快照（依赖 stateKey 落本地） */
    viewable?: boolean
    /** 查询字段候选覆盖（不传则由列定义推导）；可为枚举列补 options */
    queryFields?: RjQueryFieldDef[]
    /** 查询栏「重置」旁的自定义操作按钮（修改/删除…；confirm 走内置确认框） */
    queryActions?: RjQueryAction[]
    /** 内置行编辑/新增弹窗：false 关闭 openRowForm/openRowFormAdd 能力；对象可配 title/width/columns 与 addTitle/addColumns */
    rowForm?: RjRowFormConfig | boolean
    /** 网格级字典加载器：列上 dict:'x'（或 options:{dict:'x'}）时调用，返回 {label,value}[] 或原始数组（异步可） */
    dictLoader?: (key: string) => RjEditorOption[] | Promise<RjEditorOption[]>
    /** 网格级命名源加载器：列上 options:{ref:'name'} 时调用，返回接口原始数组（异步可），字段归一交给列上的 labelKey/valueKey/map */
    optionsLoader?: (name: string) => unknown[] | Promise<unknown[]>
    /** 内置视图（只读，恒排在自建视图前） */
    builtinViews?: RjSavedView[]
  }>(),
  {
    rows: () => [],
    height: '100%',
    detectHostTheme: true,
    // 必须显式默认 true：Vue 对未声明默认值的可选 boolean prop 会把「不传」转成 false（boolean casting）
    rowJson: true,
    density: 'medium',
    showToolbar: true,
    quickFilterEnabled: true,
    floatingFilters: false,
    groupFooter: false,
    serverSideGrouping: false,
    groupDisplayType: 'singleColumn',
    groupSelectsChildren: true,
    toolPanel: true,
    groupable: true,
    showGroupPanel: true,
    chartable: true,
    exportable: true,
    showPrint: true,
    showCsv: true,
    showPdf: true,
    showExcel: true,
    colReorder: true,
    resizable: true,
    rowSelection: false,
    selectOnCellClick: true,
    editable: false,
    rangeSelection: true,
    clipboard: true,
    contextMenu: false,
    rowDraggable: false,
    dataMode: 'client',
    pageSize: 100,
    pagerPosition: 'top',
    ssrmBlockSize: 100,
    ssrmMaxBlocksInCache: 10,
    ssrmCacheOverflow: 4,
    childrenField: 'children',
    parentField: '',
    defaultExpandAll: false,
    showSummary: false,
    pinnedTopRows: () => [],
    pinnedBottomRows: () => [],
    detailHeight: 240,
    fullWidthHeight: 90,
    exportRange: 'auto',
    statusBar: true,
    statusAggregations: () => ['sum', 'avg', 'count', 'min', 'max'],
    ariaLabel: '',
    undoRedoCellEditing: false,
    undoRedoCellEditingLimit: 50,
    copyHeadersToClipboard: false,
    markDirtyCells: false,
    rowHover: true,
    printMaxRows: 1000,
    queryable: false,
    viewable: false,
    queryFields: () => [],
    queryActions: () => [],
    rowForm: true,
    builtinViews: () => []
  }
)

// ---------------- 统一选项载体（options / dict）：一处声明同源喂 显示 / 筛选 / 编辑 / NLQ ----------------
/** 按 sourceCacheKey 缓存已解析候选（同一 dict/ref/load 源全局只解析一次） */
const optCache = reactive(new Map<string, RjEditorOption[]>())

/** 遍历声明了 options/dict 的列，把未缓存的源并发解析写入 optCache */
async function resolveAllOptions() {
  const pending = new Map<string, RjColumn>()
  for (const col of collectOptionCols(props.columns)) {
    const key = sourceCacheKey(col)
    if (!key || optCache.has(key) || pending.has(key)) continue
    pending.set(key, col)
  }
  await Promise.all(
    [...pending.entries()].map(async ([key, col]) => {
      const list = await resolveOptions(col.options, col.dict, {
        dictLoader: props.dictLoader,
        optionsLoader: props.optionsLoader
      })
      optCache.set(key, list)
    })
  )
}

/** colId → {list, labelMap}，完全由 props.columns + optCache 派生（二者任一变化即重算） */
const colOptionsIndex = computed(() => {
  const m = new Map<string, { list: RjEditorOption[]; labelMap: Map<string, string> }>()
  for (const col of collectOptionCols(props.columns)) {
    const key = sourceCacheKey(col)
    const list = key ? optCache.get(key) : undefined
    if (!list || !list.length) continue
    const labelMap = new Map<string, string>()
    for (const o of flattenOptions(list)) labelMap.set(String(o.value), String(o.label))
    m.set(colIdOf(col), { list, labelMap })
  }
  return m
})
function colOptionList(col: RjColumn): RjEditorOption[] | undefined {
  return colOptionsIndex.value.get(colIdOf(col))?.list
}
function colOptionLabel(col: RjColumn, value: any): string | undefined {
  if (value == null || value === '') return undefined
  return colOptionsIndex.value.get(colIdOf(col))?.labelMap.get(String(value))
}
// 下传给子组件（RjEditor / RjFilterMenu），仿 provide(RJ_LOCALE_KEY)
provide(RJ_OPTIONS_KEY, { list: colOptionList, label: colOptionLabel })
onMounted(() => {
  void resolveAllOptions()
})
watch(
  () => props.columns,
  () => {
    void resolveAllOptions()
  }
)

const emit = defineEmits<{
  (e: 'selection-change', rows: RjRowData[]): void
  (e: 'cell-click', p: RjCellParams, ev: MouseEvent): void
  (e: 'cell-dblclick', p: RjCellParams, ev: MouseEvent): void
  /** 内置操作列（col.actions）按钮点击（无论是否配 onClick 都派发）：{ name, action, ...单元格参数 } */
  (e: 'cell-action', p: RjCellActionCtx): void
  /** 自定义右键菜单（contextMenus）项点击：先过 disabled/confirm，onClick 后派发，携带 item 供宿主区分 */
  (e: 'context-menu-action', p: RjContextMenuCtx & { item: RjContextMenuItem }): void
  (
    e: 'cell-value-changed',
    p: { row: RjRowData; colId: string; newValue: any; oldValue: any }
  ): void
  (e: 'cells-changed', ps: any[]): void
  (e: 'sort-change', s: RjSortState[]): void
  (e: 'filter-change'): void
  (e: 'row-group-change', f: string[]): void
  (e: 'pivot-change', p: any): void
  (e: 'page-change', p: { page: number; pageSize: number }): void
  (e: 'view-change', v: RjSavedView): void
  (e: 'detail-open', row: RjRowData): void
  (e: 'row-drag-end', p: { row: RjRowData; from: number; to: number }): void
  (e: 'row-form-submit', p: {
    rows: RjRowData[]
    changes: Record<string, any>
    mode: 'edit' | 'add'
  }): void
  (e: 'row-form-add', p: { row: RjRowData; changes: Record<string, any> }): void
  (e: 'ready', api: any): void
}>()

// ---------------- 动态事件总线（对齐 AG Grid api.addEventListener） ----------------
// 允许在运行时按名订阅/退订，突破模板 @emit 的编译期约束，实现灵活的事件操作。
type RjEventListener = (event: any) => void
const busListeners = new Map<string, Set<RjEventListener>>()
function addEventListener(type: string, cb: RjEventListener): () => void {
  let set = busListeners.get(type)
  if (!set) {
    set = new Set()
    busListeners.set(type, set)
  }
  set.add(cb)
  return () => removeEventListener(type, cb)
}
function removeEventListener(type: string, cb: RjEventListener) {
  busListeners.get(type)?.delete(cb)
}
/** 向总线派发事件；单个监听器抛错不影响其它监听器与表格本身 */
function dispatchEvent(type: string, payload: any = {}) {
  const set = busListeners.get(type)
  if (!set || !set.size) return
  const event = { type, ...(payload || {}) }
  set.forEach((cb) => {
    try {
      cb(event)
    } catch (err) {
      console.error('[rj-grid] listener error for "' + type + '"', err)
    }
  })
}
// 统一的选择变更通知：同时触发 Vue emit 与总线事件
function notifySelection() {
  const rows = selectedRows()
  emit('selection-change', rows)
  dispatchEvent('rowSelectionChanged', { selected: rows })
}

// ---------------- 密度 / 主题 / i18n ----------------
const DENSITY_KEYS = ['small', 'medium', 'large'] as const
const DENSITY_H = { small: 30, medium: 36, large: 44 } as const
const densityIdx = ref(Math.max(0, DENSITY_KEYS.indexOf(props.density)))
// 密度三档文案（小/中/大）：密度按钮 title 展示当前档
const DENSITY_LABELS = computed(() => [t('densSmall'), t('densMedium'), t('densLarge')])

// auto 模式依据系统偏好解析（仅浏览器环境；SSR 安全回退浅色）
const prefersDark = ref(false)
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  prefersDark.value = mq.matches
  mq.addEventListener?.('change', (e) => (prefersDark.value = e.matches))
}

// 宿主 <html> 深浅 class 探测（element-plus/vben/tailwind 约定）：介于 theme prop 与 OS 偏好之间的中间档。
// null = 宿主未表态（<html> 既无 dark 也无 light），让位给 OS prefers-color-scheme。
const hostDark = ref<boolean | null>(null)
function readHostClass() {
  if (typeof document === 'undefined') return
  const cl = document.documentElement.classList
  if (cl.contains('dark')) hostDark.value = true
  else if (cl.contains('light')) hostDark.value = false
  else hostDark.value = null
}
// setup 期同步读一次，避免首帧先按 OS 再回写宿主造成闪动（SSR 下 readHostClass 自行短路）
if (props.detectHostTheme) readHostClass()
let hostThemeMo: MutationObserver | null = null
onMounted(() => {
  if (!props.detectHostTheme || typeof MutationObserver === 'undefined') return
  readHostClass()
  // 仅监听 <html> 的 class 属性变化（点主题开关即触发），不改建实例就能切换
  hostThemeMo = new MutationObserver(readHostClass)
  hostThemeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => {
  hostThemeMo?.disconnect()
  hostThemeMo = null
})

// 主题参数：props.theme（字符串或对象）初始化，api.setTheme 运行时替换
function themeFromProp(t: 'light' | 'dark' | RjThemeParams | undefined): RjThemeParams {
  if (!t) return {}
  if (typeof t === 'string') return { mode: t }
  return { ...t }
}
const themeState = ref<RjThemeParams>(themeFromProp(props.theme))
watch(
  () => props.theme,
  (t) => (themeState.value = themeFromProp(t)),
  { deep: true }
)
const themeMode = computed<'light' | 'dark'>(() =>
  resolveMode(
    themeState.value.mode,
    prefersDark.value,
    props.detectHostTheme ? hostDark.value : null
  )
)
const themeVars = computed(() => buildThemeVars({ ...themeState.value, mode: themeMode.value }))
// dark 供模板只读展示与根类切换；工具条按钮通过 toggleDark 改写 mode
const dark = computed(() => themeMode.value === 'dark')
function toggleDark() {
  themeState.value = { ...themeState.value, mode: dark.value ? 'light' : 'dark' }
}

// 语言 / 文案：预设底 + localeText/api 覆盖（优先级最高）
const langRef = ref(props.lang)
watch(
  () => props.lang,
  (v) => (langRef.value = v)
)
const localeOverride = ref<RjMessages | null>(props.localeText ? { ...props.localeText } : null)
watch(
  () => props.localeText,
  (v) => (localeOverride.value = v ? { ...v } : null),
  { deep: true }
)
const messages = computed<RjMessages>(() => resolveMessages(langRef.value, localeOverride.value))
const t = (key: string, params?: Record<string, string | number>): string =>
  translate(messages.value, key, params)
provide(RJ_LOCALE_KEY, t)
/** 布尔单元格字形文案（随语言切换，供 formatByType 注入） */
const BOOL_LABELS = computed<[string, string]>(() => [t('yesVal'), t('noVal')])

const rowHeight = computed(() => DENSITY_H[DENSITY_KEYS[densityIdx.value]])
const headerRowHeight = computed(() => rowHeight.value)
const rootClass = computed(() => [
  dark.value ? 'rj--dark' : '',
  `rj--${DENSITY_KEYS[densityIdx.value]}`
])
const rootStyle = computed(() => ({
  height: typeof props.height === 'number' ? props.height + 'px' : props.height,
  ...themeVars.value
}))

const slots = useSlots()

// ---------------- 图标体系（provide 供子组件 inject） ----------------
const resolvedIcons = computed(() => mergeIcons(props.icons))
provide(RJ_ICONS_KEY, resolvedIcons)

// ---------------- 行模型 ----------------
const pagerSize = ref(props.pageSize)
const pagerPage = ref(1)
// 分页键只在服务端分页模式出现（全量前端数据不分页）；位置由 pagerPosition 决定
const showPager = computed(() => props.dataMode === 'pagination' && !!props.loadData)
const pagerAtTop = computed(() => showPager.value && props.pagerPosition !== 'bottom')
const pagerAtBottom = computed(() => showPager.value && props.pagerPosition !== 'top')
/** 单元格级公式表：`${rowKey}::${colId}` → 公式文本（非响应式，变更时 touch 重算） */
const cellFormulas = new Map<string, string>()
const rowModel = useRowModel(() => props.rows, {
  rowKey: () => props.rowKey,
  rowHeight: () => rowHeight.value,
  detailHeight: () => props.detailHeight,
  fullWidthHeight: () => props.fullWidthHeight,
  hasDetailSlot: () => !!slots['row-detail'],
  groupFooter: () => !!props.groupFooter,
  // 组行标题拿被分组列的 formatter 转成显示文本（客户端分组）：不能让组行显示「1(60)」
  // 而行内单元格显示「目录」——同一件事在同一行上出现两种口径。列缺失或没 formatter 时原样返回。
  groupLabelOf: (col, value, row) => (col?.formatter ? displayOf(col, value, row, 0) : value),
  serverGrouping: () => !!props.serverSideGrouping,
  isServerSideGroup: props.isServerSideGroup,
  isFullWidthRow: (r) => (slots['full-row'] ? (props.fullWidthRow?.(r) ?? false) : false),
  loadData: (p) => props.loadData!(p),
  dataMode: () => props.dataMode,
  pageSize: () => pagerSize.value,
  treeData: () => !!props.treeData,
  childrenField: () => props.childrenField,
  parentField: () => props.parentField,
  ssrmBlockSize: () => props.ssrmBlockSize,
  ssrmMaxBlocks: () => props.ssrmMaxBlocksInCache,
  ssrmOverflow: () => props.ssrmCacheOverflow,
  labels: () => ({
    total: t('summaryTotal'),
    grandTotal: t('grandTotal'),
    totalOf: (title: string) => t('summaryOf', { title })
  }),
  formulaColumns: () =>
    // 公式上下文含隐藏列：公式引用的是数据字段，不该因为依赖列没显示而降级成 #NAME?
    formulaColumnContext(
      gridCols.value.map((l) => l.col),
      colState.listLeafColumns(),
      (id) => colState.isColumnHidden(id),
      pivotActive.value
    ),
  cellFormulas: () => cellFormulas
})
rowModel.defaultExpandAll.value = props.defaultExpandAll

// 初始排序/分组/透视（声明式配置）
{
  const sorts: RjSortState[] = []
  const groups: string[] = []
  const pcols: string[] = []
  const walkInit = (list: RjColumn[]) =>
    list.forEach((c) => {
      if (c.children?.length) walkInit(c.children)
      else {
        if (c.initialSort && (c.field || c.colId))
          sorts.push({ field: c.field || colIdOf(c), dir: c.initialSort })
        if (c.initialRowGroup && c.field) groups.push(c.field)
        if (c.initialPivot && c.field) pcols.push(c.field)
      }
    })
  walkInit(props.columns)
  if (sorts.length) rowModel.sortStates.value = sorts
  if (groups.length) rowModel.rowGroupFields.value = groups
  if (pcols.length)
    rowModel.pivotState.value = { ...rowModel.pivotState.value, cols: pcols, active: true }
}

// ---------------- 列 ----------------
// 行拖拽的适用模式：client / pagination / infinite 的行都住在内存数组里（sourceRows 就地重排即生效），
// serverSide 的行住在块槽里（sourceRows 每次 `slots.filter` 出新数组，重排落不回去）
// → SSRM 下不注入手柄列，避免画出拖不动的手柄误导使用方
const rowDragEnabled = computed(() => !!props.rowDraggable && props.dataMode !== 'serverSide')
const pivotColumns = computed<RjColumn[]>(() => rowModel.pivotCols(props.columns))
const userColumns = computed<RjColumn[]>(() => {
  const cols: RjColumn[] = []
  if (props.rowSelection)
    cols.push({
      colId: '__check',
      checkbox: true,
      width: 44,
      fixed: 'left',
      title: '',
      suppressSort: true,
      suppressMenu: true,
      headerClass: 'rj-hcell-ctl',
      filter: false
    })
  if (rowDragEnabled.value)
    cols.push({
      colId: '__drag',
      rowDrag: true,
      width: 34,
      fixed: 'left',
      title: '',
      suppressSort: true,
      suppressMenu: true,
      headerClass: 'rj-hcell-ctl',
      filter: false
    })
  cols.push(...(pivotColumns.value.length ? pivotColumns.value : props.columns))
  return cols
})

const colState = useColumnState(() => userColumns.value)
const layout = computed(() => colState.computeLayout())
const gridCols = computed<RjLeafCol[]>(() => [
  ...layout.value.leftLeaves,
  ...layout.value.normalLeaves,
  ...layout.value.rightLeaves
])
/**
 * 树展开宿主列（anchor）全局唯一：有序可见列里第一个非复选、非拖拽列。
 * 必须整表一次性选定，不能按左/普通/右冻结层各自贪心——否则每层都会把本层首列当 anchor，
 * 右冻结的「操作」列会被误判为 anchor 而走文本分支、吞掉内置 actions 按钮（列空白）。
 */
const anchorColId = computed(() => {
  for (const leaf of gridCols.value) {
    if (!leaf.col.checkbox && !leaf.col.rowDrag) return leaf.colId
  }
  return ''
})
const headerRowsInfo = computed(() => colState.computeHeaderRows())
const pipelineCols = computed(() => colState.listLeafColumns())

watch(pipelineCols, (v) => rowModel.setPipelineColumns(v), { immediate: true })

// ---------------- 查询条件栏 / 自定义视图（queryable / viewable） ----------------
// 查询条件的真值源就是 rowModel.queryConditions：client 模式 passFilter 直接读它，服务端
// 模式 fetchServer 把它透出给 loadData；此处只做「字段池推导 + 视图快照存取 + 事件编排」。
const queryConditions = rowModel.queryConditions
const queryFieldDefs = computed<RjQueryFieldDef[]>(() =>
  withCarrierOptions(deriveQueryFields(userColumns.value, props.queryFields), colOptionsIndex.value)
)
const savedViews = useSavedViews(
  () => props.stateKey,
  () => props.builtinViews
)
const currentViewId = ref<string>('')
const viewMgrRef = ref<any>()
/** 生效（已填值）条件数：视图菜单与保存快照描述用 */
const activeQueryCount = computed(
  () => queryConditions.value.filter((c) => queryCondFilled(c)).length
)
/** 当前可见列数（排除引擎控制列）：供存为视图弹窗计数 */
const liveColCount = computed(() => gridCols.value.filter((l) => !isInternalColKey(l.colId)).length)

function queryCondFilled(c: RjQueryCondition): boolean {
  if (c.operator === 'between') {
    if (Array.isArray(c.value)) return c.value.some(filled)
    return filled(c.value1) || filled(c.value2)
  }
  if (Array.isArray(c.value)) return c.value.length > 0
  return filled(c.value)
}
function filled(v: any): boolean {
  return v !== undefined && v !== null && v !== ''
}

/** 查询：client 重算行；服务端复位到首页并按新条件重取 */
function onQuerySearch() {
  rowModel.touch()
  if (props.dataMode !== 'client' && props.loadData) {
    if (props.dataMode === 'pagination') pagerPage.value = 1
    if (props.dataMode === 'serverSide') reloadServerSide()
    else rowModel.reloadServer()
  }
  scheduleSave()
  emit('filter-change')
  dispatchEvent('filterChanged', {})
}

/** 查询栏「重置」：有激活视图则把条件恢复到该视图保存时的快照（只动查询条件，
 *  不重置列布局/排序/分组，避免整页被打回初始态）；无激活视图则沿用旧行为清空条件 */
function onQueryReset() {
  const cur = savedViews.views.value.find((v) => v.id === currentViewId.value)
  queryConditions.value = cur ? cloneConditions(cur.conditions || []) : []
  onQuerySearch()
}
/** 应用一个视图：条件 + 列布局 + 排序/分组整体切换 */
function applyView(v: RjQueryCondition[] | RjSavedView, viewId?: string) {
  const view = 'conditions' in v ? (v as RjSavedView) : null
  const conds = view ? view.conditions : (v as RjQueryCondition[])
  queryConditions.value = cloneConditions(conds || [])
  if (view?.columns?.length) colState.applyColumnState(view.columns)
  const gs = view?.gridState
  rowModel.sortStates.value = (gs?.sort || []).map((s) => ({ ...s }))
  rowModel.rowGroupFields.value = (gs?.rowGroup || []).slice()
  if (viewId !== undefined) currentViewId.value = viewId
  rowModel.touch()
  if (props.dataMode !== 'client' && props.loadData) {
    syncServerCtx()
    if (props.dataMode === 'pagination') pagerPage.value = 1
    if (props.dataMode === 'serverSide') reloadServerSide()
    else rowModel.reloadServer()
  }
  scheduleSave()
  emit('filter-change')
}
function cloneConditions(list: RjQueryCondition[]): RjQueryCondition[] {
  return list.map((c) => ({ ...c, value: Array.isArray(c.value) ? c.value.slice() : c.value }))
}

function onSelectView(id: string) {
  const v = savedViews.views.value.find((x) => x.id === id)
  if (v) applyView(v, id)
}

/** 存/更新视图：抓当前查询字段 + 条件 + 列状态 + 排序分组，落本地 */
function onSaveView(payload: { id?: string; name: string }) {
  const view: RjSavedView = {
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
  }
  savedViews.upsert(view)
  currentViewId.value = view.id
  emit('view-change', view)
  dispatchEvent('savedViewChanged', { id: view.id, name: view.name })
}
function onDeleteView(id: string) {
  savedViews.remove(id)
  const rest = savedViews.views.value
  if (rest.length) applyView(rest[0], rest[0].id)
  else currentViewId.value = ''
}
/** 查询栏「存为视图」：复用视图管理器的命名弹窗 */
function onSaveViewFromBar() {
  viewMgrRef.value?.openNew?.()
}
// 查询字段池变化时，剔除已不在池中的历史条件（列下线不产生脏过滤）
watch(queryFieldDefs, (defs) => {
  const pool = new Set(defs.map((d) => d.field))
  if (queryConditions.value.some((c) => !pool.has(c.field))) {
    queryConditions.value = queryConditions.value.filter((c) => pool.has(c.field))
  }
})

// ---------------- 工具条弹层：快速搜索气泡 + 视图菜单（均在第二行功能键块） ----------------
// 快速搜索：第二行功能键块的 🔍 按钮，点击在根内同级 fixed 弹出输入框（与导出/列菜单同族）
const quickPop = ref<{ x: number; y: number } | null>(null)
const quickInputRef = ref<HTMLInputElement>()
function toggleQuickPop(ev: MouseEvent) {
  tip.value = null
  if (quickPop.value) {
    quickPop.value = null
    return
  }
  menu.value = null
  colMenu.value = null
  filterMenu.value = null
  const el = ev.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  // 锚定整个功能键块下/上沿（块内窄屏会折行，按单按钮锚会压住同组相邻按钮）
  const rb = (el.closest('.rj-tool-block') ?? el).getBoundingClientRect()
  const x = Math.max(8, Math.min(r.right - 240, window.innerWidth - 248))
  // 下方放不下弹层时（网格矮/靠视口底）改为向上弹（估算高 56px，与导出/菜单同族互斥）
  const est = 56
  quickPop.value = {
    x,
    y: rb.bottom + 6 + est > window.innerHeight - 8 ? Math.max(8, rb.top - est - 6) : rb.bottom + 6
  }
  nextTick(() => quickInputRef.value?.focus())
}

// 视图：右侧功能键块的 ◈ 按钮，点击弹出视图菜单（切换 / 存为新视图 / 更新 / 删除），复用右键菜单同族浮层
function openViewMenu(ev: MouseEvent) {
  menu.value = null
  colMenu.value = null
  filterMenu.value = null
  quickPop.value = null
  const views = savedViews.views.value
  const cur = views.find((v) => v.id === currentViewId.value) || null
  const items: RjMenuItem[] = []
  views.forEach((v) => {
    items.push({
      name: (v.id === currentViewId.value ? '✓ ' : v.builtin ? '★ ' : '') + v.name,
      action: () => onSelectView(v.id)
    })
  })
  if (!views.length) items.push({ name: t('viewNone'), disabled: () => true })
  items.push({ isSeparator: true })
  items.push({ name: t('viewSaveNew'), action: () => onSaveViewFromBar() })
  items.push({
    name: t('viewUpdate'),
    disabled: () => !cur || !!cur.builtin,
    action: () => cur && !cur.builtin && onSaveView({ id: cur.id, name: cur.name })
  })
  items.push({
    name: t('viewDelete'),
    disabled: () => !cur || !!cur.builtin,
    action: () => cur && !cur.builtin && onDeleteView(cur.id)
  })
  const el = ev.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  // 锚定整个功能键块（块内窄屏折行时不压同组按钮）：默认从块下沿向下弹，下方放不下才翻到块上方按真实高重锚
  const rb = (el.closest('.rj-tool-block') ?? el).getBoundingClientRect()
  const x = Math.max(8, Math.min(r.right - 200, window.innerWidth - 210))
  openMenuAt(x, rb.bottom + 6, items, rb.top)
}

// 默认预置 1 个查询条件（优先首个文本字段，如“编码或名称”），使 queryable 左上默认呈现可用搜索行
function seedDefaultQuery() {
  if (!props.queryable || queryConditions.value.length) return
  const defs = queryFieldDefs.value
  if (!defs.length) return
  const first = defs.find((d) => d.kind === 'text') || defs[0]
  queryConditions.value = [
    {
      field: first.field,
      operator: defaultQueryOperator(first.kind || 'text'),
      value: undefined,
      valueText: ''
    }
  ]
}

// queryable 保持“至少 1 个查询字段胶囊”：重置或移除最后一个胶囊后，自动补回一个默认空条件（空值不参与过滤）
watch(queryConditions, (list) => {
  if (props.queryable && list.length === 0) seedDefaultQuery()
})

// ---------------- 查询栏操作按钮 / 内置行编辑・新增弹窗（queryActions / rowForm） ----------------
const rowFormCfg = computed(() => (typeof props.rowForm === 'object' ? props.rowForm : undefined))
const rowFormDlg = ref<{
  rows: RjRowData[]
  fields: RjFormField[]
  mode: 'edit' | 'add'
  /** 新增模式的预置模板（参与组行与 select options 求值） */
  preset?: RjRowData
} | null>(null)
const confirmDlg = ref<{ message: string; onOk: () => void } | null>(null)
/** 内置行 JSON 查看器：存已序列化的文本，null = 未打开 */
const rowJsonDlg = ref<string | null>(null)

/** 打开内置行编辑弹窗：字段由当前叶子列生成，缺省作用于选中行（rowForm=false 时为空操作） */
function openRowForm(rows?: RjRowData[]) {
  if (props.rowForm === false) return
  const rs = rows && rows.length ? rows : selectedRows()
  if (!rs.length) return
  rowFormDlg.value = {
    rows: rs,
    mode: 'edit',
    fields: buildFormFields(pipelineCols.value, rowFormCfg.value, rs)
  }
}

/** 打开内置新增弹窗：空白表单（preset 可预置默认值），字段准入优先走 addColumns 钩子 */
function openRowFormAdd(preset?: RjRowData) {
  if (props.rowForm === false) return
  const cfg = rowFormCfg.value
  const sample = [preset || {}]
  rowFormDlg.value = {
    rows: sample,
    mode: 'add',
    preset,
    fields: buildFormFields(
      pipelineCols.value,
      cfg?.addColumns ? { ...cfg, columns: cfg.addColumns } : cfg,
      sample
    )
  }
}

/** 弹窗提交：编辑走 update 回填、新增组装新行走 add；事务刷新后透出事件供宿主持久化 */
function onRowFormSubmit(changes: Record<string, any>) {
  const dlg = rowFormDlg.value
  rowFormDlg.value = null
  if (!dlg) return
  if (dlg.mode === 'add') {
    const row = createFormRow(dlg.preset, changes)
    // 先抛 row-form-add 让宿主同步补主键（如 rowKey），再入 add 事务：
    // 闪烁按 rowKey 高亮，若先入事务则此刻主键为空、flash key 与回填后的显示行 key 失配→不闪烁
    emit('row-form-add', { row, changes })
    rowModel.applyTransaction({ add: [row] })
    scheduleSave()
    emit('row-form-submit', { rows: [row], changes, mode: 'add' })
    return
  }
  applyFormChanges(dlg.rows, changes)
  rowModel.applyTransaction({ update: dlg.rows.slice() })
  scheduleSave()
  emit('row-form-submit', { rows: dlg.rows, changes, mode: 'edit' })
}

/** 按钮编排：禁用直通、confirm 先过内置确认框，最终把 选中行/api/编辑·新增弹窗入口交给宿主 */
function runQueryAction(a: RjQueryAction) {
  const rows = selectedRows()
  if (queryActionDisabled(a, rows)) return
  const ctx: RjQueryActionCtx = { rows, api: apiObj, openRowForm, openRowFormAdd }
  const msg = queryActionConfirm(a, rows)
  if (msg) confirmDlg.value = { message: msg, onOk: () => void a.onClick(ctx) }
  else void a.onClick(ctx)
}
function onConfirmOk() {
  const d = confirmDlg.value
  confirmDlg.value = null
  d?.onOk()
}

const levelCells = computed<HeaderLevelCell[][]>(() => {
  const leafX = new Map<string, { x: number; width: number }>()
  gridCols.value.forEach((l) => leafX.set(l.colId, { x: l.x, width: l.width }))
  return headerRowsInfo.value.rows.map((level) =>
    level.map((cell) => {
      if (!cell.isGroup) {
        const g = leafX.get(cell.colId)
        return {
          col: cell.col,
          colId: cell.colId,
          x: g?.x ?? 0,
          width: g?.width ?? 120,
          isGroup: false
        }
      }
      const kids = collectGroupLeafIds(cell.col)
      const xs = kids.map((k) => leafX.get(k)).filter(Boolean) as { x: number; width: number }[]
      if (!xs.length)
        return {
          col: cell.col,
          colId: cell.colId,
          x: 0,
          width: cell.col.width ?? 120,
          isGroup: true
        }
      const min = Math.min(...xs.map((v) => v.x))
      const max = Math.max(...xs.map((v) => v.x + v.width))
      return { col: cell.col, colId: cell.colId, x: min, width: max - min, isGroup: true }
    })
  )
})

function collectGroupLeafIds(col: RjColumn): string[] {
  const out: string[] = []
  const walk = (c: RjColumn) => {
    if (c.children?.length) c.children.forEach(walk)
    else out.push(colIdOf(c))
  }
  walk(col)
  return out
}

// ---------------- 滚动与虚拟窗口 ----------------
const rootRef = ref<HTMLElement>()
const scrollerRef = ref<HTMLElement>()
const bodyWrapRef = ref<HTMLElement>()
const scrollLeft = ref(0)
const scrollTop = ref(0)
const viewportW = ref(800)
const viewportH = ref(400)
const headerTotalHeight = computed(() => headerRowsInfo.value.depth * headerRowHeight.value)

const windowRange = computed(() => {
  const rows = rowModel.processed.value.displayRows
  const offs = rowModel.offsets.value
  const h = rowHeight.value
  const st = scrollTop.value
  if (!rows.length) return { start: 0, end: 0 }
  let start = Math.max(lowerBound(offs, st, (i) => offs[i]) - 2, 0)
  let end = start
  while (end < rows.length && (offs[end] ?? 0) < st + viewportH.value + h) end++
  return { start, end: Math.min(end + 2, rows.length) }
})

const visibleRows = computed(() => {
  const rows = rowModel.processed.value.displayRows
  const offs = rowModel.offsets.value
  const out: { row: RjDisplayRow; i: number; top: number }[] = []
  for (let i = windowRange.value.start; i < windowRange.value.end; i++) {
    const row = rows[i]
    if (row) out.push({ row, i, top: offs[i] })
  }
  return out
})

const windowLeaves = computed<RjLeafCol[]>(() => {
  const normal = layout.value.normalLeaves
  if (!layout.value.virtualCols) return normal
  const xs = normal.map((l) => l.x)
  const sl = scrollLeft.value
  const start = Math.max(lowerBound(xs, sl, (i) => xs[i]) - 3, 0)
  let end = start
  while (end < normal.length && normal[end].x < sl + viewportW.value) end++
  return normal.slice(start, Math.min(end + 3, normal.length))
})
// 列虚拟化窗口实际变化→总线事件（对齐 AG Grid virtualColumnsChanged）
watch(
  () => [
    windowLeaves.value[0]?.colId,
    windowLeaves.value[windowLeaves.value.length - 1]?.colId,
    windowLeaves.value.length
  ],
  (v, o) => {
    if (o && v[0] === o[0] && v[1] === o[1] && v[2] === o[2]) return
    dispatchEvent('virtualColumnsChanged', { colIds: windowLeaves.value.map((l) => l.colId) })
  }
)

/**
 * 冻结层同帧直写入口：scroll 事件在合成前派发，而 onScroll 整体走 rAF 节流，
 * 等下一拍会让冻结层恒定落后一个滚动步长（快速甩动时冻结列有橡皮筋感）。
 * 这里只抢跑两行 style 写入，虚拟窗口等重活仍交给节流后的 onScroll。
 */
function onScrollRaw() {
  const el = scrollerRef.value
  if (el) syncFixedCanvas(el.scrollTop)
  onScroll()
}

const onScroll = throttleRaf(() => {
  const el = scrollerRef.value
  if (!el) return
  // 视口高度兜底重测：v-show / keep-alive 容器由 display:none 转可见时，ResizeObserver 的回调未必及时
  // 派发（后台窗口里整程不派），viewportH 会停在旧值 → 虚拟窗口按错高度只渲染几行、底部留一段空白，
  // 且滚动本身不会自愈。能滚起来就是「已可见且已完成布局」的确证，顺手补一次测量。
  // 只认 clientHeight > 0：容器尚未布局时不能拿 0 去覆盖已有的视口高度。
  if (el.clientHeight > 0 && el.clientHeight !== viewportH.value) measure()
  scrollLeft.value = el.scrollLeft
  scrollTop.value = el.scrollTop
  syncFixedCanvas(el.scrollTop)
  if (
    props.dataMode === 'infinite' &&
    el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight - 300
  ) {
    rowModel.fetchMore()
  }
  if (props.dataMode === 'serverSide') {
    const wr = windowRange.value
    rowModel.ensureServerBlocks(wr.start, Math.max(wr.start, wr.end - 1))
  }
})

function forwardWheel(e: WheelEvent) {
  const el = scrollerRef.value
  if (el) el.scrollTop += e.deltaY
}

let ro: ResizeObserver | null = null
const measure = () => {
  const el = scrollerRef.value
  if (!el) return
  viewportW.value = el.clientWidth
  viewportH.value = el.clientHeight
  colState.setViewportWidth(el.clientWidth)
  colState.setSuppressVirtual(!!props.suppressVirtualCols)
}

// ---------------- 行选择 ----------------
const selection = reactive(new Set<string | number>())
const preserveMap = reactive(new Map<string | number, RjRowData>())

function toggleRowKey(d: RjDisplayRow) {
  if (d.type === 'group' && groupCheckEnabled.value) {
    const keys = groupDescKeys.value.get(d.key) || []
    const allSel = keys.length > 0 && keys.every((k) => selection.has(k))
    if (allSel) keys.forEach((k) => selection.delete(k))
    else keys.forEach((k) => selection.add(k))
    if (props.keepSelectionCrossPage) {
      const dataByKey = new Map(rowModel.processed.value.displayRows.map((r) => [r.key, r.data]))
      keys.forEach((k) => {
        if (selection.has(k)) {
          const dr = dataByKey.get(k)
          if (dr) preserveMap.set(k, dr)
        } else preserveMap.delete(k)
      })
    }
    notifySelection()
    return
  }
  if (props.rowSelection === 'single') {
    selection.clear()
    selection.add(d.key)
  } else if (selection.has(d.key)) selection.delete(d.key)
  else selection.add(d.key)
  if (props.keepSelectionCrossPage) {
    if (selection.has(d.key)) preserveMap.set(d.key, d.data)
    else preserveMap.delete(d.key)
  }
  notifySelection()
}
/** 单击数据行=选中该行（替换式）：无需先勾复选框即可让删除/修改等按钮拿到选中行。
 *  已在选中且为唯一选中项时保持不消选（避免再次单击“取消”造成困惑）。 */
function selectRowByClick(d: RjDisplayRow) {
  if (selection.size === 1 && selection.has(d.key)) return
  selection.clear()
  if (props.keepSelectionCrossPage) preserveMap.clear()
  selection.add(d.key)
  if (props.keepSelectionCrossPage) preserveMap.set(d.key, d.data)
  notifySelection()
}
function selectedRows(): RjRowData[] {
  const rows = rowModel.processed.value.displayRows
    .filter((d) => selection.has(d.key))
    .map((d) => d.data)
  Array.from(preserveMap.values()).forEach((r) => {
    if (!rows.includes(r)) rows.push(r)
  })
  return rows
}
const dataDisplayRows = computed(() =>
  rowModel.processed.value.displayRows.filter((d) => d.type === 'row')
)
// 全部展开/折叠只在「有数据 + 处于层级展示（树形或已分组）」时出现：平铺空表/无层级时默认隐藏。
// 「有数据」以过滤后的数据集为准（displayRows 含组行/树行），不能用 dataDisplayRows（仅叶行）——
// 否则新建分组默认全折叠、或点「全部折叠」后叶行为 0，会把层级视图误判成无数据而隐藏按钮，用户无法一步展开。
const showExpandCollapse = computed(
  () =>
    props.groupable &&
    rowModel.processed.value.displayRows.length > 0 &&
    (!!props.treeData || rowGroupFields.value.length > 0)
)
// ---------------- 分组级联选择（groupSelectsChildren） ----------------
const groupCheckEnabled = computed(
  () =>
    !!props.groupSelectsChildren &&
    props.rowSelection === 'multiple' &&
    !!rowModel.rowGroupFields.value.length
)
/** 每个分组 -> 其下全部可见数据行 key（按 parentKey 链聚合，含嵌套子分组） */
const groupDescKeys = computed(() => {
  const map = new Map<string | number, (string | number)[]>()
  if (!groupCheckEnabled.value) return map
  const rows = rowModel.processed.value.displayRows
  const byParent = new Map<string | number, RjDisplayRow[]>()
  rows.forEach((r) => {
    if (r.parentKey == null) return
    const a = byParent.get(r.parentKey) || []
    a.push(r)
    byParent.set(r.parentKey, a)
  })
  rows.forEach((g) => {
    if (g.type !== 'group') return
    const keys: (string | number)[] = []
    const st = [g.key]
    while (st.length) {
      const k = st.pop()!
      ;(byParent.get(k) || []).forEach((ch) => {
        if (ch.type === 'row') keys.push(ch.key)
        else if (ch.type === 'group') st.push(ch.key)
      })
    }
    map.set(g.key, keys)
  })
  return map
})
function groupCheckedState(key: string | number) {
  const keys = groupDescKeys.value.get(key) || []
  let sel = 0
  for (const k of keys) if (selection.has(k)) sel++
  return {
    checked: keys.length > 0 && sel === keys.length,
    indeterminate: sel > 0 && sel < keys.length
  }
}
const allChecked = computed(
  () => dataDisplayRows.value.length > 0 && dataDisplayRows.value.every((d) => selection.has(d.key))
)
const someChecked = computed(
  () => !allChecked.value && dataDisplayRows.value.some((d) => selection.has(d.key))
)
function toggleAll() {
  if (allChecked.value)
    dataDisplayRows.value.forEach((d) => {
      selection.delete(d.key)
      // 取消全选需同步移除跨页保留项，否则 selectedRows() 仍会并入 preserveMap 导致计数残留
      if (props.keepSelectionCrossPage) preserveMap.delete(d.key)
    })
  else
    dataDisplayRows.value.forEach((d) => {
      selection.add(d.key)
      if (props.keepSelectionCrossPage) preserveMap.set(d.key, d.data)
    })
  notifySelection()
}

// ---------------- 排序 / 筛选 ----------------
const rowGroupFields = computed(() => rowModel.rowGroupFields.value)
const pivotState = computed(() => rowModel.pivotState.value)

function onSort(colId: string, field: string | undefined, additive: boolean) {
  if (!field) return
  const cur = rowModel.sortStates.value
  const idx = cur.findIndex((s) => s.field === colId || s.field === field)
  let next: RjSortState[]
  if (idx >= 0) {
    const dir = cur[idx].dir === 'asc' ? 'desc' : cur[idx].dir === 'desc' ? null : 'asc'
    next = cur.slice()
    if (dir) next[idx] = { field, dir }
    else next.splice(idx, 1)
  } else {
    next = additive ? [...cur, { field, dir: 'asc' as const }] : [{ field, dir: 'asc' as const }]
  }
  rowModel.sortStates.value = next
  rowModel.touch()
  emit('sort-change', next)
  dispatchEvent('sortChanged', { sort: next })
  scheduleSave()
}

const activeFilterIds = computed(() => {
  const ids = Array.from(rowModel.filterModels.keys())
  rowModel.floatFilters.forEach((v, id) => {
    if (v && v.trim() && !ids.includes(id)) ids.push(id)
  })
  return ids
})

// ---------------- Filters 面板：集中管理已用筛选 ----------------
function opLabelOf(type: string, op: string): string {
  const o = FILTER_OPS[type]?.find((x) => x.value === op)
  if (!o) return op
  // 优先取当前语言目录；未命中（目录缺键）回落 FILTER_OPS 内置中文，保证不显示裸 key
  const s = t(o.labelKey)
  return s === o.labelKey ? o.label : s
}
function filterModelText(m: RjFilterModel): string {
  const parts = m.conditions.map((c) => {
    if (c.op === 'blank' || c.op === 'notBlank') return opLabelOf(m.type, c.op)
    const range = c.value2 != null && c.value2 !== ''
    const v = range ? `${c.value1 ?? ''} ~ ${c.value2}` : `${c.value1 ?? ''}`
    return `${opLabelOf(m.type, c.op)} ${v}`
  })
  return parts.join(m.operator === 'and' ? t('andOp') : t('orOp'))
}
const colTitleById = computed(() => {
  const o: Record<string, string> = {}
  gridCols.value.forEach((l) => (o[l.colId] = l.col.title || l.colId))
  return o
})
/**
 * 列聚合方式变更的失效计数器：aggFunc 是直接写在列定义对象属性上的（引擎与持久化都沿这条读法），
 * 而 props 只浅层响应，嵌套对象的属性写入不被追踪——setAgg 后 panelCandidateLeaves /
 * rowGroupPayload / groupSig 都不重算，于是出现「合计数字已经变了，面板聚合标记却恒停在 ∑、
 * 连点不循环，且透给服务端的 rowGroup[].aggFunc 仍是 undefined、groupSig 不变不会重新取数」。
 * 写入处 +1，让靠列对象属性做显示的 computed 有个显式依赖可追。
 * （声明位置靠前：下面 panelCandidateLeaves 与本文件末尾的 setAgg 都要引用它）
 */
const aggRev = ref(0)

/**
 * 面板候选列（分组维/透视维/透视值）：固定用用户声明列。
 * 透视态下 listLeafUi 已被引擎生成的 __pv* 列顶替，若拿它做候选，
 * 用户再勾一次 `__pvrow0:kind` 就会把透视结果做塌（行塌成 1 行、聚合全 0）。
 */
const panelCandidateLeaves = computed<PanelLeaf[]>(() => {
  void aggRev.value // 面板聚合标记要跟随 setAgg 的写入重读（见 aggRev 注释）
  return collectLeaves(props.columns)
    .filter((c) => !c.checkbox && !c.rowDrag)
    .map((c) => ({
      col: c,
      colId: colIdOf(c),
      field: c.field,
      title: c.title,
      hidden: !!c.hidden || c.visible === false,
      pinned: (c.fixed === 'left' ? 'left' : c.fixed === 'right' ? 'right' : null) as
        | 'left'
        | 'right'
        | null,
      aggFunc: c.aggFunc as string | undefined
    }))
})
const panelFilters = computed(() => {
  const out: {
    colId: string
    kind: 'column' | 'float' | 'advanced'
    title: string
    text: string
  }[] = []
  rowModel.filterModels.forEach((m, id) =>
    out.push({
      colId: id,
      kind: 'column',
      title: colTitleById.value[id] || id,
      text: filterModelText(m)
    })
  )
  rowModel.floatFilters.forEach((v, id) => {
    if (v && v.trim())
      out.push({ colId: id, kind: 'float', title: colTitleById.value[id] || id, text: v })
  })
  const adv = rowModel.advancedFilter.value
  if (adv && countAdvConditions(adv) > 0)
    out.push({
      colId: '__advanced__',
      kind: 'advanced',
      title: t('advFilterTitle'),
      text: t('advConditions', { n: countAdvConditions(adv), op: adv.operator.toUpperCase() })
    })
  return out
})
function removePanelFilter(colId: string, kind: 'column' | 'float' | 'advanced') {
  if (kind === 'advanced') rowModel.advancedFilter.value = null
  else if (kind === 'column') rowModel.filterModels.delete(colId)
  else {
    rowModel.floatFilters.delete(colId)
    delete floatInput[colId]
  }
  rowModel.touch()
  emit('filter-change')
  dispatchEvent('filterChanged', {})
  scheduleSave()
}
function clearAllPanelFilters() {
  rowModel.filterModels.clear()
  rowModel.floatFilters.clear()
  rowModel.advancedFilter.value = null
  rowModel.quickFilter.value = ''
  commitFloat.cancel()
  commitQuick.cancel()
  syncFloatInput()
  rowModel.touch()
  emit('filter-change')
  dispatchEvent('filterChanged', {})
  scheduleSave()
}

// ---------------- ARIA 无障碍 ----------------
const gridRole = computed(() =>
  props.treeData || rowGroupFields.value.length ? 'treegrid' : 'grid'
)
const ariaRowCount = computed(
  () => rowModel.processed.value.displayRows.length + headerRowsInfo.value.depth
)
const ariaColCount = computed(() => gridCols.value.length)

// ---------------- 浮动筛选行 ----------------
const FROW_H = 30
const frowH = computed(() => (props.floatingFilters ? FROW_H : 0))
// 浮动筛选即时缓冲：输入框显示用，防抖后才写入 rowModel.floatFilters 触发重算（避免每键全量重算）
const floatInput = reactive<Record<string, string>>({})
function syncFloatInput() {
  Object.keys(floatInput).forEach((k) => delete floatInput[k])
  rowModel.floatFilters.forEach((v, k) => (floatInput[k] = v))
}
const floatValuesObj = computed(() => ({ ...floatInput }))
const floatSig = computed(() =>
  Array.from(rowModel.floatFilters.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => k + '=' + v)
    .join('&')
)
const commitFloat = debounce(() => {
  const cur = new Set(Object.keys(floatInput).filter((k) => floatInput[k]))
  rowModel.floatFilters.forEach((_v, k) => {
    if (!cur.has(k)) rowModel.floatFilters.delete(k)
  })
  cur.forEach((k) => rowModel.floatFilters.set(k, floatInput[k]))
  rowModel.touch()
  emit('filter-change')
  dispatchEvent('filterChanged', {})
  scheduleSave()
}, 200)
function onFloatFilter(colId: string, value: string) {
  if (value) floatInput[colId] = value
  else delete floatInput[colId]
  commitFloat()
}
syncFloatInput()
const filterMenu = ref<{
  col: RjColumn
  type: any
  model: RjFilterModel | null
  x: number
  y: number
  unique: any[]
} | null>(null)

function openFilter(cell: HeaderLevelCell, el: MouseEvent) {
  const col = cell.col
  const type = rowModel.filterTypeOf(col)
  let unique: any[] = []
  if (type === 'select') {
    const optList = colOptionList(col)
    if (optList && optList.length) {
      unique = flattenOptions(optList).map((o) => String(o.value))
    } else {
      unique = Array.from(
        new Set(
          rowModel
            .sourceRows()
            .slice(0, 5000)
            .map((r) => cellRawValue(col, r))
            .filter((v) => v != null)
        )
      ).map(String)
    }
  }
  const targetRect = (el.target as HTMLElement).getBoundingClientRect()
  const rootRect = rootRef.value?.getBoundingClientRect()
  const menuW = 260
  filterMenu.value = {
    col,
    type,
    model: rowModel.filterModels.get(colIdOf(col)) || null,
    x: Math.max(
      Math.min(targetRect.left - (rootRect?.left || 0), (rootRect?.width || 400) - menuW),
      4
    ),
    y: targetRect.bottom - (rootRect?.top || 0) + 4,
    unique
  }
}
function applyFilterMenu(model: RjFilterModel) {
  if (!filterMenu.value) return
  const colId = colIdOf(filterMenu.value.col)
  rowModel.filterModels.set(colId, model)
  rowModel.touch()
  filterMenu.value = null
  emit('filter-change')
  dispatchEvent('filterChanged', { colId })
  scheduleSave()
}
function clearFilterMenu() {
  if (!filterMenu.value) return
  const colId = colIdOf(filterMenu.value.col)
  rowModel.filterModels.delete(colId)
  rowModel.touch()
  filterMenu.value = null
  emit('filter-change')
  dispatchEvent('filterChanged', { colId })
  scheduleSave()
}

// ---------------- 高级过滤（跨列 AND/OR 表达式树） ----------------
const advDialog = ref<{ x: number; y: number } | null>(null)
const advFilterColumns = computed(() =>
  gridCols.value
    .filter((l) => !l.col.checkbox && !l.col.rowDrag)
    .map((l) => ({
      colId: l.colId,
      title: l.col.title || l.colId,
      filterType: rowModel.filterTypeOf(l.col)
    }))
)
function openAdvancedFilter() {
  filterMenu.value = null
  colMenu.value = null
  const rootRect = rootRef.value?.getBoundingClientRect()
  advDialog.value = {
    x: Math.max((rootRect?.width || 400) - 460, 8),
    y: 44
  }
}
function applyAdvancedFilter(model: AdvFilterGroup) {
  rowModel.advancedFilter.value = model
  rowModel.touch()
  advDialog.value = null
  emit('filter-change')
  dispatchEvent('advancedFilterChanged', { model })
  dispatchEvent('filterChanged', {})
  scheduleSave()
}
function clearAdvancedFilter() {
  rowModel.advancedFilter.value = null
  rowModel.touch()
  advDialog.value = null
  emit('filter-change')
  dispatchEvent('advancedFilterChanged', { model: null })
  dispatchEvent('filterChanged', {})
  scheduleSave()
}

// 快速搜索：本地即时值 + 防抖提交，避免每个按键同步重算全量行（大数据下卡顿）
const quickInput = ref(rowModel.quickFilter.value)
const commitQuick = debounce((v: string) => {
  rowModel.quickFilter.value = v
  rowModel.touch()
  scheduleSave()
}, 180)
watch(quickInput, (v) => commitQuick(v))
// 外部变更（面板清除/重置/setState）同步回输入框
watch(
  () => rowModel.quickFilter.value,
  (v) => {
    if (v !== quickInput.value) quickInput.value = v
  }
)

// ---------------- 交互（区域/键盘/剪贴板/查找） ----------------
const editing = ref<{ r: number; c: number } | null>(null)
// 脏格：key=`${rowKey}::${colId}` → 首次变更前原值与行引用；当前值==原值即自动清除（撤销天然复原）
const dirtyMap = ref<Map<string, { orig: any; data: RjRowData; colId: string }>>(new Map())
function dirtyKey(data: RjRowData, colId: string): string {
  return rowKeyOf(data, props.rowKey) + '::' + colId
}
/** 记录一次单元格变更对脏态的影响（仅在 markDirtyCells 开启时生效） */
function markDirty(data: RjRowData, colId: string, oldValue: any, newValue: any) {
  if (!props.markDirtyCells) return
  const k = dirtyKey(data, colId)
  const orig = dirtyMap.value.has(k) ? dirtyMap.value.get(k)!.orig : oldValue
  if (Object.is(newValue, orig)) dirtyMap.value.delete(k)
  else dirtyMap.value.set(k, { orig, data, colId })
}
const interaction = useInteraction({
  gridCols: () => gridCols.value,
  displayRows: () => rowModel.processed.value.displayRows,
  offsets: () => rowModel.offsets.value,
  rowHeight: () => rowHeight.value,
  getCellValue: (row, c) => {
    const leaf = gridCols.value[c]
    return leaf ? cellRawValue(leaf.col, row) : undefined
  },
  // 复制/查找用文本视图：图片列取文件名，避免整段 data URI 进剪贴板或被匹配
  getCellText: (row, c) => {
    const leaf = gridCols.value[c]
    return leaf ? exportRaw(leaf.col, cellRawValue(leaf.col, row)) : undefined
  },
  setCellValue: (row, colId, v) => {
    const col = pipelineCols.value.find((c) => colIdOf(c) === colId)
    if (col) rowModel.setRowValue(row, col, v)
  },
  isCellEditable: (row, c) => isEditable(row, gridCols.value[c]?.col),
  startEdit: (r, c) => startEdit(r, c),
  scrollToCell: (r, c) => apiObj.scrollTo(r, gridCols.value[c]?.colId),
  viewportSize: () => ({ w: viewportW.value, h: viewportH.value }),
  gridLeft: () => rootRef.value?.getBoundingClientRect().left || 0,
  gridTop: () => rootRef.value?.getBoundingClientRect().top || 0,
  onCellsChanged: (ps) => {
    emit('cells-changed', ps)
    ps.forEach((p) => {
      emit('cell-value-changed', p)
      markDirty(p.row, p.colId, p.oldValue, p.newValue)
    })
    // 粘贴/填充/剪切等批量写入整体纳入一次可撤销动作
    recordEdit(
      ps.map((p) => ({
        target: p.row,
        field: p.colId,
        oldValue: p.oldValue,
        newValue: p.newValue
      }))
    )
    scheduleSave()
  },
  copyHeaders: () => !!props.copyHeadersToClipboard,
  pasteTransformer: (t) => (props.pasteTransformer ? props.pasteTransformer(t) : t)
})
interaction.bindScroll(() => ({ top: scrollTop.value, left: scrollLeft.value }))
watch(editing, (v) => (interaction.editingRef.value = !!v))

const findOpen = interaction.findOpen
const findQuery = interaction.findQuery
const findMatches = interaction.findMatches
const findActive = interaction.findActive
const gotoMatch = interaction.gotoMatch
const findInputRef = ref<HTMLInputElement>()
// 查找条开启时自动聚焦并选中已有文本；关闭时回焦网格根节点以延续键盘导航
watch(findOpen, (v) => {
  if (v) nextTick(() => findInputRef.value?.select())
  else nextTick(() => rootRef.value?.focus())
})
const rangeRect = interaction.rangeRect
// 区域选区变更→总线事件（对齐 AG Grid rangeSelectionChanged）
watch(
  () => interaction.range.value,
  (r) => {
    dispatchEvent('rangeSelectionChanged', {
      ranges: r
        ? [
            {
              startRow: r.start.r,
              endRow: r.end.r,
              startColumn: gridCols.value[r.start.c]?.colId,
              endColumn: gridCols.value[r.end.c]?.colId
            }
          ]
        : []
    })
  }
)

// ---------------- 状态栏区域聚合 ----------------
function fmtStatNum(n: number): string {
  if (!isFinite(n)) return '-'
  if (Number.isInteger(n)) return n.toLocaleString()
  return (Math.round(n * 1e4) / 1e4).toLocaleString(undefined, { maximumFractionDigits: 4 })
}
const pivotActive = computed(
  () => rowModel.pivotState.value.active && rowModel.pivotState.value.cols.length > 0
)
const totalRowCount = computed(() => {
  if (props.dataMode === 'pagination' && props.loadData) return rowModel.serverTotal.value
  const dr = rowModel.processed.value.displayRows
  // 透视模式：按透视展示行（分组/总计）计数
  if (pivotActive.value) return dr.length
  // 分组（即使折叠）：顶层分组行 __count 已涵盖其下全部数据行，不受展开/折叠影响
  const tops = dr.filter((d) => d.type === 'group' && d.level === 0 && !d.isFooter)
  if (tops.length) return tops.reduce((s, d) => s + (Number((d.data as any).__count) || 0), 0)
  return dr.filter((d) => d.type === 'row').length
})
// 透视模式下原始数据钉行无意义（与透视行不同构），隐藏之
const visPinnedTop = computed(() => (pivotActive.value ? [] : props.pinnedTopRows || []))
const visPinnedBottom = computed(() => (pivotActive.value ? [] : props.pinnedBottomRows || []))
// 脏格数（仅 markDirtyCells 开启时非零）
const dirtyCount = computed(() => (props.markDirtyCells ? dirtyMap.value.size : 0))
// SSRM 块缓存实时统计（依赖 processed 重算驱动）
const ssrmInfo = computed(() => {
  void rowModel.processed.value
  if (props.dataMode !== 'serverSide') return null
  const s = rowModel.ssrmStore()
  const total = s.rowCount > 0 ? s.rowCount : 0
  const bc = s.blockCount()
  let blocks = 0
  let loadedRows = 0
  for (let b = 0; b < bc; b++)
    if (s.isBlockLoaded(b)) {
      blocks++
      loadedRows += s.endRowOf(b) - s.startRowOf(b)
    }
  return { total, blocks, loadedRows }
})
const rangeStats = computed(() => {
  const ranges = interaction.allRanges()
  if (!ranges.length) return null
  const dispRows = rowModel.processed.value.displayRows
  const cols = gridCols.value
  const agg = new Map<number, { nums: number[]; nonEmpty: number }>()
  let cMin = Infinity
  let cMax = -1
  let rowCount = 0
  ranges.forEach((rng) => {
    const r1 = Math.min(rng.start.r, rng.end.r)
    const r2 = Math.max(rng.start.r, rng.end.r)
    const c1 = Math.min(rng.start.c, rng.end.c)
    const c2 = Math.max(rng.start.c, rng.end.c)
    rowCount += r2 - r1 + 1
    cMin = Math.min(cMin, c1)
    cMax = Math.max(cMax, c2)
    for (let c = c1; c <= c2; c++) {
      const leaf = cols[c]
      if (!leaf) continue
      let slot = agg.get(c)
      if (!slot) {
        slot = { nums: [], nonEmpty: 0 }
        agg.set(c, slot)
      }
      for (let r = r1; r <= r2; r++) {
        const drow = dispRows[r]
        if (!drow || drow.type !== 'row') continue
        const v = cellRawValue(leaf.col, drow.data)
        if (v == null || v === '') continue
        slot.nonEmpty++
        const s = String(v).trim()
        const n = typeof v === 'number' ? v : Number(s)
        if (typeof v === 'number' || (s !== '' && !isNaN(n))) slot.nums.push(n)
      }
    }
  })
  const perCol: {
    colId: string
    title: string
    stats: { key: string; label: string; value: string }[]
  }[] = []
  Array.from(agg.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([c, slot]) => {
      const leaf = cols[c]
      if (!leaf) return
      const title = leaf.col.title || leaf.colId
      if (slot.nums.length) {
        const sum = slot.nums.reduce((s, x) => s + x, 0)
        const map: Record<string, string> = {
          sum: fmtStatNum(sum),
          avg: fmtStatNum(sum / slot.nums.length),
          count: String(slot.nums.length),
          min: fmtStatNum(Math.min(...slot.nums)),
          max: fmtStatNum(Math.max(...slot.nums))
        }
        const stats: { key: string; label: string; value: string }[] = []
        props.statusAggregations.forEach((k) => {
          if (map[k] != null) stats.push({ key: k, label: t(AGG_LABELS[k]), value: map[k] })
        })
        perCol.push({ colId: leaf.colId, title, stats })
      } else if (slot.nonEmpty) {
        perCol.push({
          colId: leaf.colId,
          title,
          stats: [{ key: 'count', label: t('aggCount'), value: String(slot.nonEmpty) }]
        })
      }
    })
  return { rows: rowCount, cols: cMax - cMin + 1, perCol }
})

function isEditable(row: RjRowData, col?: RjColumn): boolean {
  if (!props.editable || !col || !col.field) return false
  if (
    (row as any).__group ||
    (row as any).__summary ||
    (row as any).__pivot ||
    (row as any).__ssrmLoading ||
    (row as any).__pinned
  )
    return false
  if (col.checkbox || col.rowDrag) return false
  if (col.editable == null) return true
  return typeof col.editable === 'function' ? col.editable(row) : col.editable
}

function startEdit(r: number, c: number) {
  const rows = rowModel.processed.value.displayRows
  const cols = gridCols.value
  const row = rows[r]
  const leaf = cols[c]
  if (!row || row.type !== 'row' || !leaf) return
  if (!isEditable(row.data, leaf.col)) return
  editing.value = { r, c }
  nextTick(() => rootRef.value?.focus())
}
function stopEdit() {
  editing.value = null
}
function commitEdit(v: any) {
  if (!editing.value) return
  const { r, c } = editing.value
  const rows = rowModel.processed.value.displayRows
  const leaf = gridCols.value[c]
  const row = rows[r]
  if (row && leaf) {
    const oldValue = cellRawValue(leaf.col, row.data)
    const fxKey = dirtyKey(row.data, leaf.colId)
    // 公式：输入为以 = 开头的文本 → 存为单元格公式（不写回原始值，重算引擎产出显示值）
    if (typeof v === 'string' && isFormula(v)) {
      cellFormulas.set(fxKey, v)
      rowModel.touch()
      emit('cell-value-changed', { row: row.data, colId: leaf.colId, newValue: v, oldValue })
      dispatchEvent('cellValueChanged', { node: row, colId: leaf.colId, newValue: v, oldValue })
      leaf.col.onCellValueChanged?.({ newValue: v, oldValue, row: row.data, column: leaf.col })
      scheduleSave()
      editing.value = null
      return
    }
    // 普通值：若此前为公式单元格，清除其公式后写入基础值
    if (cellFormulas.has(fxKey)) cellFormulas.delete(fxKey)
    // valueParser：编辑提交前把输入解析为目标类型（如去货币符号、括号负数、百分比）
    const newValue = leaf.col.valueParser
      ? leaf.col.valueParser({ newValue: v, oldValue, row: row.data, column: leaf.col })
      : v
    rowModel.setRowValue(row.data, leaf.col, newValue)
    emit('cell-value-changed', { row: row.data, colId: leaf.colId, newValue, oldValue })
    dispatchEvent('cellValueChanged', {
      node: row,
      colId: leaf.colId,
      newValue,
      oldValue
    })
    leaf.col.onCellValueChanged?.({ newValue, oldValue, row: row.data, column: leaf.col })
    // 仅当值确实变化才入撤销栈，避免产生“空撤销步”
    if (!Object.is(newValue, oldValue))
      recordEdit([{ target: row.data, field: leaf.colId, oldValue, newValue }])
    markDirty(row.data, leaf.colId, oldValue, newValue)
    scheduleSave()
  }
  editing.value = null
}

// ---------------- 编辑撤销/重做（对标 AG Grid undoRedoCellEditing） ----------------
type RjTargetRow = RjRowData
const editHistory = new EditHistory<RjTargetRow>(props.undoRedoCellEditingLimit)
watch(
  () => props.undoRedoCellEditingLimit,
  (n) => editHistory.setLimit(n)
)
// 行数据整体替换（非就地编辑）时清空历史，避免持有已失效的行引用
watch(
  () => props.rows,
  () => {
    editHistory.clear()
    dirtyMap.value.clear()
  }
)
/** 记录一次编辑动作（单格或批量），受 undoRedoCellEditing 开关门控 */
function recordEdit(group: EditChange<RjTargetRow>[]) {
  if (!props.undoRedoCellEditing || !group.length) return
  editHistory.push(group)
  dispatchEvent('historyUndoChanged', { undoDepth: editHistory.undoDepth })
  dispatchEvent('historyRedoChanged', { redoDepth: editHistory.redoDepth })
}
function colByColId(colId: string): RjColumn | undefined {
  return pipelineCols.value.find((c) => colIdOf(c) === colId)
}
/** 写回单个变更（useOld=true 撤销写旧值，false 重做写新值） */
function applyEditChange(ch: EditChange<RjTargetRow>, useOld: boolean) {
  const col = colByColId(ch.field)
  if (!col) return
  const v = useOld ? ch.oldValue : ch.newValue
  const reverted = useOld ? ch.newValue : ch.oldValue
  rowModel.setRowValue(ch.target, col, v)
  markDirty(ch.target, ch.field, useOld ? ch.newValue : ch.oldValue, v)
  emit('cell-value-changed', { row: ch.target, colId: ch.field, newValue: v, oldValue: reverted })
  dispatchEvent('cellValueChanged', { colId: ch.field, newValue: v, oldValue: reverted })
  col.onCellValueChanged?.({ newValue: v, oldValue: reverted, row: ch.target, column: col })
}
function undoEdit() {
  if (!props.undoRedoCellEditing) return
  const g = editHistory.undo()
  if (!g) return
  g.forEach((ch) => applyEditChange(ch, true))
  rowModel.touch()
  scheduleSave()
  dispatchEvent('historyUndoChanged', { undoDepth: editHistory.undoDepth })
  dispatchEvent('historyRedoChanged', { redoDepth: editHistory.redoDepth })
}
function redoEdit() {
  if (!props.undoRedoCellEditing) return
  const g = editHistory.redo()
  if (!g) return
  g.forEach((ch) => applyEditChange(ch, false))
  rowModel.touch()
  scheduleSave()
  dispatchEvent('historyUndoChanged', { undoDepth: editHistory.undoDepth })
  dispatchEvent('historyRedoChanged', { redoDepth: editHistory.redoDepth })
}
/** Delete/Backspace 清空选区/活动单元格（可编辑格），整体纳入一次撤销 */
function deleteSelection() {
  if (!props.editable) return
  const rows = rowModel.processed.value.displayRows
  const cols = gridCols.value
  const cells: { r: number; c: number }[] = []
  const rng = interaction.range.value
  if (rng) {
    const r1 = Math.min(rng.start.r, rng.end.r)
    const r2 = Math.max(rng.start.r, rng.end.r)
    const c1 = Math.min(rng.start.c, rng.end.c)
    const c2 = Math.max(rng.start.c, rng.end.c)
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) cells.push({ r, c })
  } else if (interaction.active.value) {
    cells.push({ r: interaction.active.value.r, c: interaction.active.value.c })
  } else return
  const changes: EditChange<RjTargetRow>[] = []
  for (const { r, c } of cells) {
    const row = rows[r]
    const leaf = cols[c]
    if (!row || row.type !== 'row' || !leaf || !isEditable(row.data, leaf.col)) continue
    const oldValue = cellRawValue(leaf.col, row.data)
    if (oldValue == null) continue
    rowModel.setRowValue(row.data, leaf.col, null)
    emit('cell-value-changed', { row: row.data, colId: leaf.colId, newValue: null, oldValue })
    dispatchEvent('cellValueChanged', { colId: leaf.colId, newValue: null, oldValue })
    changes.push({ target: row.data, field: leaf.colId, oldValue, newValue: null })
  }
  if (changes.length) {
    recordEdit(changes)
    rowModel.touch()
    scheduleSave()
  }
}
// ---------------- 单元格构建 ----------------
interface CellSpec {
  leaf: RjLeafCol
  colIndex: number
  value: any
  display: string
  width: number
  height: number
  isAnchor: boolean
  isGroupAnchor: boolean
  /** rowSpan>1 跨行格：需提升层级，避免下半截被下一行不透明背景盖住 */
  z?: number
}

const globalColIndex = computed(() => new Map(gridCols.value.map((l, i) => [l.colId, i])))

function displayOf(col: RjColumn, value: any, row: RjRowData, rowIndex: number): string {
  if (col.checkbox || col.rowDrag) return ''
  // 组行/小计/合计这类合成行：该列没有值就留空，不能把 undefined 交给宿主 formatter。
  // 像 (v) => v ? '显示' : '隐藏' 这种布尔写法会把「没有值」当成 false，在小计行凭空造出
  // 「隐藏 / 不缓存」的业务结论。取值层 cellRawValue 已经按「组行无该列聚合项就留空」返回
  // undefined，显示层不能再把它推翻。
  if (value == null && ((row as any).__group || (row as any).__summary)) return ''
  const params: RjCellParams = { value, row, rowIndex, column: col, colIndex: 0 }
  const fm = col.formatter
  if (fm) {
    let t: any
    if (typeof fm === 'function') t = fm(params)
    else {
      const fn = compileExpression(fm)
      t = fn ? fn({ ...params, data: row, node: row }) : null
    }
    const s = t == null ? '' : String(t)
    // 透视/分组生成列沿用了源列 formatter，但组行上没有源列的原始字段（引用 data.xxx 的写法会算出 NaN）
    // → 取值失败时退回按类型格式化，不拿 NaN 冒充业务值
    if ((s === '' || s === 'NaN' || s === 'Invalid Date') && (row as any).__group && value != null)
      return formatByType(col, value, BOOL_LABELS.value)
    return s
  }
  const lab = colOptionLabel(col, value)
  if (lab != null) return lab
  return formatByType(col, value, BOOL_LABELS.value)
}

/** rowSpan 单元格是否被上方行的跨行区盖住 */
function coveredByRowSpan(rows: RjDisplayRow[], i: number, leaf: RjLeafCol): boolean {
  const fn = leaf.col.rowSpan
  if (!fn) return false
  for (let j = i - 1; j >= 0 && i - j <= 50; j--) {
    const r = rows[j]
    const s = r.type === 'row' ? Math.max(fn(r.data) || 1, 1) : 1
    if (s > i - j) return true
    if (s === 1) return false
  }
  return false
}

function cellsOf(drow: RjDisplayRow, rowIndex: number, leaves: RjLeafCol[]): CellSpec[] {
  const out: CellSpec[] = []
  const rows = rowModel.processed.value.displayRows
  const gmap = globalColIndex.value
  const isDataRow = drow.type === 'row'
  const isGroup = drow.type === 'group'
  for (let k = 0; k < leaves.length; k++) {
    const leaf = leaves[k]
    const col = leaf.col
    if (isGroup && col.checkbox && !groupCheckEnabled.value) continue
    const gi = gmap.get(leaf.colId) ?? k
    if (isDataRow && col.rowSpan && coveredByRowSpan(rows, rowIndex, leaf)) continue
    let w = leaf.width
    let skip = 0
    if (isDataRow && col.colSpan) {
      const cs = Math.max(col.colSpan(drow.data) || 1, 1)
      for (let j = 1; j < cs; j++) {
        const nl = gridCols.value[gi + j]
        if (!nl || nl.fixed !== leaf.fixed) break
        w += nl.width
        skip++
      }
    }
    let h = drow.height
    let z: number | undefined
    if (isDataRow && col.rowSpan) {
      const rs = Math.max(col.rowSpan(drow.data) || 1, 1)
      for (let j = 1; j < rs && rowIndex + j < rows.length; j++) h += rows[rowIndex + j].height
      // 行容器不透明背景且 DOM 在后：跨行格溢出部分不抬层会被下一行盖住下半截
      if (rs > 1) z = 2
    }
    // anchor 由全局唯一列决定（见 anchorColId），不随传入的 leaves 子集（左/普通/右冻结层）各自重选
    const anchor = leaf.colId === anchorColId.value && (isDataRow || isGroup)
    const value = isDataRow || isGroup ? cellRawValue(col, drow.data) : undefined
    out.push({
      leaf,
      colIndex: gi,
      value,
      display: displayOf(col, value, drow.data, rowIndex),
      width: w,
      height: h,
      isAnchor: anchor && isDataRow,
      isGroupAnchor: anchor && isGroup,
      z
    })
    k += skip
  }
  return out
}

function cellProps(
  cell: CellSpec,
  vr: { row: RjDisplayRow; i: number; top: number },
  fixed?: 'left' | 'right'
) {
  const leaf = cell.leaf
  const drow = vr.row
  const ed = editing.value
  const rt = layout.value
  return {
    leaf,
    drow,
    rowIndex: vr.i,
    colIndex: cell.colIndex,
    x: fixed === 'right' ? leaf.x - Math.max(rt.totalWidth - rt.rightWidth, 0) : leaf.x,
    width: cell.width,
    height: cell.height,
    z: cell.z,
    value:
      !!ed && ed.r === vr.i && gridCols.value[ed.c]?.colId === leaf.colId
        ? (cellFormulas.get(dirtyKey(drow.data, leaf.colId)) ?? cell.value)
        : cell.value,
    display: cell.display,
    checked: leaf.col.checkbox
      ? drow.type === 'group'
        ? groupCheckedState(drow.key).checked
        : selection.has(drow.key)
      : undefined,
    indeterminate:
      leaf.col.checkbox && drow.type === 'group'
        ? groupCheckedState(drow.key).indeterminate
        : undefined,
    groupDisplay: props.groupDisplayType,
    editing: !!ed && ed.r === vr.i && gridCols.value[ed.c]?.colId === leaf.colId,
    flash: rowModel.flashRows.value.has(drow.key),
    dirty:
      props.markDirtyCells && drow.type === 'row' && !leaf.col.checkbox && !leaf.col.rowDrag
        ? dirtyMap.value.has(dirtyKey(drow.data, leaf.colId))
        : undefined,
    treeExpandable: !!props.treeData && drow.type === 'row' && drow.expanded !== undefined,
    hasDetail: !!slots['row-detail'] && drow.type === 'row',
    detailOpen: rowModel.expandedDetails.value.has(drow.key),
    isAnchor: cell.isAnchor,
    isGroupAnchor: cell.isGroupAnchor,
    matches: interaction.matchOf(vr.i, leaf.colId),
    activeMatch: interaction.activeMatchOf(vr.i, leaf.colId)
  }
}

// ---------------- 钉行 / 合计行 ----------------
function pinnedAsDisplay(prow: RjRowData): RjDisplayRow {
  return {
    key: rowKeyOf(prow, props.rowKey),
    type: 'row',
    data: { ...prow, __pinned: true },
    level: 0,
    height: rowHeight.value,
    noDrag: true,
    pinned: true
  }
}
function pinCells(prow: RjRowData): CellSpec[] {
  return cellsOf(pinnedAsDisplay(prow), -1, gridCols.value)
}
/**
 * 钉行 / 合计行的冻结列副本层描述：与表头同款「裁切容器 + 整宽行反向位移」。
 * 这三行不走 .rj-fixed-layer，此前只靠 translateX(-scrollLeft) 跟随横滚，
 * 导致首列「总计」标签一滚就出可视区。
 */
function pinSideLayers(): {
  key: string
  style: Record<string, string>
  shift: number
  leaves: RjLeafCol[]
}[] {
  const { totalWidth, leftWidth, rightWidth, leftLeaves, rightLeaves } = layout.value
  const out: { key: string; style: Record<string, string>; shift: number; leaves: RjLeafCol[] }[] =
    []
  if (leftWidth > 0 && leftLeaves.length)
    out.push({
      key: 'l',
      style: { left: '0px', width: leftWidth + 'px' },
      shift: 0,
      leaves: leftLeaves
    })
  if (rightWidth > 0 && rightLeaves.length)
    out.push({
      key: 'r',
      style: { right: '0px', width: rightWidth + 'px' },
      shift: rightWidth - totalWidth,
      leaves: rightLeaves
    })
  return out
}
function pinCellsSide(prow: RjRowData, leaves: RjLeafCol[]): CellSpec[] {
  return cellsOf(pinnedAsDisplay(prow), -1, leaves)
}
/** 合计行标签列：拿「总计」放在哪一列 */
const summaryLabelColId = computed(() => {
  const s = rowModel.summaryRow.value as any
  // 图片列不能当标签宿主：它会把「总计」当成 URL 列表去渲染破图
  const plain = gridCols.value.filter(
    (l) => !l.col.checkbox && !l.col.rowDrag && l.col.type !== 'image'
  )
  const empty = plain.filter((l) => {
    const v = s?.[l.colId]
    // 有聚合值的列不应被标签顶掉
    return v == null || v === ''
  })
  // 0) 显式指定的宿主列
  const forced = empty.find((l) => l.col.summaryLabel) || plain.find((l) => l.col.summaryLabel)
  if (forced) return forced.colId
  // 1) 左冻结优先：合计行标签是「行标识」，落在非冻结列上横滚一下就跑出可视区
  const ranked = [...empty.filter((l) => l.col.fixed === 'left'), ...empty]
  // 2) 自定义单元格插槽会接管渲染、把组件算出的标签吞掉 → 只作次选
  const pick = ranked.find((l) => !slots['cell-' + l.colId]) || ranked[0] || plain[0]
  return pick ? pick.colId : ''
})
function pinRowCellProps(leaf: RjLeafCol, data: RjRowData, summary = false) {
  const drow: RjDisplayRow = {
    key: summary ? '__summary__' : '__pin__',
    type: 'row',
    data,
    level: 0,
    height: rowHeight.value,
    noDrag: true,
    pinned: true
  }
  const value = summary
    ? ((data as any)[colIdOf(leaf.col)] ?? cellRawValue(leaf.col, data))
    : cellRawValue(leaf.col, data)
  let display = displayOf(leaf.col, value, data, -1)
  let cellValue = value
  // 合计行标签列若无聚合值，标上“总计”以说明这一排数字的含义（对齐 AG Grid 的 count/sum 标签列）
  // 同时写进 value：自定义单元格插槽拿的是 params.value，只改 display 会被插槽吞掉
  if (summary && (value == null || value === '') && leaf.colId === summaryLabelColId.value) {
    cellValue = display = t('grandTotal')
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
  }
}

// ---------------- 行样式 / 展开 ----------------
// 悬停行高亮：以行键记录（跨主层/左右冻结层同一行联动），仅鼠标移动跨行时才更新
const hoverKey = ref('')
function onBodyPointerMove(e: PointerEvent) {
  // 拖拽中不刷 hover：自滚动会使鼠标下的行高频变化，导致全可见行 class 重算与多余重绘
  if (rowDragState) return
  if (!props.rowHover || e.pointerType !== 'mouse') return
  const rk = (e.target as HTMLElement).closest?.('.rj-row')?.getAttribute('data-rk') ?? ''
  if (rk !== hoverKey.value) hoverKey.value = rk
}
// 行悬停判定：行键可能是 number/string，统一转字符串与 data-rk 比较；仅数据行参与（组行/页脚/明细/全宽行保持自身层次色）
function isHoverRow(drow: RjDisplayRow) {
  return (
    drow.type === 'row' &&
    props.rowHover &&
    hoverKey.value !== '' &&
    String(drow.key) === hoverKey.value
  )
}

function rowClass(drow: RjDisplayRow, i: number) {
  const cls: Record<string, boolean> = {
    'rj-odd': i % 2 === 1,
    'is-hover': isHoverRow(drow),
    'is-selected': selection.has(drow.key),
    'is-flash': rowModel.flashRows.value.has(drow.key),
    'rj-group-row': drow.type === 'group' && !drow.isFooter,
    'rj-group-footer': drow.type === 'group' && !!drow.isFooter,
    'rj-detail-row': drow.type === 'detail',
    'rj-fullwidth-row': drow.type === 'fullwidth'
  }
  if (props.getRowClass && drow.type === 'row') {
    const extra = props.getRowClass({ row: drow.data, rowIndex: i })
    if (extra)
      String(extra)
        .split(' ')
        .filter(Boolean)
        .forEach((x) => (cls[x] = true))
  }
  return cls
}

function onToggleExpand(drow: RjDisplayRow) {
  if (drow.type === 'group') {
    const path = String(drow.data.__path ?? drow.key)
    if (rowModel.isServerGroupView()) {
      // 服务端权威分组：折叠态驱动（收起隐藏其子区间，展开且子行未内联则触发 type:'group' 子块）
      rowModel.setServerGroupCollapsed(path, !!drow.expanded)
      dispatchEvent('rowGroupOpened', { groupKey: path, expanded: !drow.expanded })
      return
    }
    if (drow.expanded && rowModel.defaultExpandAll.value) {
      // 从"全展开"首次收起：把其余组显式登记为展开
      const all = new Set<string>(
        rowModel.processed.value.displayRows
          .filter((d) => d.type === 'group')
          .map((d) => String(d.key))
      )
      all.delete(path)
      rowModel.expandedGroups.value = all
      rowModel.defaultExpandAll.value = false
    } else rowModel.expandGroup(path, !drow.expanded)
    dispatchEvent('rowGroupOpened', { groupKey: path, expanded: !drow.expanded })
  } else if (props.treeData) {
    const key = String(drow.key)
    if (drow.expanded && rowModel.defaultExpandAll.value) {
      const s = new Set<string>()
      rowModel.processed.value.displayRows.forEach((d) => {
        if (d.type === 'row' && d.expanded !== undefined && String(d.key) !== key)
          s.add(String(d.key))
      })
      rowModel.expandedTree.value = s
      rowModel.defaultExpandAll.value = false
    } else rowModel.toggleTree(key)
  }
}

function onToggleDetail(drow: RjDisplayRow) {
  rowModel.toggleDetail(drow.key)
  if (rowModel.expandedDetails.value.has(drow.key)) emit('detail-open', drow.data)
}

// ---------------- 选区矩形样式 ----------------
function vrInRange(i: number) {
  const rg = interaction.range.value
  if (!rg) return false
  const a = Math.min(rg.start.r, rg.end.r)
  const b = Math.max(rg.start.r, rg.end.r)
  return i >= a && i <= b
}
function rangeStyleInRow(
  vr: { row: RjDisplayRow; i: number; top: number },
  right = false
): Record<string, string> {
  const rect = rangeRect.value
  if (!rect) return {} as Record<string, string>
  const top = Math.max(rect.top, vr.top) - vr.top
  const bottom = Math.min(rect.top + rect.height, vr.top + vr.row.height) - vr.top
  const left = right
    ? rect.left - Math.max(layout.value.totalWidth - layout.value.rightWidth, 0)
    : rect.left
  return {
    left: left + 'px',
    top: top + 'px',
    width: rect.width + 'px',
    height: Math.max(bottom - top, 0) + 'px'
  }
}
const activeRectStyle = computed<Record<string, string>>(() => {
  const r = interaction.activeRect.value
  if (!r) return {} as Record<string, string>
  return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }
})
const fillHandleStyle = computed<Record<string, string>>(() => {
  const r = rangeRect.value
  if (!r) return {} as Record<string, string>
  return { left: r.left + r.width - 4 + 'px', top: r.top + r.height - 4 + 'px' }
})
function extraRangeStyle(er: { start: any; end: any }): Record<string, string> {
  const r = interaction.rangeRectOf(er)
  if (!r) return {} as Record<string, string>
  return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }
}

/**
 * 内容装得下（totalWidth <= viewportW，无横向滚动）时，右冻结浮层若仍锚容器右缘（right:0），
 * 会与主表头/主表体右冻结落点（内容右缘 totalWidth-rightWidth）错位，浮层盖住半列露出"幽灵列"。
 * 此时改锚内容右缘与主渲染对齐（同左冻结恒重合语义）；溢出时维持 right:0 钉视口右缘，滚动跟随不变。
 */
function rightFit(): boolean {
  return layout.value.totalWidth <= viewportW.value
}
function headerClipStyle(side: 'left' | 'right'): Record<string, string> {
  if (side === 'left') return { left: '0px', width: layout.value.leftWidth + 'px' }
  return rightFit()
    ? {
        left: layout.value.totalWidth - layout.value.rightWidth + 'px',
        right: 'auto',
        width: layout.value.rightWidth + 'px'
      }
    : { right: '0px', width: layout.value.rightWidth + 'px' }
}
function fixedLayerStyle(side: 'left' | 'right'): Record<string, string> {
  // 外层作为视口裁切框，行位移交给内层 canvas 的单条 transform
  const clip = { height: viewportH.value + 'px', overflow: 'hidden' }
  if (side === 'left') {
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: layout.value.leftWidth + 'px',
      ...clip
    }
  }
  // 基类 .rj-fixed-layer 带 left:0，绝对定位下 left 会压过 right → 未走 left 定位时须显式 auto
  if (rightFit()) {
    return {
      position: 'absolute',
      left: layout.value.totalWidth - layout.value.rightWidth + 'px',
      right: 'auto',
      top: '0px',
      width: layout.value.rightWidth + 'px',
      ...clip
    }
  }
  return {
    position: 'absolute',
    right: '0px',
    left: 'auto',
    top: '0px',
    width: layout.value.rightWidth + 'px',
    ...clip
  }
}
/** 冻结层画布元素：用于在同一帧内直写 transform，不等 Vue 响应式回写 */
const leftCanvasRef = ref<HTMLElement | null>(null)
const rightCanvasRef = ref<HTMLElement | null>(null)
/**
 * 跟滚直写：与 fixedCanvasStyle 的绑定值同构。
 * 同时要把 scrollTop.value 推到同一个值：拖拽自滚是命令式改 scrollTop，scroll 事件走 rAF 节流
 * 会让响应式值落后整一帧，那一拍 Vue patch 时绑定值仍是旧值，会把刚直写对的 transform 又覆写回去。
 */
function syncFixedCanvas(y: number) {
  const t = `translate3d(0, ${-y}px, 0)`
  if (leftCanvasRef.value) leftCanvasRef.value.style.transform = t
  if (rightCanvasRef.value) rightCanvasRef.value.style.transform = t
  if (scrollTop.value !== y) scrollTop.value = y
}
/** 冻结层画布：高度等于总行高，滚动只改写这一条 transform（合成器层，避免逐行 top 引发的布局风暴） */
const fixedCanvasStyle = computed<Record<string, string>>(() => ({
  position: 'absolute',
  left: '0px',
  top: '0px',
  width: '100%',
  height: Math.max(rowModel.totalHeight.value, 1) + 'px',
  transform: `translate3d(0, ${-scrollTop.value}px, 0)`,
  willChange: 'transform'
}))

// ---------------- 指针 / 键盘 ----------------
function pointToCell(e: MouseEvent | PointerEvent) {
  const el = scrollerRef.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  // 传视口相对坐标；滚动量由 cellFromPoint 内部统一叠加（避免与 el.scroll* 双重计算）
  return interaction.cellFromPoint(e.clientX - rect.left, e.clientY - rect.top)
}
function cellDisplayAt(pos: { r: number; c: number }): string {
  const drow = rowModel.processed.value.displayRows[pos.r]
  const leaf = gridCols.value[pos.c]
  if (!drow || !leaf) return ''
  return displayOf(leaf.col, cellRawValue(leaf.col, drow.data), drow.data, pos.r)
}

let winPointerMove: ((e: PointerEvent) => void) | null = null
let winPointerUp: ((e: PointerEvent) => void) | null = null

function onBodyPointerDown(e: PointerEvent) {
  const pos = pointToCell(e)
  if (pos) {
    const drow = rowModel.processed.value.displayRows[pos.r]
    const leaf = gridCols.value[pos.c]
    if (drow && leaf)
      emit(
        'cell-click',
        {
          value: cellRawValue(leaf.col, drow.data),
          row: drow.data,
          rowIndex: pos.r,
          column: leaf.col,
          colIndex: pos.c
        },
        e as unknown as MouseEvent
      )
    if (drow && leaf)
      dispatchEvent('cellClicked', {
        node: drow,
        data: drow.data,
        rowIndex: pos.r,
        colIndex: pos.c,
        column: leaf.col
      })
    // 单击数据行单元格=选中该行（仅纯鼠标左键；按住 Ctrl/Shift/Alt 时交给下方区域选择）
    // 跳过复选框：复选框由自身 @click → toggleRowKey 接管，否则 pointerdown 的替换式选中会被随后的 toggle 抵消
    if (
      props.selectOnCellClick &&
      e.button === 0 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey &&
      !e.altKey &&
      drow &&
      drow.type === 'row' &&
      !(e.target instanceof Element && e.target.closest('.rj-checkbox'))
    )
      selectRowByClick(drow)
  }
  if (!props.rangeSelection || e.button !== 0 || !pos) return
  interaction.onPointerDown(pos, e)
  winPointerMove = (ev) => interaction.onPointerMove(pointToCell(ev), ev)
  winPointerUp = () => {
    interaction.onPointerUp()
    if (winPointerMove) window.removeEventListener('pointermove', winPointerMove)
    if (winPointerUp) window.removeEventListener('pointerup', winPointerUp)
    winPointerMove = null
    winPointerUp = null
  }
  window.addEventListener('pointermove', winPointerMove)
  window.addEventListener('pointerup', winPointerUp)
}

function onBodyDblClick(e: MouseEvent) {
  const pos = pointToCell(e)
  if (!pos) return
  const drow = rowModel.processed.value.displayRows[pos.r]
  const leaf = gridCols.value[pos.c]
  if (!drow || !leaf) return
  emit(
    'cell-dblclick',
    {
      value: cellRawValue(leaf.col, drow.data),
      row: drow.data,
      rowIndex: pos.r,
      column: leaf.col,
      colIndex: pos.c
    },
    e
  )
  dispatchEvent('cellDoubleClicked', {
    node: drow,
    data: drow.data,
    rowIndex: pos.r,
    colIndex: pos.c,
    column: leaf.col
  })
  if (drow.type === 'row' && isEditable(drow.data, leaf.col)) startEdit(pos.r, pos.c)
}

function onRootKeydown(e: KeyboardEvent) {
  if (editing.value) return
  // 焦点在输入框/文本域/可编辑元素（快速搜索、查找条、浮动筛选）时，不劫持其键盘行为
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  const ctrl = isMac() ? e.metaKey : e.ctrlKey
  // 撤销/重做（Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y）
  if (ctrl && (e.key === 'z' || e.key === 'Z')) {
    if (e.shiftKey) redoEdit()
    else undoEdit()
    e.preventDefault()
    return
  }
  if (ctrl && (e.key === 'y' || e.key === 'Y')) {
    redoEdit()
    e.preventDefault()
    return
  }
  // Delete/Backspace 清空选区/活动单元格
  if ((e.key === 'Delete' || e.key === 'Backspace') && props.editable) {
    if (interaction.active.value || interaction.range.value) {
      deleteSelection()
      e.preventDefault()
      return
    }
  }
  const handled = interaction.onKeydown(e, false)
  if (!handled && e.key === 'Escape') {
    filterMenu.value = null
    menu.value = null
    colMenu.value = null
  }
}

function onWinPaste(e: ClipboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  if (!rootRef.value?.contains(t ?? null)) return
  interaction.onPaste(e)
}

// ---------------- 行拖拽排序（持续 rAF 循环 + 落点迟滞 + 边缘变速自滚 + 浮影直写 DOM） ----------------
const rowDrag = ref<{ from: number; to: number; height: number } | null>(null)
/** 拖拽浮影：整行缩略快照的单元格。kind 区分文本/图片/迷你图（后两者用占位块，不塞原始值） */
type GhostCell = { w: number; kind: 'text' | 'img' | 'spark'; text: string }
const dragGhost = ref<{ cells: GhostCell[]; h: number } | null>(null)
const dragGhostRef = ref<HTMLElement | null>(null)
/** 浮影首帧位置：仅激活时由模板写一次，其后每帧直写 transform，避开每帧 Vue 样式补丁 */
const ghostInitTransform = ref('translate3d(-9999px, -9999px, 0)')
let rowDragState: {
  drow: RjDisplayRow
  from: number
  height: number
  x: number
  y: number
  startX: number
  startY: number
  active: boolean
  /** 几何快照：滚动容器矩形与可滚上限，拖拽期间限频重测，避免每帧 read-after-write 触发布局 */
  rectTop: number
  rectH: number
  maxScroll: number
  geomAt: number
  /** 自滚亚像素累加器：只把整数步写进 scrollTop */
  sub: number
} | null = null
let dragRaf = 0
/** 落位 FLIP 的当前作用元素与清理定时器：新一次拖拽/落位前先行还原，避免连拖误清新行 transform */
let dragSettle: { els: HTMLElement[]; timer: ReturnType<typeof setTimeout> } | null = null
/** 网格内轻提示（自动消失）：用于解释「为什么不能拖」这类否则只能默默失败的操作 */
const gridToast = ref('')
let gridToastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(text: string, ms = 2200) {
  gridToast.value = text
  if (gridToastTimer) clearTimeout(gridToastTimer)
  gridToastTimer = setTimeout(() => {
    gridToast.value = ''
    gridToastTimer = null
  }, ms)
}
/** 非拖拽时行共享同一空样式对象，省去可见行每帧新建 style */
const NO_ROW_STYLE: Record<string, string> = {}
/** 行拖拽调试开关：在 console 执行 window.__RJGRID_DRAG_DEBUG=1 后，把 释放坐标→落点解析→重排结果 全链路打到 console（默认关闭，零副作用） */
function dragDebug(...args: unknown[]) {
  if (typeof window !== 'undefined' && (window as any).__RJGRID_DRAG_DEBUG)
    console.log('[rj-drag]', ...args)
}
/** 进入拖拽的最小位移：低于此值视为点击，不出浮影、不启动让位 */
const DRAG_START_GAP = 4
/** 上下边缘自动滚动触发区高度 */
const DRAG_EDGE_ZONE = 56
/** 拖拽整行快照的最大宽度：超出则按列宽预算截断渲染，避免浮影宽过视口 */
const GHOST_MAX_W = 520
/** 让位动画曲线：ease-out-quint，比 linear/ease 更接近 AG Grid 的滑行手感 */
const DRAG_TRANSITION = 'transform 190ms cubic-bezier(0.2, 0.9, 0.24, 1), opacity 150ms ease'
/** 边缘自滚中的让位过渡：仍滑行，但时长压到 90ms 以跟上 ~40ms 一变的落点，既消除橡皮筋感又不硬跳 */
const DRAG_TRANSITION_FAST = 'transform 90ms cubic-bezier(0.2, 0.9, 0.24, 1), opacity 120ms ease'
/**
 * 全程保留让位动画（AG 式丝滑）：false=常规滑行(190ms)，true=边缘自滚中的快滑(90ms)。
 * 旧实现在自滚时把过渡整个关掉导致行硬跳，是「不够丝滑」的主因；改为缩短时长而非二值开关。
 */
let dragFast = false
/** 当前模式对应的过渡串 */
function dragTransition(): string {
  return dragFast ? DRAG_TRANSITION_FAST : DRAG_TRANSITION
}

/** 拖拽让位时，某行的位移（px，正下移/负上移） */
function rowDragShift(i: number): number {
  const d = rowDrag.value
  if (!d || i === d.from) return 0
  if (d.from < d.to && i > d.from && i <= d.to) return -d.height
  if (d.from > d.to && i >= d.to && i < d.from) return d.height
  return 0
}
/** 无让位行共用的常驻样式：保留 transition，令滑回也走动画 */
const DRAG_IDLE_STYLE: Record<string, string> = { transition: DRAG_TRANSITION }
const DRAG_IDLE_FAST: Record<string, string> = { transition: DRAG_TRANSITION_FAST }
/** 被拖行自身：半透明占位 */
const DRAG_FROM_STYLE: Record<string, string> = { transition: DRAG_TRANSITION, opacity: '0.4' }
const DRAG_FROM_FAST: Record<string, string> = { transition: DRAG_TRANSITION_FAST, opacity: '0.4' }
/** 位移值→样式对象：让位量只有 ±行高两种 × 常规/快滑两态，缓存后每帧零分配 */
const dragShiftStyles = new Map<string, Record<string, string>>()
/** 供三层行 :style 合并：拖拽中给出 transform/opacity/transition，非拖拽返回共享空对象 */
function rowDragStyle(i: number): Record<string, string> {
  const d = rowDrag.value
  if (!d) return NO_ROW_STYLE
  const shift = rowDragShift(i)
  if (i === d.from) return dragFast ? DRAG_FROM_FAST : DRAG_FROM_STYLE
  if (!shift) return dragFast ? DRAG_IDLE_FAST : DRAG_IDLE_STYLE
  const ck = (dragFast ? 'f' : 'n') + shift
  let style = dragShiftStyles.get(ck)
  if (!style) {
    style = {
      transition: dragTransition(),
      transform: `translate3d(0, ${shift}px, 0)`,
      willChange: 'transform'
    }
    dragShiftStyles.set(ck, style)
  }
  return style
}

function buildGhostCells(drow: RjDisplayRow): GhostCell[] {
  const all: GhostCell[] = []
  const rows = rowModel.processed.value.displayRows
  const rowIndex = rows.indexOf(drow)
  for (const leaf of gridCols.value) {
    const col = leaf.col
    if (col.checkbox || col.rowDrag) continue
    const kind: GhostCell['kind'] = col.type === 'image' ? 'img' : col.sparkline ? 'spark' : 'text'
    let text = ''
    // 图片/迷你图不塞原始值（data URI / 数组），由占位块表达；普通列走格式化链路
    if (kind === 'text') {
      const v = cellRawValue(col, drow.data)
      if (v != null && v !== '') text = displayOf(col, v, drow.data, rowIndex) || ''
    }
    all.push({ w: leaf.width, kind, text })
  }
  // 宽度预算：整行快照不宽过视口，超出即在边界格处截断
  return all.slice(0, ghostCellCount(all, GHOST_MAX_W))
}

/** 浮影跟手：直写合成器 transform（不经响应式），避免每帧 Vue patch 与布局开销 */
function moveGhost(x: number, y: number) {
  const el = dragGhostRef.value
  if (el) el.style.transform = `translate3d(${x + 14}px, ${y + 18}px, 0)`
}

function startRowDrag(ev: PointerEvent, drow: RjDisplayRow) {
  if (!props.rowDraggable || rowDragState) return
  if (!rowDragEnabled.value) return showToast(t('rowDragNoServer'))
  clearDragSettle()
  // 排序/分组/透视/树形态下行序由引擎决定，重排源数组会被立刻排回去（拖了半天白拖）
  // → 明确拒转并说明原因，比默不作声更可预期（AG Grid 在这类状态下同样不让行拖拽）
  if (rowModel.sortStates.value.length) return showToast(t('rowDragNoSort'))
  if (rowGroupFields.value.length || pivotActive.value) return showToast(t('rowDragNoGroup'))
  if (props.treeData) return showToast(t('rowDragNoTree'))
  ev.preventDefault()
  const rows = rowModel.processed.value.displayRows
  const idx = rows.findIndex((d) => d.key === drow.key)
  if (idx < 0) return
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
  }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', endRowDrag)
  window.addEventListener('pointercancel', endRowDrag)
  // 起始先量一次几何：拖拽期间行集不变，可滚上限只需算一次；
  // 否则 rAF 里反复读 scrollHeight 会强制同步布局（实测是最长帧的主要来源）
  const sc0 = scrollerRef.value
  const wr0 = bodyWrapRef.value
  if (sc0 && wr0) {
    const r0 = wr0.getBoundingClientRect()
    rowDragState.rectTop = r0.top
    rowDragState.rectH = r0.height
    rowDragState.maxScroll = Math.max(0, sc0.scrollHeight - sc0.clientHeight)
    rowDragState.geomAt = performance.now()
  }
  // 持续 rAF 循环：光标停在边缘时也能连续自滚，而非只在 pointermove 时追帧
  dragRaf = requestAnimationFrame(dragTick)
}

function onDragMove(e: PointerEvent) {
  const st = rowDragState
  if (!st) return
  // 快速甩动时浏览器会合并(coalesce)同一帧内的多次 pointermove，e 只是首个；
  // 取合并事件里最新一帧坐标，令 st.x/st.y 尽量逼近真实指针，预览落点才跟手。
  let mx = e.clientX
  let my = e.clientY
  if (typeof e.getCoalescedEvents === 'function') {
    const co = e.getCoalescedEvents()
    if (co && co.length) {
      mx = co[co.length - 1].clientX
      my = co[co.length - 1].clientY
    }
  }
  st.x = mx
  st.y = my
  if (st.active) return
  if (Math.abs(e.clientX - st.startX) + Math.abs(e.clientY - st.startY) < DRAG_START_GAP) return
  st.active = true
  dragDebug('activate', { startX: st.startX, startY: st.startY, x: mx, y: my })
  ghostInitTransform.value = `translate3d(${e.clientX + 14}px, ${e.clientY + 18}px, 0)`
  dragGhost.value = { cells: buildGhostCells(st.drow), h: st.height }
  rowDrag.value = { from: st.from, to: st.from, height: st.height }
  document.body.style.cursor = 'grabbing'
  dispatchEvent('dragStarted', { node: st.drow, row: st.drow.data, from: st.from })
}

/**
 * 由指针当前 Y + 实时 scrollTop 解析落点显示行下标（含迟滞，相对 prevTo 平滑）。
 * dragTick 每帧预览与 endRowDrag 收尾共用同一口径：快速甩动时 pointerup 可能早于下一次 rAF，
 * 若只在 dragTick 里刷 to，d.to 会停留在 from 被误判为「没拖动」而回弹——收尾再解析一次即可兜底。
 */
function resolveDropTo(st: NonNullable<typeof rowDragState>, prevTo: number): number {
  const scroller = scrollerRef.value
  if (!scroller) return prevTo
  const rws = rowModel.processed.value.displayRows
  const offs = rowModel.offsets.value
  if (!rws.length) return prevTo
  const y = st.y - st.rectTop + scroller.scrollTop
  // offs[i] 是第 i 显示行的【顶部】累计偏移；lowerBound 返回首个 offs[i] >= target 的下标。
  // 传 y+1 使指针恰落在某行顶边时归入该行本身，减 1 得到“指针当前所在行”（含边界），
  // 而非下一行——否则落点系统性低一行，且下方迟滞以当前行顶为基准会失真。
  let t = lowerBound(offs, y + 1, (i) => offs[i]) - 1
  if (t < 0) t = 0
  if (t >= rws.length) t = rws.length - 1
  // 落点迟滞：跨过行边界还需多走 min(10px, 25% 行高) 才改落点（以上下对称的当前行为基准），消除边界与自滚时的抖频
  const rh = rws[t].height || st.height
  const top = offs[t] ?? 0
  let to = t
  if (prevTo !== to) {
    const margin = Math.min(10, rh * 0.25)
    if (prevTo === t - 1 && y - top < margin) to = prevTo
    else if (prevTo === t + 1 && top + rh - y < margin) to = prevTo
  }
  if (to < 0) to = 0
  if (to > rws.length - 1) to = rws.length - 1
  return to
}

function dragTick() {
  dragRaf = requestAnimationFrame(dragTick)
  const st = rowDragState
  const d = rowDrag.value
  if (!st || !st.active || !d) return
  const scroller = scrollerRef.value
  const wrap = bodyWrapRef.value
  if (!scroller || !wrap) return
  // 几何快照限频重测（每 500ms 一次）：只重测包裹矩形，可滚上限在 startRowDrag 已定量
  const now = performance.now()
  if (now - st.geomAt > 500) {
    const rect = wrap.getBoundingClientRect()
    st.rectTop = rect.top
    st.rectH = rect.height
    st.geomAt = now
  }
  const relY = st.y - st.rectTop
  // 1) 边缘变速自滚：越靠近边缘越快（随行动高自适应上限），取代原来固定 14px/帧的跳变
  const zone = DRAG_EDGE_ZONE
  // 上限按 ~0.22 行高/帧：36px 行下峰值≈ 11px/帧（≈ 19 行/秒），避免自滚过快冲过目标行（AG 同样偏慢以保精度）
  const vmax = 2 + st.height * 0.22
  let delta = 0
  if (relY < zone) delta = -(1.5 + vmax * (1 - Math.max(relY, 0) / zone))
  else if (relY > st.rectH - zone) delta = 1.5 + vmax * (1 - Math.max(st.rectH - relY, 0) / zone)
  if (delta) {
    // 浮点误差累加后只写整数步，避免亚像素 scrollTop 频繁失效与回绕
    st.sub += delta
    const step = Math.round(st.sub)
    if (step) {
      st.sub -= step
      const next = Math.min(Math.max(scroller.scrollTop + step, 0), st.maxScroll)
      if (next !== scroller.scrollTop) {
        scroller.scrollTop = next
        // 自写直推冻结层：scroll 事件走 rAF 节流，等 Vue 下一拍回写会让冻结层落后整一帧（橡皮筋错位）
        syncFixedCanvas(next)
      }
    }
  }
  // 自滚中切到快滑时长（仍全程保留让位动画）；离开边缘区恢复常规滑行
  const fast = !!delta
  if (fast !== dragFast) dragFast = fast
  // 2) 落点解析（与 endRowDrag 收尾共用同一口径，保证快速甩动也能取到最终落点）
  const to = resolveDropTo(st, d.to)
  // 3) 仅在落点真变化时写响应式（否则每帧会重算全部可见行 style 并 patch）
  if (to !== d.to) {
    rowDrag.value = { from: st.from, to, height: st.height }
    dispatchEvent('rowDragMove', {
      node: st.drow,
      overNode: rowModel.processed.value.displayRows[to],
      to
    })
  }
  moveGhost(st.x, st.y)
}

function endRowDrag(ev?: PointerEvent) {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', endRowDrag)
  window.removeEventListener('pointercancel', endRowDrag)
  if (dragRaf) {
    cancelAnimationFrame(dragRaf)
    dragRaf = 0
  }
  const st = rowDragState
  const prevTo = rowDrag.value?.to
  // 快速甩动时最后一两次 pointermove 常被浏览器合并/丢弃，st.y 会滞后在起拖点附近；
  // pointerup 恒携带真实释放坐标（优先取合并事件末帧），先同步进 st，令收尾落点解析基于最终指针位置。
  if (st && ev) {
    let fx = ev.clientX
    let fy = ev.clientY
    if (typeof ev.getCoalescedEvents === 'function') {
      const co = ev.getCoalescedEvents()
      if (co && co.length) {
        fx = co[co.length - 1].clientX
        fy = co[co.length - 1].clientY
      }
    }
    st.x = fx
    st.y = fy
  }
  // 收尾兜底：快速甩动时 pointerup 可能早于下一次 dragTick，d.to 会停在 from 被误判为「没拖动」而回弹；
  // 用最终指针位置 + 实时 scrollTop 再解析一次落点（与预览同口径），令落点始终跟手。
  let finalTo = prevTo ?? 0
  if (st && st.active && rowDrag.value) {
    finalTo = resolveDropTo(st, rowDrag.value.to)
    if (finalTo !== rowDrag.value.to)
      rowDrag.value = { from: st.from, to: finalTo, height: st.height }
  }
  const d = rowDrag.value
  rowDragState = null
  rowDrag.value = null
  dragGhost.value = null
  dragShiftStyles.clear()
  dragFast = false
  ghostInitTransform.value = 'translate3d(-9999px, -9999px, 0)'
  document.body.style.cursor = ''
  if (!st || !st.active) {
    dragDebug('end-cancelled', {
      active: st?.active,
      evType: ev?.type,
      evY: ev?.clientY,
      stY: st?.y
    })
    return
  }
  const moved = !!(d && d.to !== st.from)
  dragDebug('end', {
    evType: ev?.type,
    evX: ev?.clientX,
    evY: ev?.clientY,
    coalesced:
      ev && typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents().length : -1,
    startY: st.startY,
    stY: st.y,
    scrollTop: scrollerRef.value?.scrollTop,
    rectTop: st.rectTop,
    from: st.from,
    prevTo,
    finalTo,
    moved
  })
  if (moved && d) {
    const from = st.from
    const to = d.to
    applyRowMove(st.drow, from, to)
    settleDraggedRow(st.drow.key, from, to, st.height)
  }
  dispatchEvent('dragEnded', {
    node: st.drow,
    row: st.drow.data,
    from: st.from,
    to: d?.to,
    moved
  })
}

/** 还原上一次落位 FLIP 遗留的行内 transform/transition 与待执行的清理定时器 */
function clearDragSettle() {
  if (!dragSettle) return
  clearTimeout(dragSettle.timer)
  dragSettle.els.forEach((el) => {
    el.style.transition = ''
    el.style.transform = ''
  })
  dragSettle = null
}

/**
 * 被拖行落位滑行（AG 式 FLIP）：重排数据后该行的绝对 top 已跳到新槽，
 * 这里把它瞬时平移回旧视觉位置，再同帧过渡到 0，使其「滑进」目标槽而非瞬现。
 * 三层（中心/左冻/右冻）同 data-rk 的行一并处理保持同步。
 */
function settleDraggedRow(key: string | number, from: number, to: number, height: number) {
  const dist = (from - to) * height
  clearDragSettle()
  if (!dist) return
  nextTick(() => {
    const root = rootRef.value
    if (!root) return
    const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(key)) : String(key)
    const els = Array.from(root.querySelectorAll<HTMLElement>(`.rj-row[data-rk="${esc}"]`))
    if (!els.length) return
    els.forEach((el) => {
      el.style.transition = 'none'
      el.style.transform = `translate3d(0, ${dist}px, 0)`
    })
    // 强制回流提交「起点」变换后同帧切回，浏览器才会把 dist→0 当作一次过渡
    void root.offsetHeight
    els.forEach((el) => {
      el.style.transition = DRAG_TRANSITION
      el.style.transform = 'translate3d(0, 0, 0)'
    })
    dragSettle = {
      els,
      timer: setTimeout(() => clearDragSettle(), 240)
    }
  })
}

/** 落位：先把显示行下标换算为源数据行下标（跳过组行/页脚行），再重排源数组 */
function applyRowMove(drow: RjDisplayRow, from: number, to: number) {
  const moved = drow.data
  const arr = rowModel.sourceRows() as RjRowData[]
  const cur = arr.indexOf(moved)
  if (cur < 0) return
  const rws = rowModel.processed.value.displayRows
  const insertAt = rowMoveInsertIndex(
    rws.length,
    (i) => rws[i].type === 'row',
    (i) => rws[i].data === moved,
    from,
    to
  )
  arr.splice(cur, 1)
  arr.splice(insertAt, 0, moved)
  dragDebug('applyRowMove', { cur, insertAt, from, to })
  // 重排只标脏展示管线(orderRev)不标脏内容派生：行序变更不影响合计/聚合，避免每拖一次对全量行重算 summaryRow
  rowModel.touchOrder()
  emit('row-drag-end', { row: moved, from, to })
}
// ---------------- 分组 / 透视 ----------------
const bannerOver = ref(false)

function titleOfField(f: string) {
  const live = colState.listLeafColumns().find((c) => c.field === f || colIdOf(c) === f)
  if (live?.title) return live.title
  // 透视态列源被透视生成列替换，行分组字段（原始 field）在其中查不到 → 回落用户原始列，
  // 避免分组横幅 chip 退化成裸字段名（如「类型」变 kind）。注意不能回落 userColumns：
  // 它在透视态下已经被 pivotColumns 顶替，回落等于没回落。
  const src = collectLeaves(props.columns).find((c) => c.field === f || colIdOf(c) === f)
  return src?.title || f
}
function fieldOfCol(colId: string) {
  const col = colState.listLeafColumns().find((c) => colIdOf(c) === colId)
  return col?.field || colId
}
/**
 * 引擎自生的内部列（复选/拖拽柄/组行 + 透视生成的组合列、行维列、合计列）：
 * 它们不是可分组、可透视的维度。透视态下列源全被这些生成列顶替，
 * 再把它喂回透视会让透视自噬（行塌成 1 行、聚合全 0）。
 */
function isInternalColKey(k: string): boolean {
  const s = String(k)
  return s.startsWith('__pv') || s === '__check' || s === '__drag' || s === '__group'
}
function addGroup(f: string) {
  const field = f.includes('|') ? f : fieldOfCol(f)
  if (isInternalColKey(field) || isInternalColKey(f)) return showToast(t('groupInternalCol'))
  // 已做透视列维的字段再进分组，只会坐实一个退化的交叉表（交叉格全 0），直接拒接并说明原因
  if (rowModel.pivotState.value.active && rowModel.pivotState.value.cols.includes(field)) {
    return showToast(t('groupDupDim'))
  }
  if (rowModel.rowGroupFields.value.includes(field)) return
  rowModel.rowGroupFields.value = [...rowModel.rowGroupFields.value, field]
  emit('row-group-change', rowModel.rowGroupFields.value)
  dispatchEvent('rowGroupChanged', { groupedColumns: [...rowModel.rowGroupFields.value] })
  scheduleSave()
}
function removeGroup(i: number) {
  const arr = rowModel.rowGroupFields.value.slice()
  arr.splice(i, 1)
  rowModel.rowGroupFields.value = arr
  emit('row-group-change', arr)
  dispatchEvent('rowGroupChanged', { groupedColumns: arr.slice() })
  scheduleSave()
}
function removeGroupByField(f: string) {
  rowModel.rowGroupFields.value = rowModel.rowGroupFields.value.filter((x) => x !== f)
  emit('row-group-change', rowModel.rowGroupFields.value)
  dispatchEvent('rowGroupChanged', { groupedColumns: [...rowModel.rowGroupFields.value] })
  scheduleSave()
}
function setAgg(field: string, agg: string | undefined) {
  const col = colState.listLeafColumns().find((c) => c.field === field || colIdOf(c) === field)
  if (!col) return
  col.aggFunc = agg as any
  aggRev.value++ // 列定义对象属性不在响应式追踪范围内，显式弄响一次
  rowModel.touch()
  scheduleSave()
}
function togglePivot(v: boolean) {
  rowModel.pivotState.value = { ...rowModel.pivotState.value, active: v }
  emit('pivot-change', rowModel.pivotState.value)
  scheduleSave()
}
function allValueColIds(): string[] {
  // 必须走声明列：pipelineCols 在透视态已被 __pv* 生成列顶替，从它展开会把生成列写进 pivot.values
  return collectLeaves(props.columns)
    .filter((c) => !isInternalColKey(colIdOf(c)) && isPivotValueCol(c))
    .map((c) => colIdOf(c))
}
/**
 * 默认「全部指标」隐式态下真正生效的度量集（面板靠它把勾选态画实）：
 * 面板候选按类型给出所有数值列，而引擎隐式集只认已声明 aggFunc 的那几项，两边口径不一会把未生效项画成已勾选。
 */
const pivotImplicitValues = computed(() => allValueColIds())
/** 重勾选一律 append 到尾部会让透视列组内的度量顺序漂移：按声明列原序归一化 */
function normalizePivotOrder(arr: string[]): string[] {
  const leaves = collectLeaves(props.columns)
  const rank = (k: string) => {
    const i = leaves.findIndex((c) => c.field === k || colIdOf(c) === k)
    return i < 0 ? Number.MAX_SAFE_INTEGER : i
  }
  return arr.slice().sort((a, b) => rank(a) - rank(b))
}
function pivotToggle(which: 'cols' | 'values', key: string) {
  // 不允许对引擎生成列做透视（面板候选已换成声明列，但表头拖拽 / 外部 API 仍能递进来）
  if (isInternalColKey(key)) return showToast(t('pivotInternalCol'))
  // 同一字段不能既是行分组（透视行维）又是透视列维：每个组行只命中一个桶，交叉格会全为 0
  if (which === 'cols' && rowModel.rowGroupFields.value.includes(key)) {
    return showToast(t('pivotDupDim'))
  }
  const cur = rowModel.pivotState.value
  const arr = which === 'cols' ? cur.cols.slice() : cur.values.slice()
  const i = arr.indexOf(key)
  if (which === 'values' && !cur.values.length) {
    // 隐式「全部指标」态下的首次点选：以引擎真正生效的隐式集为基线做增/删。
    // 只勾一个就丢其余会违反复选框语义，展开成全部又会让「取消一个」反转为只剩一列。
    const base = allValueColIds()
    arr.length = 0
    if (!base.includes(key)) arr.push(key)
    for (const id of base) if (id !== key) arr.push(id)
  } else if (i >= 0) {
    arr.splice(i, 1)
  } else {
    arr.push(key)
  }
  // values=[] 的语义就是「全部指标」：取消最后一个会被静默反转换回全生效，必须说一声
  if (which === 'values' && !arr.length && allValueColIds().length) showToast(t('pivotAllRestored'))
  const next = {
    ...cur,
    // 透视列非空即启用、清空最后一个则停用
    active: which === 'cols' ? arr.length > 0 : cur.active,
    [which]: normalizePivotOrder(arr)
  }
  rowModel.pivotState.value = next
  emit('pivot-change', next)
  scheduleSave()
}
function onDropBanner(e: DragEvent) {
  e.preventDefault()
  bannerOver.value = false
  const id = e.dataTransfer?.getData('text/x-rj-col')
  if (id) addGroup(id)
}
function onPanelDropGroup(colId: string) {
  addGroup(colId)
}
function onPanelDropPivotCol(colId: string) {
  const f = fieldOfCol(colId)
  if (f && !rowModel.pivotState.value.cols.includes(f)) pivotToggle('cols', f)
}

// ---------------- 列操作 ----------------
function onColDrop(dragId: string, targetId: string) {
  colState.moveColumn(dragId, targetId)
  dispatchEvent('columnMoved', {})
  dispatchEvent('columnEverythingChanged', {})
  scheduleSave()
}
function onPanelToggleHide(colId: string) {
  colState.toggleHide(colId)
  dispatchEvent('columnVisible', { column: colId })
  dispatchEvent('columnEverythingChanged', {})
  scheduleSave()
}
function onPanelTogglePin(colId: string, pin: 'left' | 'right' | null) {
  colState.togglePin(colId, pin)
  dispatchEvent('columnPinned', { column: colId, pinned: pin })
  dispatchEvent('columnEverythingChanged', {})
  scheduleSave()
}
function onResize(colId: string, width: number, done: boolean) {
  colState.resize(colId, width)
  if (done) {
    dispatchEvent('columnResized', { column: colId, width })
    dispatchEvent('columnEverythingChanged', {})
    scheduleSave()
  }
}
function autoWidth(colId: string) {
  const leaf = gridCols.value.find((l) => l.colId === colId)
  if (!leaf) return
  colState.resize(colId, measureColWidth(leaf.col.title || '', sampleTexts(leaf.col)))
  scheduleSave()
}
/** 取该列前若干行的显示文本样本（与屏上同口径：displayOf，不是原始值） */
function sampleTexts(col: RjColumn): string[] {
  return rowModel
    .sourceRows()
    .slice(0, 200)
    .map((r, i) => String(displayOf(col, cellRawValue(col, r), r, i) ?? ''))
}
/**
 * 初始化默认列宽：对“无显式定宽、无用户调整、非 flex、非控制列”的列，按内容撑开。
 * 写进 autoWidthMap（非 widthMap），所以不会被当成用户调过的宽度存进视图；用户手动拖拽后 widthMap 优先。
 */
function applyDefaultAutoWidths() {
  gridCols.value.forEach((l) => {
    const col = l.col
    if (col.checkbox || col.rowDrag) return
    if (colState.hasSizedWidth(l.colId)) return
    colState.setAutoWidth(l.colId, measureColWidth(col.title || '', sampleTexts(col)))
  })
}
const panelLeaves = computed<PanelLeaf[]>(() => {
  void aggRev.value // 同 panelCandidateLeaves：聚合标记的显示源与生效源要同帧
  return colState
    .listLeafUi()
    .filter((x) => !x.col.checkbox && !x.col.rowDrag)
    .map((x) => ({
      col: x.col,
      colId: x.colId,
      field: x.col.field,
      title: x.col.title,
      hidden: x.hidden,
      pinned: x.pinned,
      aggFunc: x.col.aggFunc as string | undefined
    }))
})

// ---------------- 右键菜单 ----------------
// limit：菜单底边允许的最大位置；above：上翻时的安全上界（如功能键块 top，防压住块内折行按钮）；渲染后按真实高度重锚
const menu = ref<{ items: RjMenuItem[]; x: number; y: number; limit?: number } | null>(null)

// 工具栏即时提示气泡（#3）：悬停/聚焦 [data-tip] 时按按钮 rect 定位一个 fixed 气泡（不受工具栏 overflow 裁切）
const tip = ref<{ text: string; x: number; y: number } | null>(null)
function onTipOver(e: Event) {
  const host = e.currentTarget as HTMLElement
  const el = (e.target as HTMLElement)?.closest?.('[data-tip]') as HTMLElement | null
  if (!el || !host.contains(el)) return
  const r = el.getBoundingClientRect()
  tip.value = { text: el.getAttribute('data-tip') || '', x: r.right, y: r.bottom + 6 }
}
function onTipOut(e: Event) {
  const el = (e.target as HTMLElement)?.closest?.('[data-tip]') as HTMLElement | null
  const to = (e as PointerEvent).relatedTarget as Node | null
  // 仍在同一 [data-tip] 内部移动（如指针扫过子文本/图标）不隐藏
  if (el && to && el.contains(to)) return
  tip.value = null
}

function openMenuAt(x: number, y: number, items: RjMenuItem[], above?: number, estW = 220) {
  if (!items.length) return
  tip.value = null
  // 估算菜单高度（每项约 28px + 分隔线/内边距）：下方超出视口则向上翻（贴底按钮/贴底右键通用）
  const est = items.length * 28 + 16
  const bottom = window.innerHeight - 8
  // 水平钓制：菜单从锅点向右展开，靠右越界则左移贴视口边（导出/视图/右键菜单通用，防被右边缘裁切）
  const xc = Math.max(8, Math.min(x, window.innerWidth - estW - 8))
  if (y + est <= bottom) {
    menu.value = { items, x: xc, y, limit: bottom }
    return
  }
  const lim = (above ?? y) - 6
  menu.value = { items, x: xc, y: Math.max(8, (above ?? y) - est - 8), limit: lim }
}
/** RjContextMenu 渲染后回报真实尺寸：底边/右边越限时按实高实宽上提、左提 */
function onMenuReposition(h: number, w: number) {
  const m = menu.value
  if (!m) return
  const lim = m.limit ?? window.innerHeight - 8
  const next = { ...m }
  if (m.y + h > lim) next.y = Math.max(8, lim - h)
  if (w && m.x + w > window.innerWidth - 8) next.x = Math.max(8, window.innerWidth - 8 - w)
  if (next.y !== m.y || next.x !== m.x) menu.value = next
}
function onMenuSelect(item: RjMenuItem) {
  menu.value = null
  item.action?.()
}
function setSortSingle(field: string, dir: 'asc' | 'desc' | null) {
  rowModel.sortStates.value = dir ? [{ field, dir }] : []
  rowModel.touch()
  emit('sort-change', rowModel.sortStates.value)
  dispatchEvent('sortChanged', { column: field, sort: dir })
  scheduleSave()
}
// ---------------- 列头三页签菜单（通用 / 筛选 / 列），对标 AG Grid column menu ----------------
const colMenu = ref<{
  col: RjColumn
  colId: string
  x: number
  y: number
  canSort: boolean
  canFilter: boolean
  canGroup: boolean
  sortDir: 'asc' | 'desc' | null
  filterType: 'text' | 'number' | 'date' | 'select'
  filterModel: RjFilterModel | null
  unique: any[]
} | null>(null)

/** 「通用」页签两项冻结菜单的生效态：走 pinOf（用户覆盖 ?? 列定义 fixed），与「列」页签同源 */
const colMenuPinned = computed<'left' | 'right' | null>(() =>
  colMenu.value ? colState.pinOf(colMenu.value.col) : null
)

const colMenuColumns = computed(() =>
  panelLeaves.value.map((p) => ({
    colId: p.colId,
    title: p.title || p.colId,
    hidden: !!p.hidden,
    pinned: (p.pinned as 'left' | 'right' | null) ?? null
  }))
)

function onHeaderContextMenu(cell: HeaderLevelCell, ev: MouseEvent) {
  const col = cell.col
  if (cell.isGroup) return
  menu.value = null
  filterMenu.value = null
  const colId = colIdOf(col)
  const type = rowModel.filterTypeOf(col)
  let unique: any[] = []
  if (type === 'select') {
    const optList = colOptionList(col)
    if (optList && optList.length) {
      unique = flattenOptions(optList).map((o) => String(o.value))
    } else {
      unique = Array.from(
        new Set(
          rowModel
            .sourceRows()
            .slice(0, 5000)
            .map((r) => cellRawValue(col, r))
            .filter((v) => v != null)
        )
      ).map(String)
    }
  }
  const ss = rowModel.sortStates.value.find((x) => x.field === colId || x.field === col.field)
  colMenu.value = {
    col,
    colId,
    x: ev.clientX,
    y: ev.clientY,
    canSort: !!col.field && col.sortable !== false && col.suppressSort !== true,
    canFilter: !!col.field && col.filter !== false && !col.checkbox && !col.rowDrag,
    canGroup: !!props.groupable && !!col.field,
    sortDir: ss ? ss.dir : null,
    filterType: type as 'text' | 'number' | 'date' | 'select',
    filterModel: rowModel.filterModels.get(colId) || null,
    unique
  }
}
function colMenuSort(dir: 'asc' | 'desc' | null) {
  if (!colMenu.value) return
  const field = colMenu.value.col.field
  colMenu.value = null
  if (field) setSortSingle(field, dir)
}
function colMenuSelect() {
  if (!colMenu.value) return
  const ci = gridCols.value.findIndex((g) => g.colId === colMenu.value!.colId)
  colMenu.value = null
  if (ci >= 0) interaction.selectColumn(ci)
}
function colMenuAutosize() {
  if (!colMenu.value) return
  const colId = colMenu.value.colId
  colMenu.value = null
  autoWidth(colId)
}
function colMenuPin(pos: 'left' | 'right' | null) {
  if (!colMenu.value) return
  const colId = colMenu.value.colId
  colMenu.value = null
  onPanelTogglePin(colId, pos)
}
function colMenuHide() {
  if (!colMenu.value) return
  const colId = colMenu.value.colId
  colMenu.value = null
  onPanelToggleHide(colId)
}
function colMenuGroup() {
  if (!colMenu.value) return
  const f = colMenu.value.col.field
  colMenu.value = null
  if (f) addGroup(f)
}
function colMenuApplyFilter(model: RjFilterModel) {
  if (!colMenu.value) return
  const colId = colMenu.value.colId
  rowModel.filterModels.set(colId, model)
  rowModel.touch()
  colMenu.value = null
  emit('filter-change')
  dispatchEvent('filterChanged', { colId })
  scheduleSave()
}
function colMenuClearFilter() {
  if (!colMenu.value) return
  const colId = colMenu.value.colId
  rowModel.filterModels.delete(colId)
  rowModel.touch()
  colMenu.value = null
  emit('filter-change')
  dispatchEvent('filterChanged', { colId })
  scheduleSave()
}
function colMenuToggleColHide(colId: string) {
  onPanelToggleHide(colId)
}
function colMenuToggleColPin(colId: string, pin: 'left' | 'right' | null) {
  onPanelTogglePin(colId, pin)
}
/** 主体右键：命中数据行才接管菜单；行外空白/可编辑元素内留给浏览器原生右键（复制粘贴） */
function onBodyContextMenuRaw(e: MouseEvent) {
  const legacy = typeof props.contextMenu === 'function' ? props.contextMenu : null
  const declared = props.contextMenus
  const hasDeclared =
    !!declared && (Array.isArray(declared) ? declared.length > 0 : typeof declared === 'function')
  if (!legacy && props.contextMenu !== true && !hasDeclared) return
  // 右键落在可编辑元素（单元格编辑器/浮动筛选输入/弹层搜索框）→ 保留浏览器原生复制粘贴菜单
  if (isEditableContextTarget(e.target)) return
  // 网格内选中了文字（选中单元格内容准备复制）→ 同样放行浏览器原生「复制」菜单，
  // 否则值拷不出去；无选区的普通右键仍按行接管弹组件菜单
  if (hasUserTextSelection(rootRef.value, window.getSelection?.())) return
  const pos = pointToCell(e)
  const drow = pos ? rowModel.processed.value.displayRows[pos.r] : undefined
  const leaf = pos ? gridCols.value[pos.c] : undefined
  // 没命中行（表外空白/空表留白）→ 不拦截，弹浏览器自己的菜单
  if (!drow) return
  e.preventDefault()
  dispatchEvent('cellContextMenu', {
    node: drow,
    column: leaf?.col,
    colId: leaf?.colId,
    rowIndex: pos?.r,
    value: drow && leaf ? cellRawValue(leaf.col, drow.data) : undefined,
    x: e.clientX,
    y: e.clientY
  })
  const ctx: RjContextMenuCtx = {
    row: drow?.data,
    column: leaf?.col,
    colId: leaf?.colId,
    rowIndex: pos?.r,
    value: drow && leaf ? cellRawValue(leaf.col, drow.data) : undefined,
    api: apiObj,
    event: e
  }
  const items: RjMenuItem[] = []
  if (props.clipboard) {
    const before = items.length
    if (pos && drow && leaf)
      items.push({
        name: t('cmCopyCell'),
        action: () => writeClipboard(cellDisplayAt(pos))
      })
    if (interaction.range.value)
      items.push({ name: t('cmCopyRange'), action: () => void interaction.copyRange(false) })
    // 有复制项才收尾分隔线；空段还塞线会在菜单顶部留悬空线（无数据行右键时实见）
    if (items.length > before) items.push({ isSeparator: true })
  }
  if (pos && drow?.type === 'row' && leaf && isEditable(drow.data, leaf.col))
    items.push({ name: t('cmEdit'), action: () => startEdit(pos.r, pos.c) })
  if (pos && drow)
    items.push({ name: t('cmSelectRow'), action: () => interaction.selectRow(pos.r) })
  // 内置行 JSON 查看器：数据行才有内容可看；序列化/弹层全在组件内，宿主零接入
  if (drow.type === 'row' && props.rowJson)
    items.push({ name: t('cmRowJson'), action: () => (rowJsonDlg.value = stringifyRowJson(drow.data)) })
  if (legacy) items.push(...legacy(ctx))
  // 声明式 contextMenus：数组直通，函数按当前上下文生成；转换/过滤见 contextMenus.ts（纯函数可单测）
  const customItems = hasDeclared
    ? buildCustomMenuItems(
        (typeof declared === 'function' ? declared(ctx) : declared) || [],
        ctx,
        runContextMenuItem
      )
    : []
  const merged = joinMenuSections(items, customItems)
  // 行上总有「选中整行」兑底项；万一各段全被隐藏也不拦浏览器菜单
  if (!merged.length) return
  openMenuAt(e.clientX, e.clientY, merged)
}

/** 执行单个自定义右键菜单项：disabled 拦截 → confirm 走内置确认框 → onClick 后派发 context-menu-action */
function runContextMenuItem(item: RjContextMenuItem, ctx: RjContextMenuCtx) {
  const flag = (v: boolean | ((c: RjContextMenuCtx) => boolean) | undefined) =>
    v == null ? false : typeof v === 'function' ? !!v(ctx) : !!v
  if (flag(item.disabled)) return
  const fire = () => {
    item.onClick?.(ctx)
    emit('context-menu-action', { ...ctx, item })
  }
  const msg = typeof item.confirm === 'function' ? item.confirm(ctx) : item.confirm
  if (msg) confirmDlg.value = { message: msg, onOk: fire }
  else fire()
}

// ---------------- 导出 ----------------
/**
 * 导出/打印/剪贴板中走「原始值」的那几条分支：图片列的原始值是 data URI / URL 列表，
 * 直接写入会把整段 base64 灌进单元格，这里统一降级为文件名（其余类型保持原值，
 * 以便 Excel/CSV 里数字仍是数字）。
 */
function exportRaw(col: RjColumn, value: any): any {
  return col.type === 'image' ? imageText(value) : value
}

/**
 * 导出取值口径：同一份文件里数据行/分组行/合计行必须走同一个函数，否则会出现
 * 「数据行 ¥212.39 + 合计行 3601938.739999997」这种混排。默认取屏上格式化文本，
 * 开 exportRawValues 后取原始类型值（图片仍降级为文件名，否则整段 base64 灌进单元格）。
 */
function exportCellOf(col: RjColumn, row: RjRowData, raw?: any): any {
  const v = raw === undefined ? cellRawValue(col, row) : raw
  return props.exportRawValues ? exportRaw(col, v) : printTextOf(col, row, v)
}

/** 导出里的合计行单元格：与屏上/打印同构，标签列补上「总计」 */
function summaryExportCell(col: RjColumn, srow: RjRowData): any {
  const raw = (srow as any)[colIdOf(col)] ?? cellRawValue(col, srow)
  if ((raw == null || raw === '') && colIdOf(col) === summaryLabelColId.value)
    return t('grandTotal')
  return exportCellOf(col, srow, raw)
}

/**
 * 生效导出范围：显式 params.scope > props.exportRange（非 auto）> 旧字段兼容 > auto 落地。
 * 旧字段只在 params 里显出现时才参与，避免宿主只传 {fileName} 被当成跨视图全量导出。
 */
function scopeOf(params?: RjExportParams): RjExportScopeResolved {
  if (params?.scope) return resolveExportScope(params.scope, selection.size)
  if (props.exportRange && props.exportRange !== 'auto') return props.exportRange
  if (params?.onlySelected) return 'selected'
  if (params && params.currentView === false) return 'all'
  return resolveExportScope('auto', selection.size)
}

/** 行集合三档来源（交给 utils.pickExportRows 做纯函数判定） */
function exportRowSource() {
  return {
    selected: selectedRows(),
    display: rowModel.processed.value.displayRows,
    source: rowModel.sourceRows()
  }
}

/**
 * 导出列：按屏上生效列（顺序与显隐都跟表格一致），而不是声明列全集。
 * 旧实现取 colState.listLeafColumns()（含隐藏列），导出的文件会比屏上多出一堆看不到的列。
 */
function exportColumnsOf(params?: RjExportParams): RjColumn[] {
  let cols = gridCols.value.map((l) => l.col).filter((c) => !c.checkbox && !c.rowDrag)
  if (params?.columnKeys?.length) cols = cols.filter((c) => params.columnKeys!.includes(colIdOf(c)))
  return cols
}

/** 分页/服务端模式下 view 与 all 档都只含已加载行，不提示会让人以为丢了数据 */
function warnIfLoadedOnly(scope: RjExportScopeResolved) {
  if (props.dataMode !== 'client' && (scope === 'view' || scope === 'all'))
    showToast(t('expLoadedHint'))
}

function viewMatrix(params?: RjExportParams): any[][] {
  const cols = exportColumnsOf(params)
  const matrix: any[][] = [cols.map((c) => c.title || c.field || colIdOf(c))]
  const scope = scopeOf(params)
  pickExportRows(scope, exportRowSource(), true).forEach((r) =>
    matrix.push(cols.map((c) => exportCellOf(c, r)))
  )
  // 只有当前视图档伴合计行：选中行/未过滤源数据拼上全表「总计」会误导读数
  const srow = rowModel.summaryRow.value
  if (scope === 'view' && props.showSummary && srow)
    matrix.push(cols.map((c) => summaryExportCell(c, srow)))
  return matrix
}

/** 导出/打印进行中标记：矩阵生成与序列化是同步重活，没反馈时用户只能看到「页面死了」 */
const exporting = ref(false)

/** 先把遮罩推上屏（nextTick + 一帧 + 一个宏任务），再干同步重活 */
async function withExportBusy(run: () => void) {
  if (exporting.value) return
  exporting.value = true
  try {
    await nextTick()
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 30))
    run()
  } catch (e) {
    console.error('[RjGrid] export/print failed:', e)
  } finally {
    exporting.value = false
  }
}

function doExport(type: 'csv' | 'excel' | 'pdf', params?: RjPrintParams) {
  if (scopeOf(params) === 'server') {
    if (type === 'pdf') {
      showToast(t('expServerNoPdf'))
      withExportBusy(() => runExport('pdf', { ...params, scope: fallbackScope() }))
      return
    }
    callServerExport(type, params)
    return
  }
  warnIfLoadedOnly(scopeOf(params))
  withExportBusy(() => runExport(type, params))
}

/** 点某个导出/打印格式按钮：先弹出「范围」选择（选中行 / 当前视图 /〔后端导出〕） */
function openRangeMenu(ev: MouseEvent, fmt: 'csv' | 'excel' | 'pdf' | 'print') {
  // 无复选框（未开启行选择）时，「导出/打印选中行」无意义，不列该项
  const canSelect = !!props.rowSelection
  const sel = selection.size
  const cnt = (n: number) => ' · ' + t('expCnt', { n })
  const items: RjMenuItem[] = []
  if (canSelect)
    items.push({
      name: t('scopeSelected') + cnt(sel),
      disabled: () => sel === 0,
      action: () => runFormat(fmt, 'selected')
    })
  items.push({
    name: t('scopeView') + cnt(dataDisplayRows.value.length),
    action: () => runFormat(fmt, 'view')
  })
  // 后端导出（按查询条件全量）：仅数据类格式 + 宿主接了 serverExport 才列，避免死菜单
  if ((fmt === 'csv' || fmt === 'excel') && props.serverExport)
    items.push(
      { isSeparator: true },
      { name: t('scopeServer'), action: () => callServerExport(fmt) }
    )
  // 锅定到触发按钮下沿（与视图/快捷菜单同族），避开“鼠标点在哪就从哪展开”导致靠右按钮菜单被视口右边缘裁切
  const el = ev.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  openMenuAt(r.left, r.bottom + 6, items, r.top)
}

/** 选定范围后落地到具体格式：CSV/Excel/PDF 走 doExport，打印走 doPrint */
function runFormat(fmt: 'csv' | 'excel' | 'pdf' | 'print', scope: RjExportScopeResolved) {
  if (fmt === 'print') doPrint({ scope })
  else doExport(fmt, { scope })
}

/** 后端导出：组件不碰接口，只把生效列 + 查询状态 + 分页快照 + 选中 key 交出去 */
async function callServerExport(type: 'csv' | 'excel', params?: RjPrintParams) {
  const fn = props.serverExport
  if (!fn) {
    showToast(t('expServerMissing'))
    return
  }
  const p: RjServerExportParams = {
    type,
    fileName: params?.fileName || props.exportFileName || 'rj-grid-export',
    columns: exportColumnsOf(params).map((c) => ({
      colId: colIdOf(c),
      field: c.field,
      title: c.title || c.field || colIdOf(c)
    })),
    state: getState(),
    paging: {
      pageNo: props.dataMode === 'pagination' ? pagerPage.value : 1,
      pageSize: pagerSize.value,
      total: totalRowCount.value
    },
    selectedKeys: Array.from(selection.keys())
  }
  try {
    await fn(p)
  } catch (e) {
    console.error('[RjGrid] serverExport failed:', e)
    showToast(t('expFailed'))
  }
}

function runExport(type: 'csv' | 'excel' | 'pdf', params?: RjPrintParams) {
  const name = params?.fileName || props.exportFileName || 'rj-grid-export'
  if (type === 'pdf') {
    runPrint(params)
    return
  }
  if (type === 'csv') {
    downloadCsv(viewMatrix(params), name)
    return
  }
  const cols = exportColumnsOf(params)
  const head = cols.map((c) => c.title || c.field || colIdOf(c))
  const widths = cols.map((c) => gridCols.value.find((l) => l.colId === colIdOf(c))?.width || 120)
  const sheets: XlsxSheet[] = []

  // 数据 sheet（扁平）
  const scope = scopeOf(params)
  const dataM: any[][] = [head]
  const dataS: number[] = [1]
  pickExportRows(scope, exportRowSource(), false).forEach((r) => {
    dataM.push(cols.map((c) => exportCellOf(c, r)))
    dataS.push(0)
  })
  const srow = rowModel.summaryRow.value
  if (scope === 'view' && props.showSummary && srow) {
    dataM.push(cols.map((c) => summaryExportCell(c, srow)))
    dataS.push(2)
  }
  sheets.push({ name: t('sheetData'), matrix: dataM, colWidths: widths, rowStyles: dataS })

  // 分组 sheet（仅当前视图档：选中/源数据与分组展示行不同构，拼在一起会得到错位的组）
  if (scope === 'view' && rowGroupFields.value.length) {
    const gM: any[][] = [head]
    const gS: number[] = [1]
    rowModel.processed.value.displayRows.forEach((d) => {
      if (d.type === 'group' && !d.isFooter) {
        gM.push(cols.map((c) => displayOf(c, cellRawValue(c, d.data), d.data, 0)))
        gS.push(2)
      } else if (d.type === 'row') {
        gM.push(cols.map((c) => displayOf(c, cellRawValue(c, d.data), d.data, 0)))
        gS.push(0)
      }
    })
    sheets.push({ name: t('sheetGroup'), matrix: gM, colWidths: widths, rowStyles: gS })
  }

  if (sheets.length === 1) downloadXlsx(dataM, name, widths)
  else downloadXlsxWorkbook(sheets, name)
}

// ---------------- 打印 / PDF（零依赖：隐藏 iframe + 浏览器打印，可另存为 PDF） ----------------
/** 由多级表头行构造打印列头层级（含 colSpan/rowSpan），单层时返回 undefined 用列标题 */
function buildPrintHeaderLevels(cols: RjColumn[]): RjPrintHeaderCell[][] | undefined {
  const info = headerRowsInfo.value
  if (info.depth <= 1) return undefined
  const exportIds = new Set(cols.map((c) => colIdOf(c)))
  const levels: RjPrintHeaderCell[][] = []
  for (let level = 0; level < info.depth; level++) {
    const cells: RjPrintHeaderCell[] = []
    for (const cell of info.rows[level]) {
      let span: number
      let rowSpan: number
      if (cell.isGroup) {
        span = collectGroupLeafIds(cell.col).filter((id) => exportIds.has(id)).length
        rowSpan = 1
      } else {
        span = exportIds.has(cell.colId) ? 1 : 0
        rowSpan = info.depth - level
      }
      if (!span) continue
      cells.push({ title: cell.col.title || cell.col.field || cell.colId, colSpan: span, rowSpan })
    }
    levels.push(cells)
  }
  return levels
}

/**
 * 打印用文本：打印是给人看的文档，必须走列格式化（百分号/千分位/日期），
 * 而不是 CSV/Excel 那种保留原始数值的导出口径。
 */
function printTextOf(col: RjColumn, row: RjRowData, raw?: any): any {
  const v = raw === undefined ? cellRawValue(col, row) : raw
  if (col.type === 'image') return imageText(v)
  if (col.sparkline && Array.isArray(v)) return v.join(' ')
  return displayOf(col, v, row, 0)
}

/** 组装打印输入：列元信息 + 多级列头 + 纯数据行（含分组/汇总样式）。
 *  limit>0 时在构建阶段就早停（只为前 N 行取值），避免上万行×数十列的同步矩阵构建拖死主线程。 */
function buildPrintInput(params?: RjPrintParams, limit = 0): RjPrintInput {
  const cols = exportColumnsOf(params)
  const columns: RjPrintColumn[] = cols.map((c) => ({
    title: c.title || c.field || colIdOf(c),
    width: gridCols.value.find((l) => l.colId === colIdOf(c))?.width || c.width || 120,
    align:
      c.align || (c.type === 'num' || c.type === 'money' || c.type === 'percent' ? 'right' : 'left')
  }))
  const matrix: any[][] = []
  const rowStyles: number[] = []
  const capped = limit > 0
  const full = () => capped && matrix.length >= limit
  const pushRow = (d: { type: string; data: RjRowData }, kind: number) => {
    // 与数据行同一个取值口径（printTextOf 负责图片/迷你图降级为文本），否则组行里的图片列会被灌坏
    matrix.push(cols.map((c) => printTextOf(c, d.data)))
    rowStyles.push(kind)
  }
  const scope = scopeOf(params)
  if (scope === 'view') {
    // 当前视图档保留分组行及其样式（kind=1 汇总样）
    for (const d of rowModel.processed.value.displayRows) {
      if (full()) break
      if (d.type === 'group' && !d.isFooter) pushRow(d, 1)
      else if (d.type === 'row') pushRow(d, 0)
    }
  } else {
    for (const r of pickExportRows(scope, exportRowSource(), false)) {
      if (full()) break
      matrix.push(cols.map((c) => printTextOf(c, r)))
      rowStyles.push(0)
    }
  }
  const srow = rowModel.summaryRow.value
  if (scope === 'view' && props.showSummary && srow && !full()) {
    matrix.push(
      cols.map((c) => {
        const raw = (srow as any)[colIdOf(c)] ?? cellRawValue(c, srow)
        if ((raw == null || raw === '') && colIdOf(c) === summaryLabelColId.value)
          return t('grandTotal')
        return printTextOf(c, srow, raw)
      })
    )
    rowStyles.push(2)
  }
  return { columns, headerLevels: buildPrintHeaderLevels(cols), matrix, rowStyles }
}

/** 打印选项按当前语言兜底：页码模板 / <html lang> / 文档标题（调用端显式传值优先） */
function printOpts(params?: RjPrintParams): RjPrintParams {
  const o = params || {}
  return {
    ...o,
    pageNumberText: o.pageNumberText ?? t('pageNumber'),
    docLang: o.docLang ?? normalizeLang(langRef.value),
    docTitle: o.docTitle ?? o.title ?? t('print')
  }
}

/** 生成打印文档 HTML（不弹窗，供预览/测试/自定义容器） */
function getPrintHtml(params?: RjPrintParams): string {
  return buildPrintHtml(buildPrintInput(params), printOpts(params))
}

/** 菜单内 PDF 选中「后端导出」时回到前端具体档（有选中导选中，否则导当前视图） */
function fallbackScope(): RjExportScopeResolved {
  return resolveExportScope('auto', selection.size)
}

/** 打印 / 另存为 PDF（打开浏览器打印对话框） */
function doPrint(params?: RjPrintParams) {
  if (scopeOf(params) === 'server') {
    showToast(t('expServerNoPdf'))
    const p = { ...params, scope: fallbackScope() }
    withExportBusy(() => runPrint(p))
    return
  }
  warnIfLoadedOnly(scopeOf(params))
  withExportBusy(() => runPrint(params))
}

/** 待打印行数估算（仅计数，不做逐格取值）：用于超限提示与构建上限 */
function printRowEstimate(scope: RjExportScopeResolved): number {
  if (scope === 'view')
    return rowModel.processed.value.displayRows.reduce(
      (n, d) => n + (d.type === 'row' || (d.type === 'group' && !d.isFooter) ? 1 : 0),
      0
    )
  return pickExportRows(scope, exportRowSource(), false).length
}

function runPrint(params?: RjPrintParams) {
  // 护栏：浏览器打印会把整表排版进隐藏 iframe，上万行会生成十几 MB HTML + 分页排版，把主线程彻底卡死
  const cap = props.printMaxRows
  const total = printRowEstimate(scopeOf(params))
  const limit = cap > 0 && total > cap ? cap : 0
  const input = buildPrintInput(params, limit)
  if (limit) showToast(t('printCap', { n: cap, total }))
  printHtml(input, printOpts(params))
}

// ---------------- 服务端模式同步 ----------------
const rowGroupPayload = computed(() => {
  void aggRev.value // 聚合方式写在列对象属性上，靠计数器失效（见 aggRev 注释）
  return rowGroupFields.value.map((f) => {
    const col = colState.listLeafColumns().find((c) => c.field === f || colIdOf(c) === f)
    return { field: f, aggFunc: col?.aggFunc as string | undefined }
  })
})
const groupSig = computed(() =>
  rowGroupPayload.value.map((g) => g.field + ':' + (g.aggFunc || '')).join('|')
)
function syncServerCtx() {
  rowModel.setLoadCtx({
    sort: rowModel.sortStates.value,
    filters: Array.from(rowModel.filterModels.entries()).map(([field, model]) => ({
      field,
      model
    })),
    quickFilterText: rowModel.quickFilter.value,
    floatFilters: Array.from(rowModel.floatFilters.entries())
      .filter(([, v]) => v && v.trim())
      .map(([colId, value]) => ({ colId, value })),
    rowGroup: rowGroupPayload.value,
    advancedFilter: rowModel.advancedFilter.value
  })
}
/** SSRM：排序/筛选/分组等变更后清空块缓存并重新拉取当前视口（保留滚动位） */
function reloadServerSide() {
  const start = windowRange.value.start
  rowModel.purgeServerSideCache()
  const bs = props.ssrmBlockSize || 100
  rowModel.ensureServerBlocks(start, start + bs * 2 - 1)
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
    syncServerCtx()
    if (props.dataMode !== 'client' && props.loadData) {
      if (props.dataMode === 'pagination') pagerPage.value = 1
      if (props.dataMode === 'serverSide') reloadServerSide()
      else rowModel.reloadServer()
    }
  }
)
watch([pagerPage, pagerSize], ([p, s]) => {
  if (props.dataMode === 'pagination' && props.loadData) {
    syncServerCtx()
    rowModel.fetchPage(p, s)
    emit('page-change', { page: p, pageSize: s })
    dispatchEvent('paginationChanged', { page: p, pageSize: s })
  }
})

// 行模型（排序/筛选/分组/透视/数据）重算后统一广播 modelUpdated
watch(
  () => rowModel.processed.value,
  () => dispatchEvent('modelUpdated', {})
)

// ---------------- 状态持久化 ----------------
function getState(): RjGridState {
  return {
    columns: colState.getColumnState(),
    sort: rowModel.sortStates.value,
    filters: Array.from(rowModel.filterModels.entries()).map(([field, model]) => ({
      field,
      model
    })),
    quickFilter: rowModel.quickFilter.value,
    floatFilters: floatValuesObj.value,
    advancedFilter: rowModel.advancedFilter.value
      ? (JSON.parse(JSON.stringify(rowModel.advancedFilter.value)) as AdvFilterGroup)
      : null,
    rowGroup: [...rowModel.rowGroupFields.value],
    pivot: { ...rowModel.pivotState.value },
    queryConditions: rowModel.queryConditions.value.map((c) => ({ ...c }))
  }
}
function setState(s: RjGridState) {
  colState.applyColumnState(s.columns)
  // 防御式校验：忽略持久化状态中已不存在/被移除的列引用，避免重载时因陈旧字段触发异常
  const valid = new Set<string>()
  const addValid = (c: RjColumn) => {
    // 引擎生成列（透视 __pv* / 复选 __check / 拖拽柄 __drag）不是可持久化的列引用：
    // 透视态下 pipelineCols 恰好被它们顶替，照单全收会把生成列当成度量存回 pivot.values
    if (isInternalColKey(colIdOf(c))) return
    valid.add(colIdOf(c))
    if (c.field && !isInternalColKey(c.field)) valid.add(c.field)
  }
  collectLeaves(props.columns).forEach(addValid)
  pipelineCols.value.forEach(addValid)
  const ok = (k?: string) => !!k && valid.has(k)
  rowModel.sortStates.value = (s.sort || []).filter((x) => ok(x.field))
  rowModel.filterModels.clear()
  s.filters?.forEach((f) => {
    if (ok(f.field)) rowModel.filterModels.set(f.field, f.model)
  })
  rowModel.quickFilter.value = s.quickFilter || ''
  rowModel.floatFilters.clear()
  if (s.floatFilters)
    Object.entries(s.floatFilters).forEach(([k, v]) => {
      if (ok(k)) rowModel.floatFilters.set(k, v)
    })
  syncFloatInput()
  rowModel.advancedFilter.value = s.advancedFilter
    ? ({ ...(s.advancedFilter as object) } as AdvFilterGroup)
    : null
  rowModel.rowGroupFields.value = (s.rowGroup || []).filter((f) => ok(f))
  rowModel.queryConditions.value = (s.queryConditions || []).filter((c) => ok(c.field))
  if (s.pivot)
    rowModel.pivotState.value = {
      cols: normalizePivotOrder((s.pivot.cols || []).filter((f) => ok(f))),
      values: normalizePivotOrder((s.pivot.values || []).filter((f) => ok(f))),
      active: !!s.pivot.active
    }
  editHistory.clear()
  rowModel.touch()
  // 把过滤/归一化后的引用写回一次：否则持久化副本长期带毒，陈旧生成列 id 每次加载都要重洗一遍
  scheduleSave()
}
function saveState() {
  if (!props.stateKey) return
  try {
    localStorage.setItem(`rj-grid-state:${props.stateKey}`, JSON.stringify(getState()))
  } catch {
    /* 存储满/隐私模式忽略 */
  }
}
const scheduleSave = debounce(saveState, 400)
function resetState() {
  if (props.stateKey) localStorage.removeItem(`rj-grid-state:${props.stateKey}`)
  colState.resetColumnState()
  rowModel.sortStates.value = []
  rowModel.filterModels.clear()
  rowModel.floatFilters.clear()
  rowModel.quickFilter.value = ''
  commitFloat.cancel()
  commitQuick.cancel()
  syncFloatInput()
  rowModel.rowGroupFields.value = []
  rowModel.pivotState.value = { cols: [], values: [], active: false }
  rowModel.touch()
}

// ---------------- 图表 / 面板 ----------------
const chartOpen = ref(false)
const panelOpen = ref(false)
watch(panelOpen, (v) => dispatchEvent('toolPanelVisibleChanged', { visible: v }))
const chartRows = computed(() =>
  rowModel.processed.value.displayRows.filter((d) => d.type === 'row').map((d) => d.data)
)
// ---------------- 对外 API ----------------
function scrollTo(rowIndex: number, colId?: string) {
  const el = scrollerRef.value
  if (!el) return
  const offs = rowModel.offsets.value
  el.scrollTop = Math.max((offs[rowIndex] ?? 0) - el.clientHeight / 3, 0)
  if (colId) {
    const leaf = gridCols.value.find((l) => l.colId === colId)
    if (leaf && !leaf.fixed)
      el.scrollLeft = Math.max(Math.min(leaf.x - 40, layout.value.totalWidth - el.clientWidth), 0)
  }
  // 同帧回写滚动量并直推冻结层：原生 scrollTop 赋值后 scroll 事件会晚 1-2 帧到，
  // 不等它，否则 API 调用后会出现冻结层与新滚动量错位一帧
  scrollLeft.value = el.scrollLeft
  scrollTop.value = el.scrollTop
  syncFixedCanvas(el.scrollTop)
}

// ---------------- 自然语言查询（AI） ----------------
// 从列定义构建解析所需的列描述器（colId/field/title/筛选类型/别名/候选值）
function nlqColumns(): RjNlqColumn[] {
  const src = rowModel.sourceRows() as RjRowData[]
  const out: RjNlqColumn[] = []
  for (const leaf of gridCols.value) {
    const col = leaf.col
    if (!col || !col.field) continue
    if (leaf.colId === '__check' || leaf.colId === '__drag' || leaf.colId === '__group') continue
    let filterType: RjNlqFilterType = 'text'
    if (typeof col.filter === 'string') filterType = col.filter as RjNlqFilterType
    else if (col.type === 'num' || col.type === 'money' || col.type === 'percent')
      filterType = 'number'
    else if (col.type === 'date' || col.type === 'datetime') filterType = 'date'
    const ed = col.editor
    const edType = typeof ed === 'string' ? ed : ed?.type
    const eo = typeof ed === 'string' ? undefined : ed?.options
    if (edType === 'select' || edType === 'richSelect') filterType = 'select'
    let options: string[] | undefined
    // 候选值何时可拒：editor / 选项载体声明的枚举是权威的；client 模式下 src 就是全量行，采样出的候选也就是全集
    let strictOptions = false
    const resolvedOpts = colOptionList(col)
    if (Array.isArray(eo) && eo.length) {
      filterType = 'select'
      options = (eo as any[]).map((o) => String(o?.label ?? o?.value ?? o))
      strictOptions = true
    } else if (resolvedOpts && resolvedOpts.length) {
      filterType = 'select'
      options = flattenOptions(resolvedOpts).map((o) => String(o.label ?? o.value))
      strictOptions = true
    } else if (filterType === 'select') {
      const set = new Set<string>()
      for (const r of src) {
        const v = r[col.field]
        if (v != null && v !== '') {
          set.add(String(v))
          if (set.size > 60) break
        }
      }
      if (set.size && set.size <= Math.max(8, Math.min(src.length, 40))) {
        options = [...set]
        // 非 client 模式只采到当前块/页，候选不全时不能拒（否则会误拒合法值）
        strictOptions = props.dataMode === 'client'
      }
    }
    out.push({
      colId: leaf.colId,
      field: col.field,
      title: col.title,
      filterType,
      options,
      strictOptions
    })
  }
  return out
}

// 将解析出的意图应用到网格（筛选 / 排序 / 分组 / 全局搜索 / 取前N）
function applyNLQ(r: RjNlqResult) {
  if (!r.ok) return
  // 一次查询以「替换」语义执行：排序/分组/搜索/限量一律以本次意图为准，
  // 未携带的显式清空，避免多轮查询意图累积（如上一条的排序残留到本条）。
  rowModel.filterModels.clear()
  for (const f of r.filters) rowModel.filterModels.set(f.colId, f.model)
  rowModel.sortStates.value = r.sort ? [r.sort] : []
  const prevGroup = rowModel.rowGroupFields.value.slice()
  if (r.groupColId) {
    const gcol = gridCols.value.find((l) => l.colId === r.groupColId)
    rowModel.rowGroupFields.value = gcol ? [gcol.col.field || r.groupColId!] : []
  } else {
    rowModel.rowGroupFields.value = []
  }
  rowModel.quickFilter.value = r.search || ''
  // TopN「取前 N」：无 limit 时复位为 0（不限量），避免上一次的限量残留
  rowModel.rowLimit.value = r.limit && r.limit > 0 ? r.limit : 0
  rowModel.touch()
  emit('filter-change')
  if (rowModel.rowGroupFields.value.join('|') !== prevGroup.join('|'))
    emit('row-group-change', rowModel.rowGroupFields.value)
}

const apiObj = {
  getDisplayedRowAtIndex: (i: number) => rowModel.processed.value.displayRows[i]?.data,
  getDisplayedRowsCount: () => rowModel.processed.value.displayRows.length,
  /** 当前虚拟可见行区间 [start, end)（对标 AG Grid getVirtualRowRanges） */
  getVisibleRange: () => {
    const wr = windowRange.value
    return { start: wr.start, end: wr.end }
  },
  applyTransaction: (tx: RjTransaction) => {
    rowModel.applyTransaction(tx)
    scheduleSave()
  },
  applyTransactionAsync: async (tx: RjTransaction) => {
    if (props.dataMode === 'serverSide') rowModel.ssrmBatcher.push(tx)
    else rowModel.applyTransaction(tx)
  },
  refreshServerSide: (params?: { purge?: boolean }) => {
    if (props.dataMode !== 'serverSide') return
    if (params?.purge === false) {
      // 不 purge：仅重新调度当前视口缺失块
      const wr = windowRange.value
      rowModel.ensureServerBlocks(wr.start, Math.max(wr.start, wr.end - 1))
    } else reloadServerSide()
  },
  purgeServerSideCache: () => rowModel.purgeServerSideCache(),
  setRowData: (rows: RjRowData[]) => rowModel.setRowData(rows),
  updateRow: (row: RjRowData) => rowModel.applyTransaction({ update: [row] }),
  getCellValue: (rowIndex: number, field: string) => {
    const d = rowModel.processed.value.displayRows[rowIndex]
    if (!d) return undefined
    const col = pipelineCols.value.find((c) => c.field === field || colIdOf(c) === field)
    return col ? cellRawValue(col, d.data) : (d.data as any)[field]
  },
  setCellValue: (rowIndex: number, field: string, value: any) => {
    const d = rowModel.processed.value.displayRows[rowIndex]
    const col = pipelineCols.value.find((c) => c.field === field || colIdOf(c) === field)
    if (!d || !col) return
    const oldValue = cellRawValue(col, d.data)
    rowModel.setRowValue(d.data, col, value)
    emit('cell-value-changed', { row: d.data, colId: colIdOf(col), newValue: value, oldValue })
  },
  getSelectedRows: () => selectedRows(),
  getSelectedKeys: () => Array.from(selection),
  openRowForm: (rows?: RjRowData[]) => openRowForm(rows),
  openRowFormAdd: (preset?: RjRowData) => openRowFormAdd(preset),
  setRowSelection: (row: RjRowData, selected: boolean) => {
    const k = rowKeyOf(row, props.rowKey)
    if (selected) {
      if (props.rowSelection === 'single') selection.clear()
      selection.add(k)
      if (props.keepSelectionCrossPage) preserveMap.set(k, row)
    } else {
      selection.delete(k)
      preserveMap.delete(k)
    }
    notifySelection()
  },
  selectAll: () => toggleAll(),
  clearSelection: () => {
    selection.clear()
    preserveMap.clear()
    emit('selection-change', [])
    dispatchEvent('rowSelectionChanged', { selected: [] })
  },
  setSort: (sorts: RjSortState[]) => {
    rowModel.sortStates.value = sorts
    rowModel.touch()
    emit('sort-change', sorts)
    dispatchEvent('sortChanged', { sort: sorts })
  },
  setFilterModel: (field: string, model: RjFilterModel | null) => {
    if (model) rowModel.filterModels.set(field, model)
    else rowModel.filterModels.delete(field)
    rowModel.touch()
    emit('filter-change')
    dispatchEvent('filterChanged', { colId: field })
  },
  clearAllFilters: () => {
    rowModel.filterModels.clear()
    rowModel.floatFilters.clear()
    rowModel.advancedFilter.value = null
    rowModel.quickFilter.value = ''
    commitFloat.cancel()
    commitQuick.cancel()
    syncFloatInput()
    rowModel.touch()
    emit('filter-change')
    dispatchEvent('filterChanged', {})
    scheduleSave()
  },
  setQuickFilter: (text: string) => {
    rowModel.quickFilter.value = text
    rowModel.touch()
    emit('filter-change')
    dispatchEvent('filterChanged', {})
  },
  setAdvancedFilter: (model: AdvFilterGroup | null) => {
    if (model) applyAdvancedFilter(model)
    else clearAdvancedFilter()
  },
  getAdvancedFilter: () => rowModel.advancedFilter.value,
  openAdvancedFilter: () => openAdvancedFilter(),
  setRowGroup: (fields: string[]) => {
    rowModel.rowGroupFields.value = fields
    emit('row-group-change', fields)
    dispatchEvent('rowGroupChanged', { groupedColumns: fields.slice() })
    scheduleSave()
  },
  /** NLQ/外部设置「取前 N」显示限量（0=不限量）；供重置等场景显式复位 */
  setRowLimit: (n: number) => {
    rowModel.rowLimit.value = n && n > 0 ? n : 0
    rowModel.touch()
  },
  expandAll: () => rowModel.expandAll(),
  collapseAll: () => rowModel.collapseAll(),
  setPivot: (cols: string[], values: string[]) => {
    rowModel.pivotState.value = { cols, values, active: true }
    scheduleSave()
  },
  scrollTo,
  startEditing: (rowIndex: number, colId: string) => {
    const c = gridCols.value.findIndex((l) => l.colId === colId)
    if (c >= 0) startEdit(rowIndex, c)
  },
  stopEditing: () => stopEdit(),
  undoCellEditing: () => undoEdit(),
  redoCellEditing: () => redoEdit(),
  canUndo: () => editHistory.canUndo(),
  canRedo: () => editHistory.canRedo(),
  // 脏格 API（对标 AG Grid dirty cells）
  isDirty: () => dirtyMap.value.size > 0,
  isCellDirty: (rowIndex: number, colId: string) => {
    const drow = rowModel.processed.value.displayRows[rowIndex]
    return drow ? dirtyMap.value.has(dirtyKey(drow.data, colId)) : false
  },
  getDirtyCells: () =>
    Array.from(dirtyMap.value.values()).map((info) => {
      const col = colByColId(info.colId)
      return {
        row: info.data,
        colId: info.colId,
        oldValue: info.orig,
        newValue: col ? cellRawValue(col, info.data) : (info.data as any)[info.colId]
      }
    }),
  getDirtyRows: () => {
    const seen = new Set<RjRowData>()
    dirtyMap.value.forEach((info) => seen.add(info.data))
    return Array.from(seen)
  },
  clearDirtyCells: () => {
    dirtyMap.value.clear()
  },
  recalculate: (_force?: boolean) => {
    rowModel.touch()
  },
  setCellFormula: (rowIndex: number, colId: string, formula: string) => {
    const d = rowModel.processed.value.displayRows[rowIndex]
    if (!d || d.type !== 'row') return
    if (formula && isFormula(formula)) cellFormulas.set(dirtyKey(d.data, colId), formula)
    else cellFormulas.delete(dirtyKey(d.data, colId))
    rowModel.touch()
  },
  getCellFormula: (rowIndex: number, colId: string) => {
    const d = rowModel.processed.value.displayRows[rowIndex]
    return d ? cellFormulas.get(dirtyKey(d.data, colId)) : undefined
  },
  hasFormula: () => cellFormulas.size > 0 || colState.listLeafColumns().some((c) => !!c.formula),
  getCircularRefs: () => {
    const out: { row: number; colId: string }[] = []
    const cols = gridCols.value
    rowModel.processed.value.displayRows.forEach((d, ri) => {
      if (d.type !== 'row') return
      cols.forEach((leaf) => {
        if (cellRawValue(leaf.col, d.data) === '#CIRCULAR!')
          out.push({ row: ri, colId: leaf.colId })
      })
    })
    return out
  },
  exportData: (params?: RjPrintParams & { type?: 'csv' | 'excel' | 'pdf' }) =>
    doExport(params?.type === 'excel' ? 'excel' : params?.type === 'pdf' ? 'pdf' : 'csv', params),
  exportCurrentAsCsv: () => doExport('csv'),
  print: (params?: RjPrintParams) => doPrint(params),
  getPrintHtml: (params?: RjPrintParams) => getPrintHtml(params),
  copySelectedToClipboard: () => {
    const rows = selectedRows()
    if (!rows.length) return
    const cols = colState.listLeafColumns().filter((c) => !c.checkbox && !c.rowDrag)
    writeClipboard(
      toTsv([
        cols.map((c) => c.title || c.field || colIdOf(c)),
        ...rows.map((r) => cols.map((c) => exportRaw(c, cellRawValue(c, r))))
      ])
    )
  },
  getState,
  setState,
  refresh: () => rowModel.touch(),
  refreshCells: () => rowModel.touch(),
  getRangeSelection: () => {
    const rg = interaction.range.value
    return rg ? { start: { ...rg.start }, end: { ...rg.end } } : null
  },
  clearRangeSelection: () => interaction.clearSelection(),
  // 列便利方法（对齐 AG Grid column API）
  getColumns: () =>
    colState.listLeafColumns().map((c) => ({ colId: colIdOf(c), field: c.field, title: c.title })),
  isColumnHidden: (colId: string) => colState.isColumnHidden(colId),
  setColumnVisible: (colId: string, visible: boolean) => {
    // 已经是目标态就不发事件；写入的是「显式覆盖」，因此能打开列定义里 hidden:true 的列
    if (colState.isColumnHidden(colId) === !visible) return
    colState.toggleHide(colId, !visible)
    dispatchEvent('columnVisible', { column: colId })
    dispatchEvent('columnEverythingChanged', {})
    scheduleSave()
  },
  setColumnPinned: (colId: string, pinned: 'left' | 'right' | null) =>
    onPanelTogglePin(colId, pinned),
  setColumnWidth: (colId: string, width: number) => {
    colState.resize(colId, width)
    dispatchEvent('columnResized', { column: colId, width })
    scheduleSave()
  },
  autoSizeColumn: (colId: string) => autoWidth(colId),
  autoSizeAll: () => {
    gridCols.value.forEach((l) => autoWidth(l.colId))
    dispatchEvent('columnEverythingChanged', {})
  },
  sizeColumnsToFit: () => {
    colState.sizeToFit()
    scheduleSave()
    dispatchEvent('columnEverythingChanged', {})
  },
  /** 清除宽度覆盖：把列宽还原到列定义/内容自适应默认值（配合 autoSizeAll 做「自适应↔还原」切换） */
  resetColumnWidths: () => {
    colState.clearWidths()
    applyDefaultAutoWidths()
    scheduleSave()
    dispatchEvent('columnEverythingChanged', {})
  },
  // 主题 / i18n（运行时切换）
  setTheme: (params: RjThemeParams) => {
    themeState.value = { ...params }
  },
  getTheme: () => themeState.value,
  setLang: (lang: string) => {
    langRef.value = lang
  },
  setLocaleText: (patch: RjMessages) => {
    localeOverride.value = { ...(localeOverride.value || {}), ...patch }
  },
  parseQuery: (text: string): RjNlqResult => parseNLQ(text, nlqColumns()),
  applyQuery: (text: string): RjNlqResult => {
    const r = parseNLQ(text, nlqColumns())
    applyNLQ(r)
    dispatchEvent('queryApplied', { text, result: r })
    return r
  },
  forEachNode: (fn: (data: RjRowData, index: number, drow: RjDisplayRow) => void) =>
    rowModel.processed.value.displayRows.forEach((d, i) => fn(d.data, i, d)),
  // 动态事件订阅（AG Grid 风格）
  addEventListener,
  removeEventListener,
  dispatchEvent
}

// ---------------- 图片预览（点击图片单元格触发） ----------------
const imgPreview = ref('')

// ---------------- 全局覆盖层关闭 ----------------
function onDocPointerDown(e: Event) {
  const t = e.target as HTMLElement | null
  if (menu.value && !t?.closest?.('.rj-menu, .rj-export-btn, .rj-view-btn')) menu.value = null
  if (filterMenu.value && !t?.closest?.('.rj-popup')) filterMenu.value = null
  if (colMenu.value && !t?.closest?.('.rj-colmenu')) colMenu.value = null
  if (imgPreview.value && !t?.closest?.('.rj-img-viewer')) imgPreview.value = ''
  if (quickPop.value && !t?.closest?.('.rj-quick-pop, .rj-quick-btn')) quickPop.value = null
}

// 浮层 Escape 关闭（document 级，不依赖网格容器焦点）
function onDocKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (imgPreview.value) {
    imgPreview.value = ''
    return
  }
  if (colMenu.value || menu.value || filterMenu.value || quickPop.value) {
    colMenu.value = null
    menu.value = null
    filterMenu.value = null
    quickPop.value = null
  }
}

// ---------------- 内置操作列（col.actions）宿主 ----------------
/** 布尔直通 / 函数按当前上下文求值；def 为缺位时的返回值 */
function evalActionFlag(
  v: boolean | ((c: RjCellActionCtx) => boolean) | undefined,
  ctx: RjCellActionCtx,
  def = false
): boolean {
  if (v == null) return def
  return typeof v === 'function' ? !!v(ctx) : !!v
}
/** 执行单个操作：先按 confirm 走内置确认框，再回调 onClick 并派发 grid 级 cell-action 事件 */
function runCellAction(action: RjCellAction, params: RjCellParams) {
  const ctx: RjCellActionCtx = { ...params, action, api: apiObj }
  if (evalActionFlag(action.disabled, ctx)) return
  const fire = () => {
    action.onClick?.(ctx)
    emit('cell-action', ctx)
  }
  const msg = typeof action.confirm === 'function' ? action.confirm(ctx) : action.confirm
  if (msg) confirmDlg.value = { message: msg, onOk: fire }
  else fire()
}
provide(RJ_CELL_ACTIONS_KEY, {
  run: runCellAction,
  openOverflow: (el, actions, params) => {
    const r = el.getBoundingClientRect()
    const items: RjMenuItem[] = actions.map((a) => {
      const ctx: RjCellActionCtx = { ...params, action: a, api: apiObj }
      return {
        name: (a.icon ? a.icon + ' ' : '') + (a.label || a.name),
        disabled: () => evalActionFlag(a.disabled, ctx),
        action: () => runCellAction(a, params)
      }
    })
    // 挂在网格根的浮动菜单（.rj-cell 的 overflow 会裁切内部弹层），锚在“更多”按钮下沿
    openMenuAt(r.left, r.bottom + 6, items, r.top, 180)
  }
})

// ---------------- 生命周期 ----------------
watch(
  () => props.density,
  (v) => {
    const i = DENSITY_KEYS.indexOf(v)
    if (i >= 0) densityIdx.value = i
  }
)

// 默认列宽自适应触发：列定义变化重播；首屏数据 0→非0 补播一次（不随过滤反复重测）。
// 不能依赖 sourceRows().length：客户端模式 sourceRows 会 memo 住非响应式的 internalRows，首次取到空数组后
// getter 就不再读 props.rows → 0→N 跃迁丢不到（隐藏网格首屏空→异步灌数）。改用驱动渲染的 processed（各模式均响应式）。
watch(
  () => props.columns,
  () => nextTick(applyDefaultAutoWidths)
)
watch(
  () => rowModel.processed.value.displayRows.length,
  (n, o) => {
    if (!o && n) nextTick(applyDefaultAutoWidths)
  },
  { flush: 'post' }
)

onMounted(() => {
  nextTick(measure)
  nextTick(applyDefaultAutoWidths)
  if (scrollerRef.value) {
    ro = new ResizeObserver(() => measure())
    ro.observe(scrollerRef.value)
  }
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onDocKeyDown)
  document.addEventListener('paste', onWinPaste)
  if (props.stateKey) {
    try {
      const raw = localStorage.getItem(`rj-grid-state:${props.stateKey}`)
      if (raw) setState(JSON.parse(raw))
    } catch {
      /* 忽略损坏的持久化状态 */
    }
  }
  // queryable：默认呈现 1 个查询条件（持久化状态已带条件则不注入）
  seedDefaultQuery()
  if (props.dataMode !== 'client' && props.loadData) {
    syncServerCtx()
    if (props.dataMode === 'serverSide') {
      nextTick(() => {
        const bs = props.ssrmBlockSize || 100
        rowModel.ensureServerBlocks(0, bs * 2 - 1)
      })
    } else {
      rowModel.reloadServer()
    }
  }
  emit('ready', apiObj)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  if (dragRaf) {
    cancelAnimationFrame(dragRaf)
    dragRaf = 0
  }
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', endRowDrag)
  window.removeEventListener('pointercancel', endRowDrag)
  document.body.style.cursor = ''
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onDocKeyDown)
  document.removeEventListener('paste', onWinPaste)
  if (winPointerMove) window.removeEventListener('pointermove', winPointerMove)
  if (winPointerUp) window.removeEventListener('pointerup', winPointerUp)
})

defineExpose(apiObj as any)
</script>
