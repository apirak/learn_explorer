import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import content from '#services/content_service'
import ace from '@adonisjs/core/services/ace'
import testUtils from '@adonisjs/core/services/test_utils'
import BackfillScores from '../../commands/backfill_scores.js'

const seed = () => Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })

test.group('backfill:scores', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('scores finished attempts that have none, and leaves the rest', async ({ assert }) => {
    const finished = await seed()
    await Answer.createMany(
      content.forms.mini.ids.map((itemId) => ({ attemptId: finished.id, itemId, value: 3 }))
    )
    const unfinished = await seed()
    await Answer.create({ attemptId: unfinished.id, itemId: content.forms.mini.ids[0], value: 4 })

    const command = await ace.create(BackfillScores, [])
    await command.exec()
    command.assertSucceeded()

    await finished.refresh()
    await unfinished.refresh()
    assert.equal(finished.scoreR, 15)
    assert.equal(finished.profileStatus, 'flat')
    assert.isNull(unfinished.scoreR)
  })
})
