import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseNutrition } from './build-recipes.mjs'

describe('parseNutrition', () => {
  it('drops the markdown alignment divider and the header row', () => {
    const lines = [
      '',
      '| 项目 | 每 100g 含量 |',
      '| :--- | :--- |',
      '| 热量 | 376 Kcal |',
      '| 蛋白质 | 17.0 g |',
    ]

    assert.deepEqual(parseNutrition(lines), [
      { label: '热量', value: '376 Kcal' },
      { label: '蛋白质', value: '17.0 g' },
    ])
  })

  it('drops plain dash dividers', () => {
    const lines = ['| ---- | ---- |', '| 热量 | 179 Kcal |']

    assert.deepEqual(parseNutrition(lines), [{ label: '热量', value: '179 Kcal' }])
  })

  it('drops aligned dividers on either side', () => {
    const lines = ['| :---: | ---: |', '| ---: | :--- |', '| 钠 | 448 mg |']

    assert.deepEqual(parseNutrition(lines), [{ label: '钠', value: '448 mg' }])
  })

  it('keeps a real dash value', () => {
    assert.deepEqual(parseNutrition(['| 钠 | - |']), [{ label: '钠', value: '-' }])
  })

  it('ignores lines that are not table rows', () => {
    assert.deepEqual(parseNutrition(['', '营养成分', '- 热量 376 Kcal']), [])
  })
})
