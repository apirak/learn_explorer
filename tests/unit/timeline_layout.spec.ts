import { test } from '@japa/runner'
import type {} from '@japa/assert' // `assert` on the test context, for the inertia typecheck
import { formatDuration, layoutTimeline } from '../../inertia/timeline_layout.js'

const S = 1000
const MIN = 60 * S
const HOUR = 60 * MIN
const DAY = 24 * HOUR

test.group('Timeline layout / formatDuration', () => {
  test('shows at most two units', ({ assert }) => {
    assert.equal(formatDuration(40 * S), '40 วินาที')
    assert.equal(formatDuration(14 * MIN), '14 นาที')
    assert.equal(formatDuration(2 * HOUR + 5 * MIN), '2 ชม. 5 นาที')
    assert.equal(formatDuration(DAY + 10 * HOUR), '1 วัน 10 ชม.')
  })

  test('carries a rounded value into the next unit', ({ assert }) => {
    assert.equal(formatDuration(59.6 * S), '1 นาที')
    assert.equal(formatDuration(59.5 * MIN), '1 ชม.')
    assert.equal(formatDuration(HOUR + 59.7 * MIN), '2 ชม.')
    assert.equal(formatDuration(23 * HOUR + 59.7 * MIN), '1 วัน')
    assert.equal(formatDuration(DAY + 23.6 * HOUR), '2 วัน')
  })
})

test.group('Timeline layout / layoutTimeline', () => {
  test('keeps a skipped step in order between its neighbours', ({ assert }) => {
    // Test, Result, Career reached; Print prep skipped; Download reached.
    const { states, gaps, pos } = layoutTimeline([0, 40 * S, 14 * MIN, null, DAY])

    assert.deepEqual(states, ['reached', 'reached', 'reached', 'skipped', 'reached'])
    assert.deepEqual(
      gaps.map((g) => [g.from, g.to]),
      [
        [0, 1],
        [1, 2],
        [2, 4],
      ]
    )
    assert.equal(gaps[2].ms, DAY - 14 * MIN)
    assert.isAbove(pos[3], pos[2])
    assert.isBelow(pos[3], pos[4])
    assert.equal(pos[4], 100)
  })

  test('trails steps after the last reached one as pending', ({ assert }) => {
    const { states, pos, reachedEnd } = layoutTimeline([0, null, 5 * MIN, null, null])

    assert.deepEqual(states, ['reached', 'skipped', 'reached', 'pending', 'pending'])
    assert.equal(pos[2], reachedEnd)
    assert.isAbove(pos[3], reachedEnd)
    assert.isAbove(pos[4], pos[3])
    assert.equal(pos[4], 100)
  })

  test('an attempt that only started has no gaps', ({ assert }) => {
    const { states, gaps, pos } = layoutTimeline([0, null, null, null, null])

    assert.deepEqual(states, ['reached', 'pending', 'pending', 'pending', 'pending'])
    assert.lengthOf(gaps, 0)
    assert.equal(pos[0], 0)
    assert.equal(pos[4], 100)
  })
})
