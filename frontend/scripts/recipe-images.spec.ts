import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { afterAll, describe, expect, it } from 'vitest'

import {
  collectReferencedImages,
  copyReferencedImages,
  imageMiddleware,
  isPlainFileName,
  resolveImageFile,
} from './recipe-images'

const tempDirs: string[] = []

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recipe-images-'))
  tempDirs.push(dir)
  return dir
}

afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('collectReferencedImages', () => {
  it('只收集 /images/ 下的图片，并解码文件名', () => {
    const dataset = {
      recipes: [
        { image: '/images/三色虾仁.jpg' },
        { image: `/images/${encodeURIComponent('卤鸡爪.png')}` },
        { image: '/images/三色虾仁.jpg' },
        { image: null },
        { image: '/avatars/user.png' },
        {},
      ],
    }

    expect(collectReferencedImages(dataset)).toEqual(['三色虾仁.jpg', '卤鸡爪.png'])
  })

  it('忽略越权与畸形路径', () => {
    const dataset = {
      recipes: [
        { image: '/images/../secret.png' },
        { image: '/images/sub/dir.png' },
        { image: '/images/%E0%A4%A' },
        { image: '' },
      ],
    }

    expect(collectReferencedImages(dataset)).toEqual([])
  })

  it('数据集结构不符合预期时返回空数组', () => {
    expect(collectReferencedImages(null)).toEqual([])
    expect(collectReferencedImages({ recipes: 'nope' })).toEqual([])
  })
})

describe('isPlainFileName', () => {
  it('接受单层文件名，拒绝目录与上级跳转', () => {
    expect(isPlainFileName('卤鸡爪.png')).toBe(true)
    expect(isPlainFileName('../secret.png')).toBe(false)
    expect(isPlainFileName('sub/dir.png')).toBe(false)
    expect(isPlainFileName('..')).toBe(false)
    expect(isPlainFileName('')).toBe(false)
  })
})

describe('resolveImageFile', () => {
  it('命中数据源里的图片，缺失与越权一律返回 null', () => {
    const imagesDir = makeTempDir()
    fs.writeFileSync(path.join(imagesDir, '三色虾仁.jpg'), 'fake-image')

    expect(resolveImageFile(imagesDir, '/三色虾仁.jpg')).toBe(path.join(imagesDir, '三色虾仁.jpg'))
    expect(resolveImageFile(imagesDir, '/missing.jpg')).toBeNull()
    expect(resolveImageFile(imagesDir, '/../secret.jpg')).toBeNull()
  })
})

describe('copyReferencedImages', () => {
  it('只把被引用的图片复制进 outDir/images', () => {
    const imagesDir = makeTempDir()
    const outDir = makeTempDir()
    fs.writeFileSync(path.join(imagesDir, 'used.jpg'), 'used')
    fs.writeFileSync(path.join(imagesDir, 'unused.jpg'), 'unused')

    const recipesJson = path.join(makeTempDir(), 'recipes.json')
    fs.writeFileSync(
      recipesJson,
      JSON.stringify({ recipes: [{ image: '/images/used.jpg' }, { image: null }] }),
    )

    const result = copyReferencedImages({ imagesDir, recipesJson, outDir })

    expect(result).toEqual({ copied: 1, missing: [] })
    expect(fs.readdirSync(path.join(outDir, 'images'))).toEqual(['used.jpg'])
  })

  it('数据源缺少被引用的图片时记录 missing 且不抛错', () => {
    const imagesDir = makeTempDir()
    const outDir = makeTempDir()
    const recipesJson = path.join(makeTempDir(), 'recipes.json')
    fs.writeFileSync(recipesJson, JSON.stringify({ recipes: [{ image: '/images/gone.jpg' }] }))

    expect(copyReferencedImages({ imagesDir, recipesJson, outDir })).toEqual({
      copied: 0,
      missing: ['gone.jpg'],
    })
  })
})

describe('imageMiddleware', () => {
  function call(url: string, imagesDir: string) {
    const calls: { status: number; headers: Record<string, string>; body: string } = {
      status: 200,
      headers: {},
      body: '',
    }
    let statusCode = 200
    const res = {
      get statusCode() {
        return statusCode
      },
      set statusCode(value: number) {
        statusCode = value
      },
      setHeader(name: string, value: string) {
        calls.headers[name] = value
      },
      end(chunk?: string | Buffer) {
        calls.status = statusCode
        if (chunk) calls.body = Buffer.from(chunk).toString('utf8')
      },
    } as unknown as ServerResponse

    imageMiddleware(imagesDir)({ url } as IncomingMessage, res, () => {
      throw new Error('中间的静态图片请求不应该落到 next()')
    })
    return calls
  }

  it('命中数据源图片时返回图片内容与正确的 Content-Type', () => {
    const imagesDir = makeTempDir()
    fs.writeFileSync(path.join(imagesDir, '三色虾仁.jpg'), 'jpg-bytes')

    const result = call('/三色虾仁.jpg', imagesDir)
    expect(result.status).toBe(200)
    expect(result.headers['Content-Type']).toBe('image/jpeg')
    expect(result.body).toBe('jpg-bytes')
  })

  it('未命中或越权时返回 404 而不是回落到 SPA', () => {
    const imagesDir = makeTempDir()

    expect(call('/missing.png', imagesDir).status).toBe(404)
    expect(call('/../secret.png', imagesDir).status).toBe(404)
  })
})
