import { test } from '@japa/runner'
import content, { CONTENT_VERSION } from '#services/content_service'

test.group('Content v2', () => {
  test('exposes every content file', ({ assert }) => {
    assert.equal(CONTENT_VERSION, 'v2')
    assert.lengthOf(content.items, 60)
    assert.lengthOf(content.forms.mini.ids, 30)
    assert.lengthOf(content.occupations, 923)
    assert.equal(content.riasecTypes.R.name, 'นักลงมือทำ')
    assert.equal(content.occupationCip['23-1011.00'][0].slice(2, 3), '.')
    assert.equal(content.tcasFields['90-10'].th, 'นิติศาสตร์')
    assert.isAbove(Object.keys(content.tcasPrograms.groups).length, 0)
    assert.isAbove(Object.keys(content.tcasPrograms.fields).length, 0)
  })

  test('every Job Zone 4–5 occupation has a Thai title', ({ assert }) => {
    const missing = content.occupations
      .filter((o) => o.jobZone >= 4 && !content.thaiTitles[o.code])
      .map((o) => o.code)
    assert.deepEqual(missing, [])
  })
})
