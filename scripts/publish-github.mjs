#!/usr/bin/env node
/**
 * publish-github.mjs
 * -------------------
 * Assemble an English-only, GitHub-ready copy of this repository into ./github-dist
 * and (optionally) push it to a git remote named `github`.
 *
 * The source repo stays bilingual and Chinese-default (Gitee publishes as-is):
 *   README.md                 (Chinese)         README_EN.md          (English)
 *   docs/RjGrid使用手册.md     (Chinese manual)  docs/RjGrid_Manual_EN.md (English manual)
 *
 * This script produces the GitHub tree by:
 *   1. copying the whole tree (minus ignored/volatile dirs),
 *   2. promoting the English docs to the default filenames and dropping the Chinese
 *      manual + the internal Chinese notes,
 *   3. repointing the two cross-language "中文" links to Gitee (the Chinese home),
 *   4. defaulting the playground UI to English (business sample data stays Chinese),
 *   5. flipping package.json repo/home/bugs URLs to GitHub.
 *
 * Usage:
 *   node scripts/publish-github.mjs           # assemble ./github-dist only (dry, no network)
 *   node scripts/publish-github.mjs --push    # assemble then git init/commit/push to remote `github`
 *   node scripts/publish-github.mjs --branch main --push
 *
 * Requires a configured remote for --push, e.g.:
 *   git remote add github https://github.com/rjding/rjGrid.git
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'github-dist')

const args = process.argv.slice(2)
const PUSH = args.includes('--push')
const branchFlag = args.indexOf('--branch')
const BRANCH = branchFlag >= 0 ? args[branchFlag + 1] : 'master'

// directories/files never copied into the GitHub tree
const EXCLUDE = new Set([
  '.git',
  'node_modules',
  'github-dist',
  'playground-dist',
  '.cache',
  '__tests__/node_modules'
])

// internal Chinese notes + bilingual originals that get folded away
const DROP = new Set([
  'docs/AG-Grid复刻-全功能开发需求清单.md',
  'docs/AG-Grid深度研究报告.md',
  'docs/换机维护交接.md',
  'docs/RjGrid使用手册.md', // Chinese manual (English one is promoted in its place)
  'README_EN.md' // English original (promoted to README.md)
])

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')

function shouldCopy(absPath) {
  const r = rel(absPath)
  if (DROP.has(r)) return false
  for (const ex of EXCLUDE) {
    if (r === ex || r.startsWith(ex + '/')) return false
  }
  return true
}

function copyTree(src, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const abs = path.join(src, name)
    const stat = fs.lstatSync(abs)
    if (stat.isDirectory()) {
      if (EXCLUDE.has(rel(abs)) || EXCLUDE.has(name)) continue
      copyTree(abs, path.join(destDir, name))
    } else if (stat.isFile()) {
      if (!shouldCopy(abs)) continue
      fs.copyFileSync(abs, path.join(destDir, name))
    }
  }
}

// read/replace/write helper that throws if the anchor is missing
function patchFile(filePath, from, to, label) {
  const buf = fs.readFileSync(filePath, 'utf8')
  if (!buf.includes(from)) {
    throw new Error(`[${label}] anchor not found in ${filePath}:\n  ${JSON.stringify(from)}`)
  }
  fs.writeFileSync(filePath, buf.replace(from, to))
}

function assemble() {
  // fresh output dir
  fs.rmSync(OUT, { recursive: true, force: true })
  console.log(`→ copying tree to ${rel(OUT)}/ ...`)
  copyTree(ROOT, OUT)

  const outReadme = path.join(OUT, 'README.md')
  const outManual = path.join(OUT, 'docs', 'RjGrid_Manual_EN.md')
  const pkgJson = path.join(OUT, 'package.json')
  const demo = path.join(OUT, 'playground', 'src', 'DemoGrid.vue')

  // 1. promote English README to README.md
  console.log('→ README.md := README_EN.md (English)')
  fs.copyFileSync(path.join(ROOT, 'README_EN.md'), outReadme)

  // 2. the English manual keeps its filename (README_EN links to docs/RjGrid_Manual_EN.md)
  if (!fs.existsSync(outManual)) throw new Error('English manual missing in the copied tree')

  // 3. repoint the two cross-language links to Gitee (Chinese home), avoid dangling local paths
  console.log('→ repointing "中文" links to Gitee')
  patchFile(
    outReadme,
    '<a href="README.md">中文</a>',
    '<a href="https://gitee.com/rjding/rj-grid">中文</a>',
    'readme-nav'
  )
  patchFile(
    outManual,
    '> [中文手册](RjGrid使用手册.md) · [README](../README_EN.md)',
    '> [中文手册](https://gitee.com/rjding/rj-grid/blob/master/docs/RjGrid使用手册.md) · [README](https://gitee.com/rjding/rj-grid)',
    'manual-lang-line'
  )

  // 4. playground defaults to English UI (sample data untouched)
  console.log('→ playground UI default: zh → en')
  const demoBuf = fs.readFileSync(demo, 'utf8')
  const zhDefault = /const demoLang = ref<'zh' \| 'en'>\('zh'\)/
  if (!zhDefault.test(demoBuf)) {
    throw new Error('[demoLang] default declaration not found in DemoGrid.vue')
  }
  fs.writeFileSync(demo, demoBuf.replace(zhDefault, "const demoLang = ref<'zh' | 'en'>('en')"))

  // 5. package.json repo metadata → GitHub
  console.log('→ package.json repo/home/bugs URLs → GitHub')
  const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'))
  pkg.repository = { type: 'git', url: 'git+https://github.com/rjding/rjGrid.git' }
  pkg.bugs = { url: 'https://github.com/rjding/rjGrid/issues' }
  pkg.homepage = 'https://github.com/rjding/rjGrid#readme'
  fs.writeFileSync(pkgJson, JSON.stringify(pkg, null, 2) + '\n')

  const files = countFiles(OUT)
  console.log(`✔ assembled ${rel(OUT)}/ (${files} files)`)
}

function countFiles(dir) {
  let n = 0
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name)
    const stat = fs.lstatSync(abs)
    if (stat.isDirectory()) n += countFiles(abs)
    else n += 1
  }
  return n
}

function push() {
  if (!fs.existsSync(OUT)) throw new Error('github-dist not assembled yet')
  const run = (cmd) => {
    console.log(`$ ${cmd}`)
    execSync(cmd, { cwd: OUT, stdio: 'inherit' })
  }
  // verify the remote exists in the parent repo before pushing
  const remotes = execSync('git remote -v', { cwd: ROOT }).toString()
  if (!/\bgithub\b/.test(remotes)) {
    throw new Error(
      'remote "github" not found on the source repo.\n' +
        '  add it first:  git remote add github https://github.com/rjding/rjGrid.git'
    )
  }
  const githubUrl = remotes
    .split('\n')
    .find((l) => /^\s*github\s/.test(l) && /\(push\)/.test(l))
  if (!githubUrl) throw new Error('a push URL for remote "github" was not found')

  run('git init -q')
  run('git add -A')
  run('git commit -q -m "chore: English GitHub build (generated by scripts/publish-github.mjs)" || true')
  run(`git push -f "${githubUrl.split(/\s+/)[1]}" "HEAD:${BRANCH}"`)
  console.log(`✔ pushed to github ${BRANCH}`)
}

try {
  assemble()
  if (PUSH) push()
  else console.log('\n(dry run) to publish:  node scripts/publish-github.mjs --push')
} catch (err) {
  console.error('\n✖ publish-github failed:\n  ' + err.message)
  process.exit(1)
}
