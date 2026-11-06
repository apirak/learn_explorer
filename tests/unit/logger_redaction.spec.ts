import { test } from '@japa/runner'
import { Writable } from 'node:stream'
import { Logger } from '@adonisjs/core/logger'
import loggerConfig from '#config/logger'

/**
 * Builds the real app logger config but writes to memory instead of stdout.
 */
function captureLog(payload: Record<string, unknown>) {
  const lines: string[] = []
  // `desination` is the real (misspelled) option name in @adonisjs/logger's config type.
  const desination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString())
      done()
    },
  })
  const { transport, destination, ...config } = loggerConfig.loggers.app
  new Logger({ ...config, level: 'info', desination }).info(payload, 'event')
  return JSON.parse(lines[0])
}

test.group('Logger redaction', () => {
  test('redacts student personal data and credentials', ({ assert }) => {
    const log = captureLog({
      attemptId: 'b3c1a2e4-0000-4000-8000-000000000001',
      phone: '0812345678',
      email: 'student@example.com',
      code: 'CAMPAIGN-42',
      desiredCareer: 'หมอ',
      password: 'hunter2',
      req: { headers: { 'cookie': 'sid=abc', 'authorization': 'Bearer xyz', 'x-xsrf-token': 't' } },
    })

    assert.equal(log.attemptId, 'b3c1a2e4-0000-4000-8000-000000000001')
    for (const key of ['phone', 'email', 'code', 'desiredCareer', 'password']) {
      assert.equal(log[key], '[Redacted]', key)
    }
    assert.equal(log.req.headers.cookie, '[Redacted]')
    assert.equal(log.req.headers.authorization, '[Redacted]')
    assert.equal(log.req.headers['x-xsrf-token'], '[Redacted]')
  })
})
