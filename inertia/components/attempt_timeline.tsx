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
import { formatDuration, layoutTimeline } from '~/timeline_layout'

type Attempt = Pick<
  Data.Attempt.Variants['forDetail'],
  'createdAt' | 'resultAt' | 'careerAt' | 'printPrepAt' | 'downloadedAt' | 'testTimeMs'
>

type Step = { label: string; icon: LucideIcon; at: string | null }

const HOUR = 3_600_000

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Each step as an icon on one straight line, with how long the student took between steps.
 * A skipped step stays in order; its gap is measured from the last step reached before it.
 */
export default function AttemptTimeline({ attempt }: { attempt: Attempt }) {
  const steps: Step[] = [
    { label: 'Test', icon: PencilLine, at: attempt.createdAt },
    { label: 'Result', icon: Hexagon, at: attempt.resultAt },
    { label: 'Career', icon: BriefcaseBusiness, at: attempt.careerAt },
    { label: 'Print prep', icon: Printer, at: attempt.printPrepAt },
    { label: 'Download', icon: Download, at: attempt.downloadedAt },
  ]
  const { states, gaps, pos, reachedEnd } = layoutTimeline(
    steps.map((s) => (s.at ? new Date(s.at).getTime() : null))
  )
  const pendingCount = states.filter((s) => s === 'pending').length

  return (
    <div className="timeline">
      <div className="timeline__track">
        <div className="timeline__line" style={{ width: `${reachedEnd}%` }} />
        {pendingCount > 0 && (
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
            const state = states[i]
            const gap = gaps.find((g) => g.to === i)
            return (
              <li
                key={s.label}
                className={`timeline__step ${state === 'reached' ? '' : `timeline__step--${state}`} ${i % 2 ? 'timeline__step--low' : ''}`}
                style={{ left: `${pos[i]}%` }}
              >
                <span className="timeline__dot">
                  <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <strong>{s.label}</strong>
                <small>{s.at ? stamp(s.at) : state === 'skipped' ? 'ข้าม' : 'ยังไม่ถึง'}</small>
                {gap && (
                  <span className="visually-hidden">
                    หลัง {steps[gap.from].label} {formatDuration(gap.ms)}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      {attempt.testTimeMs !== null && (
        <p className="timeline__note muted">
          <Clock size={14} aria-hidden="true" /> เวลาทำแบบทดสอบจริง{' '}
          {formatTestTime(attempt.testTimeMs)} (ไม่นับช่วงที่ห่างเกิน 5 นาที)
        </p>
      )}
    </div>
  )
}
