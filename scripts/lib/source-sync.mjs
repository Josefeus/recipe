/**
 * Mirroring helpers for `scripts/sync-cooklikehoc.mjs`.
 *
 * The module only deals with the filesystem (list / diff / copy / delete) and
 * keeps all CLI, git and pnpm concerns in the caller, so the diff logic can be
 * unit tested with temporary directories.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { SKIPPED_MARKDOWN_FILE } from '../recipe-categories.mjs'

/** Which upstream files land in data-source, per asset kind. */
export const FILE_MATCHERS = {
  markdown: (name) => /\.md$/i.test(name) && !SKIPPED_MARKDOWN_FILE.test(name),
  image: (name) => /\.(png|jpe?g|webp|gif)$/i.test(name),
}

/** Chinese names need an explicit locale, otherwise directory listings differ across platforms. */
function compareNames(a, b) {
  return a.localeCompare(b, 'zh-Hans-CN')
}

export function listFiles(dir, matcher) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => matcher(name))
    .filter((name) => {
      try {
        return fs.statSync(path.join(dir, name)).isFile()
      } catch {
        return false
      }
    })
    .sort(compareNames)
}

export function hashFile(file) {
  return createHash('sha1').update(fs.readFileSync(file)).digest('hex')
}

function isSameFile(left, right) {
  if (fs.statSync(left).size !== fs.statSync(right).size) return false
  return hashFile(left) === hashFile(right)
}

/**
 * Diff one upstream directory against its mirror.
 * Returns `{ upstreamDir, targetDir, entries: [{ name, action }], counts }`
 * where action is `add` / `update` / `remove`.
 */
export function planDirectory({ upstreamDir, targetDir, matcher }) {
  const upstream = listFiles(upstreamDir, matcher)
  const target = listFiles(targetDir, matcher)
  const upstreamSet = new Set(upstream)
  const targetSet = new Set(target)
  const entries = []
  const counts = { add: 0, update: 0, remove: 0, unchanged: 0 }

  for (const name of upstream) {
    if (!targetSet.has(name)) {
      entries.push({ name, action: 'add' })
      counts.add += 1
      continue
    }
    if (isSameFile(path.join(upstreamDir, name), path.join(targetDir, name))) {
      counts.unchanged += 1
      continue
    }
    entries.push({ name, action: 'update' })
    counts.update += 1
  }

  for (const name of target) {
    if (upstreamSet.has(name)) continue
    entries.push({ name, action: 'remove' })
    counts.remove += 1
  }

  return { upstreamDir, targetDir, entries, counts }
}

/**
 * Windows occasionally throws EPERM/EBUSY while the indexer or an antivirus
 * scan holds a freshly written file; retry a few times before giving up.
 */
export function withRetry(action, attempts = 5) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return action()
    } catch (error) {
      lastError = error
      if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 * (i + 1))
    }
  }
  throw lastError
}

/** Make the mirror match upstream for a single plan. */
export function applyDirectoryPlan(plan) {
  fs.mkdirSync(plan.targetDir, { recursive: true })
  for (const entry of plan.entries) {
    const from = path.join(plan.upstreamDir, entry.name)
    const to = path.join(plan.targetDir, entry.name)
    if (entry.action === 'remove') {
      withRetry(() => fs.rmSync(to, { force: true }))
      continue
    }
    withRetry(() => fs.copyFileSync(from, to))
  }
}

/** Drop directories that became empty, e.g. a category upstream removed. */
export function removeEmptyDirs(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return []
  const removed = []
  for (const name of fs.readdirSync(root)) {
    const child = path.join(root, name)
    if (!fs.statSync(child).isDirectory()) continue
    removed.push(...removeEmptyDirs(child))
    if (fs.readdirSync(child).length === 0) {
      withRetry(() => fs.rmdirSync(child))
      removed.push(child)
    }
  }
  return removed
}

/** Top-level directories upstream ships but our mirror intentionally skips. */
export function listUnmappedDirs(upstreamRoot, knownDirs) {
  if (!fs.existsSync(upstreamRoot)) return []
  return fs
    .readdirSync(upstreamRoot)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => {
      try {
        return fs.statSync(path.join(upstreamRoot, name)).isDirectory()
      } catch {
        return false
      }
    })
    .filter((name) => !knownDirs.includes(name))
    .sort(compareNames)
}
