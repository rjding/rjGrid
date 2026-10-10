// rj-grid 零依赖单元测试 harness（配合 esbuild→node 运行，见 package.json 的 test:rj）
// 提供 describe/it/expect 极简实现，收集断言失败并在末尾汇总退出码。

type Fn = () => void | Promise<void>

interface Suite {
  name: string
  tests: { name: string; fn: Fn }[]
}

const suites: Suite[] = []
let current: Suite | null = null

export function describe(name: string, fn: () => void) {
  current = { name, tests: [] }
  suites.push(current)
  fn()
  current = null
}

export function it(name: string, fn: Fn) {
  if (!current) {
    current = { name: '(top)', tests: [] }
    suites.push(current)
  }
  current.tests.push({ name, fn })
}

class AssertionError extends Error {}

function fmt(v: any): string {
  try {
    return typeof v === 'string' ? JSON.stringify(v) : (JSON.stringify(v) ?? String(v))
  } catch {
    return String(v)
  }
}

export function expect(actual: any) {
  return {
    toBe(expected: any, msg?: string) {
      if (!Object.is(actual, expected))
        throw new AssertionError(`${msg || 'toBe'}: expected ${fmt(expected)}, got ${fmt(actual)}`)
    },
    toEqual(expected: any, msg?: string) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) throw new AssertionError(`${msg || 'toEqual'}: expected ${b}, got ${a}`)
    },
    toBeCloseTo(expected: number, digits = 6, msg?: string) {
      const ok = Math.abs(actual - expected) < Math.pow(10, -digits) / 2
      if (!ok)
        throw new AssertionError(`${msg || 'toBeCloseTo'}: expected ~${expected}, got ${actual}`)
    },
    toBeTruthy(msg?: string) {
      if (!actual)
        throw new AssertionError(`${msg || 'toBeTruthy'}: expected truthy, got ${fmt(actual)}`)
    },
    toBeFalsy(msg?: string) {
      if (actual)
        throw new AssertionError(`${msg || 'toBeFalsy'}: expected falsy, got ${fmt(actual)}`)
    },
    toThrow(msg?: string) {
      let threw = false
      try {
        ;(actual as Fn)()
      } catch {
        threw = true
      }
      if (!threw) throw new AssertionError(`${msg || 'toThrow'}: expected function to throw`)
    }
  }
}

/** 执行全部用例并打印结果；返回失败数 */
export async function run(): Promise<number> {
  let pass = 0
  let fail = 0
  const failures: string[] = []
  for (const s of suites) {
    console.log(`\n\u25b8 ${s.name}`)
    for (const t of s.tests) {
      try {
        await t.fn()
        pass++
        console.log(`  \u2713 ${t.name}`)
      } catch (e: any) {
        fail++
        const line = `  \u2717 ${s.name} > ${t.name}\n     ${e?.message || e}`
        failures.push(line)
        console.log(line)
      }
    }
  }
  console.log(`\n========================================`)
  console.log(`  rj-grid tests: ${pass} passed, ${fail} failed`)
  console.log(`========================================`)
  if (fail) console.log(failures.join('\n'))
  return fail
}
