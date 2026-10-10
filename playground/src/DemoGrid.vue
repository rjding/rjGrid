<template>
  <div class="rj-test-page">
    <div class="rj-test-tabs">
      <button
        v-for="t in TABS"
        :key="t.k"
        class="rj-test-tab"
        :class="{ 'is-active': tab === t.k }"
        @click="switchTab(t.k)"
      >
        {{ t.label }}
      </button>
      <span class="rj-test-desc">{{ TABS.find((t) => t.k === tab)?.desc }}</span>
      <span class="rj-test-lang">
        <button class="rj-btn" :class="{ 'is-live': demoLang === 'zh' }" @click="demoLang = 'zh'">
          中文
        </button>
        <button class="rj-btn" :class="{ 'is-live': demoLang === 'en' }" @click="demoLang = 'en'">
          EN
        </button>
      </span>
    </div>

    <!-- ① 综合功能（客户端全量） -->
    <rj-grid
      v-if="tab === 'basic'"
      ref="gridRef"
      :columns="basicColumns"
      :rows="basicRows"
      row-key="__id"
      :height="gridH"
      density="medium"
      editable
      undo-redo-cell-editing
      :undo-redo-cell-editing-limit="50"
      floating-filters
      group-footer
      range-selection
      clipboard
      copy-headers-to-clipboard
      mark-dirty-cells
      row-selection="multiple"
      keep-selection-cross-page
      :group-display-type="gdt"
      group-selects-children
      row-draggable
      :context-menus="demoContextMenus"
      state-key="wms-rjgrid-demo"
      queryable
      viewable
      show-summary
      :pinned-top-rows="pinnedTop"
      :detail-height="180"
      :full-width-row="(r: any) => !!r.__full"
      :get-row-class="({ row }: any) => (row.qty < 10 ? 'rj-low-qty' : '')"
      :lang="demoLang"
      :export-file-name="tl('rjgrid-综合演示', 'rjgrid-demo')"
      :server-export="onServerExport"
      :dict-loader="demoDictLoader"
      :options-loader="demoOptionsLoader"
      :row-hover="rowHoverOn"
      :query-actions="demoActions"
      :row-form="{ columns: demoFormCols, addColumns: demoAddCols, addTitle: tl('新增物料', 'Add Item') }"
      @selection-change="onSelChange"
      @cell-value-changed="onValueChanged"
      @row-form-add="onRowFormAdd"
      @row-form-submit="onRowFormSubmit"
      @ready="stashApi"
    >
      <template #toolbar="{ api }">
        <button class="rj-btn" @click="addRow(api)">{{ tl('＋加行', '+ Add Row') }}</button>
        <button class="rj-btn" @click="flashRandom(api)">
          {{ tl('⚡随机改值', '⚡ Random Edit') }}
        </button>
        <button class="rj-btn" @click="api.clearSelection()">
          {{ tl('清除选择', 'Clear Selection') }}
        </button>
        <button class="rj-btn" @click="exportSelected(api)">
          {{ tl('导出所选', 'Export Selected') }}
        </button>
        <button class="rj-btn" @click="toggleAutoSize(api)">
          {{
            contentSized
              ? tl('⇄ 还原列宽', '⇄ Restore Widths')
              : tl('⇄ 列宽自适应', '⇄ Auto Size')
          }}
        </button>
        <button class="rj-btn" @click="api.openAdvancedFilter()">
          {{ tl('◆ 高级过滤', '◆ Advanced Filter') }}
        </button>
        <button class="rj-btn" @click="genPrintPreview(api)">
          {{ tl('🧾 打印预览HTML', '🧾 Print HTML') }}
        </button>
        <button
          class="rj-btn"
          @click="gdt = gdt === 'singleColumn' ? 'multipleColumns' : 'singleColumn'"
        >
          {{ tl('分组显示', 'Group Display') }}{{ tl('：', ': ')
          }}{{ gdt === 'singleColumn' ? tl('单列', 'Single') : tl('多列', 'Multi') }}
        </button>
        <button class="rj-btn" @click="saveDirty(api)">
          💾 {{ tl('保存', 'Save') }}{{ dirtyN ? tl(`（${dirtyN}）`, ` (${dirtyN})`) : '' }}
        </button>
        <button class="rj-btn" @click="rowHoverOn = !rowHoverOn">
          🖱 {{ tl('悬停高亮', 'Row Hover') }}{{ tl('：', ': ')
          }}{{ rowHoverOn ? tl('开', 'On') : tl('关', 'Off') }}
        </button>
        <span class="rj-test-sel">{{
          tl(`选中 ${selCount} 行`, `${selCount} row(s) selected`)
        }}</span>
      </template>

      <!-- #query-actions 插槽覆盖轨：宿主自画按钮，作用域拿 api/选中行/内置编辑·新增弹窗入口 -->
      <template #query-actions="{ rows, openRowForm, openRowFormAdd }">
        <button class="rj-btn" :disabled="!rows.length" @click="openRowForm(rows)">
          {{ tl('✎ 插槽改行', '✎ Slot Edit') }}
        </button>
        <button class="rj-btn" @click="openRowFormAdd({ status: '待检' })">
          {{ tl('＋ 插槽新增', '＋ Slot Add') }}
        </button>
      </template>

      <template #cell-name="{ row, value }">
        <!-- 合计行等引擎生成行上没有 row.name，回落到组件算好的 value（否则「总计」会被插槽吞掉） -->
        <b :style="{ color: row.qty < 10 ? '#e54d42' : 'var(--rj-primary)' }">{{
          row.name ?? value
        }}</b>
      </template>

      <template #cell-status="{ row }">
        <span class="rj-test-tag" :class="'st-' + row.status">{{ row.status }}</span>
      </template>

      <template #row-detail="{ row }">
        <div style="padding: 10px 16px; line-height: 1.8">
          <b>{{ row.name }}</b>
          {{ tl('的从属明细（row-detail 插槽演示）', 'detail rows (row-detail slot demo)') }}<br />
          {{ tl('仓库', 'Warehouse') }}{{ tl('：', ': ') }}{{ row.warehouse }}{{ tl('｜', ' | ') }}
          {{ tl('类别', 'Category') }}{{ tl('：', ': ') }}{{ row.category }}{{ tl('｜', ' | ') }}
          {{ tl('联系人', 'Contact') }}{{ tl('：', ': ') }}{{ row.contact }} {{ row.phone }}<br />
          {{ tl('最近 30 日出入库趋势', 'Recent 30-day in/out trend') }}{{ tl('：', ': ')
          }}{{ (row.trend || []).join(', ') }}
        </div>
      </template>

      <template #full-row="{ row }">
        <div style="padding: 8px 16px; color: #b26a00">
          ⚠
          {{
            tl(
              `全宽行演示：物料 ${row.name} 正在盘点，暂停出入库。`,
              `Full-width row demo: ${row.name} is being counted, in/out suspended.`
            )
          }}
        </div>
      </template>
    </rj-grid>

    <!-- ② 大数据性能 -->
    <rj-grid
      v-if="tab === 'perf'"
      :columns="perfColumns"
      :rows="perfRows"
      row-key="__id"
      :height="gridH"
      :tool-panel="false"
      :groupable="false"
      :show-group-panel="false"
      range-selection
      clipboard
      row-selection="multiple"
      quick-filter-enabled
      :lang="demoLang"
    >
      <template #toolbar>
        <span class="rj-test-sel">
          {{
            tl(
              `${perfRows.length.toLocaleString()} 行 × ${perfColumns.length} 列（行+列双向虚拟滚动${
                perfTime ? `，生成耗时 ${perfTime}ms` : ''
              }）`,
              `${perfRows.length.toLocaleString()} rows × ${perfColumns.length} cols (two-way virtual scroll${
                perfTime ? `, built in ${perfTime}ms` : ''
              })`
            )
          }}
        </span>
      </template>
    </rj-grid>

    <!-- ③ 树形 + 分组/透视 -->
    <div
      v-if="tab === 'tree'"
      style="margin-bottom: 8px; display: flex; gap: 10px; align-items: center"
    >
      <button
        v-for="m in treeViews"
        :key="m"
        class="rj-btn"
        :class="{ 'is-active': treeView === m }"
        @click="treeView = m"
      >
        {{ m === 'tree' ? tl('树形层级', 'Tree') : tl('分组 RowGroup', 'Row Group') }}
      </button>
      <span class="rj-test-sel">{{
        treeView === 'tree'
          ? tl(
              'treeData 主从层级；切到「分组」可体验同一数据的 RowGroup 聚合（树形会遮蔽分组，故切换时关闭 treeData）',
              'treeData hierarchy; switch to Row Group to see aggregation on the same data (tree shadows grouping, so treeData is turned off when switching)'
            )
          : tl(
              '关闭 treeData、把层级数据拍平后按「类型」分组聚合；也可拖其它列进分组横幅或用 ⚙ 面板切透视',
              'treeData off; flattened hierarchy grouped by Type; drag other columns onto the group banner or use the ⚙ Panel for Pivot'
            )
      }}</span>
    </div>
    <rj-grid
      v-if="tab === 'tree'"
      :key="'tree-' + treeView"
      :columns="treeColumns"
      :rows="treeView === 'tree' ? treeRows : treeFlatRows"
      row-key="code"
      :height="gridH"
      :tree-data="treeView === 'tree'"
      :children-field="treeView === 'tree' ? 'children' : undefined"
      groupable
      show-group-panel
      group-footer
      row-selection="multiple"
      show-summary
      :lang="demoLang"
      :export-file-name="tl('rjgrid-树形分组', 'rjgrid-tree-group')"
    >
      <template #toolbar>
        <span class="rj-test-sel">{{
          tl(
            '树形/分组两种视图；打开「⚙ 面板」可切到分组/透视页签，或直接把列头拖入分组横幅体验 RowGroup / Pivot',
            'Tree / Row-Group views; open the ⚙ Panel to switch to Group / Pivot, or drag a header onto the group banner'
          )
        }}</span>
      </template>
    </rj-grid>

    <!-- ④ 服务端模式 -->
    <div
      v-if="tab === 'server'"
      style="margin-bottom: 8px; display: flex; gap: 10px; align-items: center"
    >
      <button
        v-for="m in serverModes"
        :key="m"
        class="rj-btn"
        :class="{ 'is-active': serverMode === m }"
        @click="serverMode = m"
      >
        {{ m === 'pagination' ? tl('分页模式', 'Pagination') : tl('无限滚动', 'Infinite Scroll') }}
      </button>
      <span class="rj-test-sel">{{
        tl(
          '排序/筛选/快速搜索均下发给“服务端”，切换模式会重建表格重新请求',
          'Sort / filter / quick filter are all sent to the mock server; switching mode rebuilds the grid'
        )
      }}</span>
    </div>
    <rj-grid
      v-if="tab === 'server'"
      :key="serverMode"
      :columns="serverColumns"
      :data-mode="serverMode"
      :load-data="loadDataMock"
      :page-size="serverMode === 'pagination' ? 50 : 100"
      row-key="__id"
      :height="gridH"
      range-selection
      :tool-panel="false"
      groupable
      show-group-panel
      server-side-grouping
      floating-filters
      queryable
      viewable
      :chartable="false"
      :lang="demoLang"
    />

    <!-- ⑤ SSRM 服务端行模型（块缓存 + Delta） -->
    <rj-grid
      v-if="tab === 'ssrm'"
      ref="ssrmApi"
      :columns="serverColumns"
      data-mode="serverSide"
      :load-data="loadSsrmMock"
      :ssrm-block-size="100"
      :ssrm-max-blocks-in-cache="8"
      :ssrm-cache-overflow="3"
      groupable
      show-group-panel
      server-side-grouping
      :is-server-side-group="ssrmGroupExpandable"
      row-key="__id"
      :height="gridH"
      range-selection
      :tool-panel="false"
      :chartable="false"
      :lang="demoLang"
    >
      <template #toolbar="{ api }">
        <button class="rj-btn" :class="{ 'is-live': ssrmLive }" @click="ssrmToggleLive(api)">
          {{
            ssrmLive
              ? tl('⏸ 停止实时推送', '⏸ Stop Delta Push')
              : tl('▶ 开始实时推送（Delta）', '▶ Start Delta Push')
          }}
        </button>
        <button class="rj-btn" @click="ssrmFlashOne(api)">
          {{ tl('⚡ 改一个可见行', '⚡ Edit a Visible Row') }}
        </button>
        <button class="rj-btn" @click="ssrmAdd(api)">{{ tl('＋ 追加行', '+ Append Row') }}</button>
        <button class="rj-btn" @click="ssrmRemove(api)">
          {{ tl('－ 删除首行', '- Remove First') }}
        </button>
        <button class="rj-btn" @click="api.refreshServerSide({ purge: true })">
          {{ tl('↻ 清空缓存并重载', '↻ Purge & Reload') }}
        </button>
        <span class="rj-test-sel">{{
          tl('滚动以触发分块加载与 LRU 淘汰', 'Scroll to trigger block loading and LRU eviction')
        }}</span>
      </template>
    </rj-grid>

    <!-- ⑦ 公式引擎 -->
    <rj-grid
      v-if="tab === 'formula'"
      ref="formulaApi"
      :columns="formulaColumns"
      :rows="formulaRows"
      row-key="__id"
      :height="gridH"
      editable
      range-selection
      :tool-panel="false"
      :groupable="false"
      :show-group-panel="false"
      :chartable="false"
      :lang="demoLang"
      :export-file-name="tl('rjgrid-公式引擎', 'rjgrid-formula')"
    >
      <template #toolbar="{ api }">
        <button class="rj-btn" @click="api.recalculate()">
          {{ tl('↻ 重算', '↻ Recalculate') }}
        </button>
        <button class="rj-btn" :class="{ 'is-live': loopOn }" @click="toggleLoop()">
          {{
            loopOn
              ? tl('✅ 解除循环引用', '✅ Clear Circular Ref')
              : tl('🔁 注入循环引用', '🔁 Inject Circular Ref')
          }}
        </button>
        <button class="rj-btn" @click="formulaAddRow(api)">{{ tl('＋ 加行', '+ Add Row') }}</button>
        <button class="rj-btn" @click="showCircular(api)">
          {{ tl('🧭 读循环单元格', '🧭 Read Circular Cells') }}
        </button>
        <span class="rj-test-sel">{{
          tl(
            '金额=数量×单价、税额=金额×13%、价税合计=金额+税额；双击任一格输入 =qty*2 等可建单元格公式',
            'amount=qty*price, tax=amount*13%, gross=amount+tax; double-click any cell and type =qty*2 to make a cell formula'
          )
        }}</span>
      </template>
    </rj-grid>

    <!-- ⑧ 主题 & 国际化 -->
    <rj-grid
      v-if="tab === 'theme'"
      ref="themeApi"
      :columns="themeColumns"
      :rows="themeRows"
      row-key="__id"
      :height="gridH"
      :theme="themeCfg"
      :lang="demoLang"
      :locale-text="demoLocaleText"
      editable
      range-selection
      row-selection="multiple"
      tool-panel
      groupable
      :chartable="false"
      :show-group-panel="false"
      status-bar
      :export-file-name="tl('rjgrid-主题', 'rjgrid-theme')"
    >
      <template #toolbar="{ api }">
        <span class="rj-test-sel">{{ tl('风格', 'Style') }}</span>
        <button
          v-for="p in PRESET_LIST"
          :key="p"
          class="rj-btn"
          :class="{ 'is-live': demoPreset === p }"
          @click="demoPreset = p"
        >
          {{ p }}
        </button>
        <button class="rj-btn" :class="{ 'is-live': demoDark }" @click="demoToggleDark()">
          {{ demoDark ? tl('🌙 暗色', '🌙 Dark') : tl('☀ 亮色', '☀ Light') }}
        </button>
        <button
          v-for="c in ACCENTS"
          :key="c"
          class="rj-btn"
          :class="{ 'is-live': demoAccent === c }"
          :style="{ width: '22px', height: '22px', borderRadius: '4px', background: c, padding: 0 }"
          @click="setAccent(c)"
        ></button>
        <button class="rj-btn" :class="{ 'is-live': !demoAccent }" @click="demoAccent = ''">
          {{ tl('默认色', 'Default') }}
        </button>
        <span class="rj-test-sel">{{ tl('语言', 'Language') }}</span>
        <button class="rj-btn" :class="{ 'is-live': demoLang === 'zh' }" @click="demoLang = 'zh'">
          中文
        </button>
        <button class="rj-btn" :class="{ 'is-live': demoLang === 'en' }" @click="demoLang = 'en'">
          English
        </button>
        <button
          class="rj-btn"
          :class="{ 'is-live': demoLocaleOn }"
          @click="demoLocaleOn = !demoLocaleOn"
        >
          {{ tl('localeText 覆盖', 'localeText Override') }}
        </button>
        <button
          class="rj-btn"
          @click="api.setTheme?.({ preset: 'quartz', mode: 'dark', accentColor: '#e91e63' })"
        >
          API setTheme
        </button>
        <span class="rj-test-sel">{{
          tl(
            '实时切换预设/明暗/强调色与中英文；开「面板」与列菜单可见界面文案随语言变化',
            'Switch preset / mode / accent / language at runtime; open Panel or a column menu to see text follow the language'
          )
        }}</span>
      </template>
    </rj-grid>

    <!-- ⑧ AI 自然语言查询 -->
    <rj-grid
      v-if="tab === 'ai'"
      ref="aiApi"
      :columns="aiColumns"
      :rows="aiRows"
      row-key="__id"
      :height="gridH"
      range-selection
      tool-panel
      groupable
      :chartable="false"
      :show-group-panel="false"
      status-bar
      :lang="demoLang"
      :export-file-name="tl('rjgrid-AI', 'rjgrid-ai')"
    >
      <template #toolbar="{ api }">
        <span class="rj-test-sel"
          >🤖 {{ tl('用一句话问数据', 'Ask your data in one sentence') }}</span
        >
        <input
          v-model="aiQuery"
          class="rj-ai-input"
          :placeholder="
            tl('例如：数量大于50 且 状态为在库 按单价降序', 'e.g. qty > 50 sort by price desc')
          "
          @keyup.enter="runAiQuery(api)"
        />
        <button class="rj-btn" @click="runAiQuery(api)">{{ tl('应用', 'Apply') }}</button>
        <button class="rj-btn" @click="parseOnlyAi(api)">{{ tl('仅解析', 'Parse Only') }}</button>
        <button class="rj-btn" @click="resetAi(api)">{{ tl('重置', 'Reset') }}</button>
        <button v-for="s in AI_SAMPLES" :key="s" class="rj-btn is-sample" @click="aiQuery = s">
          {{ s }}
        </button>
        <span v-if="aiExplain" class="rj-ai-explain">↳ {{ aiExplain }}</span>
      </template>
    </rj-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { RjGrid } from 'rj-grid'
import type {
  RjColumn,
  RjEditorOption,
  RjLoadServerParams,
  RjContextMenuItem,
  RjRowData,
  RjServerExportParams,
  RjQueryAction
} from 'rj-grid'
import { explainNLQ } from 'rj-grid'

defineOptions({ name: 'WmsRjGridDemo' })

/** 演示页双语：标签/按钮/列标题均经 tl() 取词，随全局语言切换重算（业务数据不译） */
const demoLang = ref<'zh' | 'en'>('en')
const tl = (zh: string, en: string) => (demoLang.value === 'en' ? en : zh)

const TAB_DEFS = [
  {
    k: 'basic',
    zh: '① 综合功能',
    en: '① Full Features',
    zhDesc: '编辑/选择/区域剪贴板/拖拽/图片/合并/明细/全宽/钉行/合计/持久化/图表/导出',
    enDesc:
      'Edit / Select / Range-Clipboard / Drag / Image / Span / Detail / Full-width / Pinned / Summary / State / Chart / Export'
  },
  {
    k: 'perf',
    zh: '② 大数据性能',
    en: '② Big Data Perf',
    zhDesc: '10 万行 × 12 列，双向虚拟滚动',
    enDesc: '100k rows × 12 cols, two-way virtual scrolling'
  },
  {
    k: 'tree',
    zh: '③ 树形/分组/透视',
    en: '③ Tree / Group / Pivot',
    zhDesc: 'treeData 主从层级 + RowGroup 聚合 + Pivot 透视',
    enDesc: 'treeData hierarchy + RowGroup aggregation + Pivot'
  },
  {
    k: 'server',
    zh: '④ 服务端模式',
    en: '④ Server-side',
    zhDesc: 'pagination 分页 / infinite 无限滚动，条件全部下发',
    enDesc: 'pagination / infinite scroll, all conditions sent to server'
  },
  {
    k: 'ssrm',
    zh: '⑤ SSRM 块缓存',
    en: '⑤ SSRM Block Cache',
    zhDesc: 'serverSide：按块取数 + 视口调度 + LRU 淘汰 + Delta 实时事务/异步批量（5 万行）',
    enDesc:
      'serverSide: block fetching + viewport scheduling + LRU eviction + Delta transactions (50k rows)'
  },
  {
    k: 'formula',
    zh: '⑥ 公式引擎',
    en: '⑥ Formula Engine',
    zhDesc: '列级/单元格级公式：依赖拓扑重算 + 循环检测（编辑输入 =... 即建公式）',
    enDesc: 'Column/cell formulas: topological recalc + circular detection (type =... to create)'
  },
  {
    k: 'theme',
    zh: '⑦ 主题 & 国际化',
    en: '⑦ Theme & i18n',
    zhDesc:
      '预设风格(Alpine/Quartz/Material)+明暗+强调色运行时切换；中英双语 + localeText 局部覆盖',
    enDesc:
      'Runtime presets (Alpine/Quartz/Material) + dark mode + accent; zh/en + localeText override'
  },
  {
    k: 'ai',
    zh: '⑧ AI 自然语言查询',
    en: '⑧ NLQ Search',
    zhDesc: '离线确定性 NLQ：一句话自动完成筛选/排序/分组/取前N/全局搜索（无需大模型）',
    enDesc: 'Offline deterministic NLQ: one sentence for filter/sort/group/top-N/search (no LLM)'
  }
] as const
type TabKey = (typeof TAB_DEFS)[number]['k']
const TABS = computed(() =>
  TAB_DEFS.map((d) => ({ k: d.k, label: tl(d.zh, d.en), desc: tl(d.zhDesc, d.enDesc) }))
)
const tab = ref<TabKey>('basic')
const gridH = 640
const gridRef = ref<any>()
const gdt = ref<'singleColumn' | 'multipleColumns'>('singleColumn')
// 悬停行高亮跟随开关（斑马纹之上的动态层，验证 rowHover prop 运行时切换）
const rowHoverOn = ref(true)

// ---------------- mock 基础 ----------------
// 固定种子的伪随机（mulberry32）：demo 数据必须可复现，否则「合计值 = 某数」这类断言无法跨刷新比对
let _rndSeed = 0x2f6e2b1 | 0
const rnd = () => {
  _rndSeed = (_rndSeed + 0x6d2b79f5) | 0
  let t = _rndSeed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rand = (n: number) => Math.floor(rnd() * n)
const pick = <T,>(arr: readonly T[]) => arr[rand(arr.length)]
const STATUSES = ['在库', '待检', '冻结', '缺货'] as const
const CATS = ['轴承', '电机', 'PLC', '电缆', '液压件', '紧固件', '气动件'] as const
const WAREHOUSES = ['W1主仓', 'W2北仓', 'W3临时库', '发货区'] as const
// RichSelect 大候选集（演示打字过滤 + 滚动 + 键盘导航）
const WAREHOUSE_OPTIONS = [
  ...WAREHOUSES.map((w) => ({ label: w, value: w })),
  ...Array.from({ length: 80 }, (_, i) => ({
    label: `区域仓-R${i + 1}`,
    value: `区域仓-R${i + 1}`
  }))
]
const PROVINCES = ['浙江省', '江苏省', '广东省', '山东省'] as const
const CITIES = ['杭州市', '苏州市', '深圳市', '青岛市'] as const
const DISTRICTS = ['西湖区', '工业园区', '南山区', '黄岛区'] as const
// 统一选项载体示范：网格级字典加载器。列上 dict:'province' 即由此取候选，
// 同源喂给 显示 / select 筛选 / select 编辑器 / NLQ，无需再各写 formatter / filterValueMap / editor.options。
const demoDictLoader = (key: string): RjEditorOption[] =>
  key === 'province' ? PROVINCES.map((p) => ({ label: p, value: p })) : []
// 树形载体示范：optionsLoader 返回带 subs 的原始数组；列上 options:{ref,childrenKey} 即按层级树渲染下拉（可折叠 + 搜索）
const REGION_TREE = [
  { name: '华东', id: 'east', subs: [{ name: '浙江省', id: 'zj' }, { name: '江苏省', id: 'js' }] },
  { name: '华南', id: 'south', subs: [{ name: '广东省', id: 'gd' }, { name: '山东省', id: 'sd' }] }
]
const REGION_LEAVES = ['zj', 'js', 'gd', 'sd'] as const
const demoOptionsLoader = (name: string): unknown[] => (name === 'regionTree' ? REGION_TREE : [])
let seq = 0

/** 离线图片：本地图形 SVG 转 data URI（不任意外链，零网络依赖） */
const AVATAR_HUES = [210, 12, 145, 268, 45, 92, 320]
function avatarUri(ch: string, i: number): string {
  const h = AVATAR_HUES[i % AVATAR_HUES.length]
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${h},78%,62%)"/>` +
    `<stop offset="1" stop-color="hsl(${(h + 40) % 360},72%,42%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="56" height="56" rx="12" fill="url(#g)"/>` +
    `<text x="28" y="38" font-size="26" font-family="sans-serif" fill="#fff" text-anchor="middle">${ch}</text>` +
    `</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

function makeRow(i: number): RjRowData {
  return {
    __id: ++seq,
    code: 'M-' + String(10000 + i),
    name:
      pick([
        '深沟球轴承',
        '伺服电机',
        'PLC模块',
        '动力电缆',
        '液压泵',
        '气缸',
        '六角螺栓',
        '变频器',
        '编码器'
      ]) +
      '-' +
      i,
    status: pick(STATUSES),
    warehouse: pick(WAREHOUSES),
    category: pick(CATS),
    province: pick(PROVINCES),
    region: pick(REGION_LEAVES),
    city: pick(CITIES),
    district: pick(DISTRICTS),
    price: Math.round(rnd() * 90000) / 100,
    qty: rand(500),
    rate: rnd(),
    trend: Array.from({ length: 12 }, () => rand(100)),
    bar: Array.from({ length: 8 }, () => rand(100)),
    contact: pick(['张伟', '李娜', '王强', '刘洋']) + rand(90),
    phone: '138' + String(10000000 + rand(9999999)),
    link: 'DOC-' + rand(99999),
    // 图片列样本：默认单图；%13 为必失败地址（验证 fallback），%37 为多图（验证 max 截断）
    photo:
      i % 13 === 5
        ? '/__rj_img_missing__.png'
        : i % 37 === 7
          ? [
              avatarUri('物', i),
              avatarUri('料', i + 1),
              avatarUri('图', i + 2),
              avatarUri('标', i + 3)
            ]
          : avatarUri(String(i % 10), i),
    createTime: Date.now() - rand(90) * 86400000,
    remark:
      i % 5 === 0
        ? '这是一段较长的备注文本，用于演示自动换行（wrapText）与行高保持一致的效果。'
        : '',
    __full: i % 997 === 0
  }
}

// ---------------- ① 综合 ----------------
const basicRows = ref<RjRowData[]>([])
const selCount = ref(0)
const dirtyN = ref(0)
// 列宽自适应↔还原开关态：必须在 immediate watch 之前声明，否则 setup 同步跑回调时撞 TDZ
const contentSized = ref(false)
const pinnedTop = ref<RjRowData[]>([
  {
    __pinnedDemo: true,
    code: '钉住',
    name: '顶部钉行示例：紧急预警物料',
    status: '冻结',
    price: 1286.5,
    qty: 3,
    warehouse: 'W1主仓',
    category: '电机'
  }
])

const extCols = computed<RjColumn[]>(() =>
  Array.from({ length: 42 }, (_, i) => ({
    field: 'ext' + (i + 1),
    title: tl('扩展列', 'Ext Col') + (i + 1),
    width: 100,
    type: 'num' as const,
    valueGetter: (r: any) => ((r.__id || 0) * (i + 7)) % 997
  }))
)

const basicColumns = computed<RjColumn[]>(() => [
  {
    field: 'code',
    title: tl('物料编码', 'Material Code'),
    width: 110,
    fixed: 'left',
    aggFunc: 'count',
    // 这是列头提示，不是单元格提示：误用 tooltip 会把「怎么排序」挂在每一个数据格上
    headerTooltip: tl(
      '点击列头排序；点击列头右侧 ⋮ 图标打开列菜单',
      'Click header to sort; ⋮ opens the column menu'
    )
  },
  {
    field: 'name',
    title: tl('物料名称', 'Material'),
    width: 170,
    fixed: 'left',
    summaryLabel: true
  },
  {
    field: 'photo',
    title: tl('图片', 'Image'),
    width: 120,
    type: 'image',
    filter: false,
    sortable: false,
    image: { size: 26, shape: 'rounded', max: 3 }
  },
  {
    field: 'status',
    title: tl('状态', 'Status'),
    width: 100,
    filter: 'select',
    colSpan: (r: any) => (r.__id % 37 === 0 ? 2 : 1),
    editor: { type: 'select', options: STATUSES.map((s) => ({ label: s, value: s })) }
  },
  {
    field: 'warehouse',
    title: tl('存放仓库', 'Warehouse'),
    width: 110,
    filter: 'select',
    editor: { type: 'richSelect', options: WAREHOUSE_OPTIONS },
    rowSpan: (r: any) => (r.__id % 41 === 0 && r.__id > 41 ? 2 : 1),
    allowPivot: true
  },
  {
    field: 'category',
    title: tl('物料类别', 'Category'),
    width: 100,
    filter: 'select',
    allowPivot: true,
    // 统一选项载体（静态示范）：一处声明，显示 / select 筛选 / select 编辑器 / NLQ 四同源
    options: CATS.map((c) => ({ label: c, value: c })),
    editor: { type: 'select' }
  },
  {
    field: 'region',
    title: tl('区域(树形)', 'Region(tree)'),
    width: 120,
    filter: 'select',
    // 树形载体：optionsLoader('regionTree') 返回带 subs 的原始数组，按 childrenKey 递归成树，下拉层级缩进 + 折叠 + 搜索
    options: { ref: 'regionTree', labelKey: 'name', valueKey: 'id', childrenKey: 'subs' },
    editor: { type: 'select' }
  },
  {
    title: tl('地址信息', 'Address'),
    children: [
      { field: 'province', title: tl('省份', 'Province'), width: 100, filter: 'select', dict: 'province', editor: { type: 'select' } },
      { field: 'city', title: tl('城市', 'City'), width: 100 },
      { field: 'district', title: tl('区县', 'District'), width: 100 }
    ]
  },
  {
    field: 'price',
    title: tl('单价', 'Unit Price'),
    width: 110,
    type: 'money',
    aggFunc: 'sum',
    sortable: true,
    // valueParser：允许输入 ¥1,234 或 (123) 会计负数，解析回数值
    valueParser: ({ newValue }: any) => {
      if (typeof newValue === 'number') return newValue
      const s = String(newValue ?? '').replace(/[¥,\s]/g, '')
      const neg = /^\(.*\)$/.test(s)
      const n = Number(s.replace(/[()]/g, ''))
      return isNaN(n) ? newValue : neg ? -n : n
    }
  },
  {
    field: 'qty',
    title: tl('库存数量', 'Stock Qty'),
    width: 100,
    type: 'num',
    aggFunc: 'sum',
    sortable: true,
    valueParser: ({ newValue }: any) => {
      const n = Number(String(newValue ?? '').replace(/[^0-9.-]/g, ''))
      return newValue === '' || isNaN(n) ? newValue : n
    }
  },
  { field: 'rate', title: tl('齐套率', 'Fill Rate'), width: 100, type: 'percent', aggFunc: 'avg' },
  {
    // 表达式服务示例：valueGetter 用字符串表达式（price * qty），formatter 用表达式拼接单位
    colId: 'amount',
    title: tl('金额(表达式)', 'Amount (Expr)'),
    width: 130,
    type: 'money',
    aggFunc: 'sum',
    sortable: true,
    filter: false,
    valueGetter: 'data.price * data.qty' as any,
    formatter: 'Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 })' as any
  },
  {
    field: 'trend',
    title: tl('趋势(迷你图)', 'Trend'),
    width: 120,
    filter: false,
    sortable: false,
    sparkline: { style: 'line' }
  },
  {
    field: 'bar',
    title: tl('分布(柱图)', 'Bars'),
    width: 110,
    filter: false,
    sortable: false,
    sparkline: { style: 'bar', valueField: 'bar' }
  },
  { field: 'contact', title: tl('联系人', 'Contact'), width: 100 },
  {
    field: 'phone',
    title: tl('电话', 'Phone'),
    width: 130,
    editor: {
      type: 'input',
      validator: (v: any) =>
        String(v || '').length < 7 ? tl('号码太短', 'Number too short') : null
    }
  },
  { field: 'link', title: tl('图样', 'Drawing'), width: 100, type: 'link', filter: false },
  { field: 'createTime', title: tl('创建时间', 'Created At'), width: 160, type: 'datetime' },
  {
    field: 'remark',
    title: tl('备注', 'Remark'),
    width: 220,
    wrapText: true,
    editor: { type: 'largeText', props: { rows: 4 } }
  },
  {
    // 内置操作列复现（照宿主反馈的真实配置：width 120 / fixed right / edit 带 label+icon、4 个只写 name 且重名的按钮）
    field: 'op',
    title: tl('操作', 'Actions'),
    width: 120,
    fixed: 'right',
    filter: false,
    sortable: false,
    suppressMenu: true,
    suppressExport: true,
    actions: [
      { name: 'edit', label: tl('编辑', 'Edit'), icon: '✎', onClick: (p: any) => ElMessage.success('edit ' + p.row.code) },
      { name: 'debug', label: tl('调试', 'Debug'), onClick: (p: any) => ElMessage.info('debug ' + p.row.code) },
      { name: 'copy', label: tl('复制', 'Copy'), onClick: (p: any) => ElMessage.info('copy ' + p.row.code) },
      { name: 'log', label: tl('日志', 'Log'), onClick: (p: any) => ElMessage.info('log ' + p.row.code) },
      { name: 'del', label: tl('删除', 'Delete'), danger: true, confirm: tl('确认删除该行？', 'Delete this row?'), onClick: (p: any) => ElMessage.warning('del ' + p.row.code) }
    ]
  },
  ...extCols.value
])

watch(
  tab,
  (v) => {
    // 切页后 basic 网格因 v-if 重建、内部选中清空，但 selection-change 不一定补发空数组：复位计数器防顶栏「选中 N 行」滞留旧值
    selCount.value = 0
    dirtyN.value = 0
    // 网格重建后回到默认列宽，同步复位「自适应/还原」开关态
    contentSized.value = false
    if (v === 'basic' && !basicRows.value.length)
      basicRows.value = Array.from({ length: 8000 }, (_, i) => makeRow(i))
    if (v === 'perf' && !perfRows.value.length) genPerf()
    if (v === 'ssrm' && !ssrmData.value.length) genSsrm()
    if (v === 'formula' && !formulaRows.value.length) genFormula()
  },
  { immediate: true }
)

function switchTab(k: TabKey) {
  if (k !== 'ssrm' && ssrmTimer) {
    clearInterval(ssrmTimer)
    ssrmTimer = null
    ssrmLive.value = false
  }
  tab.value = k
}

function onSelChange(rows: RjRowData[]) {
  selCount.value = rows.length
}
function onValueChanged(p: any) {
  console.log('[rj-grid] cell-value-changed', p)
  // 标脏在 emit 之后完成，异步读取脏格数刷新按钮
  setTimeout(() => {
    dirtyN.value = gridRef.value?.getDirtyCells?.().length ?? 0
  }, 0)
}
/** 保存：收集脏格→提交后端（此处日志）→清除脏标记 */
function saveDirty(api: any) {
  const cells = api?.getDirtyCells?.() || []
  if (!cells.length) return ElMessage.info(tl('没有未保存的修改', 'No unsaved changes'))
  console.log('[rj-grid] dirty cells', cells)
  ElMessage.success(
    tl(
      `已提交 ${cells.length} 处修改（示例，实际应调用后端 API）`,
      `${cells.length} change(s) committed (demo; call the backend API in real use)`
    )
  )
  api.clearDirtyCells()
  dirtyN.value = 0
}

function addRow(api: any) {
  const r = makeRow(seq + 1)
  r.name = '新物料-' + r.__id
  r.status = '待检'
  api.applyTransaction({ add: [r] })
  // 新增行刚入模，行高/偏移要等一个渲染周期才更新；不等 nextTick 直接 scrollTo 会拿旧偏移（落到顶部）
  nextTick(() => api.scrollTo(api.getDisplayedRowsCount() - 1))
}
// 列宽自适应与还原切换：首次按「内容宽（文本+图标+内边距）」自撑，再点还原到列定义/默认宽
function toggleAutoSize(api: any) {
  if (!contentSized.value) api.autoSizeAll()
  else api.resetColumnWidths()
  contentSized.value = !contentSized.value
}
function flashRandom(api: any) {
  const n = api.getDisplayedRowsCount()
  if (!n) return
  const row = basicRows.value[rand(basicRows.value.length)]
  if (!row) return
  row.qty = rand(600)
  row.price = Math.round(rnd() * 90000) / 100
  api.applyTransaction({ update: [row] })
}
function exportSelected(api: any) {
  const rows = api.getSelectedRows()
  if (!rows.length) return ElMessage.warning(tl('请先勾选行', 'Select rows first'))
  api.copySelectedToClipboard()
  ElMessage.success(
    tl(
      `已复制 ${rows.length} 行到剪贴板（TSV，可粘贴到 Excel）`,
      `${rows.length} row(s) copied to clipboard (TSV, paste into Excel)`
    )
  )
}
/**
 * 后端导出（按查询条件出全量）：组件不碰接口，只把生效列 + 查询状态 + 分页快照 + 选中 key 交进来。
 * 本页是 mock 数据，没有真实导出端点，故如实回显宿主“会拿去拼查询条件”的内容；
 * 业务页应在此处调 XxxApi.exportXxx(params.state/params.paging) 并 download.excel()。
 */
function onServerExport(params: RjServerExportParams) {
  const st = params.state || {}
  const condN =
    (st.filters?.length || 0) +
    (st.advancedFilter?.items?.length || 0) +
    (st.quickFilter ? 1 : 0) +
    Object.keys(st.floatFilters || {}).length
  ElMessage.success(
    tl(
      `后端导出(${params.type})：生效列 ${params.columns.length} · 查询条件 ${condN} 项 · 分页 ${params.paging.pageNo}/${params.paging.pageSize}（共 ${params.paging.total}）· 选中 key ${params.selectedKeys.length}`,
      `Server export (${params.type}): ${params.columns.length} columns · ${condN} conditions · page ${params.paging.pageNo}/${params.paging.pageSize} (total ${params.paging.total}) · ${params.selectedKeys.length} selected keys`
    )
  )
}
/** 把 basic 卡网格 api 挂到 window，供 E2E 直接调 getPrintHtml({scope}) 断言行源 */
function stashApi(api: any) {
  ;(window as any).__gridApi__ = api
}
/** 生成打印文档 HTML（不弹对话框）：验证多级表头/分组行/数字右对齐，挂到 window 供 E2E 断言 */
function genPrintPreview(api: any) {
  const html = api.getPrintHtml({
    title: tl('仓储物料清单', 'Warehouse Material List'),
    header: tl(
      'RJGrid 打印/PDF 预览（零依赖，浏览器可另存为 PDF）',
      'RJGrid print / PDF preview (zero dependency, save as PDF from the browser dialog)'
    ),
    footer: tl('聚欧云 · 仅供演示', 'Join Cloud · demo only'),
    pageSize: 'A4',
    orientation: 'landscape'
  })
  ;(window as any).__rjPrintHtml__ = html
  ElMessage.success(
    tl(
      `已生成打印 HTML（${html.length.toLocaleString()} 字符），点工具栏“打印/PDF”可弹出对话框`,
      `Print HTML generated (${html.length.toLocaleString()} chars); use the toolbar Print/PDF button`
    )
  )
}

/** 行 JSON 查看器已内置到组件（右键菜单自带「查看该行 JSON」+ 主题化弹层），宿主无需再实现 */

/** 声明式自定义右键菜单（与 col.actions 同风格）：icon/visible/disabled/confirm/danger/子菜单/分隔线直接声明，无需拼底层 RjMenuItem */
const demoContextMenus = computed<RjContextMenuItem[]>(() => [
  {
    name: 'copyCode',
    icon: '⧉',
    label: tl('复制物料编码', 'Copy Code'),
    visible: (c) => !!c.row?.code,
    onClick: (c) => {
      navigator.clipboard
        ?.writeText(String(c.row?.code ?? ''))
        .then(() => ElMessage.success(tl('已复制', 'Copied')))
        .catch(() => ElMessage.warning(tl('复制失败', 'Copy failed')))
    }
  },
  {
    name: 'tools',
    label: tl('更多工具', 'More Tools'),
    children: [
      {
        name: 'qtyDown',
        label: tl('库存 -10', 'Stock -10'),
        disabled: (c) => (c.row?.qty ?? 0) <= 0,
        onClick: (c) =>
          c.row &&
          c.api?.applyTransaction({
            update: [{ ...c.row, qty: Math.max(0, (c.row.qty || 0) - 10) }]
          })
      },
      { separator: true },
      {
        name: 'whoami',
        label: tl('报告行号与单元格值', 'Report Row & Cell'),
        onClick: (c) =>
          ElMessage.info(`rowIndex=${c.rowIndex} value=${c.value ?? ''}`)
      }
    ]
  },
  {
    name: 'del',
    icon: '🗑',
    label: tl('删除该行', 'Delete Row'),
    danger: true,
    visible: (c) => !!c.row,
    confirm: (c) => tl(`确认删除 ${c.row?.code ?? ''}？`, `Delete ${c.row?.code ?? ''}?`),
    onClick: (c) => c.row && c.api?.applyTransaction({ remove: [c.row] })
  }
])

// ---------------- ① 查询栏操作按钮 + 内置行编辑/新增弹窗 ----------------
// 声明式轨：重置旁出现「新增/批量修改/标记待检/删除」；禁用态按选中行实时求值
const demoActions = computed<RjQueryAction[]>(() => [
  {
    name: tl('＋ 新增', '＋ Add'),
    // 新增不依赖选中行，常驻可用；preset 预置弹窗外的默认字段，提交后走 row-form-add 补主键
    onClick: (ctx) => ctx.openRowFormAdd({ status: '待检', warehouse: 'W1主仓' })
  },
  {
    name: tl('✎ 批量修改', '✎ Batch Edit'),
    disabled: (rows) => !rows.length,
    onClick: (ctx) => ctx.openRowForm()
  },
  {
    name: tl('🚩 标记待检', '🚩 Mark Pending'),
    disabled: (rows) => !rows.length,
    // 不经弹窗的宿主自主批量：直接改行 + 事务刷新（与弹窗内部同一口径）
    onClick: (ctx) => {
      ctx.rows.forEach((r: any) => (r.status = '待检'))
      ctx.api.applyTransaction({ update: ctx.rows.slice() })
      ElMessage.success(tl(`已标记 ${ctx.rows.length} 行待检`, `Marked ${ctx.rows.length} row(s) pending`))
    }
  },
  {
    name: tl('🗑 删除', '🗑 Delete'),
    danger: true,
    disabled: (rows) => !rows.length,
    // confirm 走内置确认框，确认后才执行 onClick
    confirm: (rows) =>
      tl(`确定删除选中的 ${rows.length} 行？`, `Delete ${rows.length} selected row(s)?`),
    onClick: (ctx) => {
      ctx.api.applyTransaction({ remove: ctx.rows.slice() })
      ctx.api.clearSelection()
    }
  }
])
// 表单准入钩子：批量修改只收这 5 个业务字段（缺省规则仅收录声明了 editor/editable 的列）
const demoFormCols = (c: RjColumn) =>
  ['status', 'warehouse', 'category', 'price', 'qty'].includes(c.field || '')
// 新增准入：除上述字段外放行编码/名称（新对象没有主键数据填不进库）
const demoAddCols = (c: RjColumn) =>
  ['code', 'name', 'status', 'warehouse', 'category', 'price', 'qty'].includes(c.field || '')
// 新增提交后的宿主持久化钩子（组件已 add 事务插入并闪烁，这里补主键/接后端）
function onRowFormAdd(p: { row: RjRowData; changes: Record<string, any> }) {
  const r = p.row as any
  if (r.__id == null) r.__id = ++seq
  if (!r.code) r.code = 'M-' + String(10000 + r.__id)
  console.log('[rj-grid] row-form-add', p)
}
// 弹窗提交后的宿主持久化钩子（组件已本地回填，这里只演示接后端）
function onRowFormSubmit(p: {
  rows: RjRowData[]
  changes: Record<string, any>
  mode: 'edit' | 'add'
}) {
  console.log('[rj-grid] row-form-submit', p)
  ElMessage.success(
    p.mode === 'add'
      ? tl('已新增 1 行（实际应调后端保存）', 'Added 1 row (call the backend here)')
      : tl(
          `已批量修改 ${p.rows.length} 行的 ${Object.keys(p.changes).length} 个字段（实际应调后端保存）`,
          `Batch-updated ${p.rows.length} row(s) on ${Object.keys(p.changes).length} field(s) (call the backend here)`
        )
  )
}

// ---------------- ② 性能 ----------------
const perfRows = ref<RjRowData[]>([])
const perfTime = ref(0)
const perfColumns = computed<RjColumn[]>(() => [
  { field: 'id', title: 'ID', width: 80, type: 'num' },
  { field: 'code', title: tl('编码', 'Code'), width: 120 },
  { field: 'name', title: tl('名称', 'Name'), width: 180 },
  { field: 'cat', title: tl('类别', 'Category'), width: 110, filter: 'select' },
  { field: 'wh', title: tl('仓库', 'Warehouse'), width: 110, filter: 'select' },
  ...Array.from({ length: 7 }, (_, i) => ({
    field: 'v' + i,
    title: tl('数值', 'Val') + i,
    width: 100,
    type: 'num' as const,
    aggFunc: 'sum' as const
  }))
])
function genPerf() {
  const t0 = performance.now()
  const rows: RjRowData[] = new Array(100000)
  for (let i = 0; i < 100000; i++) {
    rows[i] = {
      __id: i + 1,
      id: i + 1,
      code: 'P-' + i,
      name: '物料名称-' + (i % 997),
      cat: CATS[i % CATS.length],
      wh: WAREHOUSES[i % WAREHOUSES.length],
      v0: rand(100000) / 100,
      v1: rand(1000),
      v2: rand(1000),
      v3: rand(1000),
      v4: rand(1000),
      v5: rand(1000),
      v6: rand(1000)
    }
  }
  perfRows.value = rows
  perfTime.value = Math.round(performance.now() - t0)
}

// ---------------- ③ 树形 / 分组 / 透视 ----------------
const treeViews = ['tree', 'group'] as const
const treeView = ref<(typeof treeViews)[number]>('tree')
const treeRows = ref<RjRowData[]>(
  WAREHOUSES.flatMap((w, wi) => [
    {
      code: 'W' + (wi + 1),
      name: w,
      kind: '仓库',
      qty: 0,
      amount: 0,
      rate: 0.8 + wi * 0.04,
      updateTime: Date.now() - wi * 86400000,
      children: Array.from({ length: 4 }, (_, ai) => ({
        code: `W${wi + 1}-A${ai + 1}`,
        name: `${w}-存储区${ai + 1}`,
        kind: '库区',
        qty: rand(2000),
        amount: rand(5000000) / 100,
        rate: rnd(),
        updateTime: Date.now() - rand(30) * 86400000,
        children: Array.from({ length: 5 }, (_, si) => ({
          code: `W${wi + 1}-A${ai + 1}-S${si + 1}`,
          name: `货架${String.fromCharCode(65 + si)}`,
          kind: '货架',
          qty: rand(400),
          amount: rand(900000) / 100,
          rate: rnd(),
          updateTime: Date.now() - rand(15) * 86400000,
          children: Array.from({ length: 3 }, (_, mi) => ({
            code: `W${wi + 1}-A${ai + 1}-S${si + 1}-${mi + 1}`,
            name: pick(['轴承', '电机', '电缆', 'PLC', '螺栓']) + '批次' + mi,
            kind: '物料',
            qty: rand(120),
            amount: rand(80000) / 100,
            rate: rnd(),
            updateTime: Date.now() - rand(7) * 86400000
          }))
        }))
      }))
    }
  ])
)
// 分组视图：把嵌套 children 拍平为一维行（同数据、去掉层级），供 RowGroup 按类型聚合展示
const treeFlatRows = computed<RjRowData[]>(() => {
  const out: RjRowData[] = []
  const walk = (list: RjRowData[]) => {
    for (const r of list) {
      const { children, ...rest } = r as any
      out.push(rest)
      if (Array.isArray(children)) walk(children)
    }
  }
  walk(treeRows.value)
  return out
})
const treeColumns = computed<RjColumn[]>(() => [
  {
    field: 'name',
    title: treeView.value === 'tree' ? tl('名称（树形展开）', 'Name (tree)') : tl('名称', 'Name'),
    width: 260,
    fixed: 'left'
  },
  { field: 'code', title: tl('编码', 'Code'), width: 170 },
  {
    field: 'kind',
    title: tl('类型', 'Type'),
    width: 90,
    filter: 'select',
    allowPivot: true,
    rowGroup: true,
    // 分组视图下预置按「类型」聚合，切换即所见（树形会遮蔽分组，故此视图已关 treeData）
    initialRowGroup: treeView.value === 'group'
  },
  { field: 'qty', title: tl('数量', 'Qty'), width: 110, type: 'num', aggFunc: 'sum' },
  { field: 'amount', title: tl('金额', 'Amount'), width: 130, type: 'money', aggFunc: 'sum' },
  {
    field: 'rate',
    title: tl('水位率', 'Water Level'),
    width: 110,
    type: 'percent',
    aggFunc: 'avg'
  },
  { field: 'updateTime', title: tl('更新时间', 'Updated At'), width: 160, type: 'datetime' }
])

// ---------------- ④ 服务端模式 ----------------
const serverModes = ['pagination', 'infinite'] as const
const serverMode = ref<'pagination' | 'infinite'>('pagination')
const serverData = Array.from({ length: 2357 }, (_, i) => makeRow(i))
const serverColumns = computed<RjColumn[]>(() => [
  { field: 'code', title: tl('物料编码', 'Material Code'), width: 110 },
  { field: 'name', title: tl('物料名称', 'Material'), width: 170 },
  { field: 'status', title: tl('状态', 'Status'), width: 100, filter: 'select' },
  {
    field: 'warehouse',
    title: tl('仓库', 'Warehouse'),
    width: 110,
    filter: 'select',
    rowGroup: true
  },
  { field: 'price', title: tl('单价', 'Unit Price'), width: 110, type: 'money', aggFunc: 'avg' },
  { field: 'qty', title: tl('数量', 'Qty'), width: 100, type: 'num', aggFunc: 'sum' },
  { field: 'createTime', title: tl('创建时间', 'Created At'), width: 160, type: 'datetime' }
])

function condMatch(op: string, v: any, c: any): boolean {
  const n = Number(v)
  const c1 = c.value1
  switch (op) {
    case 'contains':
      return String(v ?? '')
        .toLowerCase()
        .includes(String(c1 ?? '').toLowerCase())
    case 'ne':
      return String(v ?? '') !== String(c1 ?? '')
    case 'eq':
      return String(v ?? '') === String(c1 ?? '')
    case 'startsWith':
      return String(v ?? '').startsWith(String(c1 ?? ''))
    case 'endsWith':
      return String(v ?? '').endsWith(String(c1 ?? ''))
    case 'blank':
      return v == null || v === ''
    case 'notBlank':
      return v != null && v !== ''
    case 'gt':
      return n > Number(c1)
    case 'gte':
      return n >= Number(c1)
    case 'lt':
      return n < Number(c1)
    case 'lte':
      return n <= Number(c1)
    case 'inRange':
      return n >= Number(c1) && n <= Number(c.value2)
    case 'in':
      return (c1 as any[])?.includes?.(v) ?? false
    case 'notIn':
      return !(c1 as any[])?.includes?.(v)
    default:
      return true
  }
}

async function loadDataMock(p: RjLoadServerParams) {
  await new Promise((r) => setTimeout(r, 320)) // 模拟网络
  let rows = serverData
  if (p.quickFilterText) {
    const q = p.quickFilterText.toLowerCase()
    rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }
  for (const f of p.filters || []) {
    const model: any = f.model
    const cs: any[] = model.conditions || []
    if (!cs.length) continue
    rows = rows.filter((r) => {
      const v = (r as any)[f.field]
      return model.operator === 'and'
        ? cs.every((c) => condMatch(c.op, v, c))
        : cs.some((c) => condMatch(c.op, v, c))
    })
  }
  for (const s of (p.sort || []).slice().reverse()) {
    rows = rows.slice().sort((a: any, b: any) => {
      const va = a[s.field]
      const vb = b[s.field]
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va ?? '').localeCompare(String(vb ?? ''), 'zh')
      return s.dir === 'asc' ? cmp : -cmp
    })
  }
  // 浮动筛选行下推
  for (const ff of p.floatFilters || []) {
    const col = serverColumns.value.find((c) => c.field === ff.colId)
    rows = rows.filter((r: any) => floatMatch(ff.value, r[ff.colId], col?.type))
  }
  const start = p.start ?? (p.page - 1) * p.pageSize
  // 服务端权威分组：首屏只给本级组行，子行由引擎发 type:'group' 懒取（可折叠/可下钻）
  if (p.rowGroup && p.rowGroup.length) {
    if (p.type === 'group' && p.group) {
      const vals = (p.group.path || []) as any[]
      const kids = groupChildren(rows, p.rowGroup, vals)
      const page = kids.slice(start, start + p.pageSize)
      // 末层组（子项全是数据行）补一条组页脚小计，用来验证页脚 key 不撞 + 折叠连小计一起收
      const list =
        vals.length >= p.rowGroup.length && kids.length
          ? page.concat([groupFooterRow(kids, p.rowGroup, vals)])
          : page
      return { list, total: kids.length }
    }
    const heads = groupHeadersAt(rows, p.rowGroup, 0, '')
    return { list: heads.slice(start, start + p.pageSize), total: heads.length }
  }
  return { list: rows.slice(start, start + p.pageSize), total: rows.length }
}

// ---------------- ⑤ SSRM 服务端行模型（块缓存 + Delta） ----------------
const ssrmApi = ref<any>()
const ssrmLive = ref(false)
let ssrmTimer: ReturnType<typeof setInterval> | null = null
let ssrmAddSeq = 0
const ssrmData = ref<RjRowData[]>([])

function makeSsrmRow(i: number): RjRowData {
  return {
    __id: i + 1,
    code: 'S-' + String(200000 + i),
    name: pick(['深沟球轴承', '伺服电机', 'PLC模块', '动力电缆', '液压泵', '气缸']) + '-' + i,
    status: pick(STATUSES),
    warehouse: pick(WAREHOUSES),
    price: Math.round(rnd() * 90000) / 100,
    qty: rand(500),
    createTime: Date.now() - rand(90) * 86400000
  }
}
function genSsrm() {
  ssrmData.value = Array.from({ length: 50000 }, (_, i) => makeSsrmRow(i))
}

async function loadSsrmMock(p: RjLoadServerParams) {
  await new Promise((r) => setTimeout(r, 220)) // 模拟网络延迟
  const start = p.start ?? (p.page - 1) * p.pageSize
  const groups = p.rowGroup || []
  // 服务端权威分组：块内装的是「本级组行」，展开走 type:'group' 子块
  if (groups.length) {
    if (p.type === 'group' && p.group) {
      const vals = (p.group.path || []) as any[]
      const kids = groupChildren(ssrmData.value, groups, vals)
      const page = kids.slice(start, start + p.pageSize)
      const list =
        vals.length >= groups.length && kids.length
          ? page.concat([groupFooterRow(kids, groups, vals)])
          : page
      return { rows: list, total: kids.length, success: true }
    }
    const heads = groupHeadersAt(ssrmData.value, groups, 0, '')
    const end = Math.min(start + p.pageSize, heads.length)
    return { rows: heads.slice(start, end), total: heads.length, success: true }
  }
  const end = Math.min(start + p.pageSize, ssrmData.value.length)
  const rows = ssrmData.value.slice(start, end)
  // 服务端权威：按块返回连续区间，由引擎写入对应槽位
  return { rows, total: ssrmData.value.length, success: true }
}

/** 从当前可见行中改值，走异步批量事务（Delta + 闪烁） */
function ssrmPushUpdates(api: any) {
  // 仅在虚拟可见区间取样，保证闪烁落在屏内（而非 5 万行全域随机）
  const vr = api.getVisibleRange
    ? api.getVisibleRange()
    : { start: 0, end: api.getDisplayedRowsCount() }
  const lo = vr.start
  const hi = Math.max(vr.start, vr.end - 1)
  if (hi < lo) return
  const seen = new Set<RjRowData>()
  for (let tries = 0; tries < 20 && seen.size < 6; tries++) {
    const r = api.getDisplayedRowAtIndex(lo + rand(hi - lo + 1))
    if (r && !(r as any).__ssrmLoading) {
      r.qty = rand(800)
      r.price = Math.round(rnd() * 90000) / 100
      seen.add(r)
    }
  }
  if (seen.size) api.applyTransactionAsync({ update: Array.from(seen) })
}
function ssrmFlashOne(api: any) {
  ssrmPushUpdates(api)
}
function ssrmToggleLive(api: any) {
  if (ssrmTimer) {
    clearInterval(ssrmTimer)
    ssrmTimer = null
    ssrmLive.value = false
    return
  }
  ssrmLive.value = true
  const a = api || ssrmApi.value
  ssrmTimer = setInterval(() => {
    if (a) ssrmPushUpdates(a)
  }, 1200)
}
function ssrmAdd(api: any) {
  const r: RjRowData = {
    __id: 900000 + ++ssrmAddSeq,
    code: 'NEW-' + ssrmAddSeq,
    name: '新增物料-' + ssrmAddSeq,
    status: '待检',
    warehouse: pick(WAREHOUSES),
    price: Math.round(rnd() * 90000) / 100,
    qty: rand(500),
    createTime: Date.now()
  }
  ssrmData.value.push(r) // 与“服务端”保持权威一致
  api.applyTransactionAsync({ add: [r] })
}
function ssrmRemove(api: any) {
  const r = api.getDisplayedRowAtIndex(0)
  if (r && !(r as any).__ssrmLoading) {
    api.applyTransactionAsync({ remove: [r] })
    const i = ssrmData.value.indexOf(r)
    if (i >= 0) ssrmData.value.splice(i, 1)
  }
}

// ---------------- ⑦ 公式引擎 ----------------
const formulaApi = ref<any>()
const formulaRows = ref<RjRowData[]>([])
const loopOn = ref(false)
const formulaColumns = computed<RjColumn[]>(() => [
  { field: 'name', title: tl('物料', 'Material'), width: 140 },
  { field: 'qty', title: tl('数量', 'Qty'), type: 'num', width: 90, editable: true },
  { field: 'price', title: tl('单价', 'Price'), type: 'num', width: 100, editable: true },
  {
    field: 'amount',
    title: tl('金额', 'Amount'),
    type: 'num',
    width: 120,
    editable: true,
    formula: '=qty*price'
  },
  {
    field: 'tax',
    title: tl('税额(13%)', 'Tax (13%)'),
    type: 'num',
    width: 110,
    formula: '=ROUND(amount*0.13,2)'
  },
  {
    field: 'net',
    title: tl('价税合计', 'Gross'),
    type: 'num',
    width: 120,
    formula: '=ROUND(amount+tax,2)'
  },
  {
    field: 'share',
    title: tl('金额占比%', 'Share %'),
    type: 'num',
    width: 110,
    formula: '=ROUND(100*amount/SUM(amount:amount),2)'
  },
  { field: 'loopA', title: tl('循环A', 'Loop A'), type: 'num', width: 100, formula: '=loopB' },
  // loopB 公式由 loopOn 驱动：循环注入/解除只需切 loopOn，列定义自动重算
  {
    field: 'loopB',
    title: tl('循环B', 'Loop B'),
    type: 'num',
    width: 100,
    formula: loopOn.value ? '=loopA' : '=qty'
  }
])
function genFormula() {
  formulaRows.value = Array.from({ length: 40 }, (_, i) => ({
    __id: 500000 + i,
    name: pick(['深沟球轴承', '伺服电机', 'PLC模块', '动力电缆', '液压泵', '气缸']) + '-' + (i + 1),
    qty: 1 + rand(50),
    price: Math.round((10 + rnd() * 900) * 100) / 100
  }))
}
function toggleLoop() {
  // 循环公式写在 computed 里，切开关即重建列定义（无需手动回写 ref）
  loopOn.value = !loopOn.value
  nextTick(() => formulaApi.value?.recalculate?.())
}
function formulaAddRow(api: any) {
  const i = formulaRows.value.length
  const r: RjRowData = {
    __id: 510000 + i,
    name: '新物料-' + (i + 1),
    qty: 1 + rand(50),
    price: Math.round((10 + rnd() * 900) * 100) / 100
  }
  formulaRows.value.push(r)
  api.applyTransaction({ add: [r] })
  api.scrollTo(api.getDisplayedRowsCount() - 1)
}
function showCircular(api: any) {
  ;(window as any).__rjFormulaApi__ = api
  const refs: { row: number; colId: string }[] = api.getCircularRefs?.() || []
  if (!refs.length) return ElMessage.info(tl('当前无循环引用', 'No circular references'))
  console.log('[rj-grid] circular refs', refs)
  ElMessage.warning(
    tl(
      `检测到 ${refs.length} 个循环引用单元格（${[...new Set(refs.map((r) => r.colId))].join('/')}）`,
      `${refs.length} circular cell(s) detected in ${[...new Set(refs.map((r) => r.colId))].join('/')}`
    )
  )
}

// ---------------- ⑧ 主题 & 国际化 ----------------
const PRESET_LIST = ['legacy', 'alpine', 'quartz', 'material'] as const
const ACCENTS = ['#e91e63', '#3f51b5', '#009688', '#ff9800'] as const
const themeApi = ref<any>()
const demoPreset = ref<(typeof PRESET_LIST)[number]>('legacy')
const demoDark = ref(false)
const demoAccent = ref('')
const demoLocaleOn = ref(false)
/** 明暗切换：以表格真实主题为准（工具栏 ☀ 与 API setTheme 都会改写它），避免两个入口状态漂移 */
function demoToggleDark() {
  const api = themeApi.value
  const cur = api?.getTheme?.()?.mode
  const next = cur === 'dark' || (!cur && !demoDark.value) ? 'light' : 'dark'
  demoDark.value = next === 'dark'
  api?.setTheme?.({ ...themeCfg.value, mode: next })
}
const themeCfg = computed(() => ({
  preset: demoPreset.value,
  mode: demoDark.value ? ('dark' as const) : ('light' as const),
  accentColor: demoAccent.value || undefined
}))
const demoLocaleText = computed<Record<string, string> | undefined>(() =>
  demoLocaleOn.value
    ? demoLang.value === 'en'
      ? {
          printBtn: '🖨 Print★',
          panel: '⚙ Panel★',
          empty: '😶 nothing here (localeText override)'
        }
      : { printBtn: '🖨 打印一下★', panel: '⚙ 面板★', empty: '😶 空空如也（localeText 覆盖）' }
    : undefined
)
function setAccent(c: string) {
  demoAccent.value = demoAccent.value === c ? '' : c
}
const themeColumns = computed<RjColumn[]>(() => [
  { field: 'code', title: tl('编码', 'Code'), width: 120 },
  { field: 'name', title: tl('品名', 'Product'), width: 160 },
  { field: 'cat', title: tl('类别', 'Category'), width: 110, filter: 'select' },
  { field: 'qty', title: tl('数量', 'Qty'), type: 'num', width: 90, editable: true },
  { field: 'price', title: tl('单价', 'Price'), type: 'num', width: 100 },
  { field: 'status', title: tl('状态', 'Status'), width: 100, filter: 'select' }
])
const themeRows = ref<RjRowData[]>(
  Array.from({ length: 24 }, (_, i) => ({
    __id: 600000 + i,
    code: 'M' + (1000 + i),
    name: pick(['深沟球轴承', '伺服电机', 'PLC模块', '动力电缆', '液压泵', '气缸']) + '-' + (i + 1),
    cat: pick([...CATS]),
    qty: 1 + rand(80),
    price: Math.round((10 + rnd() * 500) * 100) / 100,
    status: pick([...STATUSES])
  }))
)

onBeforeUnmount(() => {
  if (ssrmTimer) {
    clearInterval(ssrmTimer)
    ssrmTimer = null
  }
})

// ---------------- ⑧ AI 自然语言查询 ----------------
const aiApi = ref<any>()
const aiQuery = ref('')
const aiExplain = ref('')
/** 示例查询：中文走中文词典，英文走英文关键词（引擎双语，无需联网） */
const AI_SAMPLES = computed(() =>
  demoLang.value === 'en'
    ? [
        'qty > 50',
        'stock qty greater than 50 sort by unit price desc',
        'status = 在库 sort by price desc',
        'cat contains PLC or cat contains 电机',
        'price 100 to 300',
        'name contains 轴承',
        'group by cat, qty > 20',
        'top 10'
      ]
    : [
        '数量大于50',
        '状态为在库 按单价降序',
        '类别包含轴承 或 类别包含电机',
        '单价 100 到 300',
        '品名包含电机',
        '按类别分组 数量大于20',
        '数量小于10 且 状态不为在库'
      ]
)
function showAi(r?: any) {
  if (!r) return
  // r.message 是内部 key（'empty' | 'unrecognized'），不能直拼给用户看，需转成人话
  aiExplain.value = r.ok
    ? explainNLQ(r, demoLang.value)
    : r.message === 'empty'
      ? tl('请输入查询内容', 'Enter a query')
      : tl(
          '无法识别，请换个说法（如「数量大于100」）',
          'Not understood, try e.g. "qty greater than 100"'
        )
}
function runAiQuery(api: any) {
  showAi(api.applyQuery?.(aiQuery.value))
}
function parseOnlyAi(api: any) {
  showAi(api.parseQuery?.(aiQuery.value))
}
function resetAi(api: any) {
  aiQuery.value = ''
  aiExplain.value = ''
  api.clearAllFilters?.()
  api.setSort?.([])
  api.setRowGroup?.([])
  api.setRowLimit?.(0)
}
const aiColumns = computed<RjColumn[]>(() => [
  { field: 'code', title: tl('编码', 'Code'), width: 110 },
  { field: 'name', title: tl('品名', 'Product'), width: 170 },
  { field: 'cat', title: tl('类别', 'Category'), width: 110, filter: 'select' },
  { field: 'qty', title: tl('数量', 'Qty'), type: 'num', width: 90 },
  { field: 'price', title: tl('单价', 'Price'), type: 'num', width: 100 },
  { field: 'status', title: tl('状态', 'Status'), width: 100, filter: 'select' },
  { field: 'wh', title: tl('仓库', 'Warehouse'), width: 120 }
])
const aiRows = ref<RjRowData[]>(
  Array.from({ length: 60 }, (_, i) => ({
    __id: 700000 + i,
    code: 'A' + (2000 + i),
    name: pick(['深沟球轴承', '伺服电机', 'PLC模块', '动力电缆', '液压泵', '气缸']) + '-' + (i + 1),
    cat: pick([...CATS]),
    qty: 1 + rand(120),
    price: Math.round((10 + rnd() * 500) * 100) / 100,
    status: pick([...STATUSES]),
    wh: pick(['中心仓', '华东仓', '华南仓', '西南仓'])
  }))
)

function floatMatch(raw: string, v: any, type?: string): boolean {
  const s = (raw || '').trim()
  if (!s) return true
  if (type === 'number' || typeof v === 'number') {
    const n = Number(v)
    if (isNaN(n)) return false
    let m = s.match(/^(>=|<=|>|<|=)?\s*(-?[\d.]+)$/) // 比较符
    if (m) {
      const [, op = '=', a] = m
      const x = Number(a)
      return op === '>='
        ? n >= x
        : op === '<='
          ? n <= x
          : op === '>'
            ? n > x
            : op === '<'
              ? n < x
              : n === x
    }
    m = s.match(/^(-?[\d.]+)\s*[~\.\-]{1,2}\s*(-?[\d.]+)$/) // 区间
    if (m) return n >= Number(m[1]) && n <= Number(m[2])
    return String(n).includes(s)
  }
  return String(v ?? '')
    .toLowerCase()
    .includes(s.toLowerCase())
}

function runAggMock(fn: string | undefined, vals: any[]): any {
  const nums = vals.filter((v) => typeof v === 'number' && !isNaN(v))
  const sum = nums.reduce((a, b) => a + b, 0)
  switch (fn) {
    case 'sum':
      return sum
    case 'avg':
      return nums.length ? sum / nums.length : 0
    case 'min':
      return nums.length ? Math.min(...nums) : ''
    case 'max':
      return nums.length ? Math.max(...nums) : ''
    case 'count':
      return vals.length
    default:
      return ''
  }
}

/** 组 path 格式与引擎约定一致：`|level|value` 逐层拼接，值同引擎一样转义（引擎优先采用后端给的 __path） */
function pathOfValues(values: any[]): string {
  let p = ''
  values.forEach((v, i) => {
    p = `${p}|${i}|${encodeURIComponent(String(v ?? ''))}`
  })
  return p
}

/**
 * 产出「本级组行」（子行不内联，由引擎发 type:'group' 懒取）：
 * 带齐 __group/__level/__path/__groupField/__groupValue/__groupLabels/__count/__agg
 */
function groupHeadersAt(
  rows: any[],
  groups: { field: string; aggFunc?: string }[],
  level: number,
  pathBase: string,
  labels: any[] = []
): any[] {
  const gf = groups[level]
  if (!gf) return rows.slice()
  const buckets = new Map<string, any[]>()
  rows.forEach((r) => {
    const key = String(r[gf.field] ?? '')
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(r)
  })
  return Array.from(buckets.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'zh'))
    .map(([value, bucket]) => {
      const path = `${pathBase}|${level}|${encodeURIComponent(String(value ?? ''))}`
      const header: any = {
        __id: 'grp' + path,
        __group: true,
        __level: level,
        __path: path,
        __groupField: gf.field,
        __groupValue: value,
        __groupLabels: labels.concat([value]),
        __count: bucket.length
      }
      serverColumns.value.forEach((c) => {
        if (c.field && !(c.field in header)) header[c.field] = ''
      })
      header[gf.field] = value
      const agg: Record<string, any> = {}
      serverColumns.value.forEach((c) => {
        if (c.aggFunc)
          agg[c.field!] = runAggMock(
            c.aggFunc as string,
            bucket.map((r) => r[c.field!])
          )
      })
      header.__agg = agg
      return header
    })
}

/** 按组值路径定位桶内数据行：还有下一层则给下一层组行，末层直接给数据行 */
function groupChildren(
  data: any[],
  groups: { field: string; aggFunc?: string }[],
  values: any[]
): any[] {
  let rows = data
  values.forEach((v, i) => {
    const gf = groups[i]
    if (gf) rows = rows.filter((r) => String(r[gf.field] ?? '') === String(v))
  })
  const level = values.length
  if (level >= groups.length) return rows.slice()
  return groupHeadersAt(rows, groups, level, pathOfValues(values.slice(0, level)), values.slice())
}

/** isServerSideGroup：只有带子行的组行才出展开三角 */
function ssrmGroupExpandable(row: any) {
  return !!row?.__group && (row.__count ?? 0) > 0
}

/**
 * 组页脚行（小计）：与所属组同层同值（因而同 path），靠 __footer 区分。
 * 引擎给页脚 key 加 :footer 后缀，折叠该组时小计一起收起（与客户端分组口径一致）。
 */
function groupFooterRow(
  rows: any[],
  groups: { field: string; aggFunc?: string }[],
  values: any[]
): any {
  const level = values.length - 1
  const gf = groups[level]
  const footer: any = {
    __group: true,
    __footer: true,
    __level: level,
    __path: pathOfValues(values),
    __groupField: gf?.field,
    __groupValue: values[level],
    __groupLabels: values.slice(),
    __count: rows.length
  }
  serverColumns.value.forEach((c) => {
    if (c.field && !(c.field in footer)) footer[c.field] = ''
  })
  const agg: Record<string, any> = {}
  serverColumns.value.forEach((c) => {
    if (c.aggFunc)
      agg[c.field!] = runAggMock(
        c.aggFunc as string,
        rows.map((r) => r[c.field!])
      )
  })
  footer.__agg = agg
  return footer
}
</script>

<style lang="scss">
/* 非 scoped：rj-grid 单元格内容经 v-html 渲染，需要全局类 */
.rj-test-page {
  padding: 12px;

  .rj-test-tabs {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .rj-test-tab {
    padding: 6px 14px;
    border: 1px solid var(--el-border-color, #dcdfe6);
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
    &.is-active {
      color: #fff;
      background: var(--rj-primary, #3b76f6);
      border-color: var(--rj-primary, #3b76f6);
    }
  }
  .rj-test-desc {
    font-size: 12px;
    color: #909399;
  }
  .rj-test-sel {
    font-size: 12px;
    color: var(--rj-primary, #3b76f6);
    margin-left: 8px;
  }
  /* 右上角全局语言切换：与 tab 栏同族，靠右对齐 */
  .rj-test-lang {
    margin-left: auto;
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .rj-test-tag {
    display: inline-block;
    padding: 0 8px;
    border-radius: 10px;
    font-size: 12px;
    line-height: 20px;
    color: #fff;
    background: #909399;
    &.st-在库 {
      background: #13a667;
    }
    &.st-待检 {
      background: #e6a23c;
    }
    &.st-冻结 {
      background: #909399;
    }
    &.st-缺货 {
      background: #e54d42;
    }
  }
  .rj-low-qty {
    // 不写死浅色底：用主题变量混色，暗色主题下行背景自动跟深，字色不会被浅色盖掉
    background: color-mix(in srgb, var(--rj-danger, #e54d42) 14%, var(--rj-bg)) !important;
  }
  .rj-ai-input {
    flex: 1;
    min-width: 260px;
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--rj-border, #dcdfe6);
    border-radius: 4px;
    font-size: 13px;
    color: var(--rj-text, #303133);
    background: var(--rj-bg, #fff);
    &:focus {
      outline: none;
      border-color: var(--rj-primary, #3b76f6);
    }
  }
  .rj-btn.is-sample {
    font-size: 12px;
    opacity: 0.85;
    border-style: dashed;
  }
  .rj-ai-explain {
    font-size: 12px;
    color: #13a667;
    margin-left: 8px;
  }
}
</style>
