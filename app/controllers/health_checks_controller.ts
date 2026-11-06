import { healthChecks } from '#start/health'
import type { HttpContext } from '@adonisjs/core/http'

export default class HealthChecksController {
  /**
   * Single health route (design N6): 200 when the database answers, 503 otherwise.
   */
  async handle({ response }: HttpContext) {
    const report = await healthChecks.run()
    return report.isHealthy ? response.ok(report) : response.serviceUnavailable(report)
  }
}
