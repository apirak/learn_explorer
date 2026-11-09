import { usePoll } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'

type Step = keyof Data.Dashboard['steps']
// An array, not Object.keys(RANGE_LABEL): JS lists numeric keys ('7') before 'today'.
const RANGES = ['today', '7', '30', '60', 'all'] as const
type Range = (typeof RANGES)[number]

const RANGE_LABEL: Record<Range, string> = {
  'today': 'วันนี้',
  '7': '7 วัน',
  '30': '30 วัน',
  '60': '60 วัน',
  'all': 'ทั้งหมด',
}

const STEP_LABEL: Record<Step, string> = {
  test: 'Test',
  result: 'Result',
  career: 'Career',
  print_prep: 'Print prep',
}

/** Funnel counts by furthest step, refreshed every 5 s while the tab is visible. Counts only. */
export default function AdminDashboard({
  summary,
  range,
}: InertiaProps<{ summary: Data.Dashboard; range: Range }>) {
  // The poll reloads the current URL, so it keeps the chosen range.
  usePoll(5000, { only: ['summary'] }, { background: 'pause' })

  const max = Math.max(1, ...Object.values(summary.steps))

  return (
    <Page
      title="Dashboard"
      description={`${range === 'today' || range === 'all' ? RANGE_LABEL[range] : `${range} วันล่าสุด`} · updates every 5 seconds`}
      actions={RANGES.map((r) => (
        <Link
          key={r}
          href={urlFor('admin.dashboard', {}, { qs: { range: r } })}
          className={`btn btn--sm ${r === range ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={r === range ? 'page' : undefined}
          preserveScroll
        >
          {RANGE_LABEL[r]}
        </Link>
      ))}
    >
      <div className="panel funnel">
        <ul className="funnel__steps">
          {(Object.keys(STEP_LABEL) as Step[]).map((step) => (
            <li key={step} className="funnel__row">
              <span className="funnel__label">{STEP_LABEL[step]}</span>
              <span className="funnel__track">
                <span
                  className="funnel__bar"
                  style={{ width: `${(summary.steps[step] / max) * 100}%` }}
                />
              </span>
              <strong className="funnel__count">{summary.steps[step]}</strong>
            </li>
          ))}
        </ul>
        <dl className="funnel__totals">
          <div>
            <dt>Result views</dt>
            <dd>{summary.resultViews}</dd>
          </div>
          <div>
            <dt>Downloads</dt>
            <dd>{summary.downloads}</dd>
          </div>
          <div>
            <dt>Contacts · before careers</dt>
            <dd>{summary.contacts.contact}</dd>
          </div>
          <div>
            <dt>Contacts · Print prep</dt>
            <dd>{summary.contacts.print_prep}</dd>
          </div>
        </dl>
        <p className="funnel__updated">
          Updated {new Date(summary.generatedAt).toLocaleTimeString('th-TH')}
        </p>
      </div>
    </Page>
  )
}

AdminDashboard.layout = [AppLayout]
