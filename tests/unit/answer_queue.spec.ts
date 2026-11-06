import { test } from '@japa/runner'
import type {} from '@japa/assert' // `assert` on the test context, for the inertia typecheck
import AnswerQueue, { type Outcome } from '../../inertia/answer_queue.js'

function memoryStore() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const tick = () => new Promise((r) => setTimeout(r, 5))
const DELAYS = [1, 1, 1]

test.group('AnswerQueue', () => {
  test('keeps the latest value per item and survives a reload', async ({ assert }) => {
    const store = memoryStore()
    const offline = async (): Promise<Outcome> => 'network'
    const q = new AnswerQueue('u1', store, offline, () => {}, [60_000])
    q.put('R1', 1)
    q.put('I1', 2)
    q.put('R1', 4)
    await tick() // let the failed send schedule its retry, then cancel it
    q.stop()
    assert.deepEqual(
      [...q.pending],
      [
        ['I1', 2],
        ['R1', 4],
      ]
    )

    const sent: [string, number][] = []
    const reloaded = new AnswerQueue(
      'u1',
      store,
      async (id, v) => {
        sent.push([id, v])
        return { answered: sent.length }
      },
      () => {}
    )
    assert.deepEqual(
      [...reloaded.pending],
      [
        ['I1', 2],
        ['R1', 4],
      ]
    )
    await reloaded.flush()
    assert.deepEqual(sent, [
      ['I1', 2],
      ['R1', 4],
    ])
    assert.equal(reloaded.answered, 2)
    assert.isFalse(store.data.has('le_answers:u1'))
  })

  test('retries network failures and 5xx, counting failures in a row', async ({ assert }) => {
    const replies: Outcome[] = ['network', { status: 503 }, 'network', { answered: 1 }]
    const seen: number[] = []
    const q: AnswerQueue = new AnswerQueue(
      'u2',
      memoryStore(),
      async () => replies.shift()!,
      () => seen.push(q.failures),
      DELAYS
    )
    q.put('R1', 3)
    while (q.pending.size) await tick()
    assert.deepEqual(seen, [0, 1, 2, 3, 0])
    assert.equal(q.failures, 0)
    assert.equal(q.answered, 1)
  })

  test('a 4xx is not retried and is reported', async ({ assert }) => {
    let calls = 0
    const q = new AnswerQueue(
      'u3',
      memoryStore(),
      async () => {
        calls++
        return { status: 422 }
      },
      () => {},
      DELAYS
    )
    q.put('R1', 3)
    await tick()
    await tick()
    assert.equal(calls, 1)
    assert.equal(q.rejected, 422)
    assert.equal(q.pending.size, 0)
  })

  test('a newer tap during a send stays queued', async ({ assert }) => {
    const sent: number[] = []
    let q!: AnswerQueue
    q = new AnswerQueue(
      'u4',
      memoryStore(),
      async (_id, v) => {
        sent.push(v)
        if (sent.length === 1) q.put('R1', 4) // student changes the answer mid-flight
        return { answered: 1 }
      },
      () => {}
    )
    q.put('R1', 1)
    await tick()
    assert.deepEqual(sent, [1, 4])
    assert.equal(q.pending.size, 0)
  })
})
