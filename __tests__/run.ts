// rj-grid 单元测试入口：新增 spec 时在此 import 即可
import './shims' // 必须最先：为 node 注入 auto-import 的 Vue 组合式 API 全局
import { run } from './harness'
import './utils.spec'
import './columnState.spec'
import './editHistory.spec'
import './expression.spec'
import './filtering.spec'
import './query.spec'
import './rowForm.spec'
import './icons.spec'
import './ssrm.spec'
import './serverGroups.spec'
import './grouping.spec'
import './rowDrag.spec'
import './print.spec'
import './formula.spec'
import './theme.spec'
import './locale.spec'
import './locale-keys.spec'
import './nlq.spec'
import './pivot.spec'
import './optionsSource.spec'
import './cellActions.spec'
import './contextMenus.spec'
import './rowJson.spec'

run().then((fail) => {
  process.exitCode = fail ? 1 : 0
})
