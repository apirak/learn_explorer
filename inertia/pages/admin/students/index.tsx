import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'

type Step = Data.Attempt['furthestStep']
const STEP_LABEL: Record<Step, string> = {
  test: 'Test',
  result: 'Result',
  career: 'Career',
  mypath: 'MyPath',
}

type PageProps = InertiaProps<{
  filters: { code: string | null; step: Step | null }
  attempts: {
    data: Data.Attempt[]
    metadata: { total: number; currentPage: number; lastPage: number }
  }
}>

/** Every attempt, newest first. Contact details arrive masked [DP-001]. */
export default function AdminStudents({ filters, attempts }: PageProps) {
  const { data, metadata } = attempts
  const pageUrl = (page: number) =>
    urlFor(
      'admin.students.index',
      {},
      { qs: { code: filters.code ?? undefined, step: filters.step ?? undefined, page } }
    )

  return (
    <Page title="Students" description={`${metadata.total} attempts`}>
      <Form route="admin.students.index" className="panel records__filters">
        <label className="field">
          <span className="field__label">Code</span>
          <input
            className="field__input"
            name="code"
            defaultValue={filters.code ?? ''}
            maxLength={64}
          />
        </label>
        <label className="field">
          <span className="field__label">Furthest step</span>
          <select className="field__input" name="step" defaultValue={filters.step ?? ''}>
            <option value="">Any</option>
            {(Object.keys(STEP_LABEL) as Step[]).map((s) => (
              <option key={s} value={s}>
                {STEP_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn--secondary btn--sm">
          Filter
        </button>
      </Form>

      <div className="panel records">
        {data.length === 0 ? (
          <p className="muted">No attempts match.</p>
        ) : (
          <table className="records__table">
            <thead>
              <tr>
                <th scope="col">Started</th>
                <th scope="col">Code</th>
                <th scope="col">Step</th>
                <th scope="col">Interest</th>
                <th scope="col">Download</th>
                <th scope="col">Contact</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link route="admin.students.show" routeParams={{ id: a.id }}>
                      {a.createdAt && new Date(a.createdAt).toLocaleString('th-TH')}
                    </Link>
                  </td>
                  <td>{a.code ?? '–'}</td>
                  <td>{STEP_LABEL[a.furthestStep]}</td>
                  <td>{a.interestCode ?? '–'}</td>
                  <td>{a.downloadedAt ? 'Yes' : '–'}</td>
                  <td>{[a.phone, a.email].filter(Boolean).join(' · ') || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {metadata.lastPage > 1 && (
        <nav className="records__pager" aria-label="Pages">
          {metadata.currentPage > 1 && (
            <Link href={pageUrl(metadata.currentPage - 1)} className="btn btn--ghost btn--sm">
              Previous
            </Link>
          )}
          <span className="muted">
            Page {metadata.currentPage} of {metadata.lastPage}
          </span>
          {metadata.currentPage < metadata.lastPage && (
            <Link href={pageUrl(metadata.currentPage + 1)} className="btn btn--ghost btn--sm">
              Next
            </Link>
          )}
        </nav>
      )}
    </Page>
  )
}

AdminStudents.layout = [AppLayout]
