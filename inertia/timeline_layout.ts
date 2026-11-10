/** Where a step stands: reached, passed without a timestamp, or not reached yet. */
export type StepState = 'reached' | 'skipped' | 'pending'

/** Time between two reached steps; `from` and `to` are step indexes. */
export type Gap = { from: number; to: number; ms: number }

export type TimelineLayout = {
  states: StepState[]
  gaps: Gap[]
  /** Left edge of each step on the line, 0 to 100. */
  pos: number[]
  /** Where the solid line ends and the dashed line for pending steps begins. */
  reachedEnd: number
}

const MIN = 60_000
const HOUR = 60 * MIN

/** Share of the line kept for steps not reached yet. */
const PENDING_SHARE = 18

/**
 * Elapsed time in Thai, at most two units: "40 วินาที", "14 นาที", "1 วัน 10 ชม.".
 * Rounds to the smallest unit shown first, so 59.6 seconds reads "1 นาที", not "60 วินาที".
 */
export function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} วินาที`
  const minutes = Math.round(ms / MIN)
  if (minutes < 60) return `${minutes} นาที`
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`
  }
  const hours = Math.round(ms / HOUR)
  const d = Math.floor(hours / 24)
  const h = hours % 24
  return h ? `${d} วัน ${h} ชม.` : `${d} วัน`
}

/**
 * Width of a gap on the line: log of its seconds, so a 40-second step and a one-day wait both
 * stay visible. The floor keeps the shortest gaps wide enough for their labels.
 */
const gapWidth = (ms: number) => Math.max(Math.log10(1 + ms / 1000), 0.6)

/**
 * Lay the steps out on one line from their timestamps (ms, or null when missing).
 * A missing step before the last reached one is skipped: it keeps its place in order, and the gap
 * runs from the last step reached before it. Missing steps after that trail on a dashed line.
 */
export function layoutTimeline(stepTimes: (number | null)[]): TimelineLayout {
  let lastReached = -1
  stepTimes.forEach((at, i) => {
    if (at !== null) lastReached = i
  })
  const states: StepState[] = stepTimes.map((at, i) =>
    at !== null ? 'reached' : i < lastReached ? 'skipped' : 'pending'
  )

  const gaps: Gap[] = []
  let prev = -1
  stepTimes.forEach((at, i) => {
    if (at === null) return
    if (prev >= 0) gaps.push({ from: prev, to: i, ms: Math.max(0, at - stepTimes[prev]!) })
    prev = i
  })

  const pendingCount = states.filter((s) => s === 'pending').length
  const reachedEnd = gaps.length === 0 ? 0 : pendingCount ? 100 - PENDING_SHARE : 100
  const total = gaps.reduce((sum, g) => sum + gapWidth(g.ms), 0)

  const pos: number[] = new Array(stepTimes.length).fill(0)
  let acc = 0
  for (const g of gaps) {
    acc += gapWidth(g.ms)
    pos[g.to] = (acc / total) * reachedEnd
    const between = g.to - g.from - 1
    for (let k = 1; k <= between; k++) {
      pos[g.from + k] = pos[g.from] + ((pos[g.to] - pos[g.from]) * k) / (between + 1)
    }
  }
  let waiting = 0
  states.forEach((s, i) => {
    if (s === 'pending') pos[i] = reachedEnd + (++waiting * (100 - reachedEnd)) / pendingCount
  })

  return { states, gaps, pos, reachedEnd }
}
