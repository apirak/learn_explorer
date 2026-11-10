import { type Data } from '@generated/data'
import {
  BriefcaseBusiness,
  Clock,
  Download,
  Hexagon,
  PencilLine,
  Printer,
  type LucideIcon,
} from 'lucide-react'
import { formatTestTime } from '~/components/career_match_labels'

type Attempt = Pick<
  Data.Attempt.Variants['forDetail'],
  'createdAt' | 'resultAt' | 'careerAt' | 'printPrepAt' | 'downloadedAt' | 'testTimeMs'
>

type Step = { label: string; icon: LucideIcon; at: number | null }
type Gap = { from: number; to: number; ms: number }

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** Share of the line kept for steps not reached yet. */
const PENDING_SHARE = 18

/** Elapsed time in Thai, at most two units: "40 วินาที", "14 นาที", "1 วัน 10 ชม.". */
export const formatDuration = (ms: number) => {
  if (ms < MIN) return `${Math.round(ms / 1000)} วินาที`
  if (ms < HOUR) return `${Math.round(ms / MIN)} นาที`
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR)
    const m = Math.round((ms % HOUR) / MIN)
    return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`
  }
  const d = Math.floor(ms / DAY)
  const h = Math.round((ms % DAY) / HOUR)
  return h ? `${d} วัน ${h} ชม.` : `${d} วัน`
}

/**
 * Space a gap on the line by log of its seconds, so a 40-second step and a one-day wait both
 * stay visible. The floor keeps the shortest gaps wide enough for their labels.
 */
const weight = (ms: number) => Math.max(Math.log10(1 + ms / 1000), 0.6)

const stamp = (ms: number) =>
  new Date(ms).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Each step as an icon on one straight line, with how long the student took between steps.
 * A skipped step is measured from the last step reached before it.
 */
export default function AttemptTimeline({ attempt: a }: { attempt: Attempt }) {
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : null)
  const steps: Step[] = [
    { label: 'Test', icon: PencilLine, at: t(a.createdAt) },
    { label: 'Result', icon: Hexagon, at: t(a.resultAt) },
    { label: 'Career', icon: BriefcaseBusiness, at: t(a.careerAt) },
    { label: 'Print prep', icon: Printer, at: t(a.printPrepAt) },
    { label: 'Download', icon: Download, at: t(a.downloadedAt) },
  ]

  const gaps: Gap[] = []
  let prev: number | null = null
  steps.forEach((s, i) => {
    if (s.at === null) return
    if (prev !== null) gaps.push({ from: prev, to: i, ms: Math.max(0, s.at - steps[prev].at!) })
    prev = i
  })

  const pending = steps.filter((s) => s.at === null).length
  const reachedEnd = gaps.length === 0 ? 0 : pending ? 100 - PENDING_SHARE : 100
  const total = gaps.reduce((sum, g) => sum + weight(g.ms), 0)

  const pos: number[] = []
  let acc = 0
  let waiting = 0
  steps.forEach((s, i) => {
    const gap = gaps.find((g) => g.to === i)
    if (gap) acc += weight(gap.ms)
    if (s.at !== null) pos[i] = total ? (acc / total) * reachedEnd : 0
    else pos[i] = reachedEnd + (++waiting * (100 - reachedEnd)) / pending
  })

  return (
    <div className="timeline">
      <div className="timeline__track">
        <div className="timeline__line" style={{ width: `${reachedEnd}%` }} />
        {pending > 0 && (
          <div
            className="timeline__line timeline__line--pending"
            style={{ left: `${reachedEnd}%` }}
          />
        )}
        <div aria-hidden="true">
          {gaps.map((g) => (
            <div
              key={g.to}
              className={`timeline__gap ${g.ms >= HOUR ? 'timeline__gap--long' : ''}`}
              style={{ left: `${pos[g.from]}%`, width: `${pos[g.to] - pos[g.from]}%` }}
            >
              <span>{formatDuration(g.ms)}</span>
            </div>
          ))}
        </div>
        <ol className="timeline__steps">
          {steps.map((s, i) => {
            const Icon = s.icon
            const gap = gaps.find((g) => g.to === i)
            return (
              <li
                key={s.label}
                className={`timeline__step ${s.at === null ? 'timeline__step--pending' : ''} ${i % 2 ? 'timeline__step--low' : ''}`}
                style={{ left: `${pos[i]}%` }}
              >
                <span className="timeline__dot">
                  <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <strong>{s.label}</strong>
                <small>{s.at === null ? 'ยังไม่ถึง' : stamp(s.at)}</small>
                {gap && (
                  <span className="visually-hidden">หลังขั้นก่อนหน้า {formatDuration(gap.ms)}</span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      {a.testTimeMs !== null && (
        <p className="timeline__note muted">
          <Clock size={14} aria-hidden="true" /> เวลาทำแบบทดสอบจริง {formatTestTime(a.testTimeMs)}{' '}
          (ไม่นับช่วงที่ห่างเกิน 5 นาที)
        </p>
      )}
    </div>
  )
}
