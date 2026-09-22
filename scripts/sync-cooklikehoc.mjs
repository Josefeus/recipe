#!/usr/bin/env node
/**
 * Refresh the static recipe assets from the upstream CookLikeHOC repository.
 *
 * Pipeline (idempotent: re-running with no upstream change writes nothing):
 *   1. fetch the upstream repo into a local cache clone (default `_cooklikehoc/`)
 *   2. mirror the categories + images we consume into `data-source/CookLikeHOC`
 *      (add / update / delete, so the mirror stays exactly in sync)
 *   3. record the upstream commit in `data-source/CookLikeHOC/.upstream.json`
 *   4. run `pnpm data:build` in `frontend/` to regenerate `src/data/recipes.json`
 *      (菜品图片不再复制到前端，由 Vite 插件直接从数据源提供)
 *
 * Usage:
 *   node scripts/sync-cooklikehoc.mjs               # 同步 + 重新生成前端数据
 *   node scripts/sync-cooklikehoc.mjs --check       # 只检查上游是否更新（有新数据退出码 2）
 *   node scripts/sync-cooklikehoc.mjs --dry-run     # 只打印将要发生的改动
 *   node scripts/sync-cooklikehoc.mjs --ref v1.2.0  # 固定到某个分支/标签
 *   node scripts/sync-cooklikehoc.mjs --skip-fetch  # 离线，用已有的缓存克隆
 *   node scripts/sync-cooklikehoc.mjs --no-build    # 只同步数据源，不跑前端构建
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CATEGORIES, EXCLUDED_TOP_LEVEL_DIRS } from './recipe-categories.mjs'
import {
  FILE_MATCHERS,
  applyDirectoryPlan,
  listUnmappedDirs,
  planDirectory,
  removeEmptyDirs,
} from './lib/source-sync.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const frontendDir = path.join(repoRoot, 'frontend')
const recipesJson = path.join(frontendDir, 'src', 'data', 'recipes.json')

const DEFAULT_REPO = 'https://github.com/Gar-b-age/CookLikeHOC.git'
const UPSTREAM_META_FILE = '.upstream.json'
const DEFAULT_BRANCH = 'main'
/** `--check` 用独立退出码，CI 才能区分「有新数据」和「脚本出错」。 */
const EXIT_UPSTREAM_UPDATED = 2
const CHANGED_FILES_PREVIEW = 20

const USAGE = `用法：node scripts/sync-cooklikehoc.mjs [选项]

选项：
  --repo <url>        上游仓库地址（默认 ${DEFAULT_REPO}）
  --ref <ref>         上游分支 / 标签，默认上游默认分支
  --cache-dir <dir>   上游克隆缓存目录（默认 _cooklikehoc/）
  --source-dir <dir>  数据源副本目录（默认 data-source/CookLikeHOC/）
  --skip-fetch        不访问网络，直接使用已有的缓存克隆
  --no-build          只同步数据源，不执行 frontend 的 pnpm data:build
  --dry-run           只打印改动计划，不写入任何文件
  --check             只检查上游是否有新数据；有则退出码 ${EXIT_UPSTREAM_UPDATED}，无则 0
  -h, --help          显示本帮助
`

function fail(message) {
  console.error(`错误：${message}`)
  console.error(`\n${USAGE}`)
  process.exit(1)
}

function relative(target) {
  const rel = path.relative(repoRoot, target)
  const printable = rel && !rel.startsWith('..') ? rel : target
  return printable.split(path.sep).join('/')
}

function shortCommit(commit) {
  return commit ? commit.slice(0, 7) : 'unknown'
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function parseArgs(argv) {
  const options = {
    repo: DEFAULT_REPO,
    ref: null,
    cacheDir: path.join(repoRoot, '_cooklikehoc'),
    sourceDir: path.join(repoRoot, 'data-source', 'CookLikeHOC'),
    skipFetch: false,
    build: true,
    dryRun: false,
    check: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const readValue = () => {
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) fail(`${arg} 缺少参数值`)
      i += 1
      return value
    }

    switch (arg) {
      case '--repo':
        options.repo = readValue()
        break
      case '--ref':
        options.ref = readValue()
        break
      case '--cache-dir':
        options.cacheDir = path.resolve(readValue())
        break
      case '--source-dir':
        options.sourceDir = path.resolve(readValue())
        break
      case '--skip-fetch':
        options.skipFetch = true
        break
      case '--no-build':
        options.build = false
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--check':
        options.check = true
        break
      case '-h':
      case '--help':
        options.help = true
        break
      default:
        fail(`未知参数 ${arg}`)
    }
  }

  // 这两种模式都不落盘，构建自然也不用跑。
  if (options.dryRun || options.check) options.build = false
  return options
}

function git(args, { quiet = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: quiet ? 'pipe' : ['ignore', 'pipe', 'pipe'],
  })
  if (result.error) throw new Error(`git 执行失败：${result.error.message}`)
  if (result.status !== 0) {
    const detail = (result.stderr ?? '').trim()
    throw new Error(`git ${args.join(' ')} 失败${detail ? `：\n${detail}` : ''}`)
  }
  return (result.stdout ?? '').trim()
}

/** 保证缓存克隆存在，并切到指定的上游版本。 */
function fetchUpstream(options) {
  const { cacheDir, repo, ref, skipFetch } = options
  const isClone = fs.existsSync(path.join(cacheDir, '.git'))

  if (skipFetch) {
    if (!isClone) throw new Error(`--skip-fetch 需要已存在的缓存克隆：${cacheDir}`)
    console.log(`跳过拉取，使用已有缓存克隆 ${relative(cacheDir)}`)
    return
  }

  if (!isClone) {
    console.log(`克隆上游仓库到 ${relative(cacheDir)} …`)
    fs.mkdirSync(path.dirname(cacheDir), { recursive: true })
    git(['clone', '--depth', '1', repo, cacheDir])
  }

  const target = ref ?? 'HEAD'
  console.log(`拉取上游 ${target} …`)
  try {
    git(['-C', cacheDir, 'fetch', '--depth', '1', 'origin', target])
  } catch (error) {
    throw new Error(
      `${error.message}\n提示：浅克隆只能拉取分支或标签，请用 --ref <branch|tag> 指定，不要用裸 commit sha。`,
    )
  }
  git(['-C', cacheDir, 'checkout', '--force', '--detach', 'FETCH_HEAD'])
}

function readUpstreamState(options) {
  const { cacheDir, ref } = options
  const commit = git(['-C', cacheDir, 'rev-parse', 'HEAD'], { quiet: true })
  const commitDate = git(['-C', cacheDir, 'log', '-1', '--format=%cI'], { quiet: true })

  let branch = ref
  if (!branch) {
    const probe = spawnSync('git', ['-C', cacheDir, 'rev-parse', '--abbrev-ref', 'origin/HEAD'], {
      encoding: 'utf8',
    })
    branch =
      probe.status === 0 && probe.stdout.trim()
        ? probe.stdout.trim().replace(/^origin\//, '')
        : DEFAULT_BRANCH
  }

  return { repo: options.repo.replace(/\.git$/, ''), ref: branch, commit, commitDate }
}

/** 参与同步的目录：CATEGORIES 里的分类 + images。 */
function createPlans(options) {
  const specs = [
    ...CATEGORIES.map((category) => ({ dir: category.key, kind: 'markdown' })),
    { dir: 'images', kind: 'image' },
  ]

  return specs.map((spec) => ({
    ...spec,
    plan: planDirectory({
      upstreamDir: path.join(options.cacheDir, spec.dir),
      targetDir: path.join(options.sourceDir, spec.dir),
      matcher: FILE_MATCHERS[spec.kind],
    }),
  }))
}

function totalCounts(plans) {
  return plans.reduce(
    (totals, { plan }) => ({
      add: totals.add + plan.counts.add,
      update: totals.update + plan.counts.update,
      remove: totals.remove + plan.counts.remove,
      unchanged: totals.unchanged + plan.counts.unchanged,
    }),
    { add: 0, update: 0, remove: 0, unchanged: 0 },
  )
}

function reportPlans(plans, counts) {
  const changed = counts.add + counts.update + counts.remove
  if (changed === 0) {
    console.log(`数据源已是最新：${counts.unchanged} 个文件与上游一致，无需改动。`)
    return
  }

  console.log(`需要改动的文件：新增 ${counts.add}，更新 ${counts.update}，删除 ${counts.remove}`)
  const shown = plans.flatMap(({ dir, plan }) =>
    plan.entries.map((entry) => ({
      label: `${dir}/${entry.name}`,
      marker: entry.action === 'add' ? '+' : entry.action === 'update' ? '~' : '-',
    })),
  )
  for (const item of shown.slice(0, CHANGED_FILES_PREVIEW)) {
    console.log(`  ${item.marker} ${item.label}`)
  }
  if (shown.length > CHANGED_FILES_PREVIEW) {
    console.log(`  ... 其余 ${shown.length - CHANGED_FILES_PREVIEW} 条省略`)
  }
}

/** 上游目录结构与配置不一致时给出提示，避免默默漏数据或误删。 */
function warnAboutUpstream(options) {
  const known = [...CATEGORIES.map((category) => category.key), ...EXCLUDED_TOP_LEVEL_DIRS]
  const unmapped = listUnmappedDirs(options.cacheDir, known)
  if (unmapped.length) {
    console.log(
      `\n提示：上游出现未纳入的目录 ${unmapped.join('、')}，` +
        '如需收录请更新 scripts/recipe-categories.mjs 里的 CATEGORIES。',
    )
  }

  const missing = [...CATEGORIES.map((category) => category.key), 'images'].filter(
    (dir) => !fs.existsSync(path.join(options.cacheDir, dir)),
  )
  if (missing.length) {
    console.log(
      `\n警告：上游缺少目录 ${missing.join('、')}。同步会把本地对应的副本清空；` +
        '如果上游只是改名，请同步更新 CATEGORIES 后再提交。',
    )
  }
}

/** 记录上游版本，方便追溯静态资源来自哪个 commit；commit 未变时不重写。 */
function writeUpstreamMeta(options, state) {
  const target = path.join(options.sourceDir, UPSTREAM_META_FILE)
  const previous = readJson(target)
  if (previous?.commit === state.commit && previous?.repo === state.repo) return false

  const payload = {
    repo: state.repo,
    ref: state.ref,
    commit: state.commit,
    commitDate: state.commitDate,
    syncedAt: new Date().toISOString(),
    categories: CATEGORIES.map((category) => category.key),
  }
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`记录上游版本：${relative(target)} → ${shortCommit(state.commit)}`)
  return true
}

function syncSource(options, plans) {
  for (const { plan } of plans) applyDirectoryPlan(plan)
  for (const dir of removeEmptyDirs(options.sourceDir)) {
    console.log(`  删除空目录 ${relative(dir)}`)
  }
}

function runBuild() {
  console.log('\n重新生成前端静态资源（frontend：pnpm data:build）…')
  // Windows 上 pnpm 是 .cmd，需要 shell 才能启动；整条命令作为单个字符串传入，
  // 避免 Node 对 `args + shell` 组合发出 DEP0190 警告。
  const result = spawnSync('pnpm run data:build', {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
  })
  if (result.error) throw new Error(`无法执行 pnpm：${result.error.message}`)
  if (result.status !== 0) throw new Error('pnpm data:build 失败，请查看上面的输出')
}

function reportBuildResult() {
  const dataset = readJson(recipesJson)
  if (!dataset) return
  const images = new Set(
    (dataset.recipes ?? [])
      .map((recipe) => recipe?.image)
      .filter((image) => typeof image === 'string'),
  ).size
  console.log(
    `\n产物：${dataset.recipes?.length ?? 0} 道菜，${dataset.categories?.length ?? 0} 个分类，` +
      `${images} 张引用图片（frontend/src/data/recipes.json；图片由 data-source/CookLikeHOC/images 直接提供）`,
  )
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(USAGE)
    return
  }

  console.log(`上游仓库：${options.repo}`)
  fetchUpstream(options)

  const state = readUpstreamState(options)
  console.log(`当前上游版本：${shortCommit(state.commit)}（${state.ref} · ${state.commitDate}）\n`)

  const plans = createPlans(options)
  const counts = totalCounts(plans)
  reportPlans(plans, counts)
  warnAboutUpstream(options)

  const changed = counts.add + counts.update + counts.remove
  const previous = readJson(path.join(options.sourceDir, UPSTREAM_META_FILE))
  const upstreamMoved = previous?.commit !== state.commit

  if (options.check) {
    if (changed === 0 && !upstreamMoved) {
      console.log(`\n检查结果：已是最新（${shortCommit(state.commit)}）。`)
      return
    }
    console.log(
      `\n检查结果：上游有更新 —— 已记录 ${shortCommit(previous?.commit)}，上游 ${shortCommit(state.commit)}。` +
        '\n执行 node scripts/sync-cooklikehoc.mjs 同步。',
    )
    process.exitCode = EXIT_UPSTREAM_UPDATED
    return
  }

  if (options.dryRun) {
    console.log('\n--dry-run：未写入任何文件。')
    if (!previous) console.log(`（首次同步会同时写入 ${UPSTREAM_META_FILE}）`)
    return
  }

  if (changed > 0) {
    console.log('\n同步数据源 …')
    syncSource(options, plans)
  }
  const metaWritten = writeUpstreamMeta(options, state)
  if (changed === 0 && !metaWritten) console.log('\n数据源无需改动。')

  if (options.build) {
    runBuild()
    reportBuildResult()
  }

  if (changed > 0 || metaWritten) {
    console.log(
      `\n下一步：git add data-source && ` +
        `git commit -m "chore: sync recipes from CookLikeHOC@${shortCommit(state.commit)}"`,
    )
  }
}

try {
  main()
} catch (error) {
  console.error(`\n错误：${error.message}`)
  process.exit(1)
}
