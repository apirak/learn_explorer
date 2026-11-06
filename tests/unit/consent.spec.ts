import { test } from '@japa/runner'
import consent, { CONSENT_VERSION, parseConsent } from '#services/consent_service'

test.group('Consent text', () => {
  test('the file named by CONSENT_VERSION loads without the author notes', ({ assert }) => {
    assert.equal(consent.version, CONSENT_VERSION)
    assert.isAbove(consent.blocks.length, 0)
    assert.notInclude(JSON.stringify(consent.blocks), 'PLACEHOLDER: not the Legal-approved text')
  })

  test('parses headings, lists and paragraphs', ({ assert }) => {
    const md = '<!-- note -->\n\n### หัวข้อ\n\n**ข้อมูล**\n\n- ก\n- ข\n\nบรรทัดหนึ่ง\nบรรทัดสอง'
    assert.deepEqual(parseConsent(md), [
      { type: 'heading', text: 'หัวข้อ' },
      { type: 'paragraph', text: '**ข้อมูล**' },
      { type: 'list', items: ['ก', 'ข'] },
      { type: 'paragraph', text: 'บรรทัดหนึ่ง บรรทัดสอง' },
    ])
  })

  /**
   * RELEASE BLOCKER [N2]. Students must see Legal's verbatim text, never the placeholder.
   * TODO(release): add Legal's file to resources/consent/, point CONSENT_VERSION at it, and
   * this passes. Skipped in day-to-day runs; `RELEASE=1 node ace test` must pass before launch.
   */
  test('CONSENT_VERSION names Legal-approved text, not a placeholder', ({ assert }) => {
    assert.notMatch(CONSENT_VERSION, /^placeholder/)
  }).skip(process.env.RELEASE !== '1', 'Release blocker: Legal consent text not yet added')
})
