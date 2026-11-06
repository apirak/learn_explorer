import db from '@adonisjs/lucid/services/db'
import { DbCheck } from '@adonisjs/lucid/database'
import { HealthChecks } from '@adonisjs/core/health'

export const healthChecks = new HealthChecks().register([new DbCheck(db.connection())])
