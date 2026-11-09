import { useState } from 'react'
import { BookOpen, Download, Trash2 } from 'lucide-react'
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

/**
 * Every attempt, newest first. Contact details arrive masked [DP-001]; the CSV export carries
 * them in full, for internal use only (ADR 0003).
 */
export default function AdminStudents({ filters, attempts }: PageProps) {
  const { data, metadata } = attempts
  // Delete is confirmed in the row, not with the browser's confirm().
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const filterQs = { code: filters.code ?? undefined, step: filters.step ?? undefined }
  const pageUrl = (page: number) =>
    urlFor('admin.students.index', {}, { qs: { ...filterQs, page } })

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
        {/* Plain links: the browser downloads the files, Inertia never sees them. */}
        <a
          className="btn btn--secondary btn--sm"
          href={urlFor('admin.students.export', {}, { qs: filterQs })}
          download
        >
          <Download size={15} /> Export CSV
        </a>
        <a className="btn btn--ghost btn--sm" href={urlFor('admin.students.dictionary')} download>
          <BookOpen size={15} /> Column guide
        </a>
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
                <th scope="col">Contact</th>
                <th scope="col">Download</th>
                <th scope="col" aria-label="Delete" />
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
                  <td>{[a.name, a.phone, a.email].filter(Boolean).join(' · ') || '–'}</td>
                  <td>{a.downloadedAt ? 'Yes' : '–'}</td>
                  <td>
                    {confirmId === a.id ? (
                      <Form
                        route="admin.students.destroy"
                        routeParams={{ id: a.id }}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setConfirmId(null)}
                        className="staff__actions"
                      >
                        {({ processing }) => (
                          <>
                            <button
                              type="submit"
                              className="btn btn--primary btn--sm"
                              disabled={processing}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => setConfirmId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </Form>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-label={`Delete attempt #${a.id}`}
                        onClick={() => setConfirmId(a.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
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
