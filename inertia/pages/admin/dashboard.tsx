import { usePoll } from '@inertiajs/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'

type Step = keyof Data.Dashboard['steps']

const STEP_LABEL: Record<Step, string> = {
  test: 'Test',
  result: 'Result',
  career: 'Career',
  mypath: 'MyPath',
}

/** Funnel counts by furthest step, refreshed every 5 s while the tab is visible. Counts only. */
export default function AdminDashboard({ summary }: InertiaProps<{ summary: Data.Dashboard }>) {
  usePoll(5000, { only: ['summary'] }, { background: 'pause' })

  const max = Math.max(1, ...Object.values(summary.steps))

  return (
    <Page title="Dashboard" description="60 วันล่าสุด · updates every 5 seconds">
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
        </dl>
        <p className="funnel__updated">
          Updated {new Date(summary.generatedAt).toLocaleTimeString('th-TH')}
        </p>
      </div>
    </Page>
  )
}

AdminDashboard.layout = [AppLayout]
