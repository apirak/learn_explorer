/** What one save returned: the server's count, try again later, or refused for good (4xx). */
export type Outcome = { answered: number } | 'retry' | { rejected: number }

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Wait before retry n (capped at the last value). */
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000]
/** Failed tries in a row before the student is told. */
export const NOTICE_AFTER = 3

/**
 * Unsent answers, latest value per item, mirrored to `sessionStorage` under the attempt UUID
 * so a reload in the same tab keeps them. Sends one at a time, in order.
 * Retryable failures back off (capped); a refused answer is dropped and reported.
 */
export default class AnswerQueue {
  /** Server-confirmed answer count from the latest save, or null before the first one. */
  answered: number | null = null
  /** Failed tries in a row. */
  failures = 0
  /** Status of the last answer the server refused (4xx); retrying will not help. */
  rejected: number | null = null

  #pending: Map<string, number>
  #busy = false
  #stopped = false
  #timer: ReturnType<typeof setTimeout> | undefined
  #key: string

  constructor(
    attemptUuid: string,
    private store: Store,
    private send: (itemId: string, value: number) => Promise<Outcome>,
    private onChange: () => void,
    private delays = RETRY_DELAYS
  ) {
    this.#key = `le_answers:${attemptUuid}`
    let saved: Record<string, number> = {}
    try {
      saved = JSON.parse(store.getItem(this.#key) ?? '{}')
    } catch {} // corrupt or blocked storage: start empty
    this.#pending = new Map(Object.entries(saved))
  }

  get pending(): ReadonlyMap<string, number> {
    return this.#pending
  }

  /** Queue the latest value for an item. Waits for a scheduled retry instead of jumping it. */
  put(itemId: string, value: number) {
    this.#pending.delete(itemId) // re-insert at the end, keeps send order = tap order
    this.#pending.set(itemId, value)
    this.#persist()
    this.onChange()
    if (!this.#timer) void this.flush()
  }

  /** Send everything now (mount, "ลองใหม่", back online). */
  async flush() {
    clearTimeout(this.#timer)
    this.#timer = undefined
    if (this.#busy || this.#stopped) return
    this.#busy = true
    try {
      while (this.#pending.size) {
        const [itemId, value] = this.#pending.entries().next().value!
        const outcome = await this.send(itemId, value)
        if (this.#stopped) return // page left: a new queue owns the storage now
        if (outcome === 'retry') {
          this.failures++
          const delay = this.delays[Math.min(this.failures, this.delays.length) - 1]
          this.#timer = setTimeout(() => void this.flush(), delay)
          return this.onChange()
        }
        this.failures = 0
        // A newer tap on the same item while this one was in flight stays queued.
        if (this.#pending.get(itemId) === value) this.#pending.delete(itemId)
        this.#persist()
        if ('answered' in outcome) this.answered = outcome.answered
        else {
          this.rejected = outcome.rejected
          console.error('answer rejected', itemId, outcome.rejected)
        }
        this.onChange()
      }
    } finally {
      this.#busy = false
    }
  }

  /** For mount (again, under StrictMode): send what is waiting. */
  start() {
    this.#stopped = false
    void this.flush()
  }

  /** For unmount: no more sends, no more timers, no more storage writes. */
  stop() {
    this.#stopped = true
    clearTimeout(this.#timer)
  }

  #persist() {
    try {
      if (this.#pending.size)
        this.store.setItem(this.#key, JSON.stringify(Object.fromEntries(this.#pending)))
      else this.store.removeItem(this.#key)
    } catch {} // storage full or blocked: memory queue still works
  }
}
