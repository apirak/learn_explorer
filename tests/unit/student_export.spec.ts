import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { COLUMNS, DICTIONARY_PATH, csvField } from '#services/student_export_service'

test.group('Student export', () => {
  test('every CSV column is described in the column guide', async ({ assert }) => {
    const guide = await readFile(app.makePath(DICTIONARY_PATH), 'utf8')
    const described = guide.match(/^### .+$/gm)!.flatMap((h) => h.slice(4).split(/,\s*/))
    assert.includeMembers(
      described,
      COLUMNS.map(([header]) => header)
    )
  })

  test('csvField quotes, escapes and defuses formulas', ({ assert }) => {
    assert.equal(csvField(null), '')
    assert.equal(csvField(0), '0')
    assert.equal(csvField(-1), '-1')
    assert.equal(csvField(false), 'false')
    assert.equal(csvField('หมอ, ครู'), '"หมอ, ครู"')
    assert.equal(csvField('say "hi"'), '"say ""hi"""')
    assert.equal(csvField('a\nb'), '"a\nb"')
    assert.equal(csvField('=1+1'), "'=1+1")
    assert.equal(csvField('-2'), "'-2")
  })
})
