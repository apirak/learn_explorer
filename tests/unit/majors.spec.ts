// Ported case by case from the prototype's majors.test.js.
import { test } from '@japa/runner'
import content, { type TcasField } from '#services/content_service'
import { fieldsForOccupation, groupOf } from '#services/major_service'

const { occupationCip, tcasFields: fieldMap } = content
const keys = (soc: string) => fieldsForOccupation(soc, occupationCip, fieldMap).map((m) => m.key)

test.group('Majors', () => {
  test('ranks fully on-topic fields first, then by confidence', ({ assert }) => {
    const map: Record<string, TcasField> = {
      '90-07': { th: 'จิตวิทยา', en: '', cip: ['42.01', '42.27'], confidence: 'high' },
      '70-12': { th: 'จิตวิทยาการศึกษา', en: '', cip: ['13.11', '42.28'], confidence: 'high' },
      '11-31': { th: 'จิตวิทยา', en: '', cip: ['42.01'], confidence: 'medium' },
      '61-05': { th: 'การบัญชี', en: '', cip: ['52.03'], confidence: 'high' },
    }
    const occ = { '19-3033.00': ['42.01', '42.27', '42.28'] }
    const hits = fieldsForOccupation('19-3033.00', occ, map)
    assert.deepEqual(
      hits.map((h) => h.key),
      ['90-07', '11-31', '70-12']
    )
    assert.deepEqual(hits[2].shared, ['42.28'])
    assert.equal(hits[2].share, 0.5)
  })

  test('unknown occupation has no fields', ({ assert }) => {
    assert.deepEqual(fieldsForOccupation('00-0000.00', occupationCip, fieldMap), [])
  })

  test('real data: well-known occupations land on the expected Thai field', ({ assert }) => {
    assert.equal(keys('23-1011.00')[0], '90-10') // Lawyers → นิติศาสตร์
    assert.equal(keys('29-1141.00')[0], '11-17') // Registered Nurses → พยาบาลศาสตร์
    assert.include(keys('15-1252.00'), '22-02') // Software Developers → วิทยาการคอมพิวเตอร์
    assert.isTrue(
      keys('19-3033.00')
        .slice(0, 3)
        .some((k) => k === '11-31' || k === '90-07')
    ) // Psychologists → จิตวิทยา
    assert.include(keys('27-1024.00'), '80-01') // Graphic Designers → การออกแบบ
  })

  test('groupOf', ({ assert }) => {
    assert.equal(groupOf('11-31'), '11')
  })
})
