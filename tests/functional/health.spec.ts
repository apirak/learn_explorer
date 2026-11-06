import { test } from '@japa/runner'
import env from '#start/env'
import type { HealthCheckReport } from '@adonisjs/core/types/health'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Health', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /health returns OK when the database is reachable', async ({ assert }) => {
    const response = await fetch(`http://${env.get('HOST')}:${env.get('PORT')}/health`)
    const report = (await response.json()) as HealthCheckReport

    assert.equal(response.status, 200)
    assert.isTrue(report.isHealthy)
    assert.lengthOf(report.checks, 1)
    assert.equal(report.checks[0].status, 'ok')
  })
})
