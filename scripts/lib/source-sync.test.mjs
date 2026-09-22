import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

import {
  FILE_MATCHERS,
  applyDirectoryPlan,
  listFiles,
  listUnmappedDirs,
  planDirectory,
  removeEmptyDirs,
} from './source-sync.mjs'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'recipe-source-sync-'))
let caseDir

function workspace() {
  const dir = fs.mkdtempSync(path.join(tempRoot, 'case-'))
  const upstream = path.join(dir, 'upstream')
  const target = path.join(dir, 'target')
  fs.mkdirSync(upstream, { recursive: true })
  fs.mkdirSync(target, { recursive: true })
  return { dir, upstream, target }
}

function write(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content)
}

function plan(upstream, target, matcher = FILE_MATCHERS.markdown) {
  return planDirectory({ upstreamDir: upstream, targetDir: target, matcher })
}

function actions(result) {
  return result.entries.map((entry) => `${entry.action}:${entry.name}`).sort()
}

beforeEach(() => {
  caseDir = workspace()
})

after(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})

describe('listFiles', () => {
  it('只保留匹配的文件，跳过目录与 README', () => {
    write(caseDir.upstream, 'a.md', '# a')
    write(caseDir.upstream, 'README.md', '# index')
    write(caseDir.upstream, 'notes.txt', 'ignore me')
    fs.mkdirSync(path.join(caseDir.upstream, 'nested.md'))

    assert.deepEqual(listFiles(caseDir.upstream, FILE_MATCHERS.markdown), ['a.md'])
  })

  it('目录不存在时返回空列表', () => {
    assert.deepEqual(listFiles(path.join(caseDir.dir, 'missing'), FILE_MATCHERS.markdown), [])
  })

  it('图片只认常见扩展名', () => {
    write(caseDir.upstream, '有图.jpg', 'x')
    write(caseDir.upstream, '矢量.svg', 'x')

    assert.deepEqual(listFiles(caseDir.upstream, FILE_MATCHERS.image), ['有图.jpg'])
  })
})

describe('planDirectory', () => {
  it('空目标目录全部是新增', () => {
    write(caseDir.upstream, 'a.md', '# a')
    write(caseDir.upstream, 'b.md', '# b')

    const result = plan(caseDir.upstream, caseDir.target)

    assert.deepEqual(actions(result), ['add:a.md', 'add:b.md'])
    assert.deepEqual(result.counts, { add: 2, update: 0, remove: 0, unchanged: 0 })
  })

  it('内容一致时不动，内容变化记为更新', () => {
    write(caseDir.upstream, 'a.md', '# a')
    write(caseDir.upstream, 'b.md', '# b 已改')
    write(caseDir.target, 'a.md', '# a')
    write(caseDir.target, 'b.md', '# b')

    const result = plan(caseDir.upstream, caseDir.target)

    assert.deepEqual(actions(result), ['update:b.md'])
    assert.equal(result.counts.unchanged, 1)
  })

  it('上游删除的文件会被清理', () => {
    write(caseDir.upstream, 'a.md', '# a')
    write(caseDir.target, 'a.md', '# a')
    write(caseDir.target, 'removed.md', '# old')

    const result = plan(caseDir.upstream, caseDir.target)

    assert.deepEqual(actions(result), ['remove:removed.md'])
    assert.equal(result.counts.remove, 1)
  })

  it('同名同大小但内容不同的文件也能识别', () => {
    write(caseDir.upstream, 'a.md', '# abc')
    write(caseDir.target, 'a.md', '# abd')

    assert.deepEqual(actions(plan(caseDir.upstream, caseDir.target)), ['update:a.md'])
  })
})

describe('applyDirectoryPlan', () => {
  it('执行后目标目录与上游完全一致', () => {
    write(caseDir.upstream, 'a.md', '# a')
    write(caseDir.upstream, 'b.md', '# b 新版')
    write(caseDir.target, 'b.md', '# b 旧版')
    write(caseDir.target, 'stale.md', '# stale')

    applyDirectoryPlan(plan(caseDir.upstream, caseDir.target))

    assert.deepEqual(listFiles(caseDir.target, FILE_MATCHERS.markdown), ['a.md', 'b.md'])
    assert.equal(fs.readFileSync(path.join(caseDir.target, 'b.md'), 'utf8'), '# b 新版')
    assert.deepEqual(actions(plan(caseDir.upstream, caseDir.target)), [])
  })

  it('目标目录不存在时按需创建', () => {
    const target = path.join(caseDir.dir, 'fresh', 'nested')
    write(caseDir.upstream, 'a.md', '# a')

    applyDirectoryPlan(plan(caseDir.upstream, target))

    assert.equal(fs.readFileSync(path.join(target, 'a.md'), 'utf8'), '# a')
  })
})

describe('removeEmptyDirs', () => {
  it('删掉空目录但保留有内容的目录', () => {
    fs.mkdirSync(path.join(caseDir.target, '空分类'), { recursive: true })
    fs.mkdirSync(path.join(caseDir.target, '有内容', '嵌套'), { recursive: true })
    write(path.join(caseDir.target, '有内容'), 'a.md', '# a')

    const removed = removeEmptyDirs(caseDir.target)

    assert.deepEqual(removed.map((dir) => path.basename(dir)).sort(), ['空分类', '嵌套'].sort())
    assert.equal(fs.existsSync(path.join(caseDir.target, '空分类')), false)
    assert.equal(fs.existsSync(path.join(caseDir.target, '有内容', 'a.md')), true)
    assert.equal(fs.existsSync(path.join(caseDir.target, '有内容', '嵌套')), false)
  })

  it('目录不存在时安全返回', () => {
    assert.deepEqual(removeEmptyDirs(path.join(caseDir.dir, 'missing')), [])
  })
})

describe('listUnmappedDirs', () => {
  it('只报出未纳入配置的目录', () => {
    for (const name of ['炒菜', '配料', 'new-category']) {
      fs.mkdirSync(path.join(caseDir.upstream, name), { recursive: true })
    }
    write(caseDir.upstream, 'README.md', '# root')

    assert.deepEqual(listUnmappedDirs(caseDir.upstream, ['炒菜', '配料']), ['new-category'])
  })
})
